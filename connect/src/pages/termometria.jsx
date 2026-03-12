import { useEffect, useRef } from "react";
import './termometria.css';

// ── Datos de secciones ─────────────────────────────────────
const WHY_CARDS = [
  {
    icon: '🎯',
    title: 'Precisión sin fronteras',
    desc: 'Lecturas digitales exactas y compatibilidad total con instalaciones existentes. Datos que podés confiar.',
  },
  {
    icon: '⚡',
    title: 'Eficiencia Energética',
    desc: 'Automatización inteligente de ventiladores basada en condiciones climáticas reales. Menos consumo, más protección.',
  },
  {
    icon: '🤖',
    title: 'Autonomía Total',
    desc: 'Nodos de lectura autónomos diseñados para entornos industriales exigentes. Opera 24/7 sin intervención manual.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Temperatura y humedad ambiente',
    desc: 'Sensores externos capturan las condiciones climáticas en tiempo real. El sistema las analiza continuamente para anticipar cambios en el entorno del silo.',
  },
  {
    num: '02',
    title: 'Temperatura interna del grano por capas',
    desc: 'Los cables de termometría mapean el perfil térmico completo del silo, capa por capa. Se detectan gradientes peligrosos antes de que escalen.',
  },
  {
    num: '03',
    title: 'Punto de rocío y tablas de equilibrio',
    desc: 'El algoritmo cruza datos con tablas higroscópicas para determinar el momento óptimo de ventilar, evitando la sobre-secación o rehumedecimiento del grano.',
  },
];

const TRACE_ITEMS = [
  {
    icon: '💧',
    title: 'Humedad de Ingreso',
    desc: 'Registrá el porcentaje de humedad e impurezas al momento de la carga para tener el punto de partida exacto de cada lote.',
  },

  {
    icon: '🔥',
    title: 'Historial Térmico por Lote',
    desc: 'Accedé al historial completo de temperatura de cada lote. Evidencia objetiva de calidad para clientes, acopios y certificadoras.',
  },
];

const HEATMAP_PALETTE = [
  '#1e3a5f','#1e4d7d','#1a6b8a','#0d8a7a',
  '#1aad6b','#7ac943','#f5d800','#f59e0b',
  '#f97316','#ef4444','#dc2626','#b91c1c',
];

// ── Sub-componentes ────────────────────────────────────────
function SectionTag({ children }) {
  return <div className="prod-section-tag">{children}</div>;
}

function MockDashboard() {
  const cells = Array.from({ length: 48 }, (_, i) => {
    const idx = Math.floor(Math.random() * HEATMAP_PALETTE.length);
    return HEATMAP_PALETTE[idx];
  });

  return (
    <div className="prod-mock-screen">
      <div className="prod-mock-bar">
        <span className="prod-mock-dot" style={{ background: '#ff5f57' }} />
        <span className="prod-mock-dot" style={{ background: '#febc2e' }} />
        <span className="prod-mock-dot" style={{ background: '#28c840' }} />
        <span className="prod-mock-label">SILO CENTRAL N°1 — ACTIVO</span>
      </div>
      <div className="prod-mock-body">
        <div className="prod-gauge-row">
          <div className="prod-gauge-box">
            <div className="prod-gauge-val">31.7°</div>
            <div className="prod-gauge-lbl">Temp. Máx.</div>
          </div>
          <div className="prod-gauge-box">
            <div className="prod-gauge-val">43%</div>
            <div className="prod-gauge-lbl">Llenado</div>
          </div>
          <div className="prod-gauge-box">
            <div className="prod-gauge-val prod-gauge-val--warn">⚠ 2</div>
            <div className="prod-gauge-lbl">Alertas</div>
          </div>
        </div>

        <div className="prod-mock-sublabel">MAPA DE CALOR — CABLE 1-8</div>
        <div className="prod-heatmap">
          {cells.map((color, i) => (
            <span key={i} style={{ background: color }} />
          ))}
        </div>

        <div className="prod-mock-sublabel">HISTORIAL 24H</div>
        <svg className="prod-spark" viewBox="0 0 300 48" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0fc9b0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0fc9b0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,38 C20,35 40,28 60,32 C80,36 100,20 120,18 C140,16 160,24 180,22 C200,20 220,10 240,8 C260,6 280,14 300,12"
            stroke="#0fc9b0" strokeWidth="2" fill="none"
          />
          <path
            d="M0,38 C20,35 40,28 60,32 C80,36 100,20 120,18 C140,16 160,24 180,22 C200,20 220,10 240,8 C260,6 280,14 300,12 L300,48 L0,48 Z"
            fill="url(#sparkGrad)"
          />
        </svg>
      </div>
    </div>
  );
}

// ── Hook scroll reveal ─────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.prod-reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('prod-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ── Componente principal ───────────────────────────────────
function ProductoPage() {
  useReveal();

  return (
    <div className="prod-page">

      {/* ── HERO ── */}
      <section className="prod-hero">
        <div className="prod-grid-bg" />
        <div className="prod-glow-bg" />
        <div className="prod-container">
          <div className="prod-hero-content">
            <div className="prod-badge">
              <span className="prod-badge-dot" />
              Sistema IoT Industrial — Connect Paraguay
            </div>
            <h1 className="prod-hero-title">
              Protege tu cosecha con<br />
              <span className="prod-accent">Inteligencia Industrial</span>
            </h1>
            <p className="prod-hero-sub">
              Termometría digital y automatización de aireación. El monitoreo en tiempo real que tu planta necesita para eliminar riesgos, optimizar la aireación y garantizar la calidad del grano desde cualquier dispositivo.
            </p>
            <div className="prod-hero-actions">
              <a href="https://wa.me/595985686844" className="prod-btn-primary" target="_blank" rel="noopener noreferrer">
                Contactar ahora
              </a>
              <a href="/demo" className="prod-btn-outline">Ver demo →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── ¿POR QUÉ? ── */}
      <section className="prod-section prod-section--alt" id="por-que">
        <div className="prod-container">
          <div className="prod-reveal">
            <SectionTag>// fundamentos</SectionTag>
            <h2 className="prod-section-title">¿Por qué elegir nuestra tecnología?</h2>
            <p className="prod-section-lead">
              En el almacenamiento de granos, cada grado cuenta. Nuestro sistema combina hardware de alta resistencia con software de visualización avanzada para ofrecerte una radiografía exacta de lo que sucede dentro de tus silos.
            </p>
          </div>
          <div className="prod-why-grid prod-reveal">
            {WHY_CARDS.map((c, i) => (
              <div className="prod-why-card" key={i}>
                <span className="prod-why-icon">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRACIÓN ── */}
      <section className="prod-section" id="integracion">
        <div className="prod-container">
          <div className="prod-reveal">
            <SectionTag>🛡️ flexibilidad</SectionTag>
            <h2 className="prod-section-title">Integración Digital y Analógica</h2>
            <p className="prod-section-lead">
              Sabemos que la infraestructura es una inversión importante. Por eso, nuestra plataforma es universal y se adapta a lo que ya tenés.
            </p>
          </div>
          <div className="prod-int-grid prod-reveal">
            <div className="prod-int-card">
              <div className="prod-int-label">▸ Instalación nueva</div>
              <h3>Sistemas Nuevos</h3>
              <p>Implementamos cables digitales de última generación para una precisión milimétrica. Hardware diseñado para durar décadas en entornos hostiles.</p>
            </div>
            <div className="prod-int-card">
              <span className="prod-int-badge">★ Sin recableado</span>
              <div className="prod-int-label">▸ Actualización inteligente</div>
              <h3>Retrofit — Sistemas Existentes</h3>
              <p>¿Ya tenés cabos analógicos instalados? Nuestro hardware incluye <strong>módulos de conversión</strong> que integran tus sensores actuales a nuestra plataforma moderna, ahorrándote costos de recableado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISUALIZACIÓN ── */}
      <section className="prod-section prod-section--alt" id="visualizacion">
        <div className="prod-container">
          <div className="prod-reveal">
            <SectionTag>📊 gemelo digital</SectionTag>
            <h2 className="prod-section-title">Visualización Avanzada de tu Silo</h2>
            <p className="prod-section-lead">No más tablas de datos confusas. Visualizá tu mercadería como nunca antes.</p>
          </div>
          <div className="prod-viz-layout prod-reveal">
            <ul className="prod-viz-list">
              {[
                { icon: '🌡️', title: 'Mapas de Calor (Heatmaps)', desc: 'Identificá puntos calientes de forma visual y jerárquica antes de que se conviertan en un problema. Colores intuitivos, decisiones rápidas.' },
                { icon: '📏', title: 'Detección Inteligente de Llenado', desc: 'Nuestro algoritmo analiza la varianza térmica para determinar automáticamente el nivel de grano, separando lecturas reales del aire superior.' },
              ].map((item, i) => (
                <li key={i}>
                  <div className="prod-viz-icon">{item.icon}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <MockDashboard />
          </div>
        </div>
      </section>

      {/* ── AIREACIÓN ── */}
      <section className="prod-section" id="aireacion">
        <div className="prod-container">
          <div className="prod-reveal">
            <SectionTag>🌬️ automatización</SectionTag>
            <h2 className="prod-section-title">Aireación Inteligente y Automatizada</h2>
            <p className="prod-section-lead">
              Optimizá el uso de energía y mantené el equilibrio higroscópico perfecto. El sistema decide el momento exacto para encender la ventilación.
            </p>
          </div>
          <div className="prod-steps prod-reveal">
            {STEPS.map((s, i) => (
              <div className="prod-step" key={i}>
                <div className="prod-step-num">{s.num}</div>
                <div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRAZABILIDAD ── */}
      <section className="prod-section prod-section--alt" id="trazabilidad">
        <div className="prod-container">
          <div className="prod-reveal">
            <SectionTag>📈 historial</SectionTag>
            <h2 className="prod-section-title">Trazabilidad e Historial Completo</h2>
            <p className="prod-section-lead">
              Convertí tu servidor en una base de datos estratégica. Cada lote, documentado. Cada decisión, respaldada por datos.
            </p>
          </div>
          <div className="prod-trace-grid prod-reveal">
            {TRACE_ITEMS.map((t, i) => (
              <div className="prod-trace-item" key={i}>
                <span className="prod-trace-icon">{t.icon}</span>
                <div>
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="prod-cta">
        <div className="prod-cta-glow" />
        <div className="prod-container prod-cta-inner">
          <h2>¿Listo para proteger tu cosecha?</h2>
          <p>Contactanos y un especialista diseñará la solución exacta para tu planta.</p>
          <div className="prod-cta-actions">
            <a href="https://wa.me/595985686844" className="prod-btn-primary prod-btn-lg" target="_blank" rel="noopener noreferrer">
              Contactar por WhatsApp
            </a>
            <a href="/demo" className="prod-btn-outline prod-btn-lg">Visitar demo</a>
          </div>
        </div>
      </section>

    </div>
  );
}

export default ProductoPage;