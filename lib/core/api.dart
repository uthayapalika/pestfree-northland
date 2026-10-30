import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  // Override at build time: --dart-define=API_BASE_URL=https://your-api.example
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://pestfree-northland.onrender.com',
  );
  final http.Client _client;
  String? token;

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Object? body,
    bool authenticated = true,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (authenticated && token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client.send(request).timeout(const Duration(seconds: 25));
      final response = await http.Response.fromStream(streamed);
      dynamic data;
      if (response.body.isNotEmpty) {
        try {
          data = jsonDecode(response.body);
        } on FormatException {
          data = response.body;
        }
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        var message = 'Request failed (${response.statusCode}).';
        if (data is Map) message = '${data['detail'] ?? data['message'] ?? message}';
        if (response.statusCode == 401 && authenticated) {
          message = 'Your session has expired. Please sign in again.';
        }
        throw ApiException(message, statusCode: response.statusCode);
      }
      return data;
    } on ApiException {
      rethrow;
    } catch (error) {
      throw ApiException('Could not connect to PestFree. Check your connection and API address.');
    }
  }

  Future<List<Map<String, dynamic>>> list(String path) async {
    final data = await request(path);
    if (data is! List) throw const ApiException('The server returned an unexpected response.');
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }
}
