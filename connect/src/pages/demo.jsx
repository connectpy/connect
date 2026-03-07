import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';                                        // mismo CSS que Dashboard
import { MqttProvider, useMqttStatus } from '../hooks/MqttContext';
import WidgetRendererMulti from '../components/WidgetRendererMulti.jsx'; // mismo renderer

// ─────────────────────────────────────────────────────────────────────────────
// Configuración fija de la demo.
// Misma estructura que el JSON almacenado en Supabase para usuarios reales:
//   { ws_url, tabs: [{ id, name, icon, widgets: [{ tipo, label, charts: [...] }] }] }
//
// Tipos de widget.tipo : 'container' | 'historico'
// Tipos de chart.tipo  : 'gauge' | 'line' | 'valuecard' | 'spatial_heatmap'
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_CONFIG = 
 {
  ws_url: 'wss://demonode.connectparaguay.com/ws/connect',
  tabs: [

     {
      id: 'general',
      name: 'General',
      icon: 'activity',
      widgets: [
        // WeatherCard — ancho completo
        {
          id: 'widget-weather',
          tipo: 'container',
          size: 'full',
          label: 'Estación Meteorológica',
          charts: [
            {
              id: 'weather-card',
              tipo: 'WeatherCard',
              topic: 'estacion',
              stationName: 'Planta Bella Vista',
            },
          ],
        },
        // Silo 1 — columna izquierda
        {
          id: 'widget-silo1-resumen',
          tipo: 'container',
          size: 'half',
          label: 'SILO CENTRAL N° 1',
          charts: [
            {
              id: 'silo1-resumen',
              tipo: 'SiloResumen',
              topic: 'silo1/resumen',
              siloName: 'SILO CENTRAL N° 1',
            },
          ],
        },
        // Silo 2 — columna derecha
        {
          id: 'widget-silo2-resumen',
          tipo: 'container',
          size: 'half',
          label: 'SILO CENTRAL N° 2',
          charts: [
            {
              id: 'silo2-resumen',
              tipo: 'SiloResumen',
              topic: 'silo2/datos',
              siloName: 'SILO CENTRAL N° 2',
            },
          ],
        },
      ],
    },

    // ── Pestaña 2: Silo 1 ────────────────────────────────────────────────────
    // Control de aireación | Heatmap de termometría | Histórico
    {
      id: 'silo1',
      name: 'Silo 1',
      icon: 'bar-chart',
      widgets: [
        // Control de aireación — ancho completo
        {
          id: 'silo1-control',
          tipo: 'container',
          label: 'Control de Aireación — Silo 1',
          charts: [
            {
              id: 'silo1-control-card',
              tipo: 'SiloControl',
              topic: 'silo1/datos',
              siloName: 'Silo Nro. 1',
            },
          ],
        },
        // Heatmap de termometría — ancho completo
        {
          id: 'silo1-heatmap',
          tipo: 'container',
          label: 'Termometría — Silo 1',
          charts: [
            {
              id: 'silo1-silo-heatmap',
              tipo: 'SiloHeatmap',
              topic: 'silo1/heatmap',
              label: 'Termometría — Silo 1',
            },
          ],
        },
        // Histórico — selectores de fecha
        {
          id: 'silo1-historico',
          tipo: 'historico',
          label: 'Historial — Silo 1',
          charts: [
            {
              id: 'silo1-hist-temp-max',
              tipo: 'line',
              label: 'Temperatura Máxima',
              topic: 'Silo1',
              bucket: 'Silo1',
              field: 'temperatura',
              unit: '°C',
              color: '#ef4444',
            },
            {
              id: 'silo1-hist-humedad',
              tipo: 'line',
              label: 'Humedad del Grano',
              topic: 'silo1/datos',
              field: 'humedad',
              unit: '%',
              color: '#06b6d4',
            },
            {
              id: 'silo1-hist-nivel',
              tipo: 'line',
              label: 'Nivel de Llenado',
              topic: 'silo1/datos',
              field: 'nivel',
              unit: '%',
              color: '#f59e0b',
            },
          ],
        },
      ],
    },

    // ── Pestaña 3: Silo 2 ────────────────────────────────────────────────────
    // Misma estructura que Silo 1
    {
      id: 'silo2',
      name: 'Silo 2',
      icon: 'bar-chart',
      widgets: [
        {
          id: 'silo2-control',
          tipo: 'container',
          label: 'Control de Aireación — Silo 2',
          charts: [
            {
              id: 'silo2-control-card',
              tipo: 'SiloControl',
              topic: 'silo2/datos',
              topicControl: 'silo2/control',
              siloName: 'Silo Nro. 2',
            },
          ],
        },
        {
          id: 'silo2-heatmap',
          tipo: 'container',
          label: 'Termometría — Silo 2',
          charts: [
            {
              id: 'silo2-spatial-heatmap',
              tipo: 'spatial_heatmap',
              topic: 'silo2/temperaturas',
              fields: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'],
              layout: [
                ['T7','T8'],
                ['T5','T6'],
                ['T1','T2','T3','T4'],
                ['T9','T10','T11','T12'],
              ],
              unit: '°C',
              min: 15,
              max: 45,
            },
          ],
        },
        {
          id: 'silo2-historico',
          tipo: 'historico',
          label: 'Historial — Silo 2',
          charts: [
            {
              id: 'silo2-hist-temp-max',
              tipo: 'line',
              label: 'Temperatura Máxima',
              topic: 'silo1',
              field: 'temperaturas',
              unit: '°C',
              color: '#ef4444',
            },
            {
              id: 'silo2-hist-humedad',
              tipo: 'line',
              label: 'Humedad del Grano',
              topic: 'silo2/datos',
              field: 'humedad',
              unit: '%',
              color: '#06b6d4',
            },
            {
              id: 'silo2-hist-nivel',
              tipo: 'line',
              label: 'Nivel de Llenado',
              topic: 'silo2/datos',
              field: 'nivel',
              unit: '%',
              color: '#f59e0b',
            },
          ],
        },
      ],
    },

  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente raíz
//
// Diferencia con Dashboard.jsx: no verifica sesión Supabase ni carga config
// desde la DB. La config es DEMO_CONFIG (fija). Todo lo demás es idéntico.
//
// Props opcionales:
//   wsUrl : string  Permite sobreescribir la URL del WS desde el padre.
// ─────────────────────────────────────────────────────────────────────────────
export default function DemoDashboard({ wsUrl }) {
  const config = wsUrl
    ? { ...DEMO_CONFIG, ws_url: wsUrl }
    : DEMO_CONFIG;

  return (
    <MqttProvider url={config.ws_url}>
      <DashboardInner config={config} companyName="Demo" />
    </MqttProvider>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────────
// Idéntico a DashboardInner en Dashboard.jsx.
// Diferencias:
//   - No recibe `user` (no hay sesión)
//   - El botón de logout navega a '/' en lugar de hacer signOut de Supabase
//   - No muestra user?.email en el header
// ─────────────────────────────────────────────────────────────────────────────
function DashboardInner({ config, companyName }) {
  const navigate = useNavigate();
  const { status, lastUpdate, sendMessage } = useMqttStatus();
  const [activeTabId, setActiveTabId] = useState(config?.tabs?.[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'connected') {
      sendMessage({
        action: 'get_current_status',
        client: 'dashboard_web',
        company: companyName,
      });
    }
  }, [status, sendMessage, companyName]);

  const activeTab = config?.tabs?.find((tab) => tab.id === activeTabId);

  const WS_STATUS = {
    connected:    { color: '#22c55e', label: 'Conectado',   glow: '#22c55e' },
    connecting:   { color: '#f59e0b', label: 'Conectando…', glow: '#f59e0b' },
    error:        { color: '#ef4444', label: 'Error',        glow: '#ef4444' },
    disconnected: { color: '#475569', label: 'Desconectado', glow: 'transparent' },
  };
  const { color: dotColor, label: dotLabel, glow: dotGlow } =
    WS_STATUS[status] || WS_STATUS.disconnected;

  return (
    <div className="dashboard-page">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-container">
          <div className="header-content">

            <div className="header-logo">
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {sidebarOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>

              <div className="logo">
                <div className="empresa-logo">
                  <img src={whitelogo} alt="Logo" height="50px" width="auto" />
                  <span>Connect Paraguay</span>
                </div>
                <div className="logo-cliente">
                  <span>{companyName}</span>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#64748b' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 6px ${dotGlow}`,
                  flexShrink: 0,
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
                {dotLabel}
              </div>
              <button onClick={() => navigate('/')} className="btn-logout">
                Cerrar Sesión
              </button>
            </div>

          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header"><h3>Pestañas</h3></div>
          <nav className="sidebar-nav">
            {config?.tabs?.map((tab) => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTabId(tab.id); setSidebarOpen(false); }}
              >
                {tab.icon && <span className="tab-icon">{getIcon(tab.icon)}</span>}
                <span className="tab-name">{tab.name}</span>
                <span className="tab-count">{tab.widgets?.length || 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="dashboard-content">
          <div className="content-header">
            <h1>{activeTab?.name || 'Dashboard'}</h1>
            <p className="last-update">
              Última actualización:{' '}
              {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY') : '—'}
            </p>
          </div>

          <div className="widgets-grid">
            {activeTab?.widgets?.map((widget) => (
              <div
                key={widget.id}
                className={`widget-card ${widget.size === 'half' ? 'half-width' : 'full-width'}`}
              >
                <div className="widget-header">
                  <h3>{widget.label}</h3>
                </div>
                <div className="widget-content">
                  <WidgetRendererMulti widget={widget} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

    </div>
  );
}

// ── Iconos — copia exacta de Dashboard.jsx ───────────────────────────────────
function getIcon(iconName) {
  const icons = {
    'chart-line': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    activity: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    'check-circle': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    'bar-chart': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" />
      </svg>
    ),
  };
  return icons[iconName] || icons['activity'];
}