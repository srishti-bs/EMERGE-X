import React from 'react';

/**
 * Hospital Destination Card
 * Focuses strictly on facility name, incoming ambulance ID, emergency ID, and arrival ETA.
 * Strict RED/GREEN/BLUE/WHITE color scheme.
 */
export default function HospitalDestinationCard({ hospital, emergency, isSimulated = true }) {
  const {
    name = 'City General Hospital',
  } = hospital || {};

  const vehicleId = emergency?.vehicle_id || 'AX-01';
  const emergencyId = emergency?.emergency_id || 'E-001';
  const eta = emergency?.eta || '8 min';

  return (
    <div className="glass-card" id="hospital-destination-card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">🏥</span>
          Destination
        </span>
        <div className="badge badge-online">
          <span className="pulse-dot green" />
          INCOMING
        </div>
      </div>

      <div className="hero-value-display">
        <div className="hero-value-huge highlight-white" style={{ fontSize: '1.65rem' }}>
          {name}
        </div>
        <div className="hero-value-sub">
          Designated Receiving Facility
        </div>
      </div>

      <div className="metric-row">
        <span className="metric-label">Incoming Ambulance</span>
        <span className="metric-value highlight-blue">{vehicleId}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Emergency Mission</span>
        <span className="metric-value highlight-red">{emergencyId}</span>
      </div>

      <div className="metric-row" style={{ borderBottom: 'none' }}>
        <span className="metric-label">Estimated Arrival</span>
        <span className="metric-value highlight-green" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          ⏱️ {eta}
        </span>
      </div>

      {isSimulated && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-blue)', textAlign: 'right', letterSpacing: '0.04em' }}>
          DEMO MODE • SIMULATED DATA
        </div>
      )}
    </div>
  );
}
