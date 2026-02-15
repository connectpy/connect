import { useState, useEffect } from "react";
import whitelogo from '../assets/whitelogo.svg';
import './landing.css';
import imagen from '../assets/silo.png';
//barra de navegacion
function Navbar (){
    //funcion de navbar scrolleado
    const [scrolled, setScrolled] = useState(false);
    //funcionde menu hamburguesa
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
    const navbarClass = scrolled ? 'navbar scrolled' : 'navbar';
    return(
        <nav className={navbarClass}>
            <div className="container">
                <div className="nav-content">
                    <div className="logo">
                        <img src={whitelogo} alt="Logo" height="50px" width="auto"/>
                        <h1>Connect</h1>
                    </div>
                    <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
                        <a href="#features" onClick={() => setMenuOpen(false)}>Características</a>
                        <a href="#benefits" onClick={() => setMenuOpen(false)}>Beneficios</a>
                        <a href="#contact" onClick={() => setMenuOpen(false)}>Contacto</a>
                        <a href="/login" className="btn-primary">Ingresar</a>
                    </div>
                    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>
        </nav>
    )
}

//////funcion hero//////

function Hero() {
    return(
        <section className="hero">
            <div className="container">
                <div className="hero-grid">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Monitorea tu empresa en
                            <span className="gradient-text"> tiempo real</span>
                        </h1>
                        <p className="hero-description">
                            Dashboards inteligentes que transforman tus datos en decisiones estratégicas. 
                            Visualiza métricas críticas en tiempo real.
                        </p>
                        <div className="hero-buttons">
                            <a href="/registro" className="btn-primary hero-btn">
                                Registrarse
                            </a>
                            <a href="/demo" className="btn-secondary hero-btn">
                                Visitar demo
                            </a>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="contenedor-imagen">
                            <img src={imagen} alt="Dashboard Mockup" className="dashboard-image"/>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}


// Componente de Feature
function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}

// Sección de Features
function Features() {
  const features = [
    {
      icon: '⚡',
      title: 'Tiempo Real',
      description: 'Datos actualizados cada 5 segundos. Toma decisiones basadas en información al instante.'
    },
    {
      icon: '📊',
      title: 'Visualización Avanzada',
      description: 'Gráficos interactivos, tablas dinámicas y métricas personalizadas para cada empresa.'
    },
    {
      icon: '🛡️',
      title: 'Seguridad Total',
      description: 'Autenticación robusta, datos encriptados y permisos granulares por usuario.'
    },
    {
      icon: '👥',
      title: 'Multi-Usuario',
      description: 'Administra equipos completos. Cada usuario ve solo lo que le corresponde.'
    },
    {
      icon: '📈',
      title: 'Histórico Completo',
      description: 'Accede a datos históricos ilimitados. Analiza tendencias y patrones.'
    },
    {
      icon: '🔔',
      title: 'Alertas Inteligentes',
      description: 'Notificaciones automáticas cuando las métricas superan umbrales críticos.'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Características Poderosas</h2>
          <p className="section-subtitle">Todo lo que necesitas para mantener el control</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}


// Componente de Beneficio
function BenefitItem({ text }) {
  return (
    <div className="benefit-item">
      <div className="benefit-check">✓</div>
      <p className="benefit-text">{text}</p>
    </div>
  );
}


// Componente de Estadística
function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

// Sección de Beneficios
function Benefits() {
  return (
    <section id="benefits" className="benefits">
      <div className="container">
        <div className="benefits-grid">
          <div className="benefits-content">
            <h2 className="section-title">Potencia la eficiencia de tu empresa</h2>
            <div className="benefits-list">
              <BenefitItem text="Reducción en los tiempos de respuesta" />
              <BenefitItem text="Identificación temprana de problemas operativos" />
              <BenefitItem text="Mejora continua basada en datos reales" />
              <BenefitItem text="Acceso desde cualquier dispositivo, en cualquier lugar" />
            </div>
          </div>
          
          <div className="stats-grid">
            <StatCard value="50+" label="Empresas activas" />
            <StatCard value="99.9%" label="Disponibilidad" />
            <StatCard value="5 seg" label="Actualización" />
            <StatCard value="24/7" label="Soporte" />
          </div>
        </div>
      </div>
    </section>
  );
}


// Sección CTA
function CTA() {
  return (
    <section id="contact" className="cta">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">¿Listo para transformar tu gestión?</h2>
          <p className="cta-description">
            Solicita acceso y un administrador configurará tu dashboard personalizado
          </p>
          <div className="cta-buttons">
            <a href="https://wa.me/595985686844" className="btn-light btn-lg">
              Contactar Ventas
            </a>
            <a href="https://app.connectparaguay.com" className="btn-outline btn-lg">
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}


// Footer
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Connect Paraguay</span>
            </div>
            <p className="footer-description">
              Dashboards profesionales para empresas que toman decisiones basadas en datos.
            </p>
          </div>
          
          <div className="footer-links">
            <h4>Producto</h4>
            <a href="#features">Características</a>
            <a href="#benefits">Beneficios</a>
            <a href="https://app.connectparaguay.com">Acceder</a>
          </div>
          
          <div className="footer-links">
            <h4>Soporte</h4>
            <a href="#">Documentación</a>
            <a href="#contact">Contacto</a>
            <a href="#">FAQ</a>
          </div>
          
          <div className="footer-links">
            <h4>Legal</h4>
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 Connect Paraguay. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}


function LandingPage() {
    return (
        <div className="landing-page" style={{minHeight: '100vh', backgroundColor: '#0f172a'}}>
            <Navbar />    
            <Hero />
            <Features />
            <Benefits />
            <CTA />
            <Footer />
        </div>
    );
}

export default LandingPage;