import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import { MqttProvider, useMqttStatus } from '../hooks/MqttContext';
import WidgetRendererMulti from '../components/WidgetRendererMulti.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard (usuario real)
//
// Flujo:
//   1. Verifica sesión con Supabase
//   2. Carga dashboard_config de la tabla EMPRESAS
//   3. Usa config.ws_url para conectar el MqttProvider
//   4. Cada widget se suscribe a su topic via useTopic()
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      setUser(user);

      try {
        // 1. Obtener empresa_id del usuario
        const { data: perfil, error: perfilError } = await supabase
          .from('USERS')
          .select('empresa_id')
          .eq('id', user.id)
          .single();
        if (perfilError) throw perfilError;

        // 2. Obtener nombre y dashboard_config de la empresa
        const { data: empresa, error: empresaError } = await supabase
          .from('EMPRESAS')
          .select('nombre, dashboard_config')
          .eq('id', perfil.empresa_id)
          .maybeSingle();
        if (empresaError) throw empresaError;

        if (empresa?.dashboard_config) {
          setConfig(empresa.dashboard_config);
        }
        if (empresa?.nombre) {
          setCompanyName(empresa.nombre);
          document.title = `Dashboard - ${empresa.nombre}`;
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!config?.ws_url) {
    return (
      <div className="dashboard-loading">
        <p style={{ color: '#ef4444' }}>
          No se encontró configuración de WebSocket para esta empresa.
        </p>
      </div>
    );
  }

  // ws_url viene del JSON de la DB: config.ws_url
  return (
    <MqttProvider url={config.ws_url}>
      <DashboardInner
        user={user}
        config={config}
        companyName={companyName}
      />
    </MqttProvider>
  );
}

// ─── Inner (dentro del MqttProvider, puede usar useMqttStatus) ───────────────
function DashboardInner({ user, config, companyName }) {
  const navigate = useNavigate();
  const { status, lastUpdate, sendMessage } = useMqttStatus();
  const [activeTabId, setActiveTabId] = useState(config?.tabs?.[0]?.id || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Al conectar, avisar a Node-RED que hay un cliente activo
  useEffect(() => {
    if (status === 'connected') {
      sendMessage({
        action: 'get_current_status',
        client: 'dashboard_web',
        company: companyName,
      });
    }
  }, [status, sendMessage, companyName]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const activeTab = config?.tabs?.find((tab) => tab.id === activeTabId);

  const WS_STATUS = {
    connected:    { color: '#22c55e', label: 'Conectado',   glow: '#22c55e' },
    connecting:   { color: '#f59e0b', label: 'Conectando…', glow: '#f59e0b' },
    error:        { color: '#ef4444', label: 'Error',        glow: '#ef4444' },
    disconnected: { color: '#475569', label: 'Desconectado', glow: 'transparent' },
  };
  const { color: dotColor, label: dotLabel, glow: dotGlow } = WS_STATUS[status] || WS_STATUS.disconnected;

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
                  <img src={whitelogo} alt="Logo" height="70px" width="auto" />
                  <span>CONNECT PARAGUAY</span>
                </div>
                <div className="logo-cliente">
                  <span>{companyName}</span>
                </div>
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
              <div className="user-info">
                <span>{user?.email}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout">
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

// ── Iconos ────────────────────────────────────────────────────────────────────
function getIcon(iconName) {
  const icons = {
    'chart-line': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    'activity': (
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
    'settings': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" />
      </svg>
    ),
  };
  return icons[iconName] || icons['activity'];
}