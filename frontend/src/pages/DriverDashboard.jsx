import React, { useState, useMemo } from 'react';
import CommanderMap from '../components/CommanderMap.jsx';
import RouteSchematic from '../components/RouteSchematic.jsx';
import { ApiService } from '../services/api.js';

/**
 * DriverDashboard Page (Phase B)
 * Simple, user-friendly, distraction-free command interface tailored exclusively
 * for an emergency ambulance driver navigating under critical priority.
 *
 * Answers four questions immediately:
 * 1. Where am I? (GPS status, coordinates, speed, current junction)
 * 2. Where am I going? (Destination hospital, destination input, ETA)
 * 3. Which junction is next? (Next junction approach)
 * 4. What should I know about the emergency corridor? (Compact corridor progression strip)
 *
 * Adheres strictly to RED / GREEN / BLUE / WHITE palette.
 */
export default function DriverDashboard({
  currentNav = 'my-mission',
  demoState,
  isLiveMode = false,
  isLiveBackend = false,
}) {
  const {
    emergency,
    telemetry,
    current_priority_junction,
    junction_states,
    route,
    metadata,
  } = demoState;

  // Connected emergency receiving facilities supported by existing routing graph
  const destinationOptions = [
    { id: 'J4', name: 'City General Hospital (J4 - Hospital Approach)', hospital: 'City General Hospital' },
    { id: 'J5', name: 'North Emergency Wing (J5 - Express Bypass)', hospital: 'North Emergency Wing (Bay 2)' },
    { id: 'J3', name: 'Downtown Trauma Clinic (J3 - Boulevard Way)', hospital: 'Downtown Trauma Clinic' },
  ];

  const [selectedDestId, setSelectedDestId] = useState('J4');
  const [customDestinationInput, setCustomDestinationInput] = useState('');
  const [activeDestination, setActiveDestination] = useState(emergency?.destination || 'City General Hospital');
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [routeStatusNote, setRouteStatusNote] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Active route: calculated by backend Dijkstra or fallback to demo state
  const activeRoute = calculatedRoute || route || ['J1', 'J2', 'J3', 'J4'];

  // Current and Next junction resolution
  const activeIdx = activeRoute.indexOf(current_priority_junction);
  const currentJunction = current_priority_junction || activeRoute[0] || 'J2';
  const nextJunction = activeIdx >= 0 && activeIdx < activeRoute.length - 1
    ? activeRoute[activeIdx + 1]
    : 'Destination';

  // Live GPS telemetry attribution
  const isLiveGPS = isLiveMode || telemetry?.data_source === 'LIVE GPS (ESP32)' || !demoState?.is_simulated;
  const speed = telemetry?.speed_kmh ?? 50;
  const lat = telemetry?.latitude ? Number(telemetry.latitude).toFixed(4) : '12.9740';
  const lng = telemetry?.longitude ? Number(telemetry.longitude).toFixed(4) : '77.5940';

  // Driver ambulance data payload (Strictly AX-01, isolated from AX-02)
  const driverAmbulanceData = useMemo(() => ({
    vehicle_id: emergency?.vehicle_id || 'AX-01',
    emergency_id: emergency?.emergency_id || 'E-001',
    status: emergency?.status || 'ACTIVE CRITICAL',
    priority_status: junction_states?.[current_priority_junction] || 'ACTIVE_PRIORITY',
    destination: activeDestination,
    eta: emergency?.eta || '8 min',
    latitude: telemetry?.latitude ?? 12.9740,
    longitude: telemetry?.longitude ?? 77.5940,
    speed_kmh: speed,
    current_junction: currentJunction,
    next_junction: nextJunction,
    route: activeRoute,
    data_source: isLiveGPS ? 'LIVE GPS (ESP32)' : 'SIMULATED DATA',
    is_simulated: !isLiveGPS,
  }), [emergency, activeDestination, telemetry, junction_states, current_priority_junction, currentJunction, nextJunction, activeRoute, isLiveGPS, speed]);

  // Destination submission using existing backend routing system (Dijkstra)
  const handleSetDestination = async (e) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    setRouteStatusNote('');

    let targetJunctionId = selectedDestId;
    let targetHospitalName = 'City General Hospital';

    const matchedOption = destinationOptions.find((opt) => opt.id === selectedDestId);
    if (matchedOption) {
      targetHospitalName = matchedOption.hospital;
    }

    // Check if driver typed arbitrary text
    const trimmedInput = customDestinationInput.trim();
    if (trimmedInput) {
      // Check if user entered a direct junction ID like J1-J5
      const upper = trimmedInput.toUpperCase();
      if (['J1', 'J2', 'J3', 'J4', 'J5'].includes(upper)) {
        targetJunctionId = upper;
        const opt = destinationOptions.find((o) => o.id === upper);
        targetHospitalName = opt ? opt.hospital : `Facility at ${upper}`;
      } else {
        // Arbitrary address: report missing geocoding integration point gracefully
        setRouteStatusNote(
          `Notice: Arbitrary street address geocoding is not integrated in the backend road network. Routed to closest emergency medical node (${targetJunctionId}).`
        );
      }
    }

    setActiveDestination(targetHospitalName);

    // Call existing backend route API if online
    if (isLiveBackend) {
      try {
        const res = await ApiService.calculateRoute(
          currentJunction,
          targetJunctionId,
          emergency?.emergency_id || 'E-001',
          'AX-01'
        );

        if (res.success && res.data?.route) {
          setCalculatedRoute(res.data.route);
          setRouteStatusNote(
            `Dijkstra route verified: ${res.data.route.join(' ➔ ')} (${Math.round(res.data.estimated_travel_time_seconds || 480)}s transit)`
          );
        } else {
          // Fallback to deterministic route
          applyDemoRouteFallback(targetJunctionId);
        }
      } catch (err) {
        applyDemoRouteFallback(targetJunctionId);
      }
    } else {
      // Demo Mode route resolution
      applyDemoRouteFallback(targetJunctionId);
    }

    setIsCalculating(false);
  };

  const applyDemoRouteFallback = (destId) => {
    let newRoute = ['J1', 'J2', 'J3', 'J4'];
    if (destId === 'J5') {
      newRoute = ['J1', 'J5', 'J4'];
    } else if (destId === 'J3') {
      newRoute = ['J1', 'J2', 'J3'];
    }
    setCalculatedRoute(newRoute);
    setRouteStatusNote(`Demo corridor trajectory engaged: ${newRoute.join(' ➔ ')}`);
  };

  const currentJunctionIdx = activeRoute.indexOf(current_priority_junction);

  return (
    <div className="dashboard-content" id="driver-dashboard">
      {/* 1. Header Banner */}
      <div className="driver-banner-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.4rem' }}>🚑</span>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
              UNIT AX-01 • EMERGENCY RESPONSE DRIVER HUD
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Mission: <strong style={{ color: '#ffffff' }}>{emergency?.emergency_id || 'E-001'}</strong> • Assigned Priority Corridor
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>
            <span className="pulse-dot red" />
            {emergency?.status || 'ACTIVE CRITICAL'}
          </span>
          <span className={`badge ${isLiveGPS ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.72rem' }}>
            <span className={`pulse-dot ${isLiveGPS ? 'green' : 'blue'}`} />
            {isLiveGPS ? 'LIVE GPS (ESP32)' : 'SIMULATED DATA'}
          </span>
        </div>
      </div>

      {/* 2. Destination Input Bar */}
      <div className="driver-destination-bar" id="driver-destination-section">
        <form
          onSubmit={handleSetDestination}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div className="driver-destination-group">
            <span className="driver-destination-label">
              <span>🏥</span>
              <span>DESTINATION:</span>
            </span>

            {/* Quick-select known receiving facility */}
            <select
              className="driver-destination-select"
              value={selectedDestId}
              onChange={(e) => {
                setSelectedDestId(e.target.value);
                setCustomDestinationInput('');
              }}
              id="select-destination-hospital"
              title="Select emergency destination facility"
            >
              {destinationOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>

            {/* Or custom location text */}
            <input
              type="text"
              placeholder="Or enter location / node (e.g. J4, J5)"
              value={customDestinationInput}
              onChange={(e) => setCustomDestinationInput(e.target.value)}
              className="driver-destination-select"
              style={{ maxWidth: '240px' }}
              id="input-custom-destination"
              title="Enter custom destination or junction ID"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="submit"
              className="driver-btn-set-destination"
              id="btn-set-destination"
              disabled={isCalculating}
              title="Calculate route and assert emergency corridor"
            >
              {isCalculating ? 'ROUTING...' : 'SET DESTINATION'}
            </button>
          </div>
        </form>

        {routeStatusNote && (
          <div style={{ width: '100%', fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            ℹ️ {routeStatusNote}
          </div>
        )}
      </div>

      {/* 3. Large Driver Map — Reuses CommanderMap with isDriverView={true} */}
      <div className="driver-map-wrapper">
        <CommanderMap
          selectedAmbulanceId="AX-01"
          ax01Data={driverAmbulanceData}
          route={activeRoute}
          currentPriorityJunction={current_priority_junction}
          junctionStates={junction_states}
          isLiveMode={isLiveGPS}
          isDriverView={true}
        />
      </div>

      {/* 4. Driver Mission Card */}
      <div className="driver-mission-card" id="driver-mission-card">
        <div className="driver-mission-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📋</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
              ACTIVE DRIVER MISSION SUMMARY
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
              {driverAmbulanceData.vehicle_id} • {driverAmbulanceData.emergency_id}
            </span>
          </div>
        </div>

        <div className="driver-mission-grid">
          {/* Ambulance & Emergency */}
          <div className="compact-metric-cell">
            <div className="metric-label">Assigned Vehicle</div>
            <div className="metric-val-main highlight-red">
              {driverAmbulanceData.vehicle_id}
            </div>
            <div className="metric-val-sub">
              Emergency: <strong style={{ color: '#ffffff' }}>{driverAmbulanceData.emergency_id}</strong>
            </div>
          </div>

          {/* Destination */}
          <div className="compact-metric-cell">
            <div className="metric-label">Target Facility</div>
            <div className="metric-val-main" style={{ color: '#ffffff', fontSize: '1.05rem' }}>
              🏥 {activeDestination}
            </div>
            <div className="metric-val-sub">
              Level 1 Resuscitation Bay
            </div>
          </div>

          {/* Corridor ETA */}
          <div className="compact-metric-cell">
            <div className="metric-label">Corridor ETA</div>
            <div className="metric-val-main highlight-green">
              ⏱️ {driverAmbulanceData.eta}
            </div>
            <div className="metric-val-sub">
              Signal Preemption Active
            </div>
          </div>

          {/* Current Junction */}
          <div className="compact-metric-cell">
            <div className="metric-label">Current Junction</div>
            <div className="metric-val-main highlight-green">
              {currentJunction}
            </div>
            <div className="metric-val-sub">
              Corridor Green Held
            </div>
          </div>

          {/* Next Junction */}
          <div className="compact-metric-cell">
            <div className="metric-label">Next Approach</div>
            <div className="metric-val-main highlight-blue">
              {nextJunction}
            </div>
            <div className="metric-val-sub">
              Clearance Preparing
            </div>
          </div>
        </div>
      </div>

      {/* 5. Compact Emergency Corridor Strip */}
      <div className="compact-corridor-strip" id="driver-corridor-strip">
        <div className="corridor-strip-label">
          <span style={{ color: '#10b981' }}>●</span> EMERGENCY CORRIDOR:
        </div>
        <div className="corridor-strip-nodes">
          {activeRoute.map((jId, idx) => {
            const isActive = jId === current_priority_junction;
            const jState = junction_states?.[jId] || 'NORMAL';
            const isCompleted = jState === 'COMPLETED' || (!isActive && currentJunctionIdx !== -1 && idx < currentJunctionIdx);
            const isNext = jState === 'PREPARING' || (!isActive && !isCompleted && currentJunctionIdx !== -1 && idx === currentJunctionIdx + 1);

            let nodeClass = 'normal';
            let label = 'STANDBY';
            if (isActive) {
              nodeClass = 'active';
              label = 'ACTIVE';
            } else if (isNext) {
              nodeClass = 'preparing';
              label = 'NEXT';
            } else if (isCompleted) {
              nodeClass = 'completed';
              label = 'COMPLETED';
            }

            return (
              <React.Fragment key={jId}>
                <div className={`corridor-node-pill ${nodeClass}`} id={`driver-corridor-${jId}`}>
                  <span style={{ fontWeight: 800 }}>{jId}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>{label}</span>
                </div>
                {idx < activeRoute.length - 1 && (
                  <span className="corridor-arrow-divider">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 6. Compact GPS + System Status Strip */}
      <div className="driver-status-strip" id="driver-status-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
              EMERGENCY: {driverAmbulanceData.status.includes('CRITICAL') ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
              ROUTE: ACTIVE (DIJKSTRA)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`badge ${isLiveGPS ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.7rem' }}>
              GPS: {isLiveGPS ? 'LIVE (ESP32)' : 'SIMULATED / HARDWARE PENDING'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`badge ${isLiveBackend ? 'badge-online' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
              BACKEND: {isLiveBackend ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ffffff' }}>
          <span>GPS: </span>
          <strong style={{ color: isLiveGPS ? '#10b981' : '#60a5fa' }}>{lat}° N, {lng}° E</strong>
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
          <span>SPEED: </span>
          <strong style={{ color: '#10b981' }}>{speed} KM/H</strong>
        </div>
      </div>

      {/* Subpage Route Detail View if Navigated via Sidebar */}
      {currentNav === 'driver-route' && (
        <div className="glass-card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <span className="card-title">
              <span className="card-title-icon">🧭</span>
              Corridor Waypoint Schematic Detail
            </span>
          </div>
          <RouteSchematic
            route={activeRoute}
            junctionStates={junction_states}
            currentPriorityJunction={current_priority_junction}
            vehicleId={driverAmbulanceData.vehicle_id}
            junctionsInfo={metadata?.junctions_info}
          />
        </div>
      )}

      {/* Subpage Emergency Corridor Detail View if Navigated via Sidebar */}
      {currentNav === 'emergency-corridor' && (
        <div className="glass-card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <span className="card-title">
              <span className="card-title-icon">🟢</span>
              Selective Directional Priority Corridor
            </span>
            <div className="badge badge-online">
              CORRIDOR HELD: {currentJunction}
            </div>
          </div>
          <div style={{ padding: '1rem' }}>
            <RouteSchematic
              route={activeRoute}
              junctionStates={junction_states}
              currentPriorityJunction={current_priority_junction}
              vehicleId={driverAmbulanceData.vehicle_id}
              junctionsInfo={metadata?.junctions_info}
            />
          </div>
        </div>
      )}
    </div>
  );
}
