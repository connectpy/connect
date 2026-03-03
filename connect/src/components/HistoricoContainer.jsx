import { useState, useCallback } from 'react';
import { useMqttStatus } from '../hooks/MqttContext';
import LineChartWidget from './LineChartWidget';

/**
 * HistoricoContainer
 * Widget de tipo 'historico' en el JSON de configuracion.
 *
 * Flujo:
 *   1. Usuario elige rango de fechas (desde / hasta)
 *   2. Pulsa "Consultar"
 *   3. Se envia por WebSocket:
 *      {
 *        action: "query_history",
 *        from:   "2024-01-15T00:00:00.000Z",
 *        to:     "2024-01-15T23:59:59.000Z",
 *        charts: [{ topic, field, fields }]
 *      }
 *   4. Node-RED consulta InfluxDB y responde con arrays de puntos por topic
 *   5. MqttContext recibe los arrays y REEMPLAZA las series
 *   6. Los LineChartWidget se actualizan automaticamente
 *
 * Props del config (widget.tipo === 'historico'):
 *   charts : misma config que en containers — tipo 'line' unicamente
 *   label  : titulo del bloque
 */
export default function HistoricoContainer({ charts = [], label }) {
  const { sendMessage, status } = useMqttStatus();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);

  const [from, setFrom] = useState(yesterday.toISOString().slice(0, 16));
  const [to, setTo]     = useState(now.toISOString().slice(0, 16));
  const [loading, setLoading]   = useState(false);
  const [queried, setQueried]   = useState(false);
  const [error, setError]       = useState(null);

  const handleQuery = useCallback(() => {
    if (status !== 'connected') { setError('Sin conexion al servidor'); return; }
    if (!from || !to)           { setError('Selecciona un rango de fechas'); return; }
    if (new Date(from) >= new Date(to)) { setError('Fecha inicio debe ser anterior a fecha fin'); return; }

    setError(null);
    setLoading(true);
    setQueried(false);

    const sent = sendMessage({
      action: 'query_history',
      from:   new Date(from).toISOString(),
      to:     new Date(to).toISOString(),
      // Incluimos los charts para que Node-RED sepa que topics/fields traer
      charts: charts.map((c) => ({
        topic:  c.topic,
        field:  c.field  || null,
        fields: c.fields || null,
      })),
    });

    if (sent) {
      // Marcamos como consultado despues de un tiempo prudencial.
      // Los datos llegaran via WS y MqttContext los actualizara automaticamente.
      setTimeout(() => { setLoading(false); setQueried(true); }, 2000);
    } else {
      setLoading(false);
      setError('No se pudo enviar la consulta');
    }
  }, [status, from, to, charts, sendMessage]);

  const isConnected = status === 'connected';

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    colorScheme: 'dark',
  };

  const labelStyle = {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{ width: '100%' }}>

      {/* ── Selectores de fecha ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: 10,
        border: '1px solid #1e293b',
        marginBottom: 20,
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Desde</label>
          <input
            type="datetime-local"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Hasta</label>
          <input
            type="datetime-local"
            value={to}
            min={from}
            max={now.toISOString().slice(0, 16)}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Boton Consultar */}
        <button
          onClick={handleQuery}
          disabled={!isConnected || loading}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            cursor: isConnected && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: 13,
            alignSelf: 'flex-end',
            background: isConnected && !loading
              ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
              : '#1e293b',
            color: isConnected && !loading ? '#fff' : '#475569',
            boxShadow: isConnected && !loading ? '0 0 12px #06b6d444' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 14, height: 14,
                border: '2px solid #475569',
                borderTopColor: '#06b6d4',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'historicoSpin 0.8s linear infinite',
              }} />
              Consultando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Consultar
            </>
          )}
        </button>

        {!isConnected && (
          <span style={{ fontSize: 12, color: '#ef4444', alignSelf: 'flex-end', paddingBottom: 8 }}>
            Sin conexion
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: '#1a0a0a', border: '1px solid #ef444444',
          color: '#ef4444', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Graficos ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {charts.map((chart) => {
          const { id, tipo, ...rest } = chart;
          if (tipo !== 'line') return null;

          return (
            <div key={id} style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              borderRadius: 10,
              border: '1px solid #1e293b',
              padding: '16px 12px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                {rest.label}
              </div>

              {!queried ? (
                // Placeholder inicial — antes de hacer la primera consulta
                <div style={{
                  height: 200,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p style={{ margin: 0, color: '#334155', fontSize: 12 }}>
                    Selecciona un rango y pulsa Consultar
                  </p>
                </div>
              ) : (
                <LineChartWidget
                  topic={rest.topic}
                  field={rest.field}
                  label=""
                  unit={rest.unit || rest.medicion || ''}
                  timeRange={null}
                  color={rest.color || '#06b6d4'}
                  showArea={rest.showArea !== false}
                />
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes historicoSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}