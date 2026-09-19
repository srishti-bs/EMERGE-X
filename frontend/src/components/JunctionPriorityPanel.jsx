import React from 'react';

/**
 * JunctionPriorityPanel Component
 * Displays priority state cards for J1, J2, J3, J4.
 * Highlights selective corridor priority.
 * Adheres strictly to RED / GREEN / BLUE / WHITE palette (zero yellow).
 */
export default function JunctionPriorityPanel({
  junctions = ['J1', 'J2', 'J3', 'J4'],
  junctionStates = {},
  currentPriorityJunction = 'J2',
  vehicleId = 'AX-01',
}) {
  const getSignalStatus = (state) => {
    switch (state) {
      case 'ACTIVE_PRIORITY':
        return { red: false, blue: false, green: true, label: 'CORRIDOR GREEN' };
      case 'PREPARING':
        return { red: false, blue: true, green: false, label: 'PREPARING' };
      case 'COMPLETED':
        return { red: false, blue: false, green: false, label: 'COMPLETED' };
      default:
        return { red: true, blue: false, green: false, label: 'HOLD RED' };
    }
  };

  return (
    <div className="glass-card" id="junction-priority-panel" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">🚦</span>
          Junction Priority Status
        </span>
        <div className="badge badge-online">
          <span className="pulse-dot green" />
          ACTIVE CORRIDOR
        </div>
      </div>

      <div className="junctions-grid">
        {junctions.map((jId) => {
          const state = junctionStates[jId] || 'NORMAL';
          const isTarget = jId === currentPriorityJunction;
          const signal = getSignalStatus(state);

          return (
            <div
              key={jId}
              className={`junction-card ${state === 'ACTIVE_PRIORITY'
                  ? 'is-active-corridor'
                  : state === 'PREPARING'
                    ? 'is-preparing-corridor'
                    : ''
                }`}
            >
              <div className="junction-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="junction-id-badge">{jId}</span>
                  {isTarget && (
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      PRIORITY
                    </span>
                  )}
                </div>

                {/* Signal preview with strict Red / Blue / Green states */}
                <div className="signal-preview">
                  <span className={`signal-light ${signal.red ? 'active-red' : ''}`} title="Hold Red" />
                  <span className={`signal-light ${signal.blue ? 'active-blue' : ''}`} title="Preparing Approach" />
                  <span className={`signal-light ${signal.green ? 'active-green' : ''}`} title="Corridor Green" />
                </div>
              </div>

              <div className="metric-row">
                <span className="metric-label">Current State</span>
                <span
                  className={`metric-value ${state === 'ACTIVE_PRIORITY'
                      ? 'highlight-green'
                      : state === 'PREPARING'
                        ? 'highlight-blue'
                        : state === 'COMPLETED'
                          ? 'highlight-green'
                          : 'highlight-white'
                    }`}
                >
                  {state.replace('_', ' ')}
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Emergency Unit</span>
                <span className="metric-value highlight-white">
                  {state === 'ACTIVE_PRIORITY' || state === 'PREPARING' ? vehicleId : '—'}
                </span>
              </div>

              <div className="metric-row" style={{ borderBottom: 'none' }}>
                <span className="metric-label">Signal Action</span>
                <span
                  className={`metric-value ${signal.green ? 'highlight-green' : signal.blue ? 'highlight-blue' : signal.red ? 'highlight-red' : 'highlight-white'
                    }`}
                  style={{ fontSize: '0.82rem' }}
                >
                  {signal.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Notice */}
      <div className="selective-priority-note">
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <div>
          <strong style={{ color: 'var(--color-blue-bright)' }}>SELECTIVE DIRECTIONAL PRIORITY:</strong>
          {' '}Green priority is granted exclusively to the approaching ambulance corridor direction. Conflicting cross-traffic approaches hold red.
          <strong> Not all traffic signals become green.</strong>
        </div>
      </div>
    </div>
  );
}
