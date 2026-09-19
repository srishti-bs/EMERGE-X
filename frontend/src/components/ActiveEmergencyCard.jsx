import React from 'react';

/**
 * Active Emergency Card
 * Clean command-center card showing active incident ID, vehicle, destination, and corridor ETA.
 * Strict RED/GREEN/BLUE/WHITE color scheme.
 */
export default function ActiveEmergencyCard({ emergency, isSimulated = true, onClear = null }) {
  const {
    emergency_id = 'E-001',
    vehicle_id = 'AX-01',
    status = 'ACTIVE CRITICAL',
    destination = 'City General Hospital',
    eta = '8 min',
  } = emergency || {};

  return (
    <div className="glass-card" id="active-emergency-card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">🚨</span>
          Active Emergency
        </span>
        <div className="badge badge-critical">
          <span className="pulse-dot red" />
          {status}
        </div>
      </div>

      <div className="hero-value-display">
        <div className="hero-value-huge highlight-red">
          {emergency_id}
        </div>
        <div className="hero-value-sub">
          Assigned Unit: <strong className="highlight-white">{vehicle_id}</strong>
        </div>
      </div>

      <div className="metric-row">
        <span className="metric-label">Emergency Vehicle</span>
        <span className="metric-value highlight-blue">{vehicle_id}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Destination Hospital</span>
        <span className="metric-value highlight-white">{destination}</span>
      </div>

      <div className="metric-row" style={{ borderBottom: 'none' }}>
        <span className="metric-label">Corridor Dynamic ETA</span>
        <span className="metric-value highlight-green" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          ⏱️ {eta}
        </span>
      </div>

      {onClear && (status === 'ACTIVE' || status === 'ACTIVE CRITICAL') && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onClear}
            style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center' }}
            id="btn-clear-emergency"
            title="Safely clear active emergency corridor"
          >
            ⏹ CLEAR EMERGENCY CORRIDOR
          </button>
        </div>
      )}

      {isSimulated && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-blue)', textAlign: 'right', letterSpacing: '0.04em' }}>
          DEMO MODE • SIMULATED DATA
        </div>
      )}
    </div>
  );
}
