import React, { useState } from 'react';

/**
 * LoginScreen Component
 * Clean emergency command-center authentication interface with pre-configured demo credentials.
 * Strict RED/GREEN/BLUE/WHITE palette.
 */
export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('commander');
  const [password, setPassword] = useState('emerge123');
  const [role, setRole] = useState('COMMANDER');
  const [error, setError] = useState('');

  const credentialsMap = {
    COMMANDER: { user: 'commander', pass: 'emerge123' },
    DRIVER: { user: 'driver', pass: 'emerge123' },
    HOSPITAL: { user: 'hospital', pass: 'emerge123' },
  };

  const handleRoleSelect = (newRole) => {
    setRole(newRole);
    setError('');
    const cred = credentialsMap[newRole];
    if (cred) {
      setUsername(cred.user);
      setPassword(cred.pass);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const targetCred = credentialsMap[role];
    if (
      targetCred &&
      username.trim().toLowerCase() === targetCred.user &&
      password === targetCred.pass
    ) {
      onLogin({
        username: username.trim().toLowerCase(),
        role: role,
        name: role === 'COMMANDER' ? 'Chief Dispatcher' : role === 'DRIVER' ? 'Paramedic Unit AX-01' : 'ER Intake Lead',
      });
    } else {
      setError(`Invalid credentials for ${role} role. Use demo username "${targetCred.user}" and password "${targetCred.pass}".`);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-card">
        {/* Brand Header */}
        <div className="login-brand" style={{ textAlign: 'center' }}>
          <div className="brand-icon-box" style={{ width: '56px', height: '56px', fontSize: '1.8rem', margin: '0 auto 1rem' }}>
            🚑
          </div>
          <h1 className="brand-title" style={{ fontSize: '2rem', textAlign: 'center' }}>EMERGE-X</h1>
          <p className="brand-subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            Emergency Mobility & Traffic Coordination
          </p>
          <div className="badge badge-online" style={{ margin: '0 auto 1.5rem', display: 'flex', width: 'fit-content' }}>
            <span className="pulse-dot green" />
            SYSTEM READY • SECURE ACCESS
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="login-error-banner">
            <span>🚨</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Role Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="role-select">Select Operational Role</label>
            <div className="role-selector-grid">
              <button
                type="button"
                className={`role-select-card ${role === 'COMMANDER' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('COMMANDER')}
                id="select-role-commander"
              >
                <span className="role-icon">🎛️</span>
                <span className="role-name">Commander</span>
              </button>

              <button
                type="button"
                className={`role-select-card ${role === 'DRIVER' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('DRIVER')}
                id="select-role-driver"
              >
                <span className="role-icon">🚑</span>
                <span className="role-name">Driver</span>
              </button>

              <button
                type="button"
                className={`role-select-card ${role === 'HOSPITAL' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('HOSPITAL')}
                id="select-role-hospital"
              >
                <span className="role-icon">🏥</span>
                <span className="role-name">Hospital</span>
              </button>
            </div>
          </div>

          {/* Username Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">Username</label>
            <input
              id="username-input"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. commander"
              required
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary login-btn" id="btn-login-submit">
            ENTER {role} CONTROL ROOM ➔
          </button>
        </form>

        {/* Demo Credentials Quick Guide */}
        <div className="login-credentials-guide">
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Authorized Demo Credentials:
          </div>
          <div className="credentials-chip-row">
            <span className="chip" onClick={() => handleRoleSelect('COMMANDER')}>
              Commander: <code>commander</code> / <code>emerge123</code>
            </span>
            <span className="chip" onClick={() => handleRoleSelect('DRIVER')}>
              Driver: <code>driver</code> / <code>emerge123</code>
            </span>
            <span className="chip" onClick={() => handleRoleSelect('HOSPITAL')}>
              Hospital: <code>hospital</code> / <code>emerge123</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
