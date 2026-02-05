import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import WidgetRenderer from '../components/WidgetRenderer.jsx';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null); // Aquí guardamos el JSON de la DB
  const [activeTabId, setActiveTabId] = useState(null); // Pestaña seleccionada
  const [dashboardData, setDashboardData] = useState({
    production: 12847,
    efficiency: 94,
    alerts: 3,
    activeDevices: 18
  });
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); 

  useEffect(() => {
    // Verificar si hay un usuario autenticado
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setUser(user);
      setLoading(false);
      try {
        // 1. Buscamos el empresa_id en tu tabla de perfiles/usuarios
        const { data: perfil, error: perfilError } = await supabase
        .from('USERS') // Nombre de tu tabla que une auth con empresa
        .select('empresa_id')
        .eq('id', user.id)
        .single();

        if (perfilError) throw perfilError;
        // 2. Si hay perfil, buscamos la configuración de la empresa
        const { data: empresa, error: empresaError } = await supabase
        .from('EMPRESAS') // Nombre de tu tabla de empresas
        .select('nombre, dashboard_config')
        .eq('id', perfil.empresa_id)
        .maybeSingle();
        if (empresaError) throw empresaError;
        if (empresa?.dashboard_config) {
          console.log('Configuración del dashboard cargada:', empresa.dashboard_config);
          setConfig(empresa.dashboard_config);
          if (empresa.dashboard_config.tabs?.length > 0) {
            setActiveTabId(empresa.dashboard_config.tabs[0].id);
          }
        }
        const { data: nombre_empresa, error: nombreError } = await supabase
        .from('EMPRESAS')
        .select('nombre')
        .eq('id', perfil.empresa_id)
        .single();
        if (nombreError) throw nombreError;
        document.title = `Dashboard - ${nombre_empresa.nombre}`;
        setCompanyName(nombre_empresa.nombre);
      } catch (error) {
      console.error('Error al cargar datos:', error.message);
      } 
      finally {
        setLoading(false); // Siempre quitamos el loading al final
      }
    };

    checkUser();


    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  

  // Simular actualización de datos en tiempo real (cada 5 segundos)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setDashboardData(prev => ({
        production: prev.production + Math.floor(Math.random() * 10),
        efficiency: Math.min(100, prev.efficiency + (Math.random() - 0.5)),
        alerts: Math.max(0, prev.alerts + Math.floor(Math.random() * 3 - 1)),
        activeDevices: prev.activeDevices
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
  };
  const activeTab = config?.tabs?.find(tab => tab.id === activeTabId);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-container">
          <div className="header-content">
            <button className="sidebar-toggle" onClick={toggleSidebar} aria-label='Toggle menu'>
              {sidebarOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
            <div className="logo">
              <div className="empresa-logo">
                <img src={whitelogo} alt="Logo" height="50px" width="auto"/>
                <span>Connect Paraguay</span>
              </div>
              <div className="logo-cliente">
                <span>{companyName}</span>
              </div>
            </div>
            <div className="header-actions">
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
        {/* Overlay para cerrar sidebar en mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Pestañas</h3>
          </div>
          <nav className="sidebar-nav">
            {config?.tabs?.map((tab) => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon && (
                  <span className="tab-icon">
                    {getIcon(tab.icon)}
                  </span>
                )}
                <span className="tab-name">{tab.name}</span>
                <span className="tab-count">{tab.widgets?.length || 0}</span>
              </button>
            ))}
          </nav>
        </aside>
        {/* Main Content */}
        <main className="dashboard-content">
          <div className="content-header">
            <h1>{activeTab?.name || 'Dashboard'}</h1>
            <p className="last-update">
              Última actualización: {new Date().toLocaleTimeString('es-PY')}
            </p>
          </div>
            <div className="widgets-grid">
              {activeTab?.widgets?.map((widget) => (
                <div key={widget.id} className="widget-card">
                  <div className="widget-header">
                    <h3>{widget.label}</h3>
                  </div>
                  <div className="widget-content">
                    <WidgetRenderer widget={widget} />
                  </div>
                </div>
              ))}
            </div>
        </main>
      </div>
    </div>
  );
}

function getIcon(iconName) {
  const icons = {
    'chart-line': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
    'check-circle': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    'activity': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    'bar-chart': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    ),
    'settings': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
      </svg>
    ),
    'default': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="9" y2="15"></line>
      </svg>
    )
  };

  return icons[iconName] || icons['default'];
}

export default Dashboard;