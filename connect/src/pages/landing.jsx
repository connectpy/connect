import React from "react";
import whitelogo from '../assets/whitelogo.svg';
//barra de navegacion

function navbar (){

    return(
        <nav className="navbar">
            <div className="container">
                <div className="nav-content">
                    <div className="logo">
                        <img src={whitelogo} alt="Logo" height="100px" width="auto"/>
                        <h1>Connect</h1>
                    </div>
                    <div className="links">
                        <a href="/login">Iniciar Sesión</a>
                        <a href="/register">Registrarse</a>
                    </div>
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