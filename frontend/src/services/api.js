/**
 * EMERGE-X API Client Service Layer
 * 
 * Provides HTTP client bindings to the central FastAPI backend.
 * Features built-in automatic fallback to local Demo Mode when the backend
 * or local hardware is unavailable.
 */

import { getDemoStep } from './demoData.js';

// In production, fallback to relative URLs if VITE_BACKEND_URL is not set (enables same-origin reverse-proxy and Docker deployments)
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

export const ApiService = {
  /**
   * Check if backend service is currently reachable.
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${BACKEND_BASE_URL}/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isOnline: true, data };
      }
      return { isOnline: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { isOnline: false, error: err.message };
    }
  },

  /**
   * Retrieve active emergency priority state from backend, or fallback to demo.
   */
  async getEmergencyPriority(emergencyId = 'E-001', fallbackStepIndex = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/emergencies/${emergencyId}/priority`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          isLiveBackend: true,
          data,
        };
      }
    } catch (err) {
      // Backend unreachable or offline — graceful demo mode fallback
    }

    return {
      isLiveBackend: false,
      data: null,
      fallbackData: getDemoStep(fallbackStepIndex),
    };
  },

  /**
   * Step corridor forward on live backend if connected.
   */
  async stepCorridor(emergencyId = 'E-001', nextJunctionId = null) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const body = nextJunctionId ? { next_junction_id: nextJunctionId } : {};
      const res = await fetch(`${BACKEND_BASE_URL}/api/emergencies/${emergencyId}/step-corridor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
    } catch (err) {
      // Return unsuccessful so frontend can advance demo mode locally
    }
    return { success: false };
  },

  /**
   * Retrieve continuous live vehicle telemetry from backend.
   */
  async getVehicleTelemetry(vehicleId = 'AX-01') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/vehicles/${vehicleId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isLive: false, data: null };
  },

  /**
   * Retrieve live emergency core state and hardware connectivity from backend.
   */
  async getLiveEmergencyState(isDemo = false) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/emergency/live-state?demo=${isDemo}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isOnline: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isOnline: false, data: null };
  },

  /**
   * Trigger emergency event via API (can be invoked by ESP32 or Commander UI).
   */
  async triggerEmergency(ambulanceId = 'AX-01', triggerSource = 'PUSH_BUTTON') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/emergency/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ambulance_id: ambulanceId,
          trigger_source: triggerSource,
          timestamp: 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
    } catch (err) {
      // Network error
    }
    return { success: false };
  },

  /**
   * Clear active emergency event and corridor.
   */
  async clearEmergency(emergencyId = 'E-001', ambulanceId = 'AX-01') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/emergency/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          emergency_id: emergencyId,
          ambulance_id: ambulanceId,
          clear_source: 'MANUAL',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
    } catch (err) {
      // Network error
    }
    return { success: false };
  },

  /**
   * Retrieve all registered emergencies from backend.
   */
  async getEmergencies() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/emergencies`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isLive: false, data: [] };
  },

  /**
   * Retrieve all registered vehicles from backend.
   */
  async getVehicles() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/vehicles`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isLive: false, data: [] };
  },

  /**
   * Retrieve all traffic junctions from backend.
   */
  async getJunctions() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/junctions`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isLive: false, data: [] };
  },

  /**
   * Retrieve network topology and road segments.
   */
  async getRoadNetwork() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BACKEND_BASE_URL}/api/routing/demo-network`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch (err) {
      // Offline fallback
    }
    return { isLive: false, data: null };
  },

  /**
   * Calculate route between start and destination using Dijkstra algorithm.
   */
  async calculateRoute(startJunctionId = 'J1', destinationJunctionId = 'J4', emergencyId = 'E-001', vehicleId = 'AX-01') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${BACKEND_BASE_URL}/api/routing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          start_junction_id: startJunctionId,
          destination_junction_id: destinationJunctionId,
          emergency_id: emergencyId,
          vehicle_id: vehicleId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
    } catch (err) {
      // Network error
    }
    return { success: false, data: null };
  },
};

