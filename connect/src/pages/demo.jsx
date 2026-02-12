import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import whitelogo from '../assets/whitelogo.svg';
import './Dashboard.css';
import './demo.css'
import DemoLineChart from '../components/demoLineChart.jsx';
import DemoGauge from '../components/demoGauge.jsx';

function DemoDashboard() {
  const tabs = [
    { id: 'estacion', name: 'Estación Meteorológica', icon: 'activity' },
    { id: 'historico', name: 'Histórico', icon: 'chart-line' }
  ];
  const user = "demo";
  const [activeTabId, setActiveTabId] = useState('estacion'); // Pestaña seleccionada
  const navigate = useNavigate();
  const companyName = "Su empresa";
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 1 día atrás
    return date.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const handleLogout =  () => {
      navigate('/');
    };

  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
  };
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleDateChange = () => {
    // Calcular el rango de tiempo basado en las fechas seleccionadas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 24) {
      setTimeRange('-24h');
    } else if (diffHours <= 168) { // 7 días
      setTimeRange('-7d');
    } else if (diffHours <= 720) { // 30 días
      setTimeRange('-30d');
    } else {
      setTimeRange('-90d');
    }
  };
  
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
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {getIcon(tab.icon)}
                <span className="tab-name">{tab.name}</span>
              </button>
            ))}
          </nav>
        </aside>
        {/* Main Content */}
        {/* Main Content */}
        <main className="dashboard-content">
          <div className="content-header">
            <h1>{activeTab?.name || 'Dashboard'}</h1>
            <p className="last-update">
              Última actualización: {new Date().toLocaleTimeString('es-PY')}
            </p>
          </div>

          {/* Contenido de la pestaña Estación Meteorológica */}
          {activeTabId === 'estacion' && (
            <div className="widgets-grid">
              {/* Sección de Temperatura */}
              <div className="widget-card full-width">
                <div className="widget-header">
                  <h3>Temperatura</h3>
                </div>
                <div className="widget-content">
                  <div className="gauge-chart-container">
                    <div className="gauge-section">
                      <DemoGauge
                        bucket="CONNECT"
                        measurement="ESTACION"
                        field="TEMPERATURA"
                        title="Temperatura Actual"
                        unit="°C"
                        min={-10}
                        max={50}
                        refreshInterval={5000}
                      />
                    </div>
                    <div className="chart-section">
                      <DemoLineChart
                        bucket="CONNECT"
                        measurement="ESTACION"
                        field="TEMPERATURA"
                        timeRange="-24h"
                        title="Últimas 24 horas"
                        unit="°C"
                        aggregateWindow="10m"
                        refreshInterval={30000}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Humedad */}
              <div className="widget-card full-width">
                <div className="widget-header">
                  <h3>Humedad</h3>
                </div>
                <div className="widget-content">
                  <div className="gauge-chart-container">
                    <div className="gauge-section">
                      <DemoGauge
                        bucket="CONNECT"
                        measurement="ESTACION"
                        field="HUMEDAD"
                        title="Humedad Actual"
                        unit="%"
                        min={0}
                        max={100}
                        refreshInterval={5000}
                      />
                    </div>
                    <div className="chart-section">
                      <DemoLineChart
                        bucket="CONNECT"
                        measurement="ESTACION"
                        field="HUMEDAD"
                        deviceId="weather-station-01"
                        timeRange="-24h"
                        title="Últimas 24 horas"
                        unit="%"
                        aggregateWindow="10m"
                        refreshInterval={30000}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contenido de la pestaña Histórico */}
          {activeTabId === 'historico' && (
            <div className="widgets-grid">
              {/* Selector de fechas */}
              <div className="widget-card full-width">
                <div className="widget-header">
                  <h3>Seleccionar Rango de Fechas</h3>
                </div>
                <div className="widget-content">
                  <div className="date-selector">
                    <div className="date-input-group">
                      <label htmlFor="start-date">Fecha Inicio:</label>
                      <input
                        id="start-date"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate}
                      />
                    </div>
                    <div className="date-input-group">
                      <label htmlFor="end-date">Fecha Fin:</label>
                      <input
                        id="end-date"
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <button 
                      className="btn-apply-dates"
                      onClick={handleDateChange}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>

              {/* Gráfico de Temperatura Histórico */}
              <div className="widget-card full-width">
                <div className="widget-header">
                  <h3>Histórico de Temperatura</h3>
                </div>
                <div className="widget-content">
                  <DemoLineChart
                    measurement="sensors"
                    field="temperature"
                    deviceId="weather-station-01"
                    timeRange={timeRange}
                    title="Temperatura"
                    unit="°C"
                    aggregateWindow="1h"
                    refreshInterval={60000}
                  />
                </div>
              </div>

              {/* Gráfico de Humedad Histórico */}
              <div className="widget-card full-width">
                <div className="widget-header">
                  <h3>Histórico de Humedad</h3>
                </div>
                <div className="widget-content">
                  <DemoLineChart
                    measurement="sensors"
                    field="humidity"
                    deviceId="weather-station-01"
                    timeRange={timeRange}
                    title="Humedad"
                    unit="%"
                    aggregateWindow="1h"
                    refreshInterval={60000}
                  />
                </div>
              </div>
            </div>
          )}
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

export default DemoDashboard;