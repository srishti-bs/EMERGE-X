import React from 'react';

/**
 * Ambulance Location Component
 * Displays vehicle ID, velocity, GPS coordinates, and telemetry state.
 * Strict RED/GREEN/BLUE/WHITE color scheme.
 */
export default function AmbulanceLocationCard({ telemetry, isSimulated = true }) {
  const {
    vehicle_id = 'AX-01',
    latitude = 12.9740,
    longitude = 77.5940,
    speed_kmh = 50,
    last_update = 'just now / simulated',
    data_source = isSimulated ? 'DEMO TELEMETRY' : 'LIVE GPS (ESP32)',
  } = telemetry || {};

  return (
    <div className="glass-card" id="ambulance-location-card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">📍</span>
          Ambulance Location
        </span>
        <div className={`badge ${isSimulated ? 'badge-live' : 'badge-online'}`}>
          <span className={`pulse-dot ${isSimulated ? 'blue' : 'green'}`} />
          {isSimulated ? 'DEMO TELEMETRY' : 'LIVE GPS (ESP32)'}
        </div>
      </div>

      <div className="hero-value-display">
        <div className="hero-value-huge highlight-blue">
          {speed_kmh} <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>km/h</span>
        </div>
        <div className="hero-value-sub">
          Active Unit: <strong className="highlight-white">{vehicle_id}</strong>
        </div>
      </div>

      <div className="metric-row">
        <span className="metric-label">Latitude</span>
        <span className="metric-value highlight-white">{Number(latitude).toFixed(4)}° N</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Longitude</span>
        <span className="metric-value highlight-white">{Number(longitude).toFixed(4)}° E</span>
      </div>

      <div className="metric-row" style={{ borderBottom: 'none' }}>
        <span className="metric-label">Telemetry Stream</span>
        <span className={`metric-value ${isSimulated ? 'highlight-blue' : 'highlight-green'}`}>
          {isSimulated ? 'Deterministic Simulation' : 'ESP32 Wi-Fi Stream'}
        </span>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: isSimulated ? 'var(--text-blue)' : '#10b981', textAlign: 'right', letterSpacing: '0.04em' }}>
        {isSimulated ? 'DEMO MODE • SIMULATED DATA' : '✓ Real-time NEO-6M GPS Stream'}
      </div>
    </div>
  );
}
