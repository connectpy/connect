// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import whitelogo from '../assets/whitelogo.svg';
import './register.css';

function Register() {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Por favor ingresa tu nombre completo');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return false;
    }
    if (!formData.password) {
      setError('Por favor crea una contraseña');
      return false;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    if (!formData.company.trim()) {
      setError('Por favor ingresa el nombre de tu empresa');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company: formData.company
          }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Si el usuario fue creado exitosamente, crear entrada en users_metadata
      if (data.user) {
        const { error: metadataError } = await supabase
          .from('users_metadata')
          .insert({
            id: data.user.id,
            full_name: formData.fullName,
            company: formData.company,
            role: 'viewer'
          });

        if (metadataError) {
          console.error('Error creando metadata:', metadataError);
          // No lanzamos error aquí porque el usuario ya fue creado
        }
      }

      // 3. Mostrar mensaje de éxito
      setRegisteredEmail(formData.email);
      setStep('success');

    } catch (error) {
      // Manejar errores específicos de Supabase
      if (error.message.includes('already registered')) {
        setError('Este correo electrónico ya está registrado. Por favor inicia sesión.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de éxito después del registro
  if (step === 'success') {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <div className="success-content">
              <div className="success-icon">
                <img src={whitelogo} alt="Logo" height="50px" width="auto"/>
              </div>

              <h1>¡Registro exitoso!</h1>
              <p className="success-email">
                Cuenta creada para <strong>{registeredEmail}</strong>
              </p>

              <div className="success-steps">
                <div className="success-step">
                  <div className="step-number completed">1</div>
                  <div className="step-info">
                    <h4>Cuenta creada</h4>
                    <p>Tu cuenta ha sido registrada exitosamente</p>
                  </div>
                </div>

                <div className="step-connector"></div>

                <div className="success-step">
                  <div className="step-number pending">2</div>
                  <div className="step-info">
                    <h4>Pendiente de aprobación</h4>
                    <p>Un administrador debe asignarte acceso a un dashboard</p>
                  </div>
                </div>

                <div className="step-connector"></div>

                <div className="success-step">
                  <div className="step-number pending">3</div>
                  <div className="step-info">
                    <h4>Acceso al dashboard</h4>
                    <p>Podrás visualizar los datos de tu empresa</p>
                  </div>
                </div>
              </div>

              <div className="success-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <p>
                  Por favor contacta al administrador de tu empresa para que te asigne acceso a tu dashboard. 
                  Podrás ingresar una vez que sea aprobado.
                </p>
              </div>

              <div className="success-actions">
                <Link to="/login" className="btn-back-login">
                  Volver al Login
                </Link>
                <a href="mailto:admin@connectparaguay.com" className="btn-contact-admin">
                  Contactar Administrador
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de registro
  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <Link to="/" className="logo">
              <img src={whitelogo} alt="Logo" height="50px" width="auto"/>
              <span>Connect Paraguay</span>
            </Link>
            <h1>Crear Cuenta</h1>
            <p>Regístrate para acceder a los dashboards</p>
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

          <form onSubmit={handleRegister} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Nombre Completo</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="company">Empresa</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Mi Empresa S.A."
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="juan@empresa.com"
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="password-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              La contraseña debe tener al menos 8 caracteres
            </div>

            <button type="submit" className="btn-register" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          <div className="register-footer">
            <p>
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
            </p>
          </div>
        </div>

        <div className="register-info">
          <h2>¿Por qué registrarte?</h2>
          <ul>
            <li>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Datos en tiempo real de tu empresa
            </li>
            <li>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Dashboards personalizados
            </li>
            <li>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Acceso seguro y controlado
            </li>
            <li>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Alertas y notificaciones
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Register;