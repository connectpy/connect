import { useState } from 'react';

export default function DaysWithoutAccident({
  value = null,
  label = 'Días sin accidentes',
  sector_id = 'planta_norte',
  clientId = 'demo',
  apiBase = 'https://nodered.connectparaguay.com',
}) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setConfirming(false);
    setResetting(true);
    fetch(`${apiBase}/api/accidentes/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector_id }),
    });
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

      {confirming ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 12,
              padding: '10px 20px',
              color: '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: resetting ? 'not-allowed' : 'pointer',
              opacity: resetting ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.3s',
            }}
          >
            Sí, reiniciar
          </button>
          <button
            onClick={() => setConfirming(false)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '10px 20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s',
            }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={resetting}
          style={{
            background: 'rgba(0,170,228,0.1)',
            border: '1px solid rgba(0,170,228,0.3)',
            borderRadius: 12,
            padding: '10px 24px',
            color: resetting ? 'rgba(255,255,255,0.4)' : '#00aae4',
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
          {resetting ? 'Reiniciando...' : 'Reiniciar'}
        </button>
      )}
    </div>
  );
}
