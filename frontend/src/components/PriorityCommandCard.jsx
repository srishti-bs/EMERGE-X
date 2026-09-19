import React from 'react';

/**
 * PriorityCommandCard Component
 * Displays target junction, vehicle, state, and green corridor window cleanly.
 * Strict RED/GREEN/BLUE/WHITE palette.
 */
export default function PriorityCommandCard({ command, isSimulated = true }) {
  const {
    junction_id = 'J2',
    vehicle_id = 'AX-01',
    state = 'ACTIVE PRIORITY',
    green_corridor_sec = 30,
    max_hold_sec = 45,
  } = command || {};

  return (
    <div className="glass-card" id="priority-command-card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">⚡</span>
          Priority Actuation
        </span>
        <div className="badge badge-online">
          <span className="pulse-dot green" />
          ACTIVE PRIORITY ENGAGED
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div className="metric-label">Target Junction</div>
          <div className="hero-value-huge highlight-green" style={{ fontSize: '2rem', marginTop: '6px' }}>
            {junction_id}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div className="metric-label">Emergency Unit</div>
          <div className="hero-value-huge highlight-blue" style={{ fontSize: '2rem', marginTop: '6px' }}>
            {vehicle_id}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div className="metric-label">Corridor State</div>
          <div className="hero-value-huge highlight-green" style={{ fontSize: '1.6rem', marginTop: '6px' }}>
            {state}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div className="metric-label">Green Window</div>
          <div className="hero-value-huge highlight-green" style={{ fontSize: '2rem', marginTop: '6px' }}>
            {green_corridor_sec} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>sec</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div className="metric-label">Maximum Hold Window</div>
          <div className="hero-value-huge highlight-blue" style={{ fontSize: '2rem', marginTop: '6px' }}>
            {max_hold_sec} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>sec</span>
          </div>
        </div>
      </div>

      {isSimulated && (
        <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-blue)', textAlign: 'right', letterSpacing: '0.04em' }}>
          DEMO MODE • SIMULATED CORRIDOR WINDOW
        </div>
      )}
    </div>
  );
}
