import { useTopic } from '../hooks/MqttContext';

/**
 * SiloControlCard — solo lectura
 * Muestra el estado del sistema de aireacion recibido desde Node-RED.
 * No envía ningún comando.
 *
 * Node-RED envia (topic: "silo1/datos"):
 * {
 *   nivel: 72,
 *   humedad_grano: 13.5,
 *   temp_max: 28.1, temp_avg: 24.3, temp_min: 20.6,
 *   grano: "SOJA",
 *   activo: true,
 *   fans_state: true,   // confirmacion fisica — ventilador encendido
 *   mode: "auto",       // "manual" | "auto"
 *   timer: true,        // usa programacion horaria
 *   start: "22:00",
 *   end: "06:00"
 * }
 */
export default function SiloControlCard({ topic, siloName = 'Silo Nro. 1' }) {
  const { getField } = useTopic(topic);

  const nivel      = getField('nivel')         ?? 0;
  const humGrano   = getField('humedad_grano');
  const tempMax    = getField('temp_max');
  const tempAvg    = getField('temp_avg');
  const tempMin    = getField('temp_min');
  const grano      = getField('grano')         ?? 'S/D';
  const activo     = getField('activo')        ?? false;
  const fansState  = getField('fans_state')    ?? false;  // estado fisico ventilador
  const mode       = getField('mode')          ?? '--';
  const timer      = getField('timer')         ?? false;
  const startTime  = getField('start')         ?? '--:--';
  const endTime    = getField('end')           ?? '--:--';

  const fmt = (v, d = 1) => v !== null && v !== undefined ? Number(v).toFixed(d) : '--';

  const isAuto   = mode === 'auto';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 24,
      padding: 24,
      color: 'white',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '1.5px', color: '#00aae4',
            fontWeight: 800, display: 'block', textTransform: 'uppercase',
          }}>
            Estado de Aireación
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.9)' }}>
            {siloName} — {grano}
          </span>
        </div>
        <span style={{
          fontSize: '0.6rem', padding: '4px 10px', borderRadius: 50, fontWeight: 700,
          border: activo ? '1px solid rgba(0,170,228,0.5)' : '1px solid rgba(255,255,255,0.1)',
          color: activo ? '#00aae4' : 'rgba(255,255,255,0.3)',
        }}>
          {activo ? 'CONECTADO' : 'DESCONECTADO'}
        </span>
      </div>

      {/* ── Nivel + Humedad ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.04)',
        padding: 16, borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
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

      {/* ── Temperaturas ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Máx',   value: fmt(tempMax), color: '#ef4444' },
          { label: 'Media', value: fmt(tempAvg), color: 'white'   },
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

      {/* ── Divisor ────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />

      {/* ── Modo de operación ──────────────────────────────────────────── */}
      <div>
        <span style={{
          fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 8,
        }}>
          Modo de Aireación
        </span>

        {/* Indicador MANUAL / AUTO */}
        <div style={{
          display: 'flex', borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          {['manual', 'auto'].map((m) => (
            <div key={m} style={{
              flex: 1, padding: '8px 0', textAlign: 'center',
              fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px',
              background: mode === m ? '#00aae4' : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.3s',
            }}>
              {m.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* ── Info según modo ────────────────────────────────────────────── */}

      {isAuto && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Programación horaria */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Programación horaria
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50,
              background: timer ? 'rgba(0,170,228,0.15)' : 'rgba(255,255,255,0.06)',
              color: timer ? '#00aae4' : 'rgba(255,255,255,0.3)',
              border: timer ? '1px solid rgba(0,170,228,0.3)' : '1px solid transparent',
            }}>
              {timer ? 'ACTIVA' : 'INACTIVA'}
            </span>
          </div>

          {/* Horario — siempre visible en modo auto */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: 10,
            opacity: timer ? 1 : 0.4,
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.55rem', color: '#00aae4', fontWeight: 900, display: 'block', marginBottom: 2 }}>
                INICIO
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700 }}>
                {startTime}
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem' }}>→</span>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.55rem', color: '#00aae4', fontWeight: 900, display: 'block', marginBottom: 2 }}>
                FIN
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700 }}>
                {endTime}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Estado físico del ventilador ───────────────────────────────── */}
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
        <div>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, display: 'block',
            color: fansState ? '#4caf50' : 'rgba(255,255,255,0.3)',
            letterSpacing: '0.5px', transition: 'color 0.3s',
          }}>
            {fansState ? 'VENTILADORES ENCENDIDOS' : 'VENTILADORES APAGADOS'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: 2, display: 'block' }}>
            Estado físico confirmado
          </span>
        </div>
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