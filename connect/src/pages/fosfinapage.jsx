import { useEffect, useState } from "react";
import "./fosfina.css";
import whitelogo from '../assets/whitelogo.svg';
import imagen from '../assets/fumigadora2.png';

// ── Datos ──────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Fumigación Uniforme",
    desc: "La recirculación forzada garantiza que el gas penetre en todo el volumen del granel, incluso en los lugares de difícil acceso.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Seguridad Operativa",
    desc: "Válvula solenoide y turbina de escape que previenen la acumulación excesiva de gas en caso de cortes de energía.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    title: "Cero Residuos",
    desc: "Cumple con los estándares internacionales más estrictos. Ideal para productos delicados o sensibles al amoníaco.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    title: "Versatilidad y Resistencia",
    desc: "Diseño cabinado con pintura industrial y tanque reactor de acero inoxidable para uso a la intemperie y larga vida útil.",
  },
];

const SPECS = [
  { label: "Sistema de Impulsión", value: "Turbina de alta revolución — flujo constante" },
  { label: "Tanque Reactor", value: "Acero inoxidable, acoples rápidos aluminio 3\" y 2\"" },
  { label: "Control de Temperatura", value: "Sensor automático + calentador de agua ajustable" },
  { label: "Movilidad", value: "Diseño con ruedas y cabina para transporte en planta" },
  { label: "Alimentación Eléctrica", value: "220 V ~ 25 AMP · 20 m de cable incluido" },
  { label: "Drenaje y Limpieza", value: "Sistema 2\" con llave esférica inoxidable" },
];

// ── Hook reveal ────────────────────────────────────────────
// ── Navbar (igual que landing) ─────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={scrolled ? 'navbar scrolled' : 'navbar'}>
      <div className="container">
        <div className="nav-content">
          <div className="logo">
            <img src={whitelogo} alt="Logo" height="50px" width="auto" />
            <h1>Connect</h1>
          </div>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="/#features" onClick={() => setMenuOpen(false)}>Características</a>
            <a href="/#benefits" onClick={() => setMenuOpen(false)}>Beneficios</a>
            <a href="/#contact"  onClick={() => setMenuOpen(false)}>Contacto</a>
            <a href="/login" className="btn-primary">Ingresar</a>
          </div>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".fos-reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("fos-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ── Componente principal ───────────────────────────────────
function FosfinaPage() {
  useReveal();

  return (
    <div className="fos-page">
      <Navbar />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="fos-hero">
        {/* Fondo: cuadrícula + glow verde-lima industrial */}
        <div className="fos-hero-grid" />
        <div className="fos-hero-glow" />

        <div className="fos-container">
          <div className="fos-hero-inner">
            <div className="fos-badge">
              <span className="fos-badge-pulse" />
              Pohl Servicios Industriales — Tecnología Post-Cosecha
            </div>

            <h1 className="fos-hero-title">
              Fumigación y Recirculación<br />
              <span className="fos-hl">de Fosfina (PH₃)</span>
            </h1>

            <p className="fos-hero-sub">
              Control de plagas letal, uniforme y seguro para granos almacenados.
              La tecnología de punta que tu planta necesita.
            </p>

            <div className="fos-hero-cta">
              <a
                href="https://wa.me/595985686844"
                className="fos-btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Solicitar Cotización
              </a>
              <a href="#especificaciones" className="fos-btn-ghost">
                Ver especificaciones ↓
              </a>
            </div>

            {/* Stats rápidos */}
            <div className="fos-hero-stats">
              {[
                { val: "PH₃", lbl: "Gas activo" },
                { val: "220V", lbl: "Alimentación" },
                { val: "360°", lbl: "Cobertura" },
                { val: "0", lbl: "Residuos" },
              ].map((s, i) => (
                <div className="fos-stat" key={i}>
                  <span className="fos-stat-val">{s.val}</span>
                  <span className="fos-stat-lbl">{s.lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ¿POR QUÉ ELEGIR? ══════════════════════════════════ */}
      <section className="fos-section fos-section--alt">
        <div className="fos-container">
          <div className="fos-reveal">
            <div className="fos-tag">// diferencial</div>
            <h2 className="fos-section-title">¿Por qué elegir nuestro sistema de recirculación?</h2>
            <p className="fos-section-lead">
              A diferencia de los métodos tradicionales de aplicación pasiva, nuestro equipo genera e inyecta fosfina en altas concentraciones de forma rápida. Gracias a su sistema de <strong>doble acción</strong>, el gas no solo se introduce sino que se recircula constantemente dentro de silos y recintos, eliminando los "puntos muertos" y asegurando concentraciones letales para los insectos en todas sus etapas de desarrollo.
            </p>
          </div>

          {/* Comparativa visual */}
          <div className="fos-compare fos-reveal">
            <div className="fos-compare-card fos-compare-card--old">
              <div className="fos-compare-label">Método tradicional</div>
              <ul>
                <li>Aplicación pasiva</li>
                <li>Puntos muertos sin cobertura</li>
                <li>Concentración irregular</li>
                <li>Mayor tiempo de exposición</li>
              </ul>
            </div>
            <div className="fos-compare-arrow">→</div>
            <div className="fos-compare-card fos-compare-card--new">
              <div className="fos-compare-label fos-compare-label--new">Nuestro sistema</div>
              <ul>
                <li>Recirculación forzada activa</li>
                <li>Cobertura total del volumen</li>
                <li>Concentración uniforme y letal</li>
                <li>Proceso más rápido y eficiente</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

{/* ══ IMAGEN DEL EQUIPO ════════════════════════════════ */}
      <section className="fos-section fos-section--img">
        <div className="fos-container">
          <div className="fos-img-wrapper fos-reveal">
            <div className="fos-img-glow" />
            <img
              src={imagen}
              alt="Equipo de Fumigación y Recirculación de Fosfina PH3 - Pohl Servicios Industriales"
              className="fos-equipo-img"
            />
            <div className="fos-img-caption">
              <span className="fos-img-caption-dot" />
              Equipo de Recirculación PH₃ · Fabricación nacional
            </div>
          </div>
        </div>
      </section>

      {/* ══ BENEFICIOS ════════════════════════════════════════ */}
      <section className="fos-section">
        <div className="fos-container">
          <div className="fos-reveal">
            <div className="fos-tag">// beneficios clave</div>
            <h2 className="fos-section-title">Lo que diferencia a nuestro equipo</h2>
          </div>
          <div className="fos-benefits-grid">
            {BENEFITS.map((b, i) => (
              <div className="fos-benefit-card fos-reveal" key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="fos-benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ESPECIFICACIONES ══════════════════════════════════ */}
      <section className="fos-section fos-section--alt" id="especificaciones">
        <div className="fos-container">
          <div className="fos-reveal">
            <div className="fos-tag">// ficha técnica</div>
            <h2 className="fos-section-title">Especificaciones Técnicas</h2>
            <p className="fos-section-lead">
              Ingeniería de precisión para entornos industriales exigentes.
            </p>
          </div>

          <div className="fos-specs-layout fos-reveal">
            <div className="fos-specs-table">
              {SPECS.map((s, i) => (
                <div className="fos-spec-row" key={i}>
                  <div className="fos-spec-label">{s.label}</div>
                  <div className="fos-spec-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Panel de descarga de ficha técnica */}
            <div className="fos-download-card">
              <div className="fos-download-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="36" height="36">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
              </div>
              <h4>Ficha Técnica Completa</h4>
              <p>Descargá las especificaciones completas del equipo en formato PDF.</p>
              <a href="#" className="fos-btn-download">
                Descargar PDF
              </a>
              <span className="fos-download-note">Contactanos para recibir la ficha actualizada</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SEGURIDAD ═════════════════════════════════════════ */}
      <section className="fos-section">
        <div className="fos-container">
          <div className="fos-safety-layout fos-reveal">
            <div className="fos-safety-content">
              <div className="fos-tag">// seguridad ante todo</div>
              <h2 className="fos-section-title">Diseñado para proteger al operario y la instalación</h2>
              <p className="fos-section-lead" style={{ marginBottom: "1.5rem" }}>
                El equipo está diseñado pensando en el operario y la instalación. Cada componente cumple un rol crítico en la prevención de accidentes.
              </p>
              <ul className="fos-safety-list">
                <li>
                  <span className="fos-safety-dot" />
                  <span><strong>Válvula solenoide</strong> de corte automático ante emergencias eléctricas</span>
                </li>
                <li>
                  <span className="fos-safety-dot" />
                  <span><strong>Turbina de escape</strong> que previene acumulación excesiva de gas PH₃</span>
                </li>
                <li>
                  <span className="fos-safety-dot" />
                  <span><strong>Boquilla dosificadora</strong> de pastillas para carga controlada y segura</span>
                </li>
                <li>
                  <span className="fos-safety-dot" />
                  <span><strong>Sistema de drenaje 2"</strong> con llave esférica inoxidable para limpieza de sedimentos</span>
                </li>
              </ul>
            </div>

            {/* Panel visual de seguridad */}
            <div className="fos-safety-panel">
              <div className="fos-safety-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Sistema de Seguridad Activo
              </div>
              {[
                { label: "Válvula Solenoide", status: "OK", color: "#22c55e" },
                { label: "Turbina de Escape", status: "OK", color: "#22c55e" },
                { label: "Sensor de Temperatura", status: "OK", color: "#22c55e" },
                { label: "Nivel de Gas PH₃", status: "NORMAL", color: "#0fc9b0" },
                { label: "Sistema de Drenaje", status: "LISTO", color: "#0fc9b0" },
              ].map((item, i) => (
                <div className="fos-safety-row" key={i}>
                  <span className="fos-safety-name">{item.label}</span>
                  <span className="fos-safety-status" style={{ color: item.color, borderColor: item.color }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ═════════════════════════════════════════ */}
      <section className="fos-cta">
        <div className="fos-cta-glow" />
        <div className="fos-container fos-cta-inner fos-reveal">
          <div className="fos-cta-tag">Pohl Servicios Industriales</div>
          <h2>Optimice sus procesos de sanidad vegetal</h2>
          <p>
            Contacte con un asesor técnico y reciba una cotización personalizada para su instalación.
          </p>
          <div className="fos-cta-actions">
            <a
              href="https://wa.me/595985686844"
              className="fos-btn-primary fos-btn-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contactar Asesor Técnico
            </a>
            <a href="#especificaciones" className="fos-btn-ghost fos-btn-lg">
              Ver Especificaciones
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}

export default FosfinaPage;