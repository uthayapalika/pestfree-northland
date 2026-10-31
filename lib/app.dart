import 'package:flutter/material.dart';
import 'core/api.dart';
import 'core/session.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

class PestFreeApp extends StatefulWidget {
  const PestFreeApp({super.key});

  @override
  State<PestFreeApp> createState() => _PestFreeAppState();
}

class _PestFreeAppState extends State<PestFreeApp> {
  late final ApiClient _api = ApiClient();
  late final SessionStore _session = SessionStore(_api);
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _session.restore().whenComplete(() {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Pest-Free Northland, New Zealand',
        debugShowCheckedModeBanner: false,
        theme: buildPestFreeTheme(),
        home: _loading
            ? const _SplashScreen()
            : ListenableBuilder(
                listenable: _session,
                builder: (context, _) => _session.isSignedIn
                    ? HomeScreen(session: _session)
                    : AuthScreen(session: _session),
              ),
      );
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
}
