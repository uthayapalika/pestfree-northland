import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../theme.dart';

/// Shows only the exact trap locations returned by the API for this account.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key, required this.traps});
  final List<Map<String, dynamic>> traps;

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  String _query = '';
  String? _status;

  List<Map<String, dynamic>> get _mappedTraps => widget.traps.where((trap) {
        final lat = _number(trap['exact_lat']);
        final lng = _number(trap['exact_lng']);
        if (lat == null || lng == null) return false;
        if (_status != null && (trap['status'] ?? 'active') != _status) return false;
        final text = '${trap['code'] ?? ''} ${trap['general_area'] ?? ''} ${trap['trap_type'] ?? ''}'.toLowerCase();
        return _query.trim().isEmpty || text.contains(_query.trim().toLowerCase());
      }).toList();

  @override
  Widget build(BuildContext context) {
    final traps = _mappedTraps;
    final points = traps.map((trap) => LatLng(_number(trap['exact_lat'])!, _number(trap['exact_lng'])!)).toList();
    final center = points.isEmpty ? const LatLng(-35.725, 174.32) : points.first;

    return Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 5, 16, 8), child: Row(children: [
        Expanded(child: TextField(onChanged: (value) => setState(() => _query = value), decoration: const InputDecoration(hintText: 'Search traps or areas', prefixIcon: Icon(Icons.search), isDense: true))),
        const SizedBox(width: 8),
        PopupMenuButton<String?>(tooltip: 'Filter trap status', icon: const Icon(Icons.filter_list), onSelected: (value) => setState(() => _status = value), itemBuilder: (_) => const [
          PopupMenuItem(value: null, child: Text('All statuses')),
          PopupMenuItem(value: 'active', child: Text('Active')),
          PopupMenuItem(value: 'needs_bait', child: Text('Needs bait')),
          PopupMenuItem(value: 'damaged', child: Text('Damaged')),
          PopupMenuItem(value: 'missing', child: Text('Missing')),
          PopupMenuItem(value: 'under_maintenance', child: Text('Maintenance')),
        ]),
      ])),
      Padding(padding: const EdgeInsets.fromLTRB(18, 0, 18, 8), child: Row(children: [
        Expanded(child: Text(points.isEmpty ? 'No mapped traps match your filters.' : '${points.length} mapped trap${points.length == 1 ? '' : 's'}', style: const TextStyle(color: muted, fontSize: 12))),
        TextButton.icon(onPressed: points.isEmpty ? null : () => _fit(points), icon: const Icon(Icons.fit_screen, size: 17), label: const Text('Fit traps')),
      ])),
      Expanded(child: Stack(children: [
        FlutterMap(mapController: _mapController, options: MapOptions(initialCenter: center, initialZoom: points.isEmpty ? 10 : 14), children: [
          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'nz.pestfree.mobile'),
          MarkerLayer(markers: traps.map((trap) {
            final point = LatLng(_number(trap['exact_lat'])!, _number(trap['exact_lng'])!);
            final color = '${trap['status'] ?? 'active'}' == 'active' ? leaf : const Color(0xFFB77922);
            return Marker(point: point, width: 48, height: 48, child: GestureDetector(onTap: () => _showTrap(trap), child: Container(
              decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: forest, width: 2)),
              child: const Icon(Icons.place, color: forest, size: 25),
            )));
          }).toList()),
        ]),
        if (widget.traps.every((trap) => _number(trap['exact_lat']) == null || _number(trap['exact_lng']) == null))
          Center(child: Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(mainAxisSize: MainAxisSize.min, children: const [
            Icon(Icons.location_off_outlined, color: leaf, size: 32),
            SizedBox(height: 8),
            Text('No exact locations available', style: TextStyle(fontWeight: FontWeight.w800)),
            SizedBox(height: 4),
            Text('Your account does not have access to mapped trap locations.', textAlign: TextAlign.center, style: TextStyle(color: muted)),
          ])))),
      ])),
    ]);
  }

  void _fit(List<LatLng> points) {
    if (points.length == 1) {
      _mapController.move(points.first, 16);
      return;
    }
    _mapController.fitCamera(CameraFit.coordinates(coordinates: points, padding: const EdgeInsets.all(45), maxZoom: 16));
  }

  void _showTrap(Map<String, dynamic> trap) {
    showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (_) => Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 24), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${trap['code'] ?? 'Trap'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      const SizedBox(height: 5),
      Text('${trap['general_area'] ?? 'Location unavailable'} · ${trap['trap_type'] ?? 'Other'}', style: const TextStyle(color: muted)),
      const SizedBox(height: 12),
      Text('Status: ${_titleCase('${trap['status'] ?? 'active'}'.replaceAll('_', ' '))}', style: const TextStyle(fontWeight: FontWeight.w600)),
    ])));
  }
}

double? _number(dynamic value) => value is num ? value.toDouble() : double.tryParse('$value');
String _titleCase(String value) => value.split(' ').map((word) => word.isEmpty ? word : '${word[0].toUpperCase()}${word.substring(1)}').join(' ');
