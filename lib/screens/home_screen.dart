import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api.dart';
import '../core/session.dart';
import 'assist_screen.dart';
import 'map_screen.dart';
import '../theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session});
  final SessionStore session;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _lines = [];
  List<Map<String, dynamic>> _traps = [];
  List<Map<String, dynamic>> _tasks = [];
  List<Map<String, dynamic>> _queue = [];
  ApiClient get api => widget.session.api;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final lines = await api.list('/trap-lines');
      final groups = await Future.wait(lines.map((line) => api.list('/trap-lines/${line['id']}/traps')));
      final tasks = await api.list('/tasks');
      _lines = lines;
      _traps = groups.expand((group) => group).toList();
      _tasks = tasks;
      await _cacheData();
      await _syncQueue();
    } on ApiException catch (e) {
      _error = e.message;
      if (api.token == null || e.statusCode == 401) await widget.session.signOut();
    }
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('pending_checks') ?? '[]';
    try { _queue = (jsonDecode(saved) as List).map((e) => Map<String, dynamic>.from(e)).toList(); } catch (_) { _queue = []; }
    if (_lines.isEmpty && await _cachedForCurrentUser()) {
      try {
        _lines = await readCachedList('cached_lines');
        _traps = await readCachedList('cached_traps');
        _tasks = await readCachedList('cached_tasks');
      } catch (_) {}
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _syncQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('pending_checks') ?? '[]';
    final queued = (jsonDecode(saved) as List).map((e) => Map<String, dynamic>.from(e)).toList();
    final remaining = <Map<String, dynamic>>[];
    for (final entry in queued) {
      if ('${entry['owner_id']}' != '${widget.session.user?['id']}') {
        remaining.add(entry);
        continue;
      }
      try {
        final check = entry['check_id'] == null
            ? await api.request('/traps/${entry['trap_id']}/checks', method: 'POST', body: entry['check'])
            : {'id': entry['check_id']};
        if (entry['species'] != null) {
          await api.request('/checks/${check['id']}/catches', method: 'POST', body: {'species': entry['species']});
        }
      } catch (_) { remaining.add(entry); }
    }
    await prefs.setString('pending_checks', jsonEncode(remaining));
    _queue = remaining;
  }

  Future<void> _saveOffline(Map<String, dynamic> entry) async {
    final prefs = await SharedPreferences.getInstance();
    _queue.add({...entry, 'owner_id': widget.session.user?['id']});
    await prefs.setString('pending_checks', jsonEncode(_queue));
    if (mounted) setState(() {});
  }

  Future<void> _cacheData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cached_lines', jsonEncode(_lines));
    await prefs.setString('cached_traps', jsonEncode(_traps));
    await prefs.setString('cached_tasks', jsonEncode(_tasks));
    await prefs.setString('cache_owner_id', '${widget.session.user?['id']}');
  }

  Future<bool> _cachedForCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('cache_owner_id') == '${widget.session.user?['id']}';
  }

  Future<void> _recordCheck(Map<String, dynamic> trap) async {
    final result = await showModalBottomSheet<_CheckDraft>(
      context: context, isScrollControlled: true, useSafeArea: true,
      builder: (_) => _CheckSheet(trap: trap),
    );
    if (result == null) return;
    final entry = {
      'trap_id': trap['id'],
      'check': {'status': result.status, 'notes': result.notes},
      'species': result.status == 'caught' ? result.species : null,
    };
    try {
      final check = await api.request('/traps/${trap['id']}/checks', method: 'POST', body: entry['check']);
      if (result.status == 'caught') {
        try {
          await api.request('/checks/${check['id']}/catches', method: 'POST', body: {'species': result.species});
        } on ApiException {
          await _saveOffline({...entry, 'check_id': check['id'], 'check': null});
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check saved. Catch details will sync when you reconnect.')));
          return;
        }
      }
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check recorded')));
      await _load();
    } on ApiException catch (e) {
      if (e.statusCode == null) {
        await _saveOffline(entry);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved on this device. It will sync when you reconnect.')));
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _updateTask(Map<String, dynamic> task, String status) async {
    try {
      await api.request('/tasks/${task['id']}', method: 'PATCH', body: {'status': status});
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Overview', 'Trap lines', 'Map', 'My tasks', 'Home visit', 'Profile'];
    final scaffold = Scaffold(
      appBar: AppBar(title: Text(titles[_tab]), actions: [
        if (_queue.isNotEmpty) Padding(padding: const EdgeInsets.only(right: 8), child: Center(child: _QueuePill(count: _queue.length))),
        IconButton(tooltip: 'Refresh', onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
      ]),
      body: _loading && _lines.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _lines.isEmpty
              ? _ErrorState(message: _error!, retry: _load)
              : IndexedStack(index: _tab, children: [
                  _Overview(name: widget.session.displayName, lines: _lines, traps: _traps, tasks: _tasks,
                    queueCount: _queue.length, onGo: (index) => setState(() => _tab = index), onCheck: _recordCheck, onRefresh: _load),
                  _TrapList(lines: _lines, traps: _traps, onCheck: _recordCheck),
                  MapScreen(traps: _traps),
                  _TaskList(tasks: _tasks, onUpdate: _updateTask),
                  AssistScreen(session: widget.session),
                  _Profile(session: widget.session, onRefresh: _load),
                ]),
      bottomNavigationBar: NavigationBar(selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() => _tab = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.place_outlined), label: 'Traps'),
          NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.checklist_rounded), label: 'Tasks'),
          NavigationDestination(icon: Icon(Icons.home_work_outlined), label: 'Home visit'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ]),
    );
    final media = MediaQuery.of(context);
    return MediaQuery(
      data: media.copyWith(textScaler: TextScaler.linear(widget.session.largeText ? 1.18 : 1.0)),
      child: scaffold,
    );
  }
}

Future<List<Map<String, dynamic>>> readCachedList(String key) async {
  final prefs = await SharedPreferences.getInstance();
  final saved = prefs.getString(key) ?? '[]';
  return (jsonDecode(saved) as List)
      .map((item) => Map<String, dynamic>.from(item as Map))
      .toList();
}

class _Overview extends StatelessWidget {
  const _Overview({required this.name, required this.lines, required this.traps, required this.tasks,
    required this.queueCount, required this.onGo, required this.onCheck, required this.onRefresh});
  final String name;
  final List<Map<String, dynamic>> lines, traps, tasks;
  final int queueCount;
  final ValueChanged<int> onGo;
  final ValueChanged<Map<String, dynamic>> onCheck;
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context) {
    final openTasks = tasks.where((task) => task['status'] == 'open').length;
    final attention = traps.where((trap) => ['needs_bait', 'damaged', 'missing', 'under_maintenance'].contains(trap['status'])).length;
    final recent = [...traps]..sort((a, b) => '${a['code']}'.compareTo('${b['code']}'));
    return RefreshIndicator(onRefresh: onRefresh, child: ListView(padding: const EdgeInsets.fromLTRB(18, 8, 18, 28), children: [
      Container(padding: const EdgeInsets.all(22), decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF14251F), Color(0xFF0D1915)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        border: Border.all(color: Color(0xFF31463B)), borderRadius: BorderRadius.circular(22)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [Icon(Icons.location_on_outlined, color: leaf), SizedBox(width: 8), Text('NORTHLAND, NEW ZEALAND', style: TextStyle(color: muted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4))]),
          const SizedBox(height: 12),
          Text('Kia ora, ${name.split(' ').first}', style: const TextStyle(color: ink, fontSize: 27, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          const Text('Every trap check moves Northland closer to a pest-free future.', style: TextStyle(color: muted, height: 1.45)),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(child: FilledButton.icon(onPressed: () => onGo(1), icon: const Icon(Icons.qr_code_scanner_rounded), label: const Text('Start a trap check'),
              style: FilledButton.styleFrom(backgroundColor: leaf, foregroundColor: forest, minimumSize: const Size.fromHeight(48)))),
            const SizedBox(width: 8),
            IconButton(onPressed: () => onGo(2), tooltip: 'Open trap map', icon: const Icon(Icons.map_outlined, color: leaf, size: 28)),
          ]),
        ])),
      if (queueCount > 0) ...[
        const SizedBox(height: 14),
        _InfoBanner(icon: Icons.cloud_upload_outlined, text: '$queueCount check${queueCount == 1 ? '' : 's'} waiting to sync'),
      ],
      const SizedBox(height: 16),
      _HomeVisitCard(onOpen: () => onGo(4)),
      const SizedBox(height: 22),
      const _SectionTitle('Your field snapshot'),
      const SizedBox(height: 11),
      Row(children: [
        Expanded(child: _MetricCard(icon: Icons.route_outlined, label: 'Trap lines', value: '${lines.length}', color: const Color(0xFF1B3227))),
        const SizedBox(width: 10),
        Expanded(child: _MetricCard(icon: Icons.place_outlined, label: 'Traps', value: '${traps.length}', color: const Color(0xFF332C19))),
        const SizedBox(width: 10),
        Expanded(child: _MetricCard(icon: Icons.assignment_outlined, label: 'Open tasks', value: '$openTasks', color: const Color(0xFF24233A))),
      ]),
      const SizedBox(height: 22),
      Row(children: [const Expanded(child: _SectionTitle('Needs attention')), if (attention > 0) _CountTag('$attention')]),
      const SizedBox(height: 10),
      if (attention == 0) const _EmptyCard(icon: Icons.check_circle_outline, text: 'No traps need attention right now.'),
      ...traps.where((t) => ['needs_bait', 'damaged', 'missing', 'under_maintenance'].contains(t['status'])).take(4).map((trap) => _TrapTile(trap: trap, onCheck: () => onCheck(trap))),
      const SizedBox(height: 20),
      Row(children: [const Expanded(child: _SectionTitle('Your trap lines')), TextButton(onPressed: () => onGo(1), child: const Text('View all'))]),
      ...lines.take(3).map((line) {
        final count = traps.where((trap) => trap['trap_line_id'] == line['id']).length;
        return Card(child: ListTile(leading: const CircleAvatar(backgroundColor: Color(0xFF1B3227), child: Icon(Icons.route_rounded, color: leaf)),
          title: Text('${line['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${line['general_area']}  ·  $count traps', style: const TextStyle(color: muted)), trailing: const Icon(Icons.chevron_right), onTap: () => onGo(1)));
      }),
    ]));
  }
}

class _HomeVisitCard extends StatelessWidget {
  const _HomeVisitCard({required this.onOpen});
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(color: accentSoft, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.home_work_outlined, color: leaf),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Need help at home?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              SizedBox(height: 4),
              Text('Request a safe pest or trap visit from a local volunteer.', style: TextStyle(color: muted, fontSize: 12, height: 1.35)),
            ])),
            TextButton(onPressed: onOpen, child: const Text('Request')),
          ]),
        ),
      );
}

class _TrapList extends StatefulWidget {
  const _TrapList({required this.lines, required this.traps, required this.onCheck});
  final List<Map<String, dynamic>> lines, traps;
  final ValueChanged<Map<String, dynamic>> onCheck;
  @override
  State<_TrapList> createState() => _TrapListState();
}

class _TrapListState extends State<_TrapList> {
  int? _lineId;
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final filtered = widget.traps.where((trap) => (_lineId == null || trap['trap_line_id'] == _lineId) &&
      ('${trap['code']} ${trap['general_area']}'.toLowerCase().contains(_query.toLowerCase()))).toList();
    return Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 8), child: TextField(onChanged: (value) => setState(() => _query = value),
        decoration: const InputDecoration(hintText: 'Search traps or locations', prefixIcon: Icon(Icons.search), isDense: true))),
      if (widget.lines.isNotEmpty) SizedBox(height: 46, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 14), children: [
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: ChoiceChip(label: const Text('All lines'), selected: _lineId == null, onSelected: (_) => setState(() => _lineId = null))),
        ...widget.lines.map((line) => Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: ChoiceChip(label: Text('${line['name']}'), selected: _lineId == line['id'], onSelected: (_) => setState(() => _lineId = line['id'] as int)))),
      ])),
      const SizedBox(height: 7),
      Expanded(child: filtered.isEmpty ? const _EmptyState(icon: Icons.location_searching, title: 'No traps found', subtitle: 'Try another search or line filter.')
        : ListView.builder(padding: const EdgeInsets.fromLTRB(14, 0, 14, 20), itemCount: filtered.length,
          itemBuilder: (context, index) => _TrapTile(trap: filtered[index], onCheck: () => widget.onCheck(filtered[index])))),
    ]);
  }
}

class _TrapTile extends StatelessWidget {
  const _TrapTile({required this.trap, required this.onCheck});
  final Map<String, dynamic> trap;
  final VoidCallback onCheck;
  @override
  Widget build(BuildContext context) {
    final type = '${trap['trap_type'] ?? 'other'}';
    final status = '${trap['status'] ?? 'active'}';
    final color = status == 'active' ? leaf : const Color(0xFFB77922);
    return Card(margin: const EdgeInsets.only(bottom: 9), child: Padding(padding: const EdgeInsets.fromLTRB(14, 13, 10, 13), child: Row(children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(color: accentSoft, borderRadius: BorderRadius.circular(14)),
        child: Icon(_speciesIcon(type), color: leaf)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${trap['code'] ?? 'Trap'}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        const SizedBox(height: 3), Text('${trap['general_area'] ?? 'Location unavailable'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: muted, fontSize: 12)),
        const SizedBox(height: 6), Row(children: [Text(_titleCase(type), style: const TextStyle(color: muted, fontSize: 11)), const SizedBox(width: 8), _StatusBadge(status: status, color: color)]),
      ])),
      IconButton(onPressed: onCheck, tooltip: 'Record check', icon: const Icon(Icons.add_circle_outline, color: leaf)),
    ])));
  }
}

class _TaskList extends StatelessWidget {
  const _TaskList({required this.tasks, required this.onUpdate});
  final List<Map<String, dynamic>> tasks;
  final Future<void> Function(Map<String, dynamic>, String) onUpdate;
  @override
  Widget build(BuildContext context) {
    final open = tasks.where((t) => t['status'] == 'open').toList();
    final done = tasks.where((t) => t['status'] == 'completed').toList();
    if (tasks.isEmpty) return const _EmptyState(icon: Icons.task_alt_rounded, title: 'All clear', subtitle: 'Assigned field tasks will appear here.');
    return ListView(padding: const EdgeInsets.fromLTRB(16, 6, 16, 24), children: [
      Text('${open.length} task${open.length == 1 ? '' : 's'} to do', style: const TextStyle(color: muted, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      ...open.map((task) => _TaskCard(task: task, onUpdate: onUpdate)),
      if (done.isNotEmpty) ...[const SizedBox(height: 18), const _SectionTitle('Completed'), const SizedBox(height: 8), ...done.map((task) => _TaskCard(task: task, onUpdate: onUpdate))],
    ]);
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, required this.onUpdate});
  final Map<String, dynamic> task;
  final Future<void> Function(Map<String, dynamic>, String) onUpdate;
  @override
  Widget build(BuildContext context) {
    final completed = task['status'] == 'completed';
    return Card(margin: const EdgeInsets.only(bottom: 9), child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Expanded(child: Text('${task['title']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))), Icon(completed ? Icons.check_circle : Icons.circle_outlined, color: completed ? leaf : const Color(0xFFB77922))]),
      if ('${task['notes'] ?? ''}'.isNotEmpty) ...[const SizedBox(height: 7), Text('${task['notes']}', style: const TextStyle(color: muted, height: 1.35))],
      const SizedBox(height: 8), Text([if (task['trap_code'] != null) 'Trap ${task['trap_code']}', if (task['trap_line'] != null) '${task['trap_line']}', if (task['due_at'] != null) 'Due ${_shortDate(task['due_at'])}'].join('  ·  '), style: const TextStyle(color: muted, fontSize: 12)),
      const SizedBox(height: 10), Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: () => onUpdate(task, completed ? 'open' : 'completed'),
        icon: Icon(completed ? Icons.undo : Icons.check), label: Text(completed ? 'Reopen task' : 'Mark complete'))),
    ])));
  }
}

class _Profile extends StatelessWidget {
  const _Profile({required this.session, required this.onRefresh});
  final SessionStore session;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) {
    final user = session.user ?? {};
    return ListView(padding: const EdgeInsets.all(18), children: [
      Card(child: Padding(padding: const EdgeInsets.all(19), child: Column(children: [
        const CircleAvatar(radius: 35, backgroundColor: accentSoft, child: Icon(Icons.person_outline, size: 35, color: leaf)),
        const SizedBox(height: 12), Text('${user['name']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 19)),
        Text('${user['email']}', style: const TextStyle(color: muted)), const SizedBox(height: 8),
        _StatusBadge(status: session.role.replaceAll('_', ' '), color: leaf),
      ]))),
      const SizedBox(height: 13),
      const _InfoBanner(icon: Icons.shield_outlined, text: 'Trap location details follow your account permissions.'),
      const SizedBox(height: 18),
      Card(child: Column(children: [
        ListTile(leading: const Icon(Icons.sync_rounded, color: leaf), title: const Text('Refresh field data'), subtitle: const Text('Update traps, lines and tasks'), onTap: onRefresh),
        const Divider(height: 1, indent: 55),
        SwitchListTile(secondary: const Icon(Icons.text_fields_rounded, color: leaf), title: const Text('Larger text'), subtitle: const Text('Make field instructions easier to read'), value: session.largeText, onChanged: session.setLargeText),
        const Divider(height: 1, indent: 55),
        ListTile(leading: const Icon(Icons.logout_rounded, color: Color(0xFFAB4848)), title: const Text('Sign out', style: TextStyle(color: Color(0xFFAB4848))), onTap: session.signOut),
      ])),
      const SizedBox(height: 22),
      const Text('PestFree Northland', textAlign: TextAlign.center, style: TextStyle(color: muted, fontWeight: FontWeight.w700)),
      const SizedBox(height: 4), const Text('Protecting our place, one check at a time.', textAlign: TextAlign.center, style: TextStyle(color: muted, fontSize: 12)),
    ]);
  }
}

class _CheckDraft {
  const _CheckDraft(this.status, this.notes, this.species);
  final String status, notes;
  final String? species;
}

class _CheckSheet extends StatefulWidget {
  const _CheckSheet({required this.trap});
  final Map<String, dynamic> trap;
  @override
  State<_CheckSheet> createState() => _CheckSheetState();
}

class _CheckSheetState extends State<_CheckSheet> {
  String _status = 'empty';
  String _species = 'rat';
  final _notes = TextEditingController();
  @override
  void dispose() { _notes.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Padding(padding: EdgeInsets.fromLTRB(20, 15, 20, MediaQuery.viewInsetsOf(context).bottom + 20), child: SingleChildScrollView(child: Column(
    crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: borderColor, borderRadius: BorderRadius.circular(4)))),
      const SizedBox(height: 18), Text('Check ${widget.trap['code']}', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
      Text('${widget.trap['general_area']}', style: const TextStyle(color: muted)), const SizedBox(height: 20),
      const Text('What did you find?', style: TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 9),
      Wrap(spacing: 8, runSpacing: 7, children: [
        _statusChip('empty', 'Clear', Icons.check_circle_outline),
        _statusChip('caught', 'Catch', Icons.pets_outlined),
        _statusChip('bait_needed', 'Bait needed', Icons.restaurant_outlined),
        _statusChip('sprung', 'Sprung', Icons.bolt_outlined),
      ]),
      if (_status == 'caught') ...[const SizedBox(height: 17), const Text('Species', style: TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 7),
        DropdownButtonFormField<String>(value: _species, decoration: const InputDecoration(), items: const [
          DropdownMenuItem(value: 'possum', child: Text('Possum')), DropdownMenuItem(value: 'rat', child: Text('Rat')),
          DropdownMenuItem(value: 'stoat', child: Text('Stoat')), DropdownMenuItem(value: 'mouse', child: Text('Mouse')),
          DropdownMenuItem(value: 'hedgehog', child: Text('Hedgehog')), DropdownMenuItem(value: 'other', child: Text('Other')),
        ], onChanged: (value) { if (value != null) setState(() => _species = value); })],
      const SizedBox(height: 17), TextField(controller: _notes, maxLines: 3, maxLength: 500, decoration: const InputDecoration(labelText: 'Notes (optional)', alignLabelWithHint: true)),
      const SizedBox(height: 8), FilledButton(onPressed: () => Navigator.pop(context, _CheckDraft(_status, _notes.text.trim(), _species)), child: const Text('Save check')),
    ],
  )));
  Widget _statusChip(String value, String label, IconData icon) => ChoiceChip(avatar: Icon(icon, size: 18), label: Text(label), selected: _status == value,
    onSelected: (_) => setState(() => _status = value));
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.retry});
  final String message;
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => _EmptyState(icon: Icons.cloud_off_outlined, title: 'Can’t reach the server', subtitle: message, action: FilledButton.tonalIcon(onPressed: retry, icon: const Icon(Icons.refresh), label: const Text('Try again')));
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.subtitle, this.action});
  final IconData icon;
  final String title, subtitle;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 45, color: leaf), const SizedBox(height: 12), Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6), Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: muted)), if (action != null) ...[const SizedBox(height: 15), action!],
  ])));
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.icon, required this.label, required this.value, required this.color});
  final IconData icon; final String label, value; final Color color;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 11), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Container(width: 33, height: 33, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(11)), child: Icon(icon, color: leaf, size: 19)),
    const SizedBox(height: 10), Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)), Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: muted, fontSize: 11)),
  ])));
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text); final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800));
}

class _CountTag extends StatelessWidget {
  const _CountTag(this.text); final String text;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: const Color(0xFF332C19), borderRadius: BorderRadius.circular(20)), child: Text(text, style: const TextStyle(color: Color(0xFFFFC857), fontWeight: FontWeight.w800)));
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.icon, required this.text}); final IconData icon; final String text;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: cardSurface, border: Border.all(color: borderColor), borderRadius: BorderRadius.circular(14)), child: Row(children: [Icon(icon, color: leaf, size: 20), const SizedBox(width: 10), Expanded(child: Text(text, style: const TextStyle(color: ink, fontWeight: FontWeight.w600)))]));
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.text}); final IconData icon; final String text;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(17), child: Row(children: [Icon(icon, color: leaf), const SizedBox(width: 10), Expanded(child: Text(text, style: const TextStyle(color: muted)))])));
}

class _QueuePill extends StatelessWidget {
  const _QueuePill({required this.count}); final int count;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5), decoration: BoxDecoration(color: accentSoft, borderRadius: BorderRadius.circular(20)), child: Text('$count pending', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: leaf)));
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.color}); final String status; final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(20)), child: Text(_titleCase(status.replaceAll('_', ' ')), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800)));
}

IconData _speciesIcon(String species) => switch (species) {
  'possum' => Icons.pets_outlined, 'rat' || 'mouse' => Icons.mouse_outlined,
  'stoat' || 'hedgehog' => Icons.cruelty_free_outlined, _ => Icons.nature_outlined,
};

String _titleCase(String value) => value.split(' ').map((word) => word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}').join(' ');
String _shortDate(dynamic value) => value == null ? '' : value.toString().split('T').first;
