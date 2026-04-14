import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import { SensorProvider, useSensorStatus } from '../hooks/SensorContext';
import WidgetRendererMulti from '../components/WidgetRendererMulti.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO_CONFIG — Caaty
//
// Pestaña "Resumen" : WeatherCard + SiloResumenCard
// Pestaña "Silo 1"  : SiloControlCard + SiloHeatmapWidget + HistoricoContainer
//
// Todos los widgets de tiempo real usan sensor_id → SensorContext (polling HTTP)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_CONFIG = {
  client_id: 'demo',
  api_base:  'https://nodered.connectparaguay.com',

  tabs: [

    // ── Pestaña 1: Resumen ─────────────────────────────────────────────────
    {
      id:   'resumen',
      name: 'Resumen',
      icon: 'activity',
      widgets: [

        {
          id:    'widget-weather',
          tipo:  'WeatherCard',
          size:  'full',
          label: 'Estación Meteorológica',
          stationName: 'Planta Bella Vista',
          // Un mismo sensor puede exponer varios fields en tiempo real
          sensor_temp:    'demo/estacion.fields.temperatura',
          sensor_humedad: 'demo/estacion.fields.humedad',
          sensor_rocio:   'demo/estacion.fields.rocio',
        },

        {
          id:        'widget-silo1-resumen',
          tipo:      'SiloResumen',
          size:      'half',
          label:     'Silo Central N° 1',
          siloName:  'SILO CENTRAL N° 1',
          // sensor_ids que alimentan la card
          sensor_nivel:   'caaty/silo1/NIVEL',
          sensor_temp:    'caaty/silo1/TEMP_MAX',
          sensor_humedad: 'caaty/silo1/HUM',
          sensor_fans:    'caaty/silo1/FANS',
          grano:          'SOJA',
          fecha:          '15/03/2026',
        },

      ],
    },

    // ── Pestaña 2: Silo 1 ──────────────────────────────────────────────────
    {
      id:   'silo1',
      name: 'Silo 1',
      icon: 'bar-chart',
      widgets: [

        {
          id:       'silo1-control',
          tipo:     'SiloControl',
          size:     'full',
          label:    'Control de Aireación — Silo 1',
          siloName: 'Silo Nro. 1',
          // sensor_ids del sistema de aireación
          sensor_nivel:      'demo/silo1/NIVEL',
          sensor_hum_grano:  'demo/silo1/HUM',
          sensor_temp_max:   'demo/silo1/TEMP_MAX',
          sensor_temp_avg:   'demo/silo1/TEMP_AVG',
          sensor_temp_min:   'demo/silo1/TEMP_MIN',
          sensor_activo:     'demo/silo1/ACTIVO',
          sensor_fans:       'demo/silo1/FANS',
          sensor_mode:       'demo/silo1/MODE',
          grano:             'SOJA',
        },

        {
          id:    'silo1-heatmap',
          tipo:  'SiloHeatmap',
          size:  'full',
          label: 'Termometría — Silo 1',
          // sensor_ids de termometría organizados por cabo y nivel
          // sensor_labels: etiquetas de filas y columnas
          cabos:   ['Cabo 1', 'Cabo 2', 'Cabo 3'],
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'],
          // matriz [cabo][nivel] = sensor_id
          sensor_matrix: [
            ['demo/T/S0/C0/T0.fields.temperatura','demo/T/S0/C0/T1.fields.temperatura','demo/T/S0/C0/T2.fields.temperatura','demo/T/S0/C0/T3.fields.temperatura','demo/T/S0/C0/T4.fields.temperatura','demo/T/S0/C0/T5.fields.temperatura','demo/T/S0/C0/T6.fields.temperatura'],
            ['demo/T/S0/C1/T0.fields.temperatura','demo/T/S0/C1/T1.fields.temperatura','demo/T/S0/C1/T2.fields.temperatura','demo/T/S0/C1/T3.fields.temperatura','demo/T/S0/C1/T4.fields.temperatura','demo/T/S0/C1/T5.fields.temperatura','demo/T/S0/C1/T6.fields.temperatura'],
            ['demo/T/S0/C2/T0.fields.temperatura','demo/T/S0/C2/T1.fields.temperatura','demo/T/S0/C2/T2.fields.temperatura','demo/T/S0/C2/T3.fields.temperatura','demo/T/S0/C2/T4.fields.temperatura','demo/T/S0/C2/T5.fields.temperatura','demo/T/S0/C2/T6.fields.temperatura'],
          ],
          sensor_hay_grano: 'caaty/silo1/HAY_GRANO',
          temp_min: 15,
          temp_max: 40,
        },

        {
          id:     'silo1-historico',
          tipo:   'historico_cabo',
          size:   'full',
          label:  'Análisis por Cabo — Silo 1',
          siloId: 'silo1',
          unit:   '°C',
          min:    15,
          max:    40,
          cabos: [
            {
              id:    'c1',
              label: 'Cabo 1',
              sensorIds: [
                'caaty/silo1/C1N1','caaty/silo1/C1N2','caaty/silo1/C1N3',
                'caaty/silo1/C1N4','caaty/silo1/C1N5','caaty/silo1/C1N6','caaty/silo1/C1N7',
              ],
              queryConfig: { field: 'value', window: '12h', fn: 'mean' },
            },
            {
              id:    'c2',
              label: 'Cabo 2',
              sensorIds: [
                'caaty/silo1/C2N1','caaty/silo1/C2N2','caaty/silo1/C2N3',
                'caaty/silo1/C2N4','caaty/silo1/C2N5','caaty/silo1/C2N6','caaty/silo1/C2N7',
              ],
              queryConfig: { field: 'value', window: '12h', fn: 'mean' },
            },
            {
              id:    'c3',
              label: 'Cabo 3',
              sensorIds: [
                'caaty/silo1/C3N1','caaty/silo1/C3N2','caaty/silo1/C3N3',
                'caaty/silo1/C3N4','caaty/silo1/C3N5','caaty/silo1/C3N6','caaty/silo1/C3N7',
              ],
              queryConfig: { field: 'value', window: '12h', fn: 'mean' },
            },
          ],
        },

      ],
    },

  ],
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

  const activeTab = config?.tabs?.find(t => t.id === activeTabId);

  const STATUS_MAP = {
    connected:  { color: '#22c55e', label: 'Conectado',   glow: '#22c55e' },
    connecting: { color: '#f59e0b', label: 'Conectando…', glow: '#f59e0b' },
    error:      { color: '#ef4444', label: 'Error',        glow: '#ef4444' },
  };
  const dot = STATUS_MAP[status] || { color: '#475569', label: 'Desconectado', glow: 'transparent' };

  return (
    <div className="dashboard-page">

      {/* Header */}
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
                  <img src={whitelogo} alt="Logo" height="70px" width="auto" />
                  <span>connect paraguay</span>
                </div>
                <div className="logo-cliente"><span>{companyName}</span></div>
              </div>
            </div>

            <div className="header-actions">
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#64748b' }}>
                <div style={{
                  width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: dot.color, boxShadow:`0 0 6px ${dot.glow}`,
                  transition: 'all 0.3s',
                }} />
                {dot.label}
                {lastUpdate && (
                  <span style={{ color:'#334155', marginLeft:4 }}>
                    · {lastUpdate.toLocaleTimeString('es-PY')}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('/')} className="btn-logout">Cerrar Sesión</button>
            </div>

          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
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

        {/* Main */}
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
    activity:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    'bar-chart': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    settings:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m-9-9h6m6 0h6"/></svg>,
  };
  return icons[name] || icons['activity'];
}
