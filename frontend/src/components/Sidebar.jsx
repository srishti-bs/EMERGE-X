import React from 'react';

/**
 * Sidebar Component
 * Persistent left navigation bar customized dynamically for the active operational role.
 * Adheres strictly to the RED / GREEN / BLUE / WHITE palette.
 */
export default function Sidebar({
  user,
  activeRole = 'COMMANDER',
  currentNav = 'dashboard',
  onNavChange,
  onLogout,
}) {
  // Navigation menu definitions per role
  const menuConfig = {
    COMMANDER: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'active-emergencies', label: 'Active Emergencies', icon: '🚨' },
      { id: 'ambulances', label: 'Ambulances', icon: '🚑' },
      { id: 'routes-junctions', label: 'Routes & Junctions', icon: '🛣️' },
      { id: 'priority-control', label: 'Priority Control', icon: '⚡' },
      { id: 'system-status', label: 'System Status', icon: '🖥️' },
    ],
    DRIVER: [
      { id: 'my-mission', label: 'My Mission', icon: '🚑' },
      { id: 'driver-route', label: 'Route', icon: '🧭' },
      { id: 'emergency-corridor', label: 'Emergency Corridor', icon: '🟢' },
    ],
    HOSPITAL: [
      { id: 'overview', label: 'Overview', icon: '🏥' },
      { id: 'incoming-ambulances', label: 'Incoming Ambulances', icon: '📋' },
      { id: 'emergency-details', label: 'Emergency Details', icon: '🩺' },
    ],
  };

  const navItems = menuConfig[activeRole] || menuConfig.COMMANDER;

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'COMMANDER':
        return 'badge-live';
      case 'DRIVER':
        return 'badge-online';
      case 'HOSPITAL':
        return 'badge-live';
      default:
        return 'badge-online';
    }
  };

  // Support both 'dashboard' and 'overview' for Commander dashboard
  const isItemActive = (itemId) => {
    if (activeRole === 'COMMANDER') {
      if (itemId === 'dashboard') return currentNav === 'dashboard' || currentNav === 'overview';
    }
    return currentNav === itemId;
  };

  return (
    <aside className="app-sidebar" aria-label="Main Navigation">
      {/* Brand & Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          🚑
        </div>
        <div>
          <h2 className="brand-title">EMERGE-X</h2>
          <div className="brand-subtitle">Emergency Mobility</div>
        </div>
      </div>

      {/* Current Active Role Profile */}
      <div className="sidebar-user-profile">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OPERATIONAL ROLE
          </span>
          <span className={`badge ${getRoleBadgeClass(activeRole)}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
            {activeRole}
          </span>
        </div>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-white)' }}>
          {user?.name || user?.username || 'Authorized Officer'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">NAVIGATION</div>
        <ul className="sidebar-menu-list">
          {navItems.map((item) => {
            const active = isItemActive(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar-nav-btn ${active ? 'active' : ''}`}
                  onClick={() => onNavChange(item.id)}
                  id={`nav-item-${item.id}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {active && <span className="nav-active-pip" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer with Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-mode-tag">
          <span className="pulse-dot blue" />
          <span>SYSTEM READY</span>
        </div>
        <button
          type="button"
          className="btn btn-danger sidebar-logout-btn"
          onClick={onLogout}
          id="btn-logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
