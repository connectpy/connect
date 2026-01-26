import { useState, useEffect } from "react";
import whitelogo from '../assets/whitelogo.svg';
import './landing.css';
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
                        <a href="https://app.connectparaguay.com" className="btn-primary">Ingresar</a>
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
                    </div>
                    <div className="hero-visual">
                        <div className="device-mockup">
                            hola
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}



function LandingPage() {
    return (
        <div className="landing-page">
            <Navbar />    
            <Hero />
        </div>
    );
}

export default LandingPage;