import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

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
            .from('empresas')
            .select('dashboard_config')
            .eq('id', perfil.empresa_id)
            .maybeSingle();

            if (empresaError) throw empresaError;

            if (empresa?.dashboard_config) {
                setConfig(empresa.dashboard_config);
                if (empresa.dashboard_config.tabs?.length > 0) {
                    setActiveTabId(empresa.dashboard_config.tabs[0].id);
                }
            }

        } catch (error) {
console.error('Error al cargar datos:', error.message);
         } finally {
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
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Connect Paraguay</span>
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

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="dashboard-welcome">
            <h1>Dashboard en Tiempo Real</h1>
            <p>Última actualización: {new Date().toLocaleTimeString('es-PY')}</p>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <h3>Producción Total</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <div className="metric-value">{dashboardData.production.toLocaleString()}</div>
              <div className="metric-label">unidades producidas hoy</div>
              <div className="metric-trend positive">+5.2% vs ayer</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Eficiencia</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="metric-value">{dashboardData.efficiency.toFixed(1)}%</div>
              <div className="metric-label">eficiencia operativa</div>
              <div className="metric-trend positive">+2.1% vs promedio</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Alertas Activas</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="metric-value">{dashboardData.alerts}</div>
              <div className="metric-label">requieren atención</div>
              <div className="metric-trend neutral">Sin cambios</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <h3>Dispositivos Activos</h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div className="metric-value">{dashboardData.activeDevices}</div>
              <div className="metric-label">en línea ahora</div>
              <div className="metric-trend positive">100% operativo</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Producción por Hora</h3>
              <div className="chart-placeholder">
                <p>Gráfico de líneas - Producción en tiempo real</p>
                <p className="chart-note">Integración con InfluxDB próximamente</p>
              </div>
            </div>

            <div className="chart-card">
              <h3>Eficiencia por Línea</h3>
              <div className="chart-placeholder">
                <p>Gráfico de barras - Comparativa de líneas</p>
                <p className="chart-note">Integración con InfluxDB próximamente</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-section">
            <h3>Actividad Reciente</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon success">✓</div>
                <div className="activity-content">
                  <p className="activity-title">Producción completada</p>
                  <p className="activity-time">Hace 5 minutos</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon warning">⚠</div>
                <div className="activity-content">
                  <p className="activity-title">Alerta: Temperatura alta en Línea 3</p>
                  <p className="activity-time">Hace 12 minutos</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon info">ℹ</div>
                <div className="activity-content">
                  <p className="activity-title">Mantenimiento programado completado</p>
                  <p className="activity-time">Hace 1 hora</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;