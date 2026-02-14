import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import whitelogo from '../assets/whitelogo.svg';
import './login.css'; // Reutilizamos tu CSS

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.connectparaguay.com/reset-password',
      });

      if (error) throw error;
      
      setSubmitted(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <Link to="/" className="logo">
              <img src={whitelogo} alt="Logo" height="50px" width="auto"/>
              <span>Connect Paraguay</span>
            </Link>
            <h1>Recuperar acceso</h1>
            <p>Te enviaremos un enlace para restablecer tu contraseña</p>
          </div>

          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Enviando enlace...
                  </>
                ) : (
                  'Enviar instrucciones'
                )}
              </button>
            </form>
          ) : (
            <div className="success-message" style={{ textAlign: 'center', color: '#cbd5e1' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" style={{ margin: '0 auto' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>¡Correo enviado!</h2>
              <p>Revisa tu bandeja de entrada (y la de spam) para continuar con el proceso.</p>
            </div>
          )}

          <div className="login-footer">
            <Link to="/login" className="back-link">← Volver al inicio de sesión</Link>
          </div>
        </div>

        <div className="login-info">
          <h2>Seguridad Avanzada</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Si tienes problemas para acceder a tu cuenta de telemetría, el proceso de recuperación por correo es el método más seguro para verificar tu identidad y proteger tus datos de monitoreo en tiempo real.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;