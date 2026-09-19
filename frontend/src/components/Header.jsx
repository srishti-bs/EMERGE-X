import React from 'react';

/**
 * Header Component (Top status bar)
 * Displays EMERGE-X branding, active dashboard view title, system status,
 * and prominent mode indicator (LIVE GPS vs DEMO MODE) in strict RED/GREEN/BLUE/WHITE palette.
 */
export default function Header({
  activeRole = 'COMMANDER',
  currentNav = 'dashboard',
  isBackendLive = false,
  isLiveMode = false,
  hardwareStatus = 'OFFLINE',
  onToggleLiveMode,
  user,
}) {
  const getSectionTitle = () => {
    switch (currentNav) {
      case 'dashboard':
      case 'overview':
        return activeRole === 'HOSPITAL'
          ? 'Hospital Inbound Overview'
          : activeRole === 'DRIVER'
          ? 'Ambulance Mission HUD'
          : 'Command Center Dashboard';
      case 'active-emergencies':
        return 'Active Emergency Incidents';
      case 'ambulances':
        return 'Emergency Ambulance Fleet';
      case 'routes-junctions':
        return 'Routes & Junction Priority Matrix';
      case 'priority-control':
        return 'Junction Priority Actuation';
      case 'system-status':
        return 'System & Network Status';
      case 'my-mission':
        return 'Ambulance Mission HUD';
      case 'driver-route':
        return 'Corridor Route Navigation';
      case 'emergency-corridor':
        return 'Moving Emergency Corridor';
      case 'incoming-ambulances':
        return 'Hospital Incoming Ambulances';
      case 'emergency-details':
        return 'Emergency Dispatch Summary';
      default:
        return 'Command Center Dashboard';
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <div>
          <h1 className="brand-title" style={{ fontSize: '1.35rem' }}>
            {getSectionTitle()}
          </h1>
          <p className="brand-subtitle">EMERGE-X Emergency Mobility Coordination</p>
        </div>
      </div>

      <div className="header-center-badges">
        {/* System Online Status (GREEN) */}
        <div className="badge badge-online">
          <span className="pulse-dot green" />
          SYSTEM: ONLINE
        </div>

        {/* Backend Connectivity Status (BLUE / GREEN) */}
        <div className={`badge ${isBackendLive ? 'badge-online' : 'badge-live'}`}>
          <span className={`pulse-dot ${isBackendLive ? 'green' : 'blue'}`} />
          {isBackendLive ? 'BACKEND: CONNECTED' : 'BACKEND: STANDALONE'}
        </div>

        {/* Real Hardware Attribution Status: LIVE HARDWARE vs DEMO vs PENDING vs OFFLINE */}
        <div
          className={`badge ${
            hardwareStatus === 'LIVE HARDWARE'
              ? 'badge-online'
              : hardwareStatus === 'DEMO'
              ? 'badge-live'
              : hardwareStatus === 'PENDING'
              ? 'badge-neutral'
              : 'badge-demo'
          }`}
          title="Hardware Status: LIVE HARDWARE (ESP32 active), DEMO, PENDING, or OFFLINE"
        >
          <span
            className={`pulse-dot ${
              hardwareStatus === 'LIVE HARDWARE'
                ? 'green'
                : hardwareStatus === 'DEMO'
                ? 'blue'
                : 'white'
            }`}
          />
          HARDWARE: {hardwareStatus}
        </div>

        {/* Mode Indicator & Interactive Toggle (BLUE for DEMO, GREEN for LIVE) */}
        <button
          type="button"
          className={`badge ${isLiveMode ? 'badge-online' : 'badge-live'}`}
          onClick={onToggleLiveMode}
          id="btn-mode-toggle"
          title="Click to toggle between Live GPS Telemetry and Demo Mode"
          style={{
            cursor: 'pointer',
            padding: '6px 14px',
            border: isLiveMode ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(59, 130, 246, 0.6)',
            transition: 'all 0.2s ease',
          }}
        >
          <span className={`pulse-dot ${isLiveMode ? 'green' : 'blue'}`} />
          <span>{isLiveMode ? 'LIVE GPS (ESP32)' : 'DEMO MODE: SIMULATED DATA'}</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '4px' }}>[SWITCH]</span>
        </button>
      </div>
    </header>
  );
}
