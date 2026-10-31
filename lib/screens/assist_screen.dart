import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../theme.dart';

class AssistScreen extends StatefulWidget {
  const AssistScreen({super.key, required this.session});
  final SessionStore session;

  @override
  State<AssistScreen> createState() => _AssistScreenState();
}

class _AssistScreenState extends State<AssistScreen> {
  bool _loading = true;
  bool _apiUnavailable = false;
  String? _error;
  List<Map<String, dynamic>> _requests = [];
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _inventory = [];
  ApiClient get _api => widget.session.api;
  bool get _isCoordinator => widget.session.role == 'coordinator';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() { _loading = true; _error = null; _apiUnavailable = false; });
    try {
      _requests = await _api.list('/neighbor-assist/requests');
      _summary = Map<String, dynamic>.from(await _api.request('/neighbor-assist/summary') as Map);
      if (_isCoordinator) {
        _users = await _api.list('/users');
        _users = _users.where((user) => ['volunteer', 'field_worker'].contains(user['role'])).toList();
        _inventory = await _api.list('/inventory');
      }
    } on ApiException catch (error) {
      _error = error.message;
      _apiUnavailable = error.statusCode == 404;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _createRequest() async {
    final body = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _RequestForm(),
    );
    if (body == null) return;
    try {
      await _api.request('/neighbor-assist/requests', method: 'POST', body: body);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Request sent to the PestFree team.')),
      );
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  Future<void> _assign(Map<String, dynamic> request) async {
    final body = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _AssignmentDialog(
        users: _users,
        inventory: _inventory,
        needsDelivery: ['delivery', 'visit_and_delivery'].contains(request['request_type']),
      ),
    );
    if (body == null) return;
    try {
      await _api.request('/neighbor-assist/requests/${request['id']}/assign', method: 'POST', body: body);
      await _load();
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  Future<void> _setStatus(Map<String, dynamic> request, String status) async {
    try {
      await _api.request('/neighbor-assist/requests/${request['id']}/status', method: 'PATCH', body: {'status': status});
      await _load();
      if (mounted && status == 'completed') {
        _message('Request completed. Any delivered stock was recorded in inventory.');
      }
    } on ApiException catch (error) {
      if (mounted) _message(error.message);
    }
  }

  void _message(String value) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));

  @override
  Widget build(BuildContext context) {
    final waiting = _requests.where((request) => request['status'] == 'submitted').length;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: _apiUnavailable
            ? const _AssistUnavailable()
            : _loading && _requests.isEmpty
            ? ListView(children: [SizedBox(height: 250), Center(child: CircularProgressIndicator())])
            : _error != null && _requests.isEmpty
                ? ListView(children: [const SizedBox(height: 90), _AssistEmpty(error: _error, onRetry: _load)])
                : ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 100), children: [
                    _AssistHero(isCoordinator: _isCoordinator, waiting: waiting, onCreate: _createRequest, summary: _summary),
                    const SizedBox(height: 18),
                    Text(_isCoordinator ? 'Community requests' : 'Your requests and assignments',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    if (_requests.isEmpty)
                      const _AssistEmpty(message: 'Requests from your community will show up here.', icon: Icons.volunteer_activism_outlined),
                    ..._requests.map((request) => _RequestCard(
                          request: request,
                          currentUserId: widget.session.user?['id'] as int?,
                          isCoordinator: _isCoordinator,
                          onAssign: () => _assign(request),
                          onStatus: (value) => _setStatus(request, value),
                        )),
                  ]),
      ),
      floatingActionButton: _apiUnavailable ? null : FloatingActionButton.extended(
        onPressed: _createRequest,
        backgroundColor: leaf,
        foregroundColor: forest,
        icon: const Icon(Icons.add),
        label: const Text('Ask for help'),
      ),
    );
  }
}

class _AssistHero extends StatelessWidget {
  const _AssistHero({required this.isCoordinator, required this.waiting, required this.onCreate, required this.summary});
  final bool isCoordinator;
  final int waiting;
  final VoidCallback onCreate;
  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(19),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF14251F), Color(0xFF0D1915)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          border: Border.all(color: const Color(0xFF31463B)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(child: Text('Northland Community Assist', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900))),
            Container(width: 39, height: 39, decoration: BoxDecoration(color: Colors.white.withOpacity(.15), borderRadius: BorderRadius.circular(13)),
                child: const Icon(Icons.volunteer_activism_outlined, color: Colors.white)),
          ]),
          const SizedBox(height: 9),
          Text(
            isCoordinator
                ? '$waiting new request${waiting == 1 ? '' : 's'} to review. Match a neighbor with a local volunteer and available supplies.'
                : 'A local volunteer can help with a pest concern, a safety check, or getting supplies to the right place.',
            style: const TextStyle(color: Color(0xFFE3EDE3), height: 1.45),
          ),
          const SizedBox(height: 13),
          Row(children: [
            _ImpactStat(value: '${summary['neighbors_helped'] ?? 0}', label: 'neighbors helped'),
            const SizedBox(width: 18),
            _ImpactStat(value: '${summary['volunteers_active'] ?? 0}', label: 'volunteers active'),
          ]),
          if (!isCoordinator) ...[
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Create a help request'),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white70)),
            ),
          ],
        ]),
      );
}

class _ImpactStat extends StatelessWidget {
  const _ImpactStat({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Color(0xFFDCE9DE), fontSize: 11)),
      ]);
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.currentUserId,
    required this.isCoordinator,
    required this.onAssign,
    required this.onStatus,
  });
  final Map<String, dynamic> request;
  final int? currentUserId;
  final bool isCoordinator;
  final VoidCallback onAssign;
  final ValueChanged<String> onStatus;

  @override
  Widget build(BuildContext context) {
    final status = '${request['status']}';
    final assignedToMe = request['assigned_to'] == currentUserId;
    final createdByMe = request['created_by'] == currentUserId;
    final closed = status == 'completed' || status == 'cancelled';
    final type = switch (request['request_type']) {
      'visit' => 'Home visit',
      'delivery' => 'Supply delivery',
      _ => 'Visit + supply delivery',
    };
    final statusColor = status == 'completed' ? leaf : status == 'cancelled' ? muted : const Color(0xFF9A671D);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(type, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
            _AssistStatus(text: status, color: statusColor),
          ]),
          const SizedBox(height: 7),
          Row(children: [const Icon(Icons.place_outlined, color: muted, size: 17), const SizedBox(width: 4), Expanded(child: Text('${request['general_area']}', style: const TextStyle(color: muted))) ]),
          const SizedBox(height: 7),
          Text('${request['details']}', style: const TextStyle(height: 1.4)),
          if (request['preferred_time'] != null) ...[
            const SizedBox(height: 7),
            Text('Preferred: ${request['preferred_time']}', style: const TextStyle(color: muted, fontSize: 12)),
          ],
          if (request['assigned_name'] != null) ...[
            const SizedBox(height: 7),
            Text('Volunteer: ${request['assigned_name']}', style: const TextStyle(color: muted, fontSize: 12)),
          ],
          if (request['inventory_item_name'] != null) ...[
            const SizedBox(height: 7),
            Text('Delivery: ${request['supply_quantity']} × ${request['inventory_item_name']}', style: const TextStyle(color: muted, fontSize: 12)),
          ],
          if ('${request['contact_phone'] ?? ''}'.isNotEmpty) ...[
            const SizedBox(height: 7),
            Text('Contact: ${request['contact_phone']}', style: const TextStyle(color: muted, fontSize: 12)),
          ],
          if (!closed) ...[
            const SizedBox(height: 7),
            Wrap(spacing: 4, children: [
              if (isCoordinator && ['submitted', 'assigned'].contains(status))
                TextButton.icon(onPressed: onAssign, icon: const Icon(Icons.person_add_alt_1), label: Text(status == 'assigned' ? 'Reassign' : 'Assign')),
              if (assignedToMe && status == 'assigned')
                TextButton.icon(onPressed: () => onStatus('in_progress'), icon: const Icon(Icons.play_arrow), label: const Text('Start')),
              if ((assignedToMe || isCoordinator) && ['assigned', 'in_progress'].contains(status))
                TextButton.icon(onPressed: () => onStatus('completed'), icon: const Icon(Icons.check_circle_outline), label: const Text('Complete')),
              if ((createdByMe || assignedToMe || isCoordinator) && status != 'in_progress')
                TextButton.icon(onPressed: () => onStatus('cancelled'), icon: const Icon(Icons.close), label: const Text('Cancel')),
            ]),
          ],
        ]),
      ),
    );
  }
}

class _RequestForm extends StatefulWidget {
  const _RequestForm();
  @override
  State<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends State<_RequestForm> {
  final _form = GlobalKey<FormState>();
  final _area = TextEditingController();
  final _details = TextEditingController();
  final _phone = TextEditingController();
  final _time = TextEditingController();
  String _type = 'visit';

  @override
  void dispose() {
    _area.dispose();
    _details.dispose();
    _phone.dispose();
    _time.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.viewInsetsOf(context).bottom + 18),
        child: SingleChildScrollView(child: Form(key: _form, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: borderColor, borderRadius: BorderRadius.circular(4)))),
          const SizedBox(height: 17),
          const Text('Ask your community for help', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          const Text('A coordinator will review your request and connect you with a local volunteer.', style: TextStyle(color: muted)),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(value: _type, decoration: const InputDecoration(labelText: 'What do you need?'), items: const [
            DropdownMenuItem(value: 'visit', child: Text('A pest or trap safety visit')),
            DropdownMenuItem(value: 'delivery', child: Text('Bait or equipment delivery')),
            DropdownMenuItem(value: 'visit_and_delivery', child: Text('A visit and supplies')),
          ], onChanged: (value) { if (value != null) setState(() => _type = value); }),
          const SizedBox(height: 11),
          TextFormField(controller: _area, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'General area or suburb', helperText: 'Please don’t enter an exact home address.'), validator: (value) => (value == null || value.trim().length < 2) ? 'Enter a general area' : null),
          const SizedBox(height: 11),
          TextFormField(controller: _details, minLines: 3, maxLines: 5, maxLength: 1000, decoration: const InputDecoration(labelText: 'Tell us what help is needed', alignLabelWithHint: true), validator: (value) => (value == null || value.trim().length < 10) ? 'Add a little more detail' : null),
          const SizedBox(height: 5),
          TextFormField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Contact phone (optional)', prefixIcon: Icon(Icons.phone_outlined))),
          const SizedBox(height: 11),
          TextFormField(controller: _time, decoration: const InputDecoration(labelText: 'Best time to visit (optional)', prefixIcon: Icon(Icons.schedule_outlined))),
          const SizedBox(height: 15),
          FilledButton(onPressed: () {
            if (!_form.currentState!.validate()) return;
            Navigator.pop(context, {
              'request_type': _type,
              'general_area': _area.text.trim(),
              'details': _details.text.trim(),
              'contact_phone': _phone.text.trim(),
              'preferred_time': _time.text.trim().isEmpty ? null : _time.text.trim(),
            });
          }, child: const Text('Send request')),
        ]))),
      );
}

class _AssignmentDialog extends StatefulWidget {
  const _AssignmentDialog({required this.users, required this.inventory, required this.needsDelivery});
  final List<Map<String, dynamic>> users;
  final List<Map<String, dynamic>> inventory;
  final bool needsDelivery;
  @override
  State<_AssignmentDialog> createState() => _AssignmentDialogState();
}

class _AssignmentDialogState extends State<_AssignmentDialog> {
  final _form = GlobalKey<FormState>();
  final _quantity = TextEditingController(text: '1');
  int? _userId;
  int? _itemId;

  @override
  void dispose() { _quantity.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final available = widget.inventory.where((item) => (item['quantity'] as num? ?? 0) > 0).toList();
    return AlertDialog(
      title: const Text('Assign a local volunteer'),
      content: Form(key: _form, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        DropdownButtonFormField<int>(value: _userId, decoration: const InputDecoration(labelText: 'Volunteer'), items: widget.users.map((user) => DropdownMenuItem<int>(value: user['id'] as int, child: Text('${user['name']}'))).toList(), onChanged: (value) => setState(() => _userId = value), validator: (value) => value == null ? 'Choose a volunteer' : null),
        if (widget.needsDelivery) ...[
          const SizedBox(height: 11),
          DropdownButtonFormField<int>(value: _itemId, decoration: const InputDecoration(labelText: 'Supply from inventory'), items: available.map((item) => DropdownMenuItem<int>(value: item['id'] as int, child: Text('${item['name']} · ${item['quantity']} ${item['unit']}'))).toList(), onChanged: (value) => setState(() => _itemId = value), validator: (value) => value == null ? 'Choose an in-stock item' : null),
          const SizedBox(height: 11),
          TextFormField(controller: _quantity, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity to deliver'), validator: (value) {
            final quantity = int.tryParse(value ?? '');
            Map<String, dynamic>? item;
            for (final candidate in available) {
              if (candidate['id'] == _itemId) { item = candidate; break; }
            }
            if (quantity == null || quantity < 1) return 'Enter a positive quantity';
            if (item != null && quantity > (item['quantity'] as num).toInt()) return 'Quantity exceeds current stock';
            return null;
          }),
        ],
      ]))),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Not now')),
        FilledButton(onPressed: () {
          if (!_form.currentState!.validate()) return;
          Navigator.pop(context, {
            'assigned_to': _userId,
            if (widget.needsDelivery) 'inventory_item_id': _itemId,
            if (widget.needsDelivery) 'supply_quantity': int.parse(_quantity.text),
          });
        }, child: const Text('Assign')),
      ],
    );
  }
}

class _AssistStatus extends StatelessWidget {
  const _AssistStatus({required this.text, required this.color});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5), decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(20)), child: Text(text.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900)));
}

class _AssistEmpty extends StatelessWidget {
  const _AssistEmpty({this.message, this.icon = Icons.volunteer_activism_outlined, this.error, this.onRetry});
  final String? message;
  final String? error;
  final IconData icon;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 43, color: leaf), const SizedBox(height: 10),
    Text(error == null ? 'Neighbors helping neighbors' : 'Could not load requests', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
    const SizedBox(height: 5), Text(error ?? message ?? '', textAlign: TextAlign.center, style: const TextStyle(color: muted)),
    if (onRetry != null) ...[const SizedBox(height: 12), FilledButton.tonalIcon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again'))],
  ]));
}

class _AssistUnavailable extends StatelessWidget {
  const _AssistUnavailable();

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(18, 28, 18, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF14251F), Color(0xFF0D1915)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: const Color(0xFF31463B)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.volunteer_activism_outlined, color: leaf, size: 30),
                SizedBox(height: 14),
                Text('Help keep Northland pest-free',
                    style: TextStyle(color: ink, fontSize: 21, fontWeight: FontWeight.w900)),
                SizedBox(height: 8),
                Text(
                  'Community visits and safe pest-prevention supply drop-offs are a planned PestFree feature.',
                  style: TextStyle(color: muted, height: 1.45),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(17),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: leaf),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'The live website API does not yet include support-request routes, so this app cannot submit home-visit or delivery requests. Trap checks, trap lines and field tasks continue to use the live API.',
                      style: TextStyle(color: muted, height: 1.45),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
}
