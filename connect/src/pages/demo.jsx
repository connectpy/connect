import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import './demo.css';
import { MqttProvider, useMqttStatus } from '../hooks/MqttContext';
import WidgetRenderer from '../components/WidgetRendererDemo';

// ─────────────────────────────────────────────────────────────────────────────
// URL del WebSocket
// Para la demo usa esta constante.
// Para dashboards de usuarios pasa: <DemoDashboard wsUrl={user.ws_url} />
// ─────────────────────────────────────────────────────────────────────────────
const NODERED_WS_URL = 'wss://demonode.connectparaguay.com/ws/connect';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE PESTAÑAS Y WIDGETS
// Edita este objeto para modificar el dashboard.
// Tipos disponibles: 'gauge' | 'linechart' | 'valuecard' | 'heatmap'
// Tamaños:           'full' | 'half' | 'third'
// ─────────────────────────────────────────────────────────────────────────────
const DASHBOARD_CONFIG = {
  tabs: [
    {
      id: 'estacion',
      name: 'Estación Meteorológica',
      icon: 'activity',
      widgets: [
        {
          id: 'temp-card',
          type: 'valuecard',
          size: 'half',
          topic: 'temperatura',
          title: 'Temperatura',
          unit: '°C',
          icon: '🌡️',
          decimals: 1,
          thresholds: [
            { max: 15, color: '#3b82f6' },
            { max: 30, color: '#22c55e' },
            { max: 50, color: '#ef4444' },
          ],
        },
        {
          id: 'hum-card',
          type: 'valuecard',
          size: 'half',
          topic: 'humedad',
          title: 'Humedad',
          unit: '%',
          icon: '💧',
          decimals: 0,
          color: '#06b6d4',
        },
        {
          id: 'temp-gauge',
          type: 'gauge',
          size: 'half',
          topic: 'temperatura',
          title: 'Temperatura Actual',
          unit: '°C',
          min: -10,
          max: 50,
          thresholds: [
            { value: 15, color: '#3b82f6' },
            { value: 30, color: '#10b981' },
            { value: 50, color: '#ef4444' },
          ],
        },
        {
          id: 'hum-gauge',
          type: 'gauge',
          size: 'half',
          topic: 'humedad',
          title: 'Humedad Actual',
          unit: '%',
          min: 0,
          max: 100,
          thresholds: [
            { value: 40, color: '#ef4444' },
            { value: 70, color: '#10b981' },
            { value: 100, color: '#3b82f6' },
          ],
        },
        {
          id: 'temp-line-24h',
          type: 'linechart',
          size: 'full',
          topic: 'temperatura',
          title: 'Temperatura — Últimas 24h',
          unit: '°C',
          timeRange: '-24h',
          color: '#f59e0b',
        },
        {
          id: 'hum-line-24h',
          type: 'linechart',
          size: 'full',
          topic: 'humedad',
          title: 'Humedad — Últimas 24h',
          unit: '%',
          timeRange: '-24h',
          color: '#06b6d4',
        },
      ],
    },
    {
      id: 'historico',
      name: 'Histórico',
      icon: 'chart-line',
      widgets: [
        {
          id: 'temp-line-7d',
          type: 'linechart',
          size: 'full',
          topic: 'temperatura',
          title: 'Temperatura — 7 días',
          unit: '°C',
          timeRange: '-7d',
          color: '#f59e0b',
        },
        {
          id: 'hum-line-7d',
          type: 'linechart',
          size: 'full',
          topic: 'humedad',
          title: 'Humedad — 7 días',
          unit: '%',
          timeRange: '-7d',
          color: '#06b6d4',
        },
        {
          id: 'temp-heatmap',
          type: 'heatmap',
          size: 'full',
          topic: 'temperatura',
          title: 'Mapa de calor — Temperatura',
          unit: '°C',
          colorMin: '#1a2a1a',
          colorMax: '#10b981',
        },
        {
          id: 'hum-heatmap',
          type: 'heatmap',
          size: 'full',
          topic: 'humedad',
          title: 'Mapa de calor — Humedad',
          unit: '%',
          colorMin: '#1e3a5f',
          colorMax: '#06b6d4',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente raíz
// Props (opcionales):
//   wsUrl : string – URL del WebSocket del usuario (viene de Supabase/DB)
//                   Si se omite, usa NODERED_WS_URL de esta demo.
// ─────────────────────────────────────────────────────────────────────────────
export default function DemoDashboard({ wsUrl }) {
  const resolvedUrl = wsUrl || NODERED_WS_URL;

  return (
    <MqttProvider url={resolvedUrl}>
      <DashboardInner />
    </MqttProvider>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────────
function DashboardInner() {
  const navigate = useNavigate();
  const { status, lastUpdate, sendMessage } = useMqttStatus();
  const [activeTabId, setActiveTabId] = useState(DASHBOARD_CONFIG.tabs[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Al conectar, enviar mensaje de inicialización para que Node-RED
  // sepa que hay un cliente activo. No pedimos histórico; esperamos
  // que los datos lleguen con las actualizaciones normales del sensor.
  useEffect(() => {
    if (status === 'connected') {
      console.log('📡 Conexión establecida. Solicitando estado actual de sensores...');
      sendMessage({
        action: 'get_current_status',
        client: 'dashboard_web',
      });
    }
  }, [status, sendMessage]);

  const activeTab = DASHBOARD_CONFIG.tabs.find((t) => t.id === activeTabId);

  const WS_STATUS = {
    connected:    { color: '#22c55e', label: 'Conectado',     glow: '#22c55e' },
    connecting:   { color: '#f59e0b', label: 'Conectando…',   glow: '#f59e0b' },
    error:        { color: '#ef4444', label: 'Error',          glow: '#ef4444' },
    disconnected: { color: '#475569', label: 'Desconectado',   glow: 'transparent' },
  };
  const { color: dotColor, label: dotLabel, glow: dotGlow } = WS_STATUS[status] || WS_STATUS.disconnected;

  return (
    <div className="dashboard-page">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-container">
          <div className="header-content">
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
            </div>

            <div className="header-actions">
              {/* Estado WebSocket */}
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
            {DASHBOARD_CONFIG.tabs.map((tab) => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTabId(tab.id); setSidebarOpen(false); }}
              >
                {getIcon(tab.icon)}
                <span className="tab-name">{tab.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="dashboard-content">
          <div className="content-header">
            <h1>{activeTab?.name}</h1>
            <p className="last-update">
              Última actualización:{' '}
              {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY') : '—'}
            </p>
          </div>

          <div className="widgets-grid">
            {activeTab?.widgets.map((widgetConfig) => (
              <WidgetRenderer key={widgetConfig.id} config={widgetConfig} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Iconos ────────────────────────────────────────────────────────────────────
function getIcon(name) {
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
  };
  return icons[name] || null;
}