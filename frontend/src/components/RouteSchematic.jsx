import React from 'react';

/**
 * RouteSchematic Component
 * Visual centerpiece showing J1 -> J2 -> J3 -> J4 moving green corridor progression.
 * Adheres strictly to the RED / GREEN / BLUE / WHITE palette (zero yellow).
 */
export default function RouteSchematic({
  route = ['J1', 'J2', 'J3', 'J4'],
  junctionStates = {},
  currentPriorityJunction = 'J2',
  vehicleId = 'AX-01',
  junctionsInfo = {},
}) {
  const activeIdx = route.indexOf(currentPriorityJunction);
  const progressPercent = activeIdx >= 0 ? (activeIdx / (route.length - 1)) * 100 : 33;

  const getNodeStateClass = (state, isTarget) => {
    if (isTarget) return 'node-active';
    switch (state) {
      case 'COMPLETED':
        return 'node-completed';
      case 'ACTIVE_PRIORITY':
        return 'node-active';
      case 'PREPARING':
        return 'node-preparing';
      default:
        return 'node-normal';
    }
  };

  const getStatePillClass = (state) => {
    switch (state) {
      case 'COMPLETED':
        return 'completed';
      case 'ACTIVE_PRIORITY':
        return 'active';
      case 'PREPARING':
        return 'preparing';
      default:
        return 'normal';
    }
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'COMPLETED':
        return '✓';
      case 'ACTIVE_PRIORITY':
        return '🟢';
      case 'PREPARING':
        return '🔵';
      default:
        return '⚪';
    }
  };

  return (
    <div className="glass-card" id="route-schematic-card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="card-title">
            <span className="card-title-icon">🛣️</span>
            Moving Emergency Corridor
          </span>
          <span className="badge badge-live" style={{ fontSize: '0.72rem' }}>
            SELECTIVE PRIORITY ACTIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Active Corridor Node: <strong style={{ color: '#10b981', fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>{currentPriorityJunction}</strong>
          </span>
        </div>
      </div>

      <div className="schematic-corridor">
        <div className="corridor-track">
          {/* Background track line */}
          <div className="corridor-line" />
          {/* Active progress corridor fill */}
          <div
            className="corridor-line-progress"
            style={{ width: `calc(${progressPercent}% * 0.85)` }}
          />

          {route.map((jId, idx) => {
            const state = junctionStates[jId] || (idx === 0 ? 'COMPLETED' : idx === 1 ? 'ACTIVE_PRIORITY' : idx === 2 ? 'PREPARING' : 'NORMAL');
            const isActive = jId === currentPriorityJunction;

            return (
              <div key={jId} className="corridor-node-wrapper">
                {/* Node Circle */}
                <div className={`corridor-node ${getNodeStateClass(state, isActive)}`}>
                  {isActive ? '🚑' : jId}
                </div>

                {/* Junction ID */}
                <div className="node-label" style={{ color: isActive ? '#10b981' : '#ffffff' }}>
                  {jId}
                </div>

                {/* State Badge */}
                <div className={`node-state-pill ${getStatePillClass(state)}`}>
                  {getStatusIcon(state)} {state.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scannable Status Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span><strong style={{ color: '#10b981' }}>J1:</strong> COMPLETED</span>
          <span><strong style={{ color: '#10b981' }}>J2:</strong> ACTIVE PRIORITY</span>
          <span><strong style={{ color: '#3b82f6' }}>J3:</strong> PREPARING</span>
          <span><strong style={{ color: '#94a3b8' }}>J4:</strong> NORMAL</span>
        </div>
        <div style={{ color: 'var(--color-blue-bright)', fontWeight: 600 }}>
          Selective Directional Priority Corridor
        </div>
      </div>
    </div>
  );
}
