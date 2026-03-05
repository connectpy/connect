import { useState, useEffect, useCallback } from 'react';
import { useTopic, useMqttStatus } from '../hooks/MqttContext';

/**
 * SiloControlCard
 * Control de aireacion de un silo: manual/auto, switch ventiladores, timer horario.
 * Sincroniza estado desde Node-RED y envia comandos de vuelta por WebSocket.
 *
 * Node-RED envia datos (topic: "silo1/datos"):
 * {
 *   topic: "silo1/datos",
 *   payload: {
 *     nivel: 72, humedad_grano: 13.5,
 *     temp_max: 28.1, temp_avg: 24.3, temp_min: 20.6,
 *     fans_state: true,
 *     mode: "auto",          // "manual" | "auto"
 *     fans: false,           // estado switch manual
 *     timer: true,           // programacion horaria
 *     start: "22:00",
 *     end: "06:00",
 *     grano: "SOJA",
 *     activo: true
 *   }
 * }
 *
 * Dashboard envia comandos (mismo topic de respuesta configurado en Node-RED):
 * {
 *   topic: "silo1/control",
 *   payload: { source: "dashboard", mode, fans, timer, start, end }
 * }
 */
export default function SiloControlCard({ topic, siloName = 'Silo Nro. 1' }) {
  const { getField, current } = useTopic(topic);
  const { sendMessage } = useMqttStatus();

  // Estado local del panel de control
  const [mode, setMode]           = useState('auto');
  const [fanSwitch, setFanSwitch] = useState(false);
  const [useTimer, setUseTimer]   = useState(false);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime]     = useState('06:00');

  // Sincronizar desde Node-RED cuando llegan datos.
  // Usamos `current` como dependencia unica — evita re-ejecuciones con
  // valores null intermedios que resetearian el estado local del usuario.
  useEffect(() => {
    if (!current || typeof current !== 'object') return;
    if (current.mode  != null) setMode(current.mode);
    if (current.fans  != null) setFanSwitch(current.fans === true || current.fans === 'ON');
    if (current.timer != null) setUseTimer(Boolean(current.timer));
    if (current.start != null) setStartTime(current.start);
    if (current.end   != null) setEndTime(current.end);
  }, [current]);

  // Enviar estado completo del control a Node-RED por el mismo topic.
  // `source: 'dashboard'` permite que Node-RED distinga este mensaje
  // de los datos que el propio Node-RED envia, evitando loops.
  const sendControl = useCallback((overrides = {}) => {
    sendMessage({
      topic,
      payload: {
        source: 'dashboard',
        mode,
        fans: fanSwitch,
        timer: useTimer,
        start: startTime,
        end: endTime,
        ...overrides,
      },
    });
  }, [mode, fanSwitch, useTimer, startTime, endTime, sendMessage, topic]);

  // Valores de lectura
  const nivel        = getField('nivel')        ?? 0;
  const humGrano     = getField('humedad_grano');
  const tempMax      = getField('temp_max');
  const tempAvg      = getField('temp_avg');
  const tempMin      = getField('temp_min');
  const fansState    = getField('fans_state')   ?? false;
  const grano        = getField('grano')        ?? 'S/D';
  const activo       = getField('activo')       ?? false;

  const fmt = (v, d = 1) => v !== null && v !== undefined ? Number(v).toFixed(d) : '--';

  const glass = {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: 24,
    color: 'white',
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  };

  return (
    <div style={glass}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: '0.6rem', letterSpacing: '1.5px', color: '#00aae4', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>
            Control de Silo
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.9)' }}>
            {siloName} — {grano}
          </span>
        </div>
        <span style={{
          fontSize: '0.6rem', padding: '4px 10px', borderRadius: 50,
          border: activo ? '1px solid rgba(0,170,228,0.5)' : '1px solid rgba(255,255,255,0.1)',
          color: activo ? '#00aae4' : 'rgba(255,255,255,0.3)',
          fontWeight: 700,
        }}>
          {activo ? 'CONECTADO' : 'DESCONECTADO'}
        </span>
      </div>

      {/* ── Nivel + Humedad grano ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.04)',
        padding: 16, borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 12,
      }}>
        {/* Mini gauge circular */}
        <svg width="65" height="65" viewBox="0 0 65 65" style={{ flexShrink: 0 }}>
          <circle cx="32.5" cy="32.5" r="26" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
          <circle cx="32.5" cy="32.5" r="26" stroke="#00aae4" strokeWidth="6" fill="none"
            strokeDasharray={`${(nivel / 100) * 163.4} 163.4`}
            strokeLinecap="round" transform="rotate(-90 32.5 32.5)"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
          <text x="32.5" y="32.5" textAnchor="middle" dominantBaseline="middle"
            fontWeight="800" fontSize="11" fill="white">{nivel}%</text>
        </svg>

        <div style={{ marginLeft: 16 }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            Estado de Carga
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 2 }}>
            {fmt(humGrano, 1)}
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>% Humedad</span>
          </div>
        </div>
      </div>

      {/* ── Temperaturas ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Máx',   value: fmt(tempMax), color: '#ef4444' },
          { label: 'Media', value: fmt(tempAvg), color: 'white' },
          { label: 'Mín',   value: fmt(tempMin), color: '#3b82f6' },
        ].map((t) => (
          <div key={t.label} style={{
            flex: 1, background: 'rgba(0,0,0,0.2)',
            padding: '10px 8px', borderRadius: 14, textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>
              {t.label}
            </span>
            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: t.color, marginTop: 4 }}>
              {t.value}°
            </span>
          </div>
        ))}
      </div>

      {/* ── Divisor ───────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)', marginBottom: 20 }} />

      {/* ── Toggle Manual / Auto ─────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
          Configuración de Aireación
        </span>
        <div style={{
          display: 'flex', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}>
          {['manual', 'auto'].map((m) => (
            <button key={m} onClick={() => { setMode(m); sendControl({ mode: m }); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px',
                background: mode === m ? '#00aae4' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel Manual ─────────────────────────────────────────────── */}
      {mode === 'manual' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: fanSwitch ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.06)',
          border: fanSwitch ? '1px solid rgba(76,175,80,0.3)' : '1px solid transparent',
          padding: '10px 16px', borderRadius: 16, marginBottom: 16,
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 18,
              animation: fanSwitch ? 'siloCtrlSpin 2s linear infinite' : 'none',
              color: fanSwitch ? '#4caf50' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.3s',
            }}>⚙</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ventiladores</span>
          </div>
          {/* Toggle switch */}
          <div onClick={() => { const v = !fanSwitch; setFanSwitch(v); sendControl({ state: v }); }}
            style={{
              width: 44, height: 24, borderRadius: 50, cursor: 'pointer',
              background: fanSwitch ? '#4caf50' : 'rgba(255,255,255,0.15)',
              position: 'relative', transition: 'background 0.3s',
            }}>
            <div style={{
              position: 'absolute', top: 3,
              left: fanSwitch ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }} />
          </div>
        </div>
      )}

      {/* ── Panel Auto ───────────────────────────────────────────────── */}
      {mode === 'auto' && (
        <div style={{ marginBottom: 16 }}>
          {/* Switch timer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.06)', padding: '10px 16px', borderRadius: 16, marginBottom: 10,
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Programación Horaria</span>
            <div onClick={() => { const v = !useTimer; setUseTimer(v); sendControl({ timer: v }); }}
              style={{
                width: 44, height: 24, borderRadius: 50, cursor: 'pointer',
                background: useTimer ? '#00aae4' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.3s',
              }}>
              <div style={{
                position: 'absolute', top: 3,
                left: useTimer ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
              }} />
            </div>
          </div>

          {/* Horarios */}
          {useTimer && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
              background: 'rgba(0,0,0,0.2)', padding: 14, borderRadius: 14,
            }}>
              {[
                { label: 'INICIO', value: startTime, onChange: (v) => { setStartTime(v); sendControl({ start: v }); } },
                { label: 'FIN',    value: endTime,   onChange: (v) => { setEndTime(v);   sendControl({ end: v }); } },
              ].map((t, i) => (
                <div key={t.label} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.55rem', color: '#00aae4', fontWeight: 900, display: 'block', marginBottom: 4 }}>
                    {t.label}
                  </span>
                  <input type="time" value={t.value}
                    onChange={(e) => t.onChange(e.target.value)}
                    style={{
                      background: 'transparent', border: 'none', color: 'white',
                      fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 'bold',
                      outline: 'none', colorScheme: 'dark', cursor: 'pointer',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Estado ventiladores ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 16,
        background: fansState ? 'rgba(76,175,80,0.08)' : 'rgba(0,0,0,0.4)',
        border: fansState ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.4s',
      }}>
        <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
          {fansState && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(76,175,80,0.4)',
              animation: 'siloCtrlPulse 1.5s infinite',
            }} />
          )}
          <span style={{
            fontSize: 18, display: 'block', lineHeight: '24px', textAlign: 'center',
            animation: fansState ? 'siloCtrlSpin 2.5s linear infinite' : 'none',
            color: fansState ? '#4caf50' : 'rgba(255,255,255,0.3)',
          }}>⚙</span>
        </div>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: fansState ? '#4caf50' : 'rgba(255,255,255,0.3)',
          letterSpacing: '0.5px',
          transition: 'color 0.3s',
        }}>
          {fansState ? 'SISTEMA DE AIREACIÓN ACTIVO' : 'SISTEMA EN ESPERA'}
        </span>
      </div>

      <style>{`
        @keyframes siloCtrlSpin  { to { transform: rotate(360deg); } }
        @keyframes siloCtrlPulse {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76,175,80,0.7); }
          70%  { transform: scale(1);   box-shadow: 0 0 0 10px rgba(76,175,80,0); }
          100% { transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}