import { useState, useEffect } from 'react';

/**
 * SiloResumenCard
 * Resumen visual de un silo: nivel, temperatura, grano, ventilación, humedad, fecha ingreso.
 *
 * Node-RED envia:
 * {
 *   topic: "silo1/datos",
 *   payload: {
 *     nivel: 72,           // 0-100 (%)
 *     temp: 24.5,          // temperatura maxima sensada
 *     grano: "SOJA",       // variedad de grano
 *     fans: true,          // ventilacion activa
 *     humedad: 13.2,       // humedad del grano (%)
 *     fecha: "12/06/2024", // fecha de ingreso
 *     connected: true
 *   }
 * }
 */
/**
 * SiloResumenCard
 * Recibe todos los valores como prop "data" desde WidgetRendererMulti (SensorContext).
 *
 * Props:
 *   data.nivel     : number   0–100 (%)
 *   data.temp      : number   temperatura máxima
 *   data.grano     : string   variedad de grano
 *   data.fans      : boolean  ventilación activa
 *   data.humedad   : number   humedad del grano (%)
 *   data.fecha     : string   fecha de ingreso
 *   data.connected : boolean
 *   siloName       : string
 */
export default function SiloResumenCard({ data = {}, siloName = 'SILO CENTRAL N° 1' }) {
  const nivel     = data.nivel     ?? 0;
  const temp      = data.temp      ?? null;
  const grano     = data.grano     ?? null;
  const fans      = data.fans      ?? false;
  const humedad   = data.humedad   ?? null;
  const fecha     = data.fecha     ?? null;
  const connected = data.connected ?? false;

  // Color del gauge segun nivel
  const nivelColor = nivel > 85 ? '#ef4444' : nivel > 70 ? '#f59e0b' : '#00aae4';

  // SVG gauge circular
  const CIRCUNFERENCE = 2 * Math.PI * 42; // r=42
  const strokeDasharray = `${(nivel / 100) * CIRCUNFERENCE} ${CIRCUNFERENCE}`;

  const fmt = (v, dec = 1) => v !== null && v !== undefined ? Number(v).toFixed(dec) : '--';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: 24,
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.37)',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      transition: 'border 0.3s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.border = '1px solid rgba(0,170,228,0.5)'}
      onMouseLeave={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Icono silo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00aae4" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.9)' }}>
            {siloName}
          </span>
        </div>

        {/* Badge estado */}
        <span style={{
          fontSize: '0.6rem', background: 'rgba(0,0,0,0.3)',
          padding: '5px 12px', borderRadius: 50,
          border: connected ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 6,
          color: connected ? '#22c55e' : 'rgba(255,255,255,0.4)',
          fontWeight: 700, letterSpacing: '1px',
        }}>
          <span style={{
            height: 6, width: 6, background: connected ? '#22c55e' : '#475569',
            borderRadius: '50%', display: 'inline-block',
            boxShadow: connected ? '0 0 8px #22c55e' : 'none',
            animation: connected ? 'siloP 2s infinite' : 'none',
          }} />
          {connected ? 'SISTEMA ACTIVO' : 'OFFLINE'}
        </span>
      </div>

      {/* ── Gauge + Info ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, marginBottom: 20 }}>

        {/* Gauge SVG */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 100 100">
            {/* Track */}
            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)"
              strokeWidth="6" fill="none" />
            {/* Fill */}
            <circle cx="50" cy="50" r="42"
              stroke={nivelColor} strokeWidth="8" fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.4s' }}
            />
            {/* Glow ring */}
            <circle cx="50" cy="50" r="42"
              stroke={nivelColor} strokeWidth="1" fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ filter: `blur(3px)`, opacity: 0.5, transition: 'stroke-dasharray 0.8s' }}
            />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fontWeight="700" fontSize="18" fill="white" dy="-4">
              {nivel}%
            </text>
            <text x="50" y="64" textAnchor="middle"
              fontSize="7" fill="rgba(255,255,255,0.4)" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              LLENADO
            </text>
          </svg>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <div>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Temperatura Máx.
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
              <span style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1 }}>{fmt(temp)}</span>
              <span style={{ fontSize: '1rem', color: '#00aae4', fontWeight: 700 }}>°C</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Variedad de Grano
            </span>
            <span style={{ color: '#00aae4', fontWeight: 600, display: 'block', fontSize: '0.95rem', marginTop: 2 }}>
              {grano ?? 'S/D'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Divisor ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        margin: '0 0 16px',
      }} />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', gap: 8 }}>
        {/* Ventilación */}
        <div>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ventilación
          </span>
          <div style={{
            background: fans ? 'rgba(0,170,228,0.12)' : 'rgba(255,255,255,0.05)',
            border: fans ? '1px solid rgba(0,170,228,0.3)' : '1px solid transparent',
            padding: '4px 8px', borderRadius: 8,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5,
            fontSize: '0.8rem', marginTop: 5, color: fans ? '#00aae4' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.3s',
          }}>
            <span style={{
              display: 'inline-block',
              animation: fans ? 'siloSpin 2s linear infinite' : 'none',
            }}>⚙</span>
            {fans ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Fecha ingreso */}
        <div>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ingreso
          </span>
          <span style={{ fontSize: '0.82rem', display: 'block', marginTop: 5, color: 'rgba(255,255,255,0.8)' }}>
            {fecha ?? '--/--/--'}
          </span>
        </div>

        {/* Humedad grano */}
        <div>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Humedad
          </span>
          <span style={{ fontSize: '0.82rem', display: 'block', marginTop: 5, color: 'rgba(255,255,255,0.8)' }}>
            {fmt(humedad, 1)}%
          </span>
        </div>
      </div>

      <style>{`
        @keyframes siloP    { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.6)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        @keyframes siloSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}