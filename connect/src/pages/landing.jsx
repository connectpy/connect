import React from "react";
import { useState, useEffect } from "react";
import whitelogo from '../assets/whitelogo.svg';
//barra de navegacion

function navbar (){
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

function LandingPage() {
    return (
        <div className="landing-page">
            {navbar()}
        </div>
    )
}

export default LandingPage;