import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import { SensorProvider, useSensorStatus } from '../hooks/SensorContext';
import WidgetRendererMulti from '../components/WidgetRendererMulti.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO_CONFIG
//
// Widgets con sensor_id → SensorContext (polling HTTP /api/estado/:clientId)
// Widgets con topic     → legacy (se migran progresivamente)
//
// historico_cabo → cabos[].sensorIds lista los sensor_id del cabo
//                  cabos[].queryConfig define { field, window, fn } para /api/consulta
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_CONFIG = {
  "client_id": "caaty",
  "api_base":  "https://nodered.connectparaguay.com",
  "tabs": [

    {
      "id": "secadero",
      "name": "Secadero",
      "icon": "activity",
      "widgets": [

        {
          "id": "widget-secadero-temps",
          "tipo": "container",
          "size": "full",
          "label": "Temperaturas en tiempo real",
          "charts": [
            { "id": "sec-t1", "tipo": "gauge", "sensor_id": "caaty/secadero/T1", "label": "T1", "min": 0, "max": 60 },
            { "id": "sec-t2", "tipo": "gauge", "sensor_id": "caaty/secadero/T2", "label": "T2", "min": 0, "max": 60 },
            { "id": "sec-t3", "tipo": "gauge", "sensor_id": "caaty/secadero/T3", "label": "T3", "min": 0, "max": 60 },
            { "id": "sec-t4", "tipo": "gauge", "sensor_id": "caaty/secadero/T4", "label": "T4", "min": 0, "max": 60 },
            { "id": "sec-t5", "tipo": "gauge", "sensor_id": "caaty/secadero/T5", "label": "T5", "min": 0, "max": 60 },
            { "id": "sec-t6", "tipo": "gauge", "sensor_id": "caaty/secadero/T6", "label": "T6", "min": 0, "max": 60 },
            { "id": "sec-t7", "tipo": "gauge", "sensor_id": "caaty/secadero/T7", "label": "T7", "min": 0, "max": 60 },
            { "id": "sec-t8", "tipo": "gauge", "sensor_id": "caaty/secadero/T8", "label": "T8", "min": 0, "max": 60 }
          ]
        },

        {
          "id": "widget-secadero-historico",
          "tipo": "historico_cabo",
          "size": "full",
          "label": "Análisis Histórico — Secadero",
          "siloId": "secadero",
          "unit": "°C",
          "min": 15,
          "max": 60,
          "cabos": [
            {
              "id": "cabo-sec-a",
              "label": "Zona A (T1–T4)",
              "sensorIds": [
                "caaty/secadero/T1",
                "caaty/secadero/T2",
                "caaty/secadero/T3",
                "caaty/secadero/T4"
              ],
              "queryConfig": { "field": "value", "window": "1h", "fn": "mean" }
            },
            {
              "id": "cabo-sec-b",
              "label": "Zona B (T5–T8)",
              "sensorIds": [
                "caaty/secadero/T5",
                "caaty/secadero/T6",
                "caaty/secadero/T7",
                "caaty/secadero/T8"
              ],
              "queryConfig": { "field": "value", "window": "1h", "fn": "mean" }
            }
          ]
        }

      ]
    }

  ]
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DemoDashboard({ clientId, apiBase }) {
  const config = {
    ...DEMO_CONFIG,
    client_id: clientId || DEMO_CONFIG.client_id,
    api_base:  apiBase  || DEMO_CONFIG.api_base,
  };

  return (
    <SensorProvider clientId={config.client_id} apiBase={config.api_base}>
      <DashboardInner config={config} companyName={config.client_id} />
    </SensorProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function DashboardInner({ config, companyName }) {
  const navigate = useNavigate();
  const { status, lastUpdate } = useSensorStatus();
  const [activeTabId, setActiveTabId] = useState(config?.tabs?.[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeTab = config?.tabs?.find(tab => tab.id === activeTabId);

  const WS_STATUS = {
    connected:  { color:'#22c55e', label:'Conectado',   glow:'#22c55e' },
    connecting: { color:'#f59e0b', label:'Conectando…', glow:'#f59e0b' },
    error:      { color:'#ef4444', label:'Error',        glow:'#ef4444' },
  };
  const dot = WS_STATUS[status] || { color:'#475569', label:'Desconectado', glow:'transparent' };

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">
        <div className="dashboard-container">
          <div className="header-content">
            <div className="header-logo">
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
                {sidebarOpen
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                }
              </button>
              <div className="logo">
                <div className="empresa-logo">
                  <img src={whitelogo} alt="Logo" height="50px" width="auto" />
                  <span>Connect Paraguay</span>
                </div>
                <div className="logo-cliente"><span>{companyName}</span></div>
              </div>
            </div>
            <div className="header-actions">
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#64748b' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, transition:'all 0.3s',
                  background:dot.color, boxShadow:`0 0 6px ${dot.glow}` }} />
                {dot.label}
              </div>
              {lastUpdate && (
                <span style={{ fontSize:11, color:'#334155' }}>
                  {lastUpdate.toLocaleTimeString('es-PY')}
                </span>
              )}
              <button onClick={() => navigate('/')} className="btn-logout">Cerrar Sesión</button>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header"><h3>Pestañas</h3></div>
          <nav className="sidebar-nav">
            {config?.tabs?.map(tab => (
              <button key={tab.id}
                className={`sidebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTabId(tab.id); setSidebarOpen(false); }}>
                {tab.icon && <span className="tab-icon">{getIcon(tab.icon)}</span>}
                <span className="tab-name">{tab.name}</span>
                <span className="tab-count">{tab.widgets?.length || 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="dashboard-content">
          <div className="content-header">
            <h1>{activeTab?.name || 'Dashboard'}</h1>
          </div>
          <div className="widgets-grid">
            {activeTab?.widgets?.map(widget => (
              <div key={widget.id}
                className={`widget-card ${widget.size === 'half' ? 'half-width' : 'full-width'}`}>
                <div className="widget-header"><h3>{widget.label}</h3></div>
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

function getIcon(name) {
  const icons = {
    activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    'bar-chart': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m-9-9h6m6 0h6"/></svg>,
  };
  return icons[name] || icons['activity'];
}