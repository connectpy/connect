import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WaitingPlaceholder } from './GaugeWidget';

function calcSiloPoints({ rings = 0, cabos = [], rotation = 0, cx = 140, cy = 140, maxRadius = 110 }) {
  const points = [];
  let caboNumber = 1;

  points.push({ x: cx, y: cy, ring: -1, index: 0, label: `${caboNumber++}`, isCenter: true });

  const rotRad = (rotation * Math.PI) / 180;

  for (let r = 0; r < rings; r++) {
    const ringRadius = ((r + 1) / rings) * maxRadius;
    const count = cabos[r] ?? 4;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + rotRad + i * ((2 * Math.PI) / count);
      points.push({
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
        ring: r + 1,
        index: i,
        label: `${caboNumber++}`,
      });
    }
  }
  return points;
}

function SiloTopView({ config = {} }) {
  const { rings = 0, cabos = [], rotation = 0 } = config;
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38;
  const points = calcSiloPoints({ rings, cabos, rotation, cx, cy, maxRadius });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block' }}>
      <circle cx={cx} cy={cy} r={maxRadius + 10}
        stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />

      {Array.from({ length: rings }, (_, r) => {
        const rr = ((r + 1) / rings) * maxRadius;
        return (
          <circle key={r} cx={cx} cy={cy} r={rr}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        );
      })}

      {points.filter(p => p.ring > 0).map((p, i) => (
        <line key={`rl-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      ))}

      {points.map((p, i) => (
        <g key={`pt-${i}`}>
          <circle cx={p.x} cy={p.y}
            r={p.isCenter ? 5 : 3.5}
            fill="#00aae4"
            stroke={p.isCenter ? 'rgba(0,170,228,0.5)' : 'rgba(0,170,228,0.3)'}
            strokeWidth={p.isCenter ? 2 : 1}
          />
          {p.isCenter && (
            <circle cx={p.x} cy={p.y} r={9} fill="none"
              stroke="rgba(0,170,228,0.15)" strokeWidth="1" />
          )}
          <text x={p.x + (p.isCenter ? 12 : 7)}
            y={p.y + (p.isCenter ? -2 : 4)}
            fill="rgba(255,255,255,0.5)" fontSize={p.isCenter ? 9 : 8}
            fontWeight="600" textAnchor="start" dominantBaseline="middle">
            {p.label}
          </text>
        </g>
      ))}

      {/* Ladder reference */}
      <g>
        <line x1={cx + maxRadius + 14} y1={cy - 22} x2={cx + maxRadius + 14} y2={cy + 22}
          stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" />
        {[-16, -6, 4, 14].map((off, i) => (
          <line key={`rung-${i}`}
            x1={cx + maxRadius + 7} y1={cy + off}
            x2={cx + maxRadius + 21} y2={cy + off}
            stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" />
        ))}
        <text x={cx + maxRadius + 30} y={cy + 4}
          fill="rgba(255,255,255,0.15)" fontSize="7" textAnchor="start" dominantBaseline="middle">
          Escalera
        </text>
      </g>

      <text x={cx} y={size - 10} textAnchor="middle"
        fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">
        Anillos: {rings} | Cabos: [{cabos.join(', ')}] | Rotación: {rotation}°
      </text>
    </svg>
  );
}

export default function SiloDashboard({ data = {}, heatmap: heatmapProp = {}, siloConfig = {}, siloName = 'Silo Nro. 1' }) {
  const nivel = data.nivel ?? 0;
  const humGrano = data.humedad_grano ?? null;
  const tempMax = data.temp_max ?? null;
  const tempAvg = data.temp_avg ?? null;
  const tempMin = data.temp_min ?? null;
  const grano = data.grano ?? 'S/D';
  const activo = data.activo ?? false;
  const fansState = data.fans_state ?? false;
  const mode = data.mode ?? '--';
  const timer = data.timer ?? false;
  const startTime = data.start ?? '--:--';
  const endTime = data.end ?? '--:--';

  const fmt = (v, d = 1) => v !== null && v !== undefined ? Number(v).toFixed(d) : '--';
  const isAuto = mode === 'auto';

  /* ── Heatmap ─────────────────────────────────────────── */
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const labels = heatmapProp.labels ?? [];
  const days = heatmapProp.days ?? [];
  const heatmapData = heatmapProp.data ?? [];
  const showColor = heatmapProp.showColor ?? [];
  const hmTempMax = heatmapProp.temp_max ?? 40;
  const hmTempMin = heatmapProp.temp_min ?? 15;
  const hasHeatmap = heatmapData.length > 0;

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !hasHeatmap) return;
    const modifiedData = heatmapData.map((item) => {
      const [col, row, value] = Array.isArray(item) ? item : [item[0], item[1], item[2]];
      const flagRow = Array.isArray(showColor) && showColor[col];
      const flagValue = Array.isArray(flagRow) ? flagRow[row] : (showColor?.[col]?.[row] ?? true);
      if (!flagValue) {
        return {
          value: [col, row, value],
          itemStyle: { color: 'rgba(255,255,255,0.06)' },
          label: { color: 'rgba(255,255,255,0.2)' },
        };
      }
      return [col, row, value];
    });

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: (params) => {
          const val = Array.isArray(params.value) ? params.value[2] : params.data?.value?.[2];
          const caboLabel = Array.isArray(labels) ? (labels[params.value[0]] ?? params.value[0]) : params.value[0];
          const sensorNum = (params.value[1] ?? 0) + 1;
          return `<b style="color:#00aae4">${caboLabel}</b> — Sensor ${sensorNum}<br/>
                  <b style="font-size:15px">${typeof val === 'number' ? val.toFixed(2) : val} °C</b>`;
        },
      },
      grid: { top: '8%', bottom: '8%', left: '5%', right: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: Array.isArray(labels) ? labels : [],
        axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: Array.isArray(days) ? days.map((_, i) => i + 1) : [],
        axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { show: false },
      },
      visualMap: [{
        min: hmTempMin, max: hmTempMax, calculable: true, show: false,
        orient: 'horizontal', left: 'center', bottom: '0%',
        inRange: { color: ['#22c55e', '#eab308', '#f97316', '#ef4444'] },
      }],
      series: [{
        name: '°C', type: 'heatmap', data: modifiedData,
        label: {
          show: true, fontSize: 10, fontWeight: 600,
          formatter: (params) => {
            const val = Array.isArray(params.value) ? params.value[2] : params.data?.value?.[2];
            return typeof val === 'number' ? val.toFixed(1) : '';
          },
        },
        itemStyle: { borderWidth: 2, borderColor: 'rgba(15,23,42,0.8)', borderRadius: 3 },
        emphasis: {
          itemStyle: {
            shadowBlur: 12, shadowColor: 'rgba(0,170,228,0.5)',
            borderColor: '#00aae4', borderWidth: 2,
          },
        },
      }],
    }, true);
  }, [heatmapData, showColor, labels, days, hmTempMax, hmTempMin]);

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
      {/* ── Header ─────────────────────────────────────── */}
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

      {/* ── Main row: left (info) | right (silo) ──────── */}
      <div style={{
        display: 'flex', gap: 20,
        flexWrap: 'wrap', alignItems: 'stretch',
      }}>
        {/* ── Left panel ──────────────────────────────────── */}
        <div style={{
          flex: '1 1 240px', minWidth: 200,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Nivel + Humedad */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '10px 14px', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <svg width="48" height="48" viewBox="0 0 65 65" style={{ flexShrink: 0 }}>
              <circle cx="32.5" cy="32.5" r="26" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
              <circle cx="32.5" cy="32.5" r="26" stroke="#00aae4" strokeWidth="6" fill="none"
                strokeDasharray={`${(nivel / 100) * 163.4} 163.4`}
                strokeLinecap="round" transform="rotate(-90 32.5 32.5)"
                style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              <text x="32.5" y="32.5" textAnchor="middle" dominantBaseline="middle"
                fontWeight="800" fontSize="11" fill="white">{nivel}%</text>
            </svg>
            <div>
              <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>
                Estado de Carga
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {fmt(humGrano, 1)}
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>% Humedad</span>
              </span>
            </div>
          </div>

          {/* Temperatures compact */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Máx', value: fmt(tempMax), color: '#ef4444' },
              { label: 'Media', value: fmt(tempAvg), color: 'white' },
              { label: 'Mín', value: fmt(tempMin), color: '#3b82f6' },
            ].map((t) => (
              <div key={t.label} style={{
                flex: 1, background: 'rgba(0,0,0,0.2)',
                padding: '6px 4px', borderRadius: 10, textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block' }}>
                  {t.label}
                </span>
                <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: t.color, marginTop: 2 }}>
                  {t.value}°
                </span>
              </div>
            ))}
          </div>

          {/* Mode compact */}
          <div>
            <div style={{
              display: 'flex', borderRadius: 10, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
            }}>
              {['manual', 'auto'].map((m) => (
                <div key={m} style={{
                  flex: 1, padding: '5px 0', textAlign: 'center',
                  fontWeight: 700, fontSize: '0.65rem', letterSpacing: '1px',
                  background: mode === m ? '#00aae4' : 'transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.3s',
                }}>
                  {m.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Timer compact */}
          {isAuto && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>
                  Programación
                </span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50,
                  background: timer ? 'rgba(0,170,228,0.15)' : 'rgba(255,255,255,0.06)',
                  color: timer ? '#00aae4' : 'rgba(255,255,255,0.3)',
                  border: timer ? '1px solid rgba(0,170,228,0.3)' : '1px solid transparent',
                }}>
                  {timer ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 8,
                opacity: timer ? 1 : 0.4,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.5rem', color: '#00aae4', fontWeight: 900, display: 'block', marginBottom: 1 }}>
                    INICIO
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700 }}>
                    {startTime}
                  </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem' }}>→</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.5rem', color: '#00aae4', fontWeight: 900, display: 'block', marginBottom: 1 }}>
                    FIN
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700 }}>
                    {endTime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fan status compact */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: fansState ? 'rgba(76,175,80,0.08)' : 'rgba(0,0,0,0.4)',
            border: fansState ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.4s',
          }}>
            <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
              {fansState && (
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(76,175,80,0.4)',
                  animation: 'siloDashPulse 1.5s infinite',
                }} />
              )}
              <span style={{
                fontSize: 15, display: 'block', lineHeight: '20px', textAlign: 'center',
                animation: fansState ? 'siloDashSpin 2.5s linear infinite' : 'none',
                color: fansState ? '#4caf50' : 'rgba(255,255,255,0.3)',
              }}>⚙</span>
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: fansState ? '#4caf50' : 'rgba(255,255,255,0.3)',
              letterSpacing: '0.5px',
            }}>
              {fansState ? 'VENTILADORES ENCENDIDOS' : 'VENTILADORES APAGADOS'}
            </span>
          </div>
        </div>

        {/* ── Right panel: Silo top view ────────────────── */}
        <div style={{
          flex: '0 0 auto', width: 260,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SiloTopView config={siloConfig} />
        </div>
      </div>

      {/* ── Heatmap ─────────────────────────────────────── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />

      <div>
        <span style={{
          fontSize: '0.6rem', color: '#00aae4', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '1.5px', display: 'block', marginBottom: 8,
        }}>
          Termometría — Cabos
        </span>
        <div style={{ position: 'relative', width: '100%', minHeight: 240 }}>
          {!hasHeatmap && (
            <WaitingPlaceholder text="Esperando datos de termometría..." />
          )}
          <div ref={chartRef} style={{
            width: '100%', height: 240,
            opacity: hasHeatmap ? 1 : 0,
            transition: 'opacity 0.4s',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes siloDashSpin  { to { transform: rotate(360deg); } }
        @keyframes siloDashPulse {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76,175,80,0.7); }
          70%  { transform: scale(1);   box-shadow: 0 0 0 10px rgba(76,175,80,0); }
          100% { transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
