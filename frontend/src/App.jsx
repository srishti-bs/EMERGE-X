import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import CommanderDashboard from './pages/CommanderDashboard.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import HospitalDashboard from './pages/HospitalDashboard.jsx';
import { getDemoStep, DEMO_SCENARIO_STEPS } from './services/demoData.js';
import { ApiService } from './services/api.js';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [currentNav, setCurrentNav] = useState('dashboard');

  // Mode state: Live Mode vs Demo Mode
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Demo simulation state
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Live backend connection & telemetry state
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [liveEmergencyState, setLiveEmergencyState] = useState(null);
  const [liveBackendPriority, setLiveBackendPriority] = useState(null);
  const [liveVehicleTelemetry, setLiveVehicleTelemetry] = useState(null);
  const [liveEmergenciesList, setLiveEmergenciesList] = useState([]);
  const [liveVehiclesList, setLiveVehiclesList] = useState([]);
  const [liveJunctionsList, setLiveJunctionsList] = useState([]);
  const [liveRoadNetwork, setLiveRoadNetwork] = useState(null);

  // Login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === 'COMMANDER') setCurrentNav('dashboard');
    else if (user.role === 'DRIVER') setCurrentNav('my-mission');
    else if (user.role === 'HOSPITAL') setCurrentNav('overview');
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setIsPlaying(false);
    setIsLiveMode(false);
    setCurrentNav('dashboard');
  };

  // Toggle between Live GPS mode and Demo mode
  const handleToggleLiveData = useCallback(() => {
    setIsLiveMode((prev) => {
      const next = !prev;
      if (next) setIsPlaying(false); // Stop demo simulation when switching to live data mode
      return next;
    });
  }, []);

  // Handlers for DEMO START and DEMO STOP
  const handleDemoStart = useCallback(() => {
    if (isLiveMode) {
      setIsLiveMode(false); // Exit live mode when demo is started
    }
    setIsPlaying(true);
  }, [isLiveMode]);

  const handleDemoStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Handler for advancing priority corridor along route
  const handleStepCorridor = useCallback(async (nextJunctionId = null) => {
    const res = await ApiService.stepCorridor('E-001', nextJunctionId);
    if (res.success && res.data) {
      setLiveBackendPriority(res.data);
    }
    const updated = await ApiService.getLiveEmergencyState(!isLiveMode);
    if (updated.isOnline && updated.data) {
      setLiveEmergencyState(updated.data);
    }
  }, [isLiveMode]);

  // Handler for clearing emergency from UI
  const handleClearEmergency = useCallback(async () => {
    await ApiService.clearEmergency('E-001', 'AX-01');
    const updated = await ApiService.getLiveEmergencyState(!isLiveMode);
    if (updated.isOnline && updated.data) {
      setLiveEmergencyState(updated.data);
    }
  }, [isLiveMode]);

  // Check backend health and poll telemetry
  useEffect(() => {
    let isMounted = true;

    const pollBackend = async () => {
      const health = await ApiService.checkHealth();
      if (!isMounted) return;

      setIsBackendLive(health.isOnline);

      if (health.isOnline) {
        // 1. Fetch live emergency core state (push button, clear state, hardware attribution)
        const liveCoreRes = await ApiService.getLiveEmergencyState(!isLiveMode);
        if (isMounted && liveCoreRes.isOnline && liveCoreRes.data) {
          setLiveEmergencyState(liveCoreRes.data);
        }

        // 2. Fetch priority corridor status
        const priorityRes = await ApiService.getEmergencyPriority('E-001', currentStep);
        if (isMounted && priorityRes.isLiveBackend && priorityRes.data) {
          setLiveBackendPriority(priorityRes.data);
        }

        // 3. Fetch live vehicle GPS telemetry from database
        const vehicleRes = await ApiService.getVehicleTelemetry('AX-01');
        if (isMounted && vehicleRes.isLive && vehicleRes.data) {
          setLiveVehicleTelemetry(vehicleRes.data);
        }

        // 4. Fetch live emergency incidents list
        const emergenciesRes = await ApiService.getEmergencies();
        if (isMounted && emergenciesRes.isLive && emergenciesRes.data) {
          setLiveEmergenciesList(emergenciesRes.data);
        }

        // 5. Fetch live vehicle fleet
        const vehiclesRes = await ApiService.getVehicles();
        if (isMounted && vehiclesRes.isLive && vehiclesRes.data) {
          setLiveVehiclesList(vehiclesRes.data);
        }

        // 6. Fetch live junctions network
        const junctionsRes = await ApiService.getJunctions();
        if (isMounted && junctionsRes.isLive && junctionsRes.data) {
          setLiveJunctionsList(junctionsRes.data);
        }

        // 7. Fetch road network topology
        const roadsRes = await ApiService.getRoadNetwork();
        if (isMounted && roadsRes.isLive && roadsRes.data) {
          setLiveRoadNetwork(roadsRes.data);
        }
      } else {
        setLiveEmergencyState(null);
        setLiveBackendPriority(null);
        setLiveVehicleTelemetry(null);
        setLiveEmergenciesList([]);
        setLiveVehiclesList([]);
        setLiveJunctionsList([]);
        setLiveRoadNetwork(null);
      }
    };

    pollBackend();
    // Poll every 2 seconds when in Live Mode, or 4 seconds in Demo Mode
    const pollInterval = isLiveMode ? 2000 : 4000;
    const interval = setInterval(pollBackend, pollInterval);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveMode, currentStep]);

  // Demo auto-play playback loop (advances step every 3.5s when DEMO START is active)
  useEffect(() => {
    if (!isPlaying || isLiveMode) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % DEMO_SCENARIO_STEPS.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPlaying, isLiveMode]);

  // Real Hardware Status (distinguishing LIVE HARDWARE, DEMO, OFFLINE, PENDING)
  const hardwareStatus = useMemo(() => {
    if (!isLiveMode) return 'DEMO';
    if (!isBackendLive) return 'OFFLINE';
    return liveEmergencyState?.hardware_status || 'PENDING';
  }, [isLiveMode, isBackendLive, liveEmergencyState]);

  // Compute unified active state: cleanly separated between Live Mode and Demo Mode
  const activeState = useMemo(() => {
    const demoFallback = getDemoStep(currentStep);

    // LIVE MODE: Real GPS telemetry from ESP32 & backend database
    if (isLiveMode) {
      const hasLiveGps = liveVehicleTelemetry && liveVehicleTelemetry.current_latitude !== null;
      const livePriority = liveBackendPriority;
      const isPushActive = liveEmergencyState?.is_active && liveEmergencyState?.trigger_source === 'PUSH_BUTTON';

      const resolvedRoute = liveEmergencyState?.is_active && liveEmergencyState?.route?.length
        ? liveEmergencyState.route
        : (livePriority?.route || demoFallback.route);

      const resolvedPriorityJunction = liveEmergencyState?.is_active && liveEmergencyState?.current_priority_junction
        ? liveEmergencyState.current_priority_junction
        : (livePriority?.current_priority_junction || demoFallback.current_priority_junction);

      const resolvedJunctionStates = liveEmergencyState?.is_active && Object.keys(liveEmergencyState?.junction_priority_states || {}).length > 0
        ? liveEmergencyState.junction_priority_states
        : (livePriority?.junction_priority_states || demoFallback.junction_states);

      return {
        ...demoFallback,
        emergency: {
          ...demoFallback.emergency,
          emergency_id: liveEmergencyState?.emergency_id || livePriority?.emergency_id || demoFallback.emergency.emergency_id,
          vehicle_id: liveEmergencyState?.ambulance_id || livePriority?.vehicle_id || demoFallback.emergency.vehicle_id,
          status: liveEmergencyState?.is_active ? 'ACTIVE' : demoFallback.emergency.status,
          condition: liveEmergencyState?.emergency_type || demoFallback.emergency.condition,
        },
        route: resolvedRoute,
        current_priority_junction: resolvedPriorityJunction,
        junction_states: resolvedJunctionStates,
        telemetry: hasLiveGps
          ? {
              ...demoFallback.telemetry,
              vehicle_id: liveVehicleTelemetry.vehicle_id || 'AX-01',
              latitude: liveVehicleTelemetry.current_latitude,
              longitude: liveVehicleTelemetry.current_longitude,
              speed_kmh: liveVehicleTelemetry.speed || 0.0,
              data_source: isPushActive
                ? 'LIVE ESP32 (PUSH BUTTON TRIGGER + GPS) • CORRIDOR ACTIVE'
                : 'LIVE GPS (ESP32) • UNINTEGRATED HARDWARE SIMULATED',
              last_update: 'real-time hardware stream',
            }
          : {
              ...demoFallback.telemetry,
              data_source: isPushActive
                ? 'LIVE ESP32 PUSH BUTTON (GPIO 4) • EMERGENCY ACTIVE'
                : isBackendLive
                ? 'WAITING FOR ESP32 TELEMETRY'
                : 'BACKEND OFFLINE',
              last_update: isBackendLive ? 'listening on /api/v1/emergency/trigger' : 'backend unreachable',
            },
        priority_command: livePriority?.junction_commands?.find(
          (c) => c.junction_id === resolvedPriorityJunction
        ) || demoFallback.priority_command,
        metadata: {
          ...demoFallback.metadata,
          hardware_status: {
            push_button: hardwareStatus,
            gps: hasLiveGps ? 'LIVE ESP32 (ACTIVE)' : 'WAITING FOR ESP32',
            rfid: 'SIMULATED / HARDWARE PENDING',
            traffic_camera_yolo: 'SIMULATED / HARDWARE PENDING',
          },
        },
      };
    }

    // DEMO MODE: Pure deterministic simulation data
    return demoFallback;
  }, [isLiveMode, currentStep, liveVehicleTelemetry, liveBackendPriority, liveEmergencyState, isBackendLive, hardwareStatus]);

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Render Main Application Shell with Persistent Sidebar
  return (
    <div className="app-shell">
      {/* Persistent Left Navigation Sidebar */}
      <Sidebar
        user={currentUser}
        activeRole={currentUser.role}
        currentNav={currentNav}
        onNavChange={setCurrentNav}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-content-pane">
        <Header
          activeRole={currentUser.role}
          currentNav={currentNav}
          isBackendLive={isBackendLive}
          isLiveMode={isLiveMode}
          hardwareStatus={hardwareStatus}
          onToggleLiveMode={handleToggleLiveData}
          user={currentUser}
        />

        <main>
          {currentUser.role === 'COMMANDER' && (
            <CommanderDashboard
              currentNav={currentNav}
              demoState={activeState}
              isSimulating={isPlaying}
              isLiveMode={isLiveMode}
              onDemoStart={handleDemoStart}
              onDemoStop={handleDemoStop}
              onToggleLiveData={handleToggleLiveData}
              onClearEmergency={handleClearEmergency}
              onStepCorridor={handleStepCorridor}
              isLiveBackend={isBackendLive}
              hardwareStatus={hardwareStatus}
              emergenciesList={liveEmergenciesList}
              vehiclesList={liveVehiclesList}
              junctionsList={liveJunctionsList}
              roadNetwork={liveRoadNetwork}
            />
          )}

          {currentUser.role === 'DRIVER' && (
            <DriverDashboard
              currentNav={currentNav}
              demoState={activeState}
              isLiveMode={isLiveMode}
              isLiveBackend={isBackendLive}
            />
          )}

          {currentUser.role === 'HOSPITAL' && (
            <HospitalDashboard
              currentNav={currentNav}
              demoState={activeState}
            />
          )}
        </main>

        <footer className="dashboard-footer">
          <div>
            <strong>EMERGE-X</strong>: AI-Powered Real-Time Emergency Mobility & Traffic Coordination System
          </div>
          <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            “Clearing the way. Saving critical minutes.”
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
            Selective Directional Emergency Corridor Priority • Live GPS Integration Phase
          </div>
        </footer>
      </div>
    </div>
  );
}
