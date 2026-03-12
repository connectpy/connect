import { useState, useEffect, useCallback } from "react";
import whitelogo from '../assets/whitelogo.svg';
import './landing.css';
import slide2 from '../assets/silo.png';
import slide1 from '../assets/fondo.png';
import slide3 from '../assets/telemetria.png';
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
// ============================================================
// REEMPLAZA la función Hero() completa en tu landing.jsx
// ------------------------------------------------------------
// Asegurate de tener estos imports al inicio del archivo:
//
//   import slide1 from '../assets/slide1.png';
//   import slide2 from '../assets/slide2.png';
//   import slide3 from '../assets/slide3.png';
//
// Y que useState, useEffect, useCallback estén importados:
//   import { useState, useEffect, useCallback } from "react";
// ============================================================

function Hero() {
    const slides = [
        {
            image: slide1,
            title: "Maximice la calidad de su grano,",
            titleHighlight: "minimice los riesgos.",
            subtitle:
                "Monitoreo de termometría digital y automatización de aireación con tecnología IoT de alta precisión. Proteja su inversión contra focos de calor y humedad en tiempo real.",
            btnPrimary: { label: "Ver mas", href: "/termometria" },
            btnSecondary: { label: "Visitar demo", href: "/demo" },
        },
        {
            image: slide2,
            title: "Visualizá el interior de tu silo",
            titleHighlight: "en tiempo real.",
            subtitle:
                "Accedé a mapas de calor, gráficos históricos y alertas automáticas desde cualquier dispositivo. Toda la información de tu planta, al alcance de tu mano.",
            btnPrimary: { label: "Contactar", href: "https://wa.me/595985686844" },
            btnSecondary: { label: "Visitar demo", href: "/demo" },
        },
        {
            image: slide3,
            title: "Automatizá la aireación,",
            titleHighlight: "reducí costos operativos.",
            subtitle:
                "Nuestro sistema activa y detiene los ventiladores automáticamente según las condiciones del grano. Menos intervención manual, más eficiencia y menos pérdidas.",
            btnPrimary: { label: "Contactar", href: "https://wa.me/595985686844" },
            btnSecondary: { label: "Visitar demo", href: "/demo" },
        },
    ];

    const [current, setCurrent] = useState(0);
    const [sliding, setSliding] = useState(false);
    const [direction, setDirection] = useState("next"); // "next" | "prev"

    const goTo = useCallback(
        (index, dir = "next") => {
            if (sliding) return;
            setDirection(dir);
            setSliding(true);
            setTimeout(() => {
                setCurrent(index);
                setSliding(false);
            }, 500);
        },
        [sliding]
    );

    const next = useCallback(() => {
        goTo((current + 1) % slides.length, "next");
    }, [current, goTo, slides.length]);

    const prev = useCallback(() => {
        goTo((current - 1 + slides.length) % slides.length, "prev");
    }, [current, goTo, slides.length]);

    useEffect(() => {
        const timer = setInterval(next, 6000);
        return () => clearInterval(timer);
    }, [next]);

    return (
        <section className="hero-carousel">
            {/* Track deslizable */}
            <div
                className={`hero-track ${sliding ? `hero-track--sliding-${direction}` : ""}`}
            >
                {slides.map((slide, i) => (
                    <div
                        key={i}
                        className={`hero-slide ${i === current ? "hero-slide--active" : ""}`}
                        style={{ backgroundImage: `url(${slide.image})` }}
                        aria-hidden={i !== current}
                    >
                        <div className="hero-overlay" />
                        <div className="hero-slide-inner">
                            <div className="hero-text-block">
                                <h1 className="hero-banner-title">
                                    {slide.title}{" "}
                                    <span className="gradient-text">{slide.titleHighlight}</span>
                                </h1>
                                <p className="hero-banner-subtitle">{slide.subtitle}</p>
                                <div className="hero-buttons">
                                    <a
                                        href={slide.btnPrimary.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary hero-btn"
                                    >
                                        {slide.btnPrimary.label}
                                    </a>
                                    <a href={slide.btnSecondary.href} className="btn-secondary hero-btn">
                                        {slide.btnSecondary.label}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Flechas */}
            <button className="carousel-arrow carousel-arrow--left" onClick={prev} aria-label="Anterior">
                ‹
            </button>
            <button className="carousel-arrow carousel-arrow--right" onClick={next} aria-label="Siguiente">
                ›
            </button>

            {/* Dots */}
            <div className="carousel-dots">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`carousel-dot ${i === current ? "carousel-dot--active" : ""}`}
                        onClick={() => goTo(i, i > current ? "next" : "prev")}
                        aria-label={`Ir a slide ${i + 1}`}
                    />
                ))}
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