import React from 'react';

/**
 * HospitalDashboard Page
 * Supports sub-navigation: Overview, Incoming Ambulances, Emergency Details.
 * Clean, simplified interface with zero medical record or doctor name clutter.
 */
export default function HospitalDashboard({ currentNav = 'overview', demoState }) {
  const { emergency, telemetry, metadata } = demoState;
  const hospital = metadata?.hospital;

  return (
    <div className="dashboard-content" id="hospital-dashboard">
      {/* Hospital Subpage 1: OVERVIEW */}
      {currentNav === 'overview' && (
        <div className="hospital-triage-container">
          <div className="glass-card triage-radar-box">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏥</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
              {hospital?.name || 'City General Hospital'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Emergency Inbound Coordination (Simulated)
            </p>

            <div className="badge badge-critical" style={{ fontSize: '0.85rem', padding: '6px 14px', marginBottom: '1.5rem' }}>
              <span className="pulse-dot red" />
              STATUS: INCOMING
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem 2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-accent)', width: '100%', maxWidth: '420px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Time of Arrival</div>
              <div className="hero-value-huge highlight-green" style={{ fontSize: '3rem', margin: '0.25rem 0' }}>
                ⏱️ {emergency?.eta}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#93c5fd' }}>
                Ambulance: <strong>{telemetry?.vehicle_id}</strong>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">📋</span>
                Incoming Emergency Summary
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                ACTIVE INTAKE
              </div>
            </div>

            <div className="metric-row">
              <span className="metric-label">Incoming Ambulance</span>
              <span className="metric-value highlight-blue">{telemetry?.vehicle_id}</span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Emergency Mission</span>
              <span className="metric-value highlight-red">{emergency?.emergency_id}</span>
            </div>

            <div className="metric-row">
              <span className="metric-label">ETA</span>
              <span className="metric-value highlight-green">⏱️ {emergency?.eta}</span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Destination</span>
              <span className="metric-value highlight-blue">{hospital?.name}</span>
            </div>

            <div className="metric-row" style={{ borderBottom: 'none' }}>
              <span className="metric-label">Intake Status</span>
              <span className="metric-value highlight-green">INCOMING</span>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-blue)', textAlign: 'right' }}>
              * Clearly labeled: SIMULATED INTAKE DATA
            </div>
          </div>
        </div>
      )}

      {/* Hospital Subpage 2: INCOMING AMBULANCES */}
      {currentNav === 'incoming-ambulances' && (
        <div className="dashboard-grid">
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">📋</span>
                Incoming Ambulances
              </span>
              <div className="badge badge-online">
                <span className="pulse-dot green" />
                1 INBOUND AMBULANCE
              </div>
            </div>

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Incoming Ambulance</th>
                    <th>Emergency ID</th>
                    <th>ETA</th>
                    <th>Destination</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong className="highlight-blue" style={{ fontFamily: 'var(--font-mono)' }}>
                        {telemetry?.vehicle_id}
                      </strong>
                    </td>
                    <td>
                      <span className="highlight-red" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {emergency?.emergency_id}
                      </span>
                    </td>
                    <td>
                      <span className="highlight-green" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ⏱️ {emergency?.eta}
                      </span>
                    </td>
                    <td>{hospital?.name}</td>
                    <td>
                      <span className="badge badge-critical" style={{ fontSize: '0.75rem' }}>
                        INCOMING
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: '#64748b' }}>
              Table view: Showing active inbound emergency priority vehicles.
            </div>
          </div>
        </div>
      )}

      {/* Hospital Subpage 3: EMERGENCY DETAILS */}
      {currentNav === 'emergency-details' && (
        <div className="dashboard-grid">
          <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="card-title-icon">🩺</span>
                Emergency Details
              </span>
              <div className="badge badge-critical">
                <span className="pulse-dot red" />
                ACTIVE
              </div>
            </div>

            <div className="metric-row">
              <span className="metric-label">Emergency ID</span>
              <span className="metric-value highlight-red" style={{ fontSize: '1.2rem' }}>
                {emergency?.emergency_id}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Ambulance</span>
              <span className="metric-value highlight-blue" style={{ fontSize: '1.2rem' }}>
                {telemetry?.vehicle_id}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">ETA</span>
              <span className="metric-value highlight-green" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                ⏱️ {emergency?.eta}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">Destination</span>
              <span className="metric-value highlight-blue" style={{ fontSize: '1.1rem' }}>
                {hospital?.name}
              </span>
            </div>

            <div className="metric-row" style={{ borderBottom: 'none' }}>
              <span className="metric-label">Status</span>
              <span className="metric-value highlight-green" style={{ fontSize: '1.1rem' }}>
                ACTIVE
              </span>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
              SIMULATED HOSPITAL INTAKE • ZERO CLINICAL DATA RECORDED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
