import { useState } from 'react';

export default function DaysWithoutAccident({
  value = null,
  label = 'Días sin accidentes',
  sector_id = 'planta_norte',
  clientId = 'demo',
  apiBase = 'https://nodered.connectparaguay.com',
}) {
  const [resetting, setResetting] = useState(false);
  const [resetOk, setResetOk] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    setResetting(true);
    setResetOk(false);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${apiBase}/api/accidentes/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResetOk(true);
      setTimeout(() => setResetOk(false), 3000);
    } catch (err) {
      clearTimeout(timeout);
      setError(err.name === 'AbortError' ? 'Timeout' : err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setResetting(false);
    }
  };

  const days = value !== null && value !== undefined ? Number(value) : null;
  const displayDays = days !== null ? Math.floor(days) : null;

  const isZero = days === 0;
  const digitColor = isZero ? '#ef4444' : '#22c55e';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: '28px 24px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.37)',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      textAlign: 'center',
      transition: 'border 0.3s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.border = '1px solid rgba(0,170,228,0.5)'}
      onMouseLeave={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
    >
      <div style={{ fontSize: '0.65rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>
        {label}
      </div>

      {displayDays !== null ? (
        <>
          <div style={{
            fontSize: '4rem',
            fontWeight: 300,
            lineHeight: 1,
            color: digitColor,
            fontVariantNumeric: 'tabular-nums',
            textShadow: isZero
              ? '0 0 40px rgba(239,68,68,0.4)'
              : '0 0 40px rgba(34,197,94,0.3)',
            transition: 'color 0.4s, text-shadow 0.4s',
            marginBottom: 4,
          }}>
            {displayDays}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontWeight: 500,
            marginBottom: 24,
          }}>
            {displayDays === 1 ? 'día' : 'días'}
          </div>
        </>
      ) : (
        <div style={{
          fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)',
          marginBottom: 24, padding: '24px 0',
        }}>
          Sin datos
        </div>
      )}

      <button
        onClick={handleReset}
        disabled={resetting}
        style={{
          background: resetOk
            ? 'rgba(34,197,94,0.15)'
            : error
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(0,170,228,0.1)',
          border: resetOk
            ? '1px solid rgba(34,197,94,0.4)'
            : error
              ? '1px solid rgba(239,68,68,0.4)'
              : '1px solid rgba(0,170,228,0.3)',
          borderRadius: 12,
          padding: '10px 24px',
          color: resetOk ? '#22c55e' : error ? '#ef4444' : '#00aae4',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          cursor: resetting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          opacity: resetting ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        {resetting ? 'Reiniciando...' : resetOk ? 'Reiniciado ✓' : error ? `Error: ${error}` : 'Reiniciar'}
      </button>
    </div>
  );
}
