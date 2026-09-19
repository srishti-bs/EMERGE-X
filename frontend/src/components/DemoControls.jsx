import React from 'react';

/**
 * DemoControls Component
 * Provides exactly three controls:
 * 1. DEMO START - Starts the simulated emergency flow
 * 2. DEMO STOP - Stops the simulation
 * 3. LIVE DATA - Switches dashboard to live-data mode
 * Strict RED/GREEN/BLUE/WHITE palette.
 */
export default function DemoControls({
  isSimulating = false,
  isLiveMode = false,
  onDemoStart,
  onDemoStop,
  onToggleLiveData,
  statusMessage = '',
}) {
  return (
    <div className="demo-controls-bar" id="demo-controls-bar">
      <div className="controls-left" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* 1. DEMO START */}
        <button
          type="button"
          className={`btn ${!isLiveMode && isSimulating ? 'btn-demo-start-active' : 'btn-primary'}`}
          onClick={onDemoStart}
          id="btn-demo-start"
          title="Start simulated emergency corridor flow"
        >
          <span style={{ fontSize: '0.9rem' }}>▶</span>
          <span>DEMO START</span>
          {!isLiveMode && isSimulating && (
            <span className="pulse-dot green" style={{ marginLeft: '4px' }} />
          )}
        </button>

        {/* 2. DEMO STOP */}
        <button
          type="button"
          className={`btn ${!isLiveMode && !isSimulating ? 'btn-demo-stopped' : 'btn-danger'}`}
          onClick={onDemoStop}
          id="btn-demo-stop"
          title="Stop the simulation"
          disabled={!isSimulating && !isLiveMode}
        >
          <span style={{ fontSize: '0.9rem' }}>⏹</span>
          <span>DEMO STOP</span>
        </button>

        {/* 3. LIVE DATA */}
        <button
          type="button"
          className={`btn ${isLiveMode ? 'btn-live-data-active' : 'btn-secondary'}`}
          onClick={onToggleLiveData}
          id="btn-live-data"
          title="Switch dashboard to real-time live data"
        >
          <span style={{ fontSize: '0.9rem' }}>📡</span>
          <span>LIVE DATA</span>
          {isLiveMode && (
            <span className="pulse-dot green" style={{ marginLeft: '4px' }} />
          )}
        </button>
      </div>

      <div className="controls-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="mode-status-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          {isLiveMode ? (
            <span className="badge badge-online">
              <span className="pulse-dot green" />
              MODE: LIVE DATA STREAM (REAL GPS)
            </span>
          ) : isSimulating ? (
            <span className="badge badge-info">
              <span className="pulse-dot blue" />
              MODE: SIMULATED EMERGENCY CORRIDOR (RUNNING)
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
              MODE: SIMULATION STOPPED
            </span>
          )}
        </div>
        {statusMessage && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {statusMessage}
          </span>
        )}
      </div>
    </div>
  );
}
