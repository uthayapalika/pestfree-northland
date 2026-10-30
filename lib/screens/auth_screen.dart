import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.session});
  final SessionStore session;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _register = false;
  bool _busy = false;
  bool _hidePassword = true;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      if (_register) {
        await widget.session.register(_name.text, _email.text, _password.text);
      } else {
        await widget.session.signIn(_email.text, _password.text);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 34, 24, 28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _BrandMark(),
                      const SizedBox(height: 38),
                      Text(_register ? 'Join the team' : 'Welcome back',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: ink, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text(_register
                          ? 'Join Pest-Free Northland as a volunteer.'
                          : 'Sign in to continue your field work.',
                          style: const TextStyle(color: muted, fontSize: 15)),
                      const SizedBox(height: 26),
                      if (_register) ...[
                        TextFormField(controller: _name, textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(labelText: 'Your name', prefixIcon: Icon(Icons.person_outline)),
                          validator: (v) => (v == null || v.trim().length < 2) ? 'Enter your name' : null),
                        const SizedBox(height: 14),
                      ],
                      TextFormField(controller: _email, keyboardType: TextInputType.emailAddress,
                        autocorrect: false, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.mail_outline)),
                        validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email address' : null),
                      const SizedBox(height: 14),
                      TextFormField(controller: _password, obscureText: _hidePassword,
                        decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                            onPressed: () => setState(() => _hidePassword = !_hidePassword))),
                        validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters' : null,
                        onFieldSubmitted: (_) => _submit()),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        _ErrorBanner(message: _error!),
                      ],
                      const SizedBox(height: 22),
                      FilledButton(onPressed: _busy ? null : _submit,
                        child: _busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text(_register ? 'Create account' : 'Sign in')),
                      const SizedBox(height: 12),
                      TextButton(onPressed: _busy ? null : () => setState(() { _register = !_register; _error = null; }),
                        child: Text(_register ? 'Already have an account? Sign in' : 'New to Pest-Free Northland? Create an account')),
                      const SizedBox(height: 24),
                      Text('Pest-Free Northland, New Zealand  ·  Every check counts',
                        textAlign: TextAlign.center, style: TextStyle(color: muted.withOpacity(.85), fontSize: 12)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) => Row(children: [
    Container(width: 54, height: 54, decoration: BoxDecoration(color: forest, borderRadius: BorderRadius.circular(17)),
      child: ClipRRect(borderRadius: BorderRadius.circular(17), child: Image.asset('assets/brand/pest-free-icon.png', fit: BoxFit.cover))),
    const SizedBox(width: 13),
    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Pest-Free', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900, color: ink, letterSpacing: -.5)),
      Text('NORTHLAND, NEW ZEALAND', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: muted, letterSpacing: 1.3)),
    ]),
  ]);
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(color: const Color(0xFF351B1B), borderRadius: BorderRadius.circular(12)),
    child: Row(children: [const Icon(Icons.error_outline, color: Color(0xFFFF8078)), const SizedBox(width: 9),
      Expanded(child: Text(message, style: const TextStyle(color: Color(0xFFFFB4AC))))]),
  );
}
