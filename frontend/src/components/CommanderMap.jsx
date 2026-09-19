import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { JUNCTION_COORDINATES, HOSPITAL_COORDINATES } from '../services/demoData.js';

/**
 * CommanderMap Component
 * Visually dominant interactive Leaflet map rendered using OpenStreetMap tiles.
 * Displays:
 *  - Primary emergency vehicle AX-01 marker (live GPS or demo fallback)
 *  - Secondary simulated vehicle AX-02 marker (demo only)
 *  - Junction nodes J1, J2, J3, J4, J5 styled by priority status
 *  - Hospital destination marker
 *  - Backend Dijkstra route polyline
 * Strict palette: RED, GREEN, BLUE, WHITE.
 */
export default function CommanderMap({
  selectedAmbulanceId = 'AX-01',
  onSelectAmbulance,
  ax01Data,
  ax02Data,
  route = ['J1', 'J2', 'J3', 'J4'],
  currentPriorityJunction = 'J2',
  junctionStates = {},
  isLiveMode = false,
  isDriverView = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Bangalore emergency corridor (~12.9755, 77.5975)
    const map = L.map(mapContainerRef.current, {
      center: [12.9755, 77.5975],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Feature group for dynamic overlays
    const layersGroup = L.featureGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    // Invalidate size to guarantee crisp tile render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and route polyline whenever props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    // Clear previous markers & polylines
    layersGroup.clearLayers();

    // 1. Render Route Polyline from existing backend route
    const routeCoords = route
      .map((jId) => JUNCTION_COORDINATES[jId])
      .filter(Boolean)
      .map((j) => [j.lat, j.lng]);

    // Extend line to hospital destination
    if (routeCoords.length > 0) {
      routeCoords.push([HOSPITAL_COORDINATES.lat, HOSPITAL_COORDINATES.lng]);

      // Draw route shadow/casing (Dark blue glow)
      L.polyline(routeCoords, {
        color: '#1e3a8a',
        weight: 8,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layersGroup);

      // Draw primary route line (Bright blue with directional glow)
      L.polyline(routeCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 6',
      }).addTo(layersGroup);
    }

    // 2. Render Secondary Ambulance AX-02 Route if AX-02 is selected (Bypass Route J1 -> J5 -> J4)
    if (!isDriverView && ax02Data && selectedAmbulanceId === 'AX-02') {
      const ax02RouteCoords = (ax02Data.route || ['J1', 'J5', 'J4'])
        .map((jId) => JUNCTION_COORDINATES[jId])
        .filter(Boolean)
        .map((j) => [j.lat, j.lng]);

      if (ax02RouteCoords.length > 0) {
        ax02RouteCoords.push([HOSPITAL_COORDINATES.lat, HOSPITAL_COORDINATES.lng]);
        L.polyline(ax02RouteCoords, {
          color: '#60a5fa',
          weight: 3,
          opacity: 0.8,
          dashArray: '4, 6',
        }).addTo(layersGroup);
      }
    }

    // 3. Render Junction Markers (J1, J2, J3, J4, J5)
    Object.entries(JUNCTION_COORDINATES).forEach(([jId, info]) => {
      const state = junctionStates[jId] || (jId === currentPriorityJunction ? 'ACTIVE_PRIORITY' : 'NORMAL');
      const isCurrentPriority = jId === currentPriorityJunction;

      // Color mapping strictly adheres to RED / GREEN / BLUE / WHITE
      let stateColor = '#ffffff'; // NORMAL = White
      let stateBadge = 'NORMAL';
      let haloClass = '';

      if (state === 'ACTIVE_PRIORITY') {
        stateColor = '#10b981'; // GREEN
        stateBadge = 'ACTIVE PRIORITY';
        haloClass = 'junction-halo-green';
      } else if (state === 'PREPARING') {
        stateColor = '#3b82f6'; // BLUE
        stateBadge = 'PREPARING';
        haloClass = 'junction-halo-blue';
      } else if (state === 'COMPLETED') {
        stateColor = '#10b981'; // GREEN
        stateBadge = 'COMPLETED';
      }

      const junctionHtml = `
        <div class="map-junction-marker ${haloClass}" style="border-color: ${stateColor};">
          <span style="color: ${stateColor}; font-weight: 800;">${jId}</span>
        </div>
      `;

      const junctionIcon = L.divIcon({
        html: junctionHtml,
        className: 'custom-leaflet-div-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([info.lat, info.lng], { icon: junctionIcon }).addTo(layersGroup);
      marker.bindPopup(`
        <div class="map-popup">
          <div class="map-popup-title">${info.name}</div>
          <div class="map-popup-row">
            <span>Corridor State:</span>
            <strong style="color: ${stateColor};">${stateBadge}</strong>
          </div>
          <div class="map-popup-row">
            <span>Coordinates:</span>
            <span>${info.lat.toFixed(4)}° N, ${info.lng.toFixed(4)}° E</span>
          </div>
          ${isCurrentPriority ? '<div class="map-popup-badge-green">● CURRENT PRIORITY HELD</div>' : ''}
        </div>
      `);
    });

    // 4. Render Hospital Destination Marker
    const hospitalHtml = `
      <div class="map-hospital-marker">
        <span>🏥</span>
      </div>
    `;
    const hospitalIcon = L.divIcon({
      html: hospitalHtml,
      className: 'custom-leaflet-div-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const hospitalMarker = L.marker([HOSPITAL_COORDINATES.lat, HOSPITAL_COORDINATES.lng], {
      icon: hospitalIcon,
    }).addTo(layersGroup);

    hospitalMarker.bindPopup(`
      <div class="map-popup">
        <div class="map-popup-title">🏥 ${HOSPITAL_COORDINATES.name}</div>
        <div class="map-popup-row"><span>Status:</span><strong style="color: #10b981;">EMERGENCY BAY READY</strong></div>
        <div class="map-popup-row"><span>Approach Junction:</span><strong style="color: #ffffff;">J4 (Hospital Blvd)</strong></div>
      </div>
    `);

    // 5. Render Primary Ambulance Marker (AX-01)
    if (ax01Data) {
      const ax01Lat = Number(ax01Data.latitude) || 12.9740;
      const ax01Lng = Number(ax01Data.longitude) || 77.5940;
      const isSelected = selectedAmbulanceId === 'AX-01';

      const ax01Html = `
        <div class="map-ambulance-marker ${isSelected ? 'marker-selected' : ''}" style="border-color: #ef4444;">
          <span class="marker-pulse-ring" style="border-color: #ef4444;"></span>
          <span class="marker-icon">🚑</span>
          <span class="marker-tag" style="background: #dc2626; color: #ffffff;">AX-01</span>
        </div>
      `;

      const ax01Icon = L.divIcon({
        html: ax01Html,
        className: 'custom-leaflet-div-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const ax01Marker = L.marker([ax01Lat, ax01Lng], { icon: ax01Icon, zIndexOffset: 1000 }).addTo(layersGroup);

      ax01Marker.on('click', () => {
        if (onSelectAmbulance) onSelectAmbulance('AX-01');
      });

      ax01Marker.bindPopup(`
        <div class="map-popup">
          <div class="map-popup-title" style="color: #ef4444;">🚑 AX-01 — PRIMARY EMERGENCY</div>
          <div class="map-popup-row"><span>Mission ID:</span><strong style="color: #ffffff;">${ax01Data.emergency_id || 'E-001'}</strong></div>
          <div class="map-popup-row"><span>Status:</span><strong style="color: #ef4444;">${ax01Data.status || 'ACTIVE CRITICAL'}</strong></div>
          <div class="map-popup-row"><span>Speed:</span><strong style="color: #10b981;">${ax01Data.speed_kmh || 50} km/h</strong></div>
          <div class="map-popup-row"><span>Telemetry:</span><span style="color: #60a5fa;">${isLiveMode ? 'LIVE GPS (ESP32)' : 'SIMULATED DATA'}</span></div>
          <div class="map-popup-row"><span>ETA to Hospital:</span><strong style="color: #10b981;">${ax01Data.eta || '8 min'}</strong></div>
        </div>
      `);
    }

    // 6. Render Secondary Simulated Ambulance Marker (AX-02)
    if (!isDriverView && ax02Data) {
      const ax02Lat = Number(ax02Data.latitude) || 12.9720;
      const ax02Lng = Number(ax02Data.longitude) || 77.5980;
      const isSelected = selectedAmbulanceId === 'AX-02';

      const ax02Html = `
        <div class="map-ambulance-marker secondary-ambulance ${isSelected ? 'marker-selected' : ''}" style="border-color: #3b82f6;">
          <span class="marker-pulse-ring" style="border-color: #3b82f6;"></span>
          <span class="marker-icon">🚑</span>
          <span class="marker-tag" style="background: #2563eb; color: #ffffff;">AX-02</span>
        </div>
      `;

      const ax02Icon = L.divIcon({
        html: ax02Html,
        className: 'custom-leaflet-div-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const ax02Marker = L.marker([ax02Lat, ax02Lng], { icon: ax02Icon, zIndexOffset: 900 }).addTo(layersGroup);

      ax02Marker.on('click', () => {
        if (onSelectAmbulance) onSelectAmbulance('AX-02');
      });

      ax02Marker.bindPopup(`
        <div class="map-popup">
          <div class="map-popup-title" style="color: #60a5fa;">🚑 AX-02 — SECONDARY SIMULATED</div>
          <div class="map-popup-row"><span>Mission ID:</span><strong style="color: #ffffff;">${ax02Data.emergency_id || 'E-002'}</strong></div>
          <div class="map-popup-row"><span>Status:</span><strong style="color: #60a5fa;">${ax02Data.status || 'ACTIVE STANDBY'}</strong></div>
          <div class="map-popup-row"><span>Speed:</span><strong style="color: #10b981;">${ax02Data.speed_kmh || 40} km/h</strong></div>
          <div class="map-popup-row"><span>Telemetry:</span><span style="color: #94a3b8;">SIMULATED / DEMO ONLY</span></div>
          <div class="map-popup-row"><span>Route:</span><span style="color: #ffffff;">J1 ➔ J5 ➔ J4</span></div>
          <div class="map-popup-row"><span>ETA to Hospital:</span><strong style="color: #10b981;">${ax02Data.eta || '14 min'}</strong></div>
        </div>
      `);
    }
  }, [selectedAmbulanceId, ax01Data, ax02Data, route, currentPriorityJunction, junctionStates, isLiveMode, isDriverView]);

  return (
    <div className="glass-card map-card-container" id="commander-map-container" style={{ gridColumn: '1 / -1', padding: '0', overflow: 'hidden' }}>
      {/* Map Header Overlay Bar */}
      <div className="map-overlay-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="card-title-icon" style={{ fontSize: '1.2rem' }}>{isDriverView ? '🧭' : '🗺️'}</span>
          <div>
            <strong style={{ color: '#ffffff', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
              {isDriverView ? 'EMERGENCY DISPATCH NAVIGATION • UNIT AX-01' : 'CITY DIGITAL TWIN • OPENSTREETMAP LIVE TRACKER'}
            </strong>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {isDriverView
                ? 'Real-time GPS navigation & priority corridor waypoint trajectory'
                : 'Real-time multi-unit GPS positioning & dynamic Dijkstra corridor visualization'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="badge badge-online" style={{ fontSize: '0.7rem' }}>
            <span className="pulse-dot green" />
            {isDriverView ? (isLiveMode ? 'LIVE GPS ACTIVE' : 'SIMULATED GPS') : 'TILE LAYER: OPENSTREETMAP'}
          </span>
          <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
            ROUTING: DIJKSTRA (BACKEND)
          </span>
        </div>
      </div>

      {/* Leaflet Interactive Map Viewport */}
      <div
        ref={mapContainerRef}
        className="commander-leaflet-map"
        style={{
          width: '100%',
          height: '480px',
          background: '#070e1b',
        }}
      />

      {/* Map Legend Footer Bar */}
      <div className="map-legend-footer">
        <div className="legend-item">
          <span className="legend-marker-dot" style={{ background: '#ef4444' }} />
          <span>{isDriverView ? 'AX-01 (Your Ambulance)' : 'AX-01 Primary (Active Emergency)'}</span>
        </div>
        {!isDriverView && (
          <div className="legend-item">
            <span className="legend-marker-dot" style={{ background: '#3b82f6' }} />
            <span>AX-02 Secondary (Simulated Unit)</span>
          </div>
        )}
        <div className="legend-item">
          <span className="legend-marker-dot" style={{ background: '#10b981' }} />
          <span>Active Priority Junction (Corridor Green)</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker-dot" style={{ background: '#3b82f6' }} />
          <span>Preparing / Next Junction</span>
        </div>
        {!isDriverView && (
          <div className="legend-item">
            <span className="legend-marker-dot" style={{ background: '#ffffff' }} />
            <span>Normal Municipal Cycle</span>
          </div>
        )}
        <div className="legend-item">
          <span style={{ fontSize: '1rem' }}>🏥</span>
          <span>Hospital Destination</span>
        </div>
      </div>
    </div>
  );
}
