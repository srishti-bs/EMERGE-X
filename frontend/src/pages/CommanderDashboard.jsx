import React, { useState } from 'react';
import ActiveEmergencyCard from '../components/ActiveEmergencyCard.jsx';
import AmbulanceLocationCard from '../components/AmbulanceLocationCard.jsx';
import HospitalDestinationCard from '../components/HospitalDestinationCard.jsx';
import RouteSchematic from '../components/RouteSchematic.jsx';
import JunctionPriorityPanel from '../components/JunctionPriorityPanel.jsx';
import PriorityCommandCard from '../components/PriorityCommandCard.jsx';
import DemoControls from '../components/DemoControls.jsx';
import CommanderMap from '../components/CommanderMap.jsx';

/**
 * CommanderDashboard Page
 * Supports views: Dashboard (Overview), Active Emergencies, Ambulances,
 * Routes & Junctions, Priority Control, System Status.
 * Adheres strictly to the RED / GREEN / BLUE / WHITE color family.
 *
 * Visual hierarchy:
 *   1. Header / Banner
 *   2. System Status & Controls
 *   3. LARGE REAL LEAFLET + OPENSTREETMAP MAP
 *   4. Ambulance Selector (AX-01 vs AX-02)
 *   5. Emergency + Ambulance Details
 *   6. Route Information
 *   7. Moving Corridor Visualization
 *   8. Hardware Transparency
 */
export default function CommanderDashboard({
  currentNav = 'dashboard',
  demoState,
  isSimulating = false,
  isLiveMode = false,
  onDemoStart,
  onDemoStop,
  onToggleLiveData,
  onClearEmergency,
  onStepCorridor,
  isLiveBackend,
  hardwareStatus = 'OFFLINE',
  emergenciesList = [],
  vehiclesList = [],
  junctionsList = [],
  roadNetwork = null,
}) {
  const {
    emergency,
    telemetry,
    route,
    current_priority_junction,
    junction_states,
    priority_command,
    metadata,
    step_summary,
  } = demoState;

  // Selected ambulance state: 'AX-01' (Primary) vs 'AX-02' (Secondary Simulated)
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('AX-01');

  const isOverview = currentNav === 'dashboard' || currentNav === 'overview';

  // Primary Ambulance Data (AX-01) - binds to live ESP32 GPS when live, or demo fallback
  const ax01Data = {
    vehicle_id: emergency?.vehicle_id || 'AX-01',
    emergency_id: emergency?.emergency_id || 'E-001',
    status: emergency?.status || 'ACTIVE CRITICAL',
    priority_status: junction_states?.[current_priority_junction] || 'ACTIVE_PRIORITY',
    destination: emergency?.destination || 'City General Hospital',
    eta: emergency?.eta || '8 min',
    latitude: telemetry?.latitude ?? 12.9740,
    longitude: telemetry?.longitude ?? 77.5940,
    speed_kmh: telemetry?.speed_kmh ?? 50,
    current_junction: current_priority_junction || 'J2',
    next_junction: route?.[route.indexOf(current_priority_junction) + 1] || 'J3',
    route: route || ['J1', 'J2', 'J3', 'J4'],
    data_source: isLiveMode ? 'LIVE GPS (ESP32)' : 'SIMULATED DATA',
    is_simulated: !isLiveMode,
  };

  // Secondary Ambulance Data (AX-02) - purely simulated demo emergency (never presented as live hardware)
  const ax02Data = demoState?.secondary_ambulance || {
    vehicle_id: 'AX-02',
    emergency_id: 'E-002',
    status: 'ACTIVE STANDBY',
    priority_status: 'STANDBY / EN ROUTE',
    destination: 'City General Hospital (Bay 2)',
    eta: '14 min',
    latitude: 12.9720,
    longitude: 77.5980,
    speed_kmh: 40,
    current_junction: 'J1',
    next_junction: 'J5',
    route: ['J1', 'J5', 'J4'],
    data_source: 'SIMULATED / DEMO ONLY',
    is_simulated: true,
  };

  // Resolve currently inspected ambulance
  const activeAmbulance = selectedAmbulanceId === 'AX-02' ? ax02Data : ax01Data;
  const activeRoute = activeAmbulance.route || route || ['J1', 'J2', 'J3', 'J4'];
  const currentJunctionIdx = activeRoute.indexOf(current_priority_junction);

  // Resolved dynamic lists with graceful demo fallbacks (includes AX-02 in demo mode)
  const displayEmergencies = isLiveBackend && emergenciesList && emergenciesList.length > 0
    ? emergenciesList
    : [
        ax01Data,
        {
          emergency_id: ax02Data.emergency_id,
          vehicle_id: ax02Data.vehicle_id,
          status: ax02Data.status,
          destination_hospital: ax02Data.destination,
          eta: ax02Data.eta,
          data_source: 'SIMULATED / DEMO ONLY',
        },
      ];

  const displayVehicles = isLiveBackend && vehiclesList && vehiclesList.length > 0
    ? vehiclesList
    : [
        {
          vehicle_id: ax01Data.vehicle_id,
          emergency_status: ax01Data.status,
          speed: ax01Data.speed_kmh,
          current_latitude: ax01Data.latitude,
          current_longitude: ax01Data.longitude,
          status: 'ACTIVE',
        },
        {
          vehicle_id: ax02Data.vehicle_id,
          emergency_status: ax02Data.status,
          speed: ax02Data.speed_kmh,
          current_latitude: ax02Data.latitude,
          current_longitude: ax02Data.longitude,
          status: 'STANDBY',
        },
      ];

  const displayJunctions = isLiveBackend && junctionsList && junctionsList.length > 0
    ? junctionsList
    : route.map((id) => ({
        junction_id: id,
        name: metadata?.junctions_info?.[id]?.name || `Junction ${id}`,
        latitude: 12.974 + (id.charCodeAt(1) - 49) * 0.005,
        longitude: 77.594 + (id.charCodeAt(1) - 49) * 0.005,
        status: 'ACTIVE',
      }));

  return (
    <div className="dashboard-content" id="commander-dashboard">
      {/* 1. Mode Status Banner (Strict Blue / Green, concise) */}
      <div className={`demo-banner ${isLiveMode ? 'live-banner' : ''}`}>
        <div className="demo-banner-content">
          <span style={{ fontSize: '1.15rem' }}>{isLiveMode ? '🛰️' : 'ℹ️'}</span>
          <span>
            {isLiveMode ? (
              <strong style={{ color: '#10b981' }}>
                LIVE GPS TELEMETRY ACTIVE: Primary Unit AX-01 streaming real-time ESP32 coordinates.
              </strong>
            ) : (
              <strong style={{ color: '#60a5fa' }}>
                DEMO MODE: Multi-ambulance corridor progression simulation.
              </strong>
            )}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: isLiveMode ? '#10b981' : '#60a5fa', fontWeight: 700 }}>
          {isLiveBackend ? (isLiveMode ? 'HARDWARE CONNECTED' : 'BACKEND ONLINE') : 'BACKEND OFFLINE • DEMO MODE'}
        </div>
      </div>

      {/* 2. Demo Controls Bar: DEMO START, DEMO STOP, LIVE DATA */}
      <DemoControls
        isSimulating={isSimulating}
        isLiveMode={isLiveMode}
        onDemoStart={onDemoStart}
        onDemoStop={onDemoStop}
        onToggleLiveData={onToggleLiveData}
        statusMessage={isLiveMode ? 'Live GPS Stream Active — Hardware Integrated' : step_summary}
      />

      {/* VIEW 1: DASHBOARD / OVERVIEW (Streamlined, Map-Centric Command Center) */}
      {isOverview && (
        <div className="dashboard-grid">
          {/* 3. VISUALLY DOMINANT LEAFLET + OPENSTREETMAP MAP */}
          <CommanderMap
            selectedAmbulanceId={selectedAmbulanceId}
            onSelectAmbulance={setSelectedAmbulanceId}
            ax01Data={ax01Data}
            ax02Data={ax02Data}
            route={route}
            currentPriorityJunction={current_priority_junction}
            junctionStates={junction_states}
            isLiveMode={isLiveMode}
          />

          {/* 4. COMPACT HORIZONTAL CORRIDOR STRIP: J1 COMPLETED → J2 ACTIVE → J3 NEXT → J4 */}
          <div className="compact-corridor-strip" id="corridor-progression-strip">
            <div className="corridor-strip-label">
              <span style={{ color: '#10b981' }}>●</span> CORRIDOR STATUS:
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
                    <div className={`corridor-node-pill ${nodeClass}`} id={`corridor-pill-${jId}`}>
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
            {onStepCorridor && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onStepCorridor()}
                id="btn-quick-step-corridor"
                style={{ padding: '4px 12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                title="Advance moving green corridor step"
              >
                ADVANCE ▶
              </button>
            )}
          </div>

          {/* 5. CONSOLIDATED COMPACT ACTIVE EMERGENCY CARD WITH INLINE SELECTOR */}
          <div className="compact-emergency-card" id="compact-active-emergency-card">
            <div className="compact-emergency-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🚨</span>
                  <span>ACTIVE EMERGENCY MISSION • {activeAmbulance.emergency_id}</span>
                </span>
                <span
                  className={`badge ${
                    activeAmbulance.status.includes('CRITICAL') || activeAmbulance.status === 'ACTIVE'
                      ? 'badge-critical'
                      : 'badge-live'
                  }`}
                  style={{ fontSize: '0.68rem' }}
                >
                  <span className={`pulse-dot ${activeAmbulance.status.includes('CRITICAL') ? 'red' : 'blue'}`} />
                  {activeAmbulance.status}
                </span>
              </div>

              {/* Compact Inline Ambulance Selector (AX-01 vs AX-02) */}
              <div className="compact-ambulance-selector-inline">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginRight: '2px' }}>
                  UNIT:
                </span>
                <button
                  type="button"
                  className={`compact-selector-chip primary ${selectedAmbulanceId === 'AX-01' ? 'active' : ''}`}
                  onClick={() => setSelectedAmbulanceId('AX-01')}
                  id="select-unit-ax01"
                  title="Inspect primary emergency unit AX-01"
                >
                  <span>🚑</span>
                  <span>AX-01</span>
                  <span className={`badge ${isLiveMode ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.58rem', padding: '0 4px' }}>
                    {isLiveMode ? 'LIVE' : 'SIM'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`compact-selector-chip secondary ${selectedAmbulanceId === 'AX-02' ? 'active' : ''}`}
                  onClick={() => setSelectedAmbulanceId('AX-02')}
                  id="select-unit-ax02"
                  title="Inspect secondary simulated unit AX-02"
                >
                  <span>🚑</span>
                  <span>AX-02</span>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.58rem', padding: '0 4px' }}>
                    SIM
                  </span>
                </button>

                {selectedAmbulanceId === 'AX-01' && onClearEmergency && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClearEmergency}
                    id="btn-clear-emergency-compact"
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                      color: '#ef4444',
                      marginLeft: '6px',
                    }}
                    title="Clear active emergency status"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            </div>

            {/* Compact Metric Grid — All 9 Required Fields */}
            <div className="compact-emergency-grid">
              {/* Field 1 & 2 & 3: Vehicle ID, Emergency ID, Status */}
              <div className="compact-metric-cell">
                <div className="metric-label">Vehicle & Emergency</div>
                <div className="metric-val-main" style={{ color: selectedAmbulanceId === 'AX-01' ? '#ef4444' : '#60a5fa' }}>
                  {activeAmbulance.vehicle_id} <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>• {activeAmbulance.emergency_id}</span>
                </div>
                <div className="metric-val-sub">
                  Status: <strong style={{ color: activeAmbulance.status.includes('CRITICAL') ? '#ef4444' : '#10b981' }}>{activeAmbulance.status}</strong>
                </div>
              </div>

              {/* Field 5 & 6: Current Junction & Next Junction */}
              <div className="compact-metric-cell">
                <div className="metric-label">Corridor Junctions</div>
                <div className="metric-val-main">
                  <span style={{ color: '#10b981' }}>{activeAmbulance.current_junction}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontSize: '0.85rem' }}>➔</span>
                  <span style={{ color: '#60a5fa' }}>{activeAmbulance.next_junction}</span>
                </div>
                <div className="metric-val-sub">
                  Priority: <strong style={{ color: '#10b981' }}>{activeAmbulance.priority_status}</strong>
                </div>
              </div>

              {/* Field 4: ETA */}
              <div className="compact-metric-cell">
                <div className="metric-label">Estimated Arrival (ETA)</div>
                <div className="metric-val-main" style={{ color: '#10b981' }}>
                  ⏱️ {activeAmbulance.eta}
                </div>
                <div className="metric-val-sub">
                  Clearance Window Active
                </div>
              </div>

              {/* Field 7: Destination */}
              <div className="compact-metric-cell">
                <div className="metric-label">Destination Hospital</div>
                <div className="metric-val-main" style={{ color: '#ffffff', fontSize: '1rem' }}>
                  🏥 {activeAmbulance.destination}
                </div>
                <div className="metric-val-sub">
                  Level 1 Trauma Receiving Bay
                </div>
              </div>

              {/* Field 8 & 9: GPS Coordinates & Speed */}
              <div className="compact-metric-cell">
                <div className="metric-label">GPS & Speed Telemetry</div>
                <div className="metric-val-main" style={{ color: '#ffffff', fontSize: '1rem' }}>
                  <span style={{ color: '#10b981' }}>{activeAmbulance.speed_kmh} km/h</span>
                </div>
                <div className="metric-val-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                  {Number(activeAmbulance.latitude).toFixed(4)}° N, {Number(activeAmbulance.longitude).toFixed(4)}° E
                </div>
              </div>
            </div>
          </div>

          {/* 6. COMPACT HARDWARE & DATA-SOURCE STATUS STRIP */}
          <div className="compact-hardware-strip" id="hardware-status-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <span style={{ color: '#60a5fa' }}>⚙️</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardware & Sensor Stream:</span>
            </div>
            <div className="compact-hardware-items">
              <div className="compact-hardware-item">
                <span className="dot" style={{ background: isLiveMode ? '#10b981' : '#3b82f6' }} />
                <span>GPS: <strong style={{ color: '#ffffff' }}>{isLiveMode ? 'ESP32 Live' : 'Simulated'}</strong></span>
              </div>
              <div className="compact-hardware-item">
                <span className="dot" style={{ background: '#ffffff' }} />
                <span>RFID: <strong style={{ color: '#ffffff' }}>Simulated Tag</strong></span>
              </div>
              <div className="compact-hardware-item">
                <span className="dot" style={{ background: '#ffffff' }} />
                <span>YOLO: <strong style={{ color: '#ffffff' }}>Synthetic Feed</strong></span>
              </div>
              <div className="compact-hardware-item">
                <span className="dot" style={{ background: hardwareStatus === 'LIVE HARDWARE' ? '#10b981' : '#ffffff' }} />
                <span>Push Button: <strong style={{ color: '#ffffff' }}>{hardwareStatus === 'LIVE HARDWARE' ? 'GPIO 4 Armed' : 'Simulated'}</strong></span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: isLiveBackend ? '#10b981' : 'var(--text-muted)' }}>
              {isLiveBackend ? 'REST API 200 OK' : 'LOCAL ENGINE'}
            </div>
          </div>
        </div>
      )}


      {/* VIEW 2: ACTIVE EMERGENCIES */}
      {currentNav === 'active-emergencies' && (
        <div className="dashboard-grid">
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🚨</span>
                Active Emergency Incidents
              </span>
              <div className="badge badge-critical">
                <span className="pulse-dot red" />
                {displayEmergencies.length} ACTIVE INCIDENT(S)
              </div>
            </div>

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Emergency ID</th>
                    <th>Ambulance</th>
                    <th>Status</th>
                    <th>Destination</th>
                    <th>ETA</th>
                    <th>Current Location</th>
                    <th>Telemetry Source</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEmergencies.map((em, idx) => (
                    <tr key={em.emergency_id || idx}>
                      <td>
                        <strong className="highlight-red" style={{ fontFamily: 'var(--font-mono)' }}>
                          {em.emergency_id}
                        </strong>
                      </td>
                      <td>
                        <span className="highlight-blue" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {em.vehicle_id}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${em.status === 'ACTIVE' || em.status === 'ACTIVE CRITICAL' ? 'badge-critical' : 'badge-online'}`} style={{ fontSize: '0.7rem' }}>
                          {em.status}
                        </span>
                      </td>
                      <td>{em.destination_hospital || em.destination}</td>
                      <td>
                        <strong className="highlight-green" style={{ fontFamily: 'var(--font-mono)' }}>
                          ⏱️ {em.eta}
                        </strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {em.latitude ? `${Number(em.latitude).toFixed(4)}° N, ${Number(em.longitude).toFixed(4)}° E` : `${Number(telemetry?.latitude).toFixed(4)}° N, ${Number(telemetry?.longitude).toFixed(4)}° E`}
                      </td>
                      <td>
                        <span className={`badge ${em.vehicle_id === 'AX-01' && isLiveMode ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.7rem' }}>
                          {em.vehicle_id === 'AX-01' && isLiveMode ? 'LIVE GPS (ESP32)' : 'SIMULATED DATA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <ActiveEmergencyCard emergency={activeAmbulance} isSimulated={activeAmbulance.is_simulated} onClear={selectedAmbulanceId === 'AX-01' ? onClearEmergency : null} />
          </div>
        </div>
      )}

      {/* VIEW 3: AMBULANCES */}
      {currentNav === 'ambulances' && (
        <div className="dashboard-grid">
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🚑</span>
                Emergency Ambulance Fleet
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                {displayVehicles.length} UNIT(S) ONLINE
              </div>
            </div>

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Status</th>
                    <th>Speed</th>
                    <th>Current GPS Coordinates</th>
                    <th>Assigned Mission</th>
                    <th>Telemetry Stream</th>
                  </tr>
                </thead>
                <tbody>
                  {displayVehicles.map((v, idx) => (
                    <tr key={v.vehicle_id || idx}>
                      <td>
                        <strong className="highlight-blue" style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                          {v.vehicle_id}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${v.emergency_status === 'ACTIVE_CRITICAL' || v.emergency_status === 'ACTIVE CRITICAL' || v.emergency_status === 'ACTIVE' ? 'badge-critical' : 'badge-online'}`} style={{ fontSize: '0.7rem' }}>
                          {v.emergency_status || v.status}
                        </span>
                      </td>
                      <td>
                        <span className="highlight-green" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {v.speed !== undefined && v.speed !== null ? `${v.speed} km/h` : `${telemetry?.speed_kmh} km/h`}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {v.current_latitude !== null && v.current_latitude !== undefined
                          ? `${Number(v.current_latitude).toFixed(4)}° N, ${Number(v.current_longitude).toFixed(4)}° E`
                          : `${Number(telemetry?.latitude).toFixed(4)}° N, ${Number(telemetry?.longitude).toFixed(4)}° E`}
                      </td>
                      <td>
                        <span className="highlight-white">
                          {v.vehicle_id === 'AX-01' ? `${ax01Data.emergency_id} ➔ ${ax01Data.destination}` : `${ax02Data.emergency_id} ➔ ${ax02Data.destination}`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${v.vehicle_id === 'AX-01' && isLiveMode ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.7rem' }}>
                          {v.vehicle_id === 'AX-01' && isLiveMode ? 'LIVE ESP32 WI-FI' : 'DEMO TELEMETRY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-overview-row">
            <AmbulanceLocationCard telemetry={activeAmbulance} isSimulated={activeAmbulance.is_simulated} />
            <HospitalDestinationCard
              hospital={metadata?.hospital}
              emergency={activeAmbulance}
              isSimulated={activeAmbulance.is_simulated}
            />
          </div>
        </div>
      )}

      {/* VIEW 4: ROUTES & JUNCTIONS */}
      {currentNav === 'routes-junctions' && (
        <div className="dashboard-grid">
          <CommanderMap
            selectedAmbulanceId={selectedAmbulanceId}
            onSelectAmbulance={setSelectedAmbulanceId}
            ax01Data={ax01Data}
            ax02Data={ax02Data}
            route={route}
            currentPriorityJunction={current_priority_junction}
            junctionStates={junction_states}
            isLiveMode={isLiveMode}
          />

          <RouteSchematic
            route={route}
            junctionStates={junction_states}
            currentPriorityJunction={current_priority_junction}
            vehicleId={emergency?.vehicle_id}
            junctionsInfo={metadata?.junctions_info}
          />

          {/* Registered Junctions Network Matrix */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🗺️</span>
                Municipal Traffic Intersections & Network Nodes
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                {displayJunctions.length} NODES MONITORED
              </div>
            </div>

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Junction ID</th>
                    <th>Intersection Name</th>
                    <th>GPS Coordinates</th>
                    <th>Corridor Status</th>
                    <th>Signal Phase Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {displayJunctions.map((j) => {
                    const st = junction_states[j.junction_id] || 'NORMAL';
                    const isPriority = j.junction_id === current_priority_junction;
                    return (
                      <tr key={j.junction_id}>
                        <td>
                          <span className="junction-id-badge" style={{ fontSize: '0.85rem' }}>{j.junction_id}</span>
                        </td>
                        <td>
                          <strong className="highlight-white">{j.name}</strong>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {Number(j.latitude).toFixed(4)}° N, {Number(j.longitude).toFixed(4)}° E
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              st === 'ACTIVE_PRIORITY'
                                ? 'badge-critical'
                                : st === 'PREPARING'
                                ? 'badge-live'
                                : st === 'COMPLETED'
                                ? 'badge-online'
                                : 'badge-neutral'
                            }`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {st.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`highlight-${isPriority ? 'green' : 'white'}`} style={{ fontWeight: isPriority ? 800 : 400 }}>
                            {isPriority ? '🟢 CORRIDOR GREEN HELD' : st === 'PREPARING' ? '🔵 PREPARING CLEARANCE' : st === 'COMPLETED' ? '✓ RECOVERED' : '⚪ MUNICIPAL CYCLE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <JunctionPriorityPanel
            junctions={route}
            junctionStates={junction_states}
            currentPriorityJunction={current_priority_junction}
            vehicleId={emergency?.vehicle_id}
          />
        </div>
      )}

      {/* VIEW 5: PRIORITY CONTROL */}
      {currentNav === 'priority-control' && (
        <div className="dashboard-grid">
          {/* Corridor Manual Progression Control Card */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }} id="priority-actuation-controller">
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">⚡</span>
                Corridor Progression & Manual Override Control
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                ACTIVE PRIORITY: {current_priority_junction}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Selective directional emergency corridor progression along planned trajectory:
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', marginTop: '6px' }}>
                  {route.map((j, i) => (
                    <span
                      key={j}
                      style={{
                        color: j === current_priority_junction ? '#10b981' : 'var(--text-muted)',
                        fontWeight: j === current_priority_junction ? 800 : 400,
                      }}
                    >
                      {j === current_priority_junction ? `[${j}]` : j}
                      {i < route.length - 1 ? ' ➔ ' : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onStepCorridor && onStepCorridor()}
                  id="btn-step-corridor"
                  title="Advance moving green corridor to next upcoming intersection"
                  style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                >
                  <span style={{ fontSize: '1rem' }}>▶</span>
                  <span>ADVANCE CORRIDOR STEP</span>
                </button>

                {route.map((jId) => (
                  <button
                    key={jId}
                    type="button"
                    className={`btn ${jId === current_priority_junction ? 'btn-live-data-active' : 'btn-secondary'}`}
                    onClick={() => onStepCorridor && onStepCorridor(jId)}
                    id={`btn-step-to-${jId}`}
                    title={`Assert priority directly to ${jId}`}
                    style={{ padding: '6px 14px', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  >
                    {jId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PriorityCommandCard command={priority_command} isSimulated={!isLiveMode} />
          <JunctionPriorityPanel
            junctions={route}
            junctionStates={junction_states}
            currentPriorityJunction={current_priority_junction}
            vehicleId={emergency?.vehicle_id}
          />
        </div>
      )}

      {/* VIEW 6: SYSTEM STATUS */}
      {currentNav === 'system-status' && (
        <div className="dashboard-grid">
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🖥️</span>
                System & Subsystem Health Matrix
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                ALL SUBSYSTEMS NOMINAL
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">FastAPI Backend</span>
                  <span className={`badge ${isLiveBackend ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.65rem' }}>
                    {isLiveBackend ? 'CONNECTED' : 'STANDALONE'}
                  </span>
                </div>
                <div className="hero-value-huge highlight-green" style={{ fontSize: '1.5rem' }}>
                  {isLiveBackend ? 'ONLINE (200 OK)' : 'STANDALONE'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Endpoint: http://localhost:8000
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">Priority Engine</span>
                  <span className="badge badge-online" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                </div>
                <div className="hero-value-huge highlight-green" style={{ fontSize: '1.5rem' }}>
                  CORRIDOR READY
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {route.length} Sequence Nodes ({current_priority_junction} Active)
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">Telemetry Pipeline</span>
                  <span className={`badge ${isLiveMode ? 'badge-online' : 'badge-live'}`} style={{ fontSize: '0.65rem' }}>
                    {isLiveMode ? 'LIVE GPS' : 'DEMO MODE'}
                  </span>
                </div>
                <div className="hero-value-huge highlight-blue" style={{ fontSize: '1.5rem' }}>
                  {isLiveMode ? 'NEO-6M ESP32' : 'DETERMINISTIC'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isLiveBackend && vehiclesList.length > 0 ? `${vehiclesList.length} Units Tracked in Database` : 'Streaming via Wi-Fi'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">Receiving Hospital</span>
                  <span className="badge badge-online" style={{ fontSize: '0.65rem' }}>READY</span>
                </div>
                <div className="hero-value-huge highlight-white" style={{ fontSize: '1.4rem' }}>
                  {metadata?.hospital?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Trauma Bay #1 Level 1 Resuscitation reserved
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">Traffic Network Grid</span>
                  <span className="badge badge-online" style={{ fontSize: '0.65rem' }}>
                    {isLiveBackend ? 'DATABASE LIVE' : 'SYNTHETIC'}
                  </span>
                </div>
                <div className="hero-value-huge highlight-blue" style={{ fontSize: '1.3rem' }}>
                  {isLiveBackend && junctionsList.length > 0 ? `${junctionsList.length} JUNCTIONS` : '4 DEMO NODES'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isLiveBackend && roadNetwork?.total_roads ? `${roadNetwork.total_roads} Directed Road Edges` : 'Dijkstra Cost Routing Active'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="metric-label">ESP32 Push Button Trigger</span>
                  <span className={`badge ${hardwareStatus === 'LIVE HARDWARE' ? 'badge-online' : hardwareStatus === 'DEMO' ? 'badge-live' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                    {hardwareStatus}
                  </span>
                </div>
                <div className={`hero-value-huge ${hardwareStatus === 'LIVE HARDWARE' ? 'highlight-green' : 'highlight-white'}`} style={{ fontSize: '1.3rem' }}>
                  {hardwareStatus === 'LIVE HARDWARE' ? 'ARMED & ACTIVE' : isLiveMode ? 'WAITING TRIGGER' : 'DEMO MODE'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Physical push button on GPIO 4 with 5s cooldown lockout
                </div>
              </div>
            </div>
          </div>

          <RouteSchematic
            route={route}
            junctionStates={junction_states}
            currentPriorityJunction={current_priority_junction}
            vehicleId={emergency?.vehicle_id}
            junctionsInfo={metadata?.junctions_info}
          />
        </div>
      )}
    </div>
  );
}
