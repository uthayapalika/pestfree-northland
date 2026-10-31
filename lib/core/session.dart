import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

class SessionStore extends ChangeNotifier {
  SessionStore(this.api);
  final ApiClient api;
  static const _secureStorage = FlutterSecureStorage();
  Map<String, dynamic>? user;
  bool largeText = false;
  bool get isSignedIn => api.token != null && user != null;
  String get displayName => '${user?['name'] ?? 'PestFree member'}';
  String get role => '${user?['role'] ?? 'volunteer'}';

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    largeText = prefs.getBool('large_text') ?? false;
    api.token = await _secureStorage.read(key: 'access_token');
    final savedUser = prefs.getString('user_json');
    if (api.token == null || savedUser == null) return;
    try {
      final profile = await api.request('/auth/me');
      user = Map<String, dynamic>.from(profile as Map);
      await prefs.setString('user_json', jsonEncode(user));
    } catch (_) {
      // Keep the saved session profile for offline browsing. Requests will refresh on reconnection.
      try {
        final decoded = Map<String, dynamic>.from(jsonDecode(savedUser) as Map);
        user = decoded;
      } catch (_) {
        await signOut();
      }
    }
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    final data = await api.request('/auth/login', method: 'POST', authenticated: false,
        body: {'email': email.trim(), 'password': password});
    final response = Map<String, dynamic>.from(data as Map);
    api.token = '${response['access_token']}';
    final profile = await api.request('/auth/me');
    user = Map<String, dynamic>.from(profile as Map);
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.write(key: 'access_token', value: api.token!);
    await prefs.setString('user_json', _encode(user!));
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    await api.request('/auth/register', method: 'POST', authenticated: false,
        body: {'name': name.trim(), 'email': email.trim(), 'password': password, 'role': 'volunteer'});
    await signIn(email, password);
  }

  Future<void> signOut() async {
    api.token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: 'access_token');
    await prefs.remove('user_json');
    notifyListeners();
  }

  Future<void> setLargeText(bool enabled) async {
    largeText = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('large_text', enabled);
    notifyListeners();
  }
}

String _encode(Map<String, dynamic> value) => jsonEncode(value);
