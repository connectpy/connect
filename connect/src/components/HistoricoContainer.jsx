import { useState, useCallback, useEffect, useRef } from 'react';
import { useMqttStatus, useTopic } from '../hooks/MqttContext';
import * as echarts from 'echarts';

// ─────────────────────────────────────────────────────────────────────────────
// HistoricoContainer
//
// Selectores: cabos (botones) + desde/hasta (date) + botón Consultar
// Gráficos:
//   1. CaboHeatmap  — filas=sensores, columnas=fechas, color solo donde hay_grano=true
//   2. LineChartArea — temperatura media + zonas aireación + zonas sin grano
//
// Flujo WebSocket:
//   React → Node-RED:  { action:'query_historico_cabo', cabo, from, to }
//   Node-RED → React:  { topic:'historico_cabo', payload:{ sensors, heatmap, hayGrano, linea } }
//
// Props:
//   cabos   : [{ id:'cabo0', label:'Cabo 1' }, ...]   ← del JSON de config
//   siloId  : string   ← para distinguir múltiples instancias en distintos silos
//   unit    : string   (default '°C')
//   min     : number   (default 15)
//   max     : number   (default 40)
// ─────────────────────────────────────────────────────────────────────────────
export default function HistoricoContainer({
  cabos  = [],
  siloId = 'silo1',
  unit   = '°C',
  min    = 15,
  max    = 40,
}) {
  const { sendMessage, status } = useMqttStatus();

  // Escuchar respuesta en topic 'historico_cabo'
  // Node-RED envía: { topic: 'historico_cabo', payload: { sensors, heatmap, hayGrano, linea } }
  const { getField } = useTopic('historico_cabo');

  const now   = new Date();
  const week  = new Date(now.getTime() - 7 * 86400000);

  const [cabo,     setCabo]    = useState(cabos[0]?.id ?? null);
  const [from,     setFrom]    = useState(week.toISOString().slice(0, 10));
  const [to,       setTo]      = useState(now.toISOString().slice(0, 10));
  const [loading,  setLoading] = useState(false);
  const [queried,  setQueried] = useState(false);
  const [error,    setError]   = useState(null);
  const timerRef               = useRef(null);

  // Datos que llegan desde Node-RED
  const sensors  = getField('sensors')  ?? [];
  const heatmap  = getField('heatmap')  ?? [];
  const hayGrano = getField('hayGrano') ?? [];
  const linea    = getField('linea')    ?? [];

  // Cuando llegan datos nuevos → cerrar loading
  useEffect(() => {
    if (sensors.length > 0 || heatmap.length > 0) {
      setLoading(false);
      setQueried(true);
      clearTimeout(timerRef.current);
    }
  }, [sensors, heatmap]);

  const caboActivo = cabos.find(c => c.id === cabo) ?? cabos[0];

  const handleQuery = useCallback(() => {
    if (status !== 'connected') { setError('Sin conexión al servidor'); return; }
    if (!cabo)                  { setError('Seleccioná un cabo'); return; }
    if (!from || !to)           { setError('Seleccioná un rango de fechas'); return; }
    if (new Date(from) > new Date(to)) { setError('La fecha inicio debe ser menor al fin'); return; }

    setError(null);
    setLoading(true);
    setQueried(false);

    sendMessage({
      action: 'query_historico_cabo',
      siloId,
      cabo:   caboActivo,
      from,
      to,
    });

    // Timeout de seguridad 15s
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
      setError('Sin respuesta del servidor (timeout)');
    }, 15000);
  }, [status, cabo, from, to, siloId, caboActivo, sendMessage]);

  // ── Estilos ────────────────────────────────────────────────────────────────
  const isConnected = status === 'connected';

  const inputStyle = {
    background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, color: '#f1f5f9', fontSize: 13,
    padding: '8px 12px', outline: 'none', colorScheme: 'dark',
  };
  const labelCss = {
    fontSize: 10, color: '#475569', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 5,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>

      {/* ── Panel de selectores ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(10,22,40,0.95), rgba(15,30,55,0.95))',
        borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Cabos */}
        <div>
          <label style={labelCss}>Cabo</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cabos.map(c => (
              <button key={c.id} onClick={() => setCabo(c.id)}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  transition: 'all 0.18s',
                  background: cabo === c.id
                    ? 'linear-gradient(135deg,#00aae4,#0076b3)'
                    : 'rgba(255,255,255,0.05)',
                  color:  cabo === c.id ? '#fff' : 'rgba(255,255,255,0.4)',
                  border: cabo === c.id
                    ? '1px solid rgba(0,170,228,0.5)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: cabo === c.id ? '0 0 12px rgba(0,170,228,0.25)' : 'none',
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desde */}
        <div>
          <label style={labelCss}>Desde</label>
          <input type="date" value={from} max={to}
            onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>

        {/* Hasta */}
        <div>
          <label style={labelCss}>Hasta</label>
          <input type="date" value={to} min={from} max={now.toISOString().slice(0,10)}
            onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>

        {/* Botón consultar */}
        <button onClick={handleQuery} disabled={!isConnected || loading}
          style={{
            padding: '9px 26px', borderRadius: 8, border: 'none',
            cursor: isConnected && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.18s',
            background: isConnected && !loading
              ? 'linear-gradient(135deg,#00aae4,#0076b3)' : '#1e293b',
            color:     isConnected && !loading ? '#fff' : '#334155',
            boxShadow: isConnected && !loading ? '0 0 16px rgba(0,170,228,0.28)' : 'none',
          }}>
          {loading
            ? <><Spin /> Consultando...</>
            : '⟵ Consultar'
          }
        </button>

        {!isConnected && (
          <span style={{ fontSize: 11, color: '#ef4444', alignSelf: 'flex-end', paddingBottom: 8 }}>
            ● Sin conexión
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 12, color: '#ef4444',
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {error}
        </div>
      )}

      {/* ── Heatmap ─────────────────────────────────────────────────────────── */}
      <Card label={`Termometría — ${caboActivo?.label ?? ''}`}
            meta={queried && heatmap.length > 0 ? `${heatmap.length} turnos · ${sensors.length} sensores` : null}>
        {!queried
          ? <Placeholder text="Seleccioná un cabo y un rango de fechas" height={200} />
          : heatmap.length === 0
            ? <Placeholder text="Sin datos para el rango seleccionado" height={200} />
            : <CaboHeatmap sensors={sensors} heatmap={heatmap} hayGrano={hayGrano}
                unit={unit} min={min} max={max} />
        }
      </Card>

      {/* ── Línea temperatura + aireación + grano ───────────────────────────── */}
      <Card label="Temperatura Media · Aireación · Grano"
            meta={queried && linea.length > 0 ? `${linea.length} puntos` : null}>
        {!queried
          ? <Placeholder text="Seleccioná un cabo y un rango de fechas" height={240} />
          : linea.length === 0
            ? <Placeholder text="Sin datos para el rango seleccionado" height={240} />
            : <LineChartArea data={linea} unit={unit} />
        }
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CaboHeatmap — una sola serie, visualMap con valor centinela para sin-grano
// ─────────────────────────────────────────────────────────────────────────────
function CaboHeatmap({ sensors, heatmap, hayGrano, unit, min, max }) {
  const ref = useRef(null);
  const ec  = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ec.current = echarts.init(ref.current, null, { renderer: 'canvas' });
    const onResize = () => ec.current?.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); ec.current?.dispose(); ec.current = null; };
  }, []);

  useEffect(() => {
    if (!ec.current || !heatmap.length || !sensors.length) return;

    const fechas   = heatmap.map(d => d.fecha);
    const SENTINEL = min - 1; // valor fuera de rango → outOfRange (gris)

    const granoIdx = {};
    hayGrano.forEach(r => { granoIdx[r.fecha] = r; });

    // [fechaIdx, sensorIdx, valorVM, tempReal, tieneGrano]
    const data = [];
    heatmap.forEach((row, fi) => {
      const gr = granoIdx[row.fecha] || {};
      sensors.forEach((s, si) => {
        const t = row[s];
        if (t == null) return;
        const tiene = gr[s] === true || gr[s] === 1 || gr[s] === 'true';
        data.push([fi, si, tiene ? Number(t) : SENTINEL, Number(t), tiene ? 1 : 0]);
      });
    });

    const height = Math.max(160, sensors.length * 36 + 50);
    ref.current.style.height = height + 'px';
    ec.current.resize();

    ec.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: p => {
          const [fi, si, , temp, grano] = p.value;
          return `
            <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:4px">${fechas[fi]}</div>
            <b style="color:#00aae4">${sensors[si]}</b><br/>
            <b style="font-size:17px">${Number(temp).toFixed(1)} ${unit}</b><br/>
            <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:4px;
              font-size:10px;font-weight:700;
              background:${grano ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.15)'};
              color:${grano ? '#22c55e' : '#64748b'}">
              ${grano ? 'Con grano' : 'Sin grano'}
            </span>`;
        },
      },
      grid: { top: 4, bottom: 40, left: '3%', right: '3%', containLabel: true },
      xAxis: {
        type: 'category', data: fechas, position: 'bottom',
        axisLabel: {
          color: 'rgba(255,255,255,0.4)', fontSize: 9, rotate: 35,
          interval: fechas.length <= 10 ? 0 : Math.floor(fechas.length / 8),
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category', data: sensors,
        axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitLine: { show: false },
      },
      visualMap: {
        min, max, dimension: 2, show: false, seriesIndex: 0,
        inRange:    { color: ['#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444'] },
        outOfRange: { color: ['rgba(20,30,50,0.9)'] },
      },
      series: [{
        type: 'heatmap', data,
        label: {
          show: true, fontSize: 10, fontWeight: 700,
          formatter: p => Number(p.value[3]).toFixed(1),
          color: p => p.value[4] === 1 ? '#fff' : 'rgba(255,255,255,0.25)',
        },
        itemStyle: { borderWidth: 2, borderColor: 'rgba(5,12,25,0.8)', borderRadius: 3 },
        emphasis:  { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,170,228,0.4)', borderColor: '#00aae4', borderWidth: 2 } },
      }],
    }, true);
  }, [heatmap, hayGrano, sensors, unit, min, max]);

  return (
    <div>
      <div style={{ display:'flex', gap:14, justifyContent:'flex-end', marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>{min}{unit}</span>
          <div style={{ width:72, height:7, borderRadius:4, background:'linear-gradient(to right,#3b82f6,#06b6d4,#10b981,#f59e0b,#ef4444)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>{max}{unit}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:13, height:9, borderRadius:2, background:'rgba(20,30,50,0.9)', border:'1px solid rgba(100,116,139,0.2)' }} />
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>Sin grano</span>
        </div>
      </div>
      <div ref={ref} style={{ width:'100%', height:160 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineChartArea — visualMap pieces: área solo cuando aireación está activa
// ─────────────────────────────────────────────────────────────────────────────
function LineChartArea({ data, unit = '°C' }) {
  const ref = useRef(null);
  const ec  = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ec.current = echarts.init(ref.current, null, { renderer: 'canvas' });
    const onResize = () => ec.current?.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); ec.current?.dispose(); ec.current = null; };
  }, []);

  useEffect(() => {
    if (!ec.current || !data?.length) return;

    const times = data.map(d => {
      const dt = new Date(d.timestamp);
      return dt.toLocaleDateString('es-PY',  { day:'2-digit', month:'2-digit' })
           + ' ' + dt.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' });
    });
    const values   = data.map(d => d.temp ?? null);
    const airBools = data.map(d => d.aireacion === true || d.aireacion === 1 || d.aireacion === 'true');

    // pieces para visualMap — área azul solo donde aireación = true, transparente el resto
    const pieces = buildPieces(airBools,
      'rgba(0,170,228,0.30)',   // aireación ON  → área azul
      'rgba(0,0,0,0)'           // aireación OFF → sin área
    );


    ec.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: params => {
          const idx  = params[0]?.dataIndex ?? 0;
          const val  = values[idx];
          const aire = airBools[idx];
          return `
            <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:5px">${times[idx]}</div>
            <b style="color:#f59e0b;font-size:18px">${val != null ? Number(val).toFixed(1) : '—'}</b>
            <span style="color:rgba(255,255,255,0.35)"> ${unit}</span>
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
                background:${aire ? 'rgba(0,170,228,0.2)' : 'rgba(100,116,139,0.15)'};
                color:${aire ? '#00aae4' : '#64748b'}">
                Aire: ${aire ? 'ON' : 'OFF'}
              </span>

            </div>`;
        },
      },
      grid: { top: 16, bottom: 50, left: 52, right: 16, containLabel: false },
      xAxis: {
        type: 'category', boundaryGap: false, data: times,
        axisLabel: {
          color: 'rgba(255,255,255,0.25)', fontSize: 9, rotate: 30,
          interval: Math.max(0, Math.floor(times.length / 8) - 1),
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, formatter: v => v + unit },
        axisLine:  { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
      },
      visualMap: {
        show: false, dimension: 0, seriesIndex: 0, pieces,
      },
      series: [
        {
          type: 'line', data: values, smooth: 0.3, symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: { color: 'rgba(0,0,0,0)' },  // base transparente; visualMap pieces sobreescribe
          markLine: {
            silent: true,
            lineStyle: { color: 'rgba(255,255,255,0.07)', type: 'dashed' },
            data: [{ type: 'average' }],
            label: {
              formatter: p => 'Med: ' + Number(p.value).toFixed(1) + unit,
              color: 'rgba(255,255,255,0.2)', fontSize: 9,
            },
          },
        },
      ],
    }, true);
  }, [data, unit]);

  // Leyenda
  return (
    <div>
      <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginBottom:6, flexWrap:'wrap' }}>
        <LegBadge color="#f59e0b"                    label="Temperatura"   type="line" />
        <LegBadge color="rgba(0,170,228,0.30)"       label="Aireación ON"  border="rgba(0,170,228,0.4)" />
      </div>
      <div ref={ref} style={{ width:'100%', height:240 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildPieces(bools, colorTrue, colorFalse) {
  const pieces = []; let cur = bools[0]; let s = 0;
  for (let i = 1; i <= bools.length; i++) {
    if (i === bools.length || bools[i] !== cur) {
      pieces.push({ gte: s, lte: i-1, color: cur ? colorTrue : colorFalse });
      if (i < bools.length) { cur = bools[i]; s = i; }
    }
  }
  return pieces;
}


// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function Card({ label, meta, children }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(10,22,40,0.95),rgba(15,30,55,0.95))',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.65)', letterSpacing:'0.04em' }}>
          {label}
        </span>
        {meta && <span style={{ fontSize:10, color:'#334155' }}>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Placeholder({ text, height }) {
  return (
    <div style={{ height, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.1)', textAlign:'center' }}>{text}</span>
    </div>
  );
}

function Spin() {
  return <span style={{ display:'inline-block', animation:'hcSpin 0.8s linear infinite' }}>⟳
    <style>{`@keyframes hcSpin{to{transform:rotate(360deg)}}`}</style>
  </span>;
}

function LegBadge({ color, label, type, border }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      {type === 'line'
        ? <div style={{ width:16, height:2, background:color, borderRadius:2 }} />
        : <div style={{ width:13, height:9, background:color, borderRadius:2, border:`1px solid ${border||'transparent'}` }} />
      }
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{label}</span>
    </div>
  );
}