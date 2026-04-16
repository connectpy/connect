import { useState, useCallback, useRef } from 'react';
import { useHistorico } from '../hooks/SensorContext';
import * as echarts from 'echarts';
import { useEffect } from 'react';

/**
 * HistoricoContainer
 *
 * Props (vienen del JSON config del widget):
 *   cabos   : [{ id, label, sensorIds: ['s1','s2',...], queryConfig: { field, window, fn } }]
 *   siloId  : string
 *   unit    : string
 *   min     : number
 *   max     : number
 *
 * Flujo:
 *   1. Usuario elige cabo + rango de fechas y presiona Consultar
 *   2. useHistorico().query() hace GET /api/consulta/:clientId con los params
 *   3. Respuesta: { [sensorId]: [{ timestamp, value }] }
 *   4. Se renderizan CaboHeatmap + LineChartArea con los datos
 *
 * Formato de respuesta esperada del backend:
 * {
 *   "caaty/secadero/T1": [
 *     { "timestamp": "2026-03-01T00:00:00Z", "value": 26.1, "hay_grano": true },
 *     ...
 *   ],
 *   "caaty/secadero/T2": [...],
 * }
 * El heatmap construye filas=sensorIds, columnas=timestamps agrupados.
 * La línea usa un sensorId de referencia (el primero) para temperatura media.
 * hay_grano viene como field separado si se configuró en queryConfig.
 */
export default function HistoricoContainer({
  cabos  = [],
  siloId = 'silo',
  unit   = '°C',
  min    = 15,
  max    = 40,
}) {
  const { query, data, loading, error } = useHistorico();

  const now  = new Date();
  const week = new Date(now.getTime() - 7 * 86400000);

  const [cabo,   setCabo]   = useState(cabos[0]?.id ?? null);
  const [from,   setFrom]   = useState(week.toISOString().slice(0, 10));
  const [to,     setTo]     = useState(now.toISOString().slice(0, 10));
  const [queried, setQueried] = useState(false);

  const caboActivo = cabos.find(c => c.id === cabo) ?? cabos[0];

  const handleQuery = useCallback(async () => {
    if (!caboActivo) return;
    const cfg = caboActivo.queryConfig || {};

    const rawFields = cfg.fields ?? cfg.field;
    const fields = rawFields
      ? (Array.isArray(rawFields) ? rawFields : [rawFields])
      : ['value', 'hayGrano'];

    await query({
      sensorIds: caboActivo.sensorIds || [],
      desde:     `${from}T00:00:00Z`,
      hasta:     `${to}T23:59:59Z`,
      fields,
      window:    cfg.window || '1h',
      fn:        cfg.fn     || 'mean',
    });
    setQueried(true);
  }, [caboActivo, from, to, query]);

  // Transformar respuesta del backend para los gráficos
  const { sensors, heatmap, hayGrano, linea } = transformData(
    data,
    caboActivo?.sensorIds || [],
    caboActivo?.queryConfig?.fields?.[0] || 'value'
  );

  // ── Estilos ────────────────────────────────────────────────────────────────
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
    <div style={{ display:'flex', flexDirection:'column', gap:16, width:'100%' }}>

      {/* ── Selectores ──────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-end',
        padding:'18px 20px',
        background:'linear-gradient(135deg,rgba(10,22,40,0.95),rgba(15,30,55,0.95))',
        borderRadius:14, border:'1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Cabos */}
        <div>
          <label style={labelCss}>Cabo</label>
          <select
            value={cabo ?? ''}
            onChange={e => { setCabo(e.target.value); setQueried(false); }}
            style={{
              ...inputStyle,
              minWidth: 140,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: 32,
            }}
          >
            {cabos.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
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

        {/* Consultar */}
        <button onClick={handleQuery} disabled={loading || !caboActivo}
          style={{
            padding:'9px 26px', borderRadius:8, border:'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight:700, fontSize:13, letterSpacing:'0.04em',
            display:'flex', alignItems:'center', gap:8, transition:'all 0.18s',
            background: loading ? '#1e293b' : 'linear-gradient(135deg,#00aae4,#0076b3)',
            color:      loading ? '#334155' : '#fff',
            boxShadow:  loading ? 'none'   : '0 0 16px rgba(0,170,228,0.28)',
          }}>
          {loading ? <><Spin /> Consultando...</> : '⟵ Consultar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding:'10px 16px', borderRadius:8, fontSize:12, color:'#ef4444',
          background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)',
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

      {/* ── Línea temperatura + aireación ───────────────────────────────────── */}
      <Card label="Temperatura Media · Aireación"
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
// transformData
// Convierte la respuesta del backend en las estructuras que usan los gráficos.
//
// Entrada:
//   data = { [sensorId]: [{ timestamp, [tempField]: value, hayGrano?, hay_grano? }] }
//   sensorIds = string[]
//   tempField = nombre del campo de temperatura (ej: 'value', 'temperatura')
// Salida:
//   sensors  : ['T1','T2',...]              ← parte final del sensorId
//   heatmap  : [{ fecha, T1, T2, ... }]    ← valores de temperatura por timestamp
//   hayGrano : [{ fecha, T1, T2, ... }]    ← booleanos (true = hay grano → se colorea)
//   linea    : [{ timestamp, temp, aireacion }]  ← promedio de todos los sensores
// ─────────────────────────────────────────────────────────────────────────────
function transformData(data, sensorIds, tempField = 'value') {
  if (!data || !sensorIds.length) return { sensors: [], heatmap: [], hayGrano: [], linea: [] };

  const labelOf = id => id.split('/').pop();
  const sensors = sensorIds.map(labelOf);

  const tsSet = new Set();
  sensorIds.forEach(id => {
    (data[id] || []).forEach(p => tsSet.add(p.timestamp));
  });
  const timestamps = [...tsSet].sort();

  const formatFecha = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('es-PY', { day:'2-digit', month:'2-digit' })
         + ' ' + d.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' });
  };

  const idx = {};
  sensorIds.forEach(id => {
    idx[id] = {};
    (data[id] || []).forEach(p => { idx[id][p.timestamp] = p; });
  });

  const heatmap  = [];
  const hayGrano = [];
  const linaAcc  = {};

  const hasGrano = (punto) => {
    if (!punto) return false;
    const val = punto.hayGrano ?? punto.hay_grano;
    return val === true || val === 1 || val === 'true' || val === '1';
  };

  timestamps.forEach(ts => {
    const fecha = formatFecha(ts);
    const hRow  = { fecha };
    const gRow  = { fecha };

    sensorIds.forEach(id => {
      const label = labelOf(id);
      const punto = idx[id][ts];
      if (punto) {
        const tempValue = punto[tempField] ?? punto.value;
        hRow[label] = tempValue;
        gRow[label] = hasGrano(punto);

        if (!linaAcc[ts]) linaAcc[ts] = { sum: 0, count: 0, aireacion: false };
        linaAcc[ts].sum   += Number(tempValue);
        linaAcc[ts].count += 1;
        if (punto.aireacion === true || punto.aireacion === 1) {
          linaAcc[ts].aireacion = true;
        }
      }
    });

    heatmap.push(hRow);
    hayGrano.push(gRow);
  });

  const linea = timestamps
    .filter(ts => linaAcc[ts]?.count > 0)
    .map(ts => ({
      timestamp: ts,
      temp:      linaAcc[ts].sum / linaAcc[ts].count,
      aireacion: linaAcc[ts].aireacion,
    }));

  return { sensors, heatmap, hayGrano, linea };
}

// ─────────────────────────────────────────────────────────────────────────────
// CaboHeatmap — dos series: con grano (color temp) + sin grano (gris fijo)
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

    const fechas = heatmap.map(d => d.fecha);

    const granoIdx = {};
    hayGrano.forEach(r => { granoIdx[r.fecha] = r; });

    const modifiedData = [];

    heatmap.forEach((row, fi) => {
      const gr = granoIdx[row.fecha] || {};
      sensors.forEach((s, si) => {
        const t = row[s];
        if (t == null) return;
        const tiene = gr[s] === true;
        const value = [fi, si, Number(t)];

        if (!tiene) {
          modifiedData.push({
            value,
            itemStyle: { color: 'rgba(255,255,255,0.06)' },
            label: { color: 'rgba(255,255,255,0.2)' },
          });
        } else {
          modifiedData.push(value);
        }
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
          const val = Array.isArray(p.value) ? p.value[2] : p.data?.value?.[2];
          const fi = Array.isArray(p.value) ? p.value[0] : p.data?.value?.[0];
          const si = Array.isArray(p.value) ? p.value[1] : p.data?.value?.[1];
          const tiene = p.data?.itemStyle == null;
          return `
            <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:4px">${fechas[fi]}</div>
            <b style="color:#00aae4">${sensors[si]}</b><br/>
            <b style="font-size:17px">${Number(val).toFixed(1)} ${unit}</b><br/>
            <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:4px;
              font-size:10px;font-weight:700;
              background:${tiene ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)'};
              color:${tiene ? '#22c55e' : '#64748b'}">
              ${tiene ? 'Con grano' : 'Sin grano'}
            </span>`;
        },
      },
      grid: { top:4, bottom:40, left:'3%', right:'3%', containLabel:true },
      xAxis: {
        type:'category', data:fechas, position:'bottom',
        axisLabel: {
          color:'rgba(255,255,255,0.4)', fontSize:9, rotate:35,
          interval: fechas.length <= 10 ? 0 : Math.floor(fechas.length / 8),
        },
        axisLine:  { lineStyle:{ color:'rgba(255,255,255,0.06)' } },
        splitLine: { show:false },
      },
      yAxis: {
        type:'category', data:sensors,
        axisLabel: { color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700 },
        axisLine:  { lineStyle:{ color:'rgba(255,255,255,0.06)' } },
        splitLine: { show:false },
      },
      visualMap: {
        min, max, show: false,
        inRange: { color: ['#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444'] },
      },
      series: [{
        name: 'Temperatura',
        type: 'heatmap',
        data: modifiedData,
        label: { show: true, fontSize: 10, fontWeight: 700, color: '#fff',
                 formatter: p => {
                   const val = Array.isArray(p.value) ? p.value[2] : p.data?.value?.[2];
                   return Number(val).toFixed(1);
                 }},
        itemStyle: { borderWidth: 2, borderColor: 'rgba(5,12,25,0.8)', borderRadius: 3 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,170,228,0.4)', borderColor: '#00aae4', borderWidth: 2 } },
      }],
    }, true);
  }, [heatmap, hayGrano, sensors, unit, min, max]);

  return (
    <div>
      <div style={{ display:'flex', gap:14, justifyContent:'flex-end', marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>{min}{unit}</span>
          <div style={{ width:72, height:7, borderRadius:4,
            background:'linear-gradient(to right,#3b82f6,#06b6d4,#10b981,#f59e0b,#ef4444)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>{max}{unit}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:13, height:9, borderRadius:2, background:'rgba(22,32,50,0.95)',
            border:'1px solid rgba(100,116,139,0.2)' }} />
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>Sin grano</span>
        </div>
      </div>
      <div ref={ref} style={{ width:'100%', height:160 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineChartArea — temperatura + markArea donde aireación = true
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
      return dt.toLocaleDateString('es-PY', { day:'2-digit', month:'2-digit' })
           + ' ' + dt.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' });
    });
    const values   = data.map(d => d.temp ?? null);
    const airBools = data.map(d => d.aireacion === true || d.aireacion === 1 || d.aireacion === 'true');

    // Construir markArea: tramos donde aireación = true
    const markAreaData = [];
    let start = null;
    airBools.forEach((on, i) => {
      if (on  && start === null) { start = i; }
      if (!on && start !== null) {
        markAreaData.push([{ xAxis: times[start] }, { xAxis: times[i - 1] }]);
        start = null;
      }
    });
    if (start !== null) {
      markAreaData.push([{ xAxis: times[start] }, { xAxis: times[times.length - 1] }]);
    }

    ec.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger:'axis',
        backgroundColor:'#0f172a', borderColor:'#1e293b', borderWidth:1,
        textStyle: { color:'#f1f5f9', fontSize:12 },
        formatter: params => {
          const idx  = params[0]?.dataIndex ?? 0;
          const val  = values[idx];
          const aire = airBools[idx];
          return `
            <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:5px">${times[idx]}</div>
            <b style="color:#f59e0b;font-size:18px">${val != null ? Number(val).toFixed(1) : '—'}</b>
            <span style="color:rgba(255,255,255,0.35)"> ${unit}</span>
            <div style="margin-top:6px">
              <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
                background:${aire ? 'rgba(0,170,228,0.2)' : 'rgba(100,116,139,0.12)'};
                color:${aire ? '#00aae4' : '#64748b'}">
                Aireación ${aire ? 'ON' : 'OFF'}
              </span>
            </div>`;
        },
      },
      grid: { top:16, bottom:50, left:52, right:16, containLabel:false },
      xAxis: {
        type:'category', boundaryGap:false, data:times,
        axisLabel: {
          color:'rgba(255,255,255,0.25)', fontSize:9, rotate:30,
          interval: Math.max(0, Math.floor(times.length / 8) - 1),
        },
        axisLine:  { lineStyle:{ color:'rgba(255,255,255,0.06)' } },
        splitLine: { show:false },
      },
      yAxis: {
        type:'value',
        axisLabel: { color:'rgba(255,255,255,0.25)', fontSize:10, formatter: v => v + unit },
        axisLine:  { show:false },
        splitLine: { lineStyle:{ color:'rgba(255,255,255,0.04)', type:'dashed' } },
      },
      series: [{
        type:'line', data:values, smooth:0.3, symbol:'none',
        lineStyle: { color:'#f59e0b', width:2 },
        areaStyle: { color:'rgba(245,158,11,0.06)' },
        markLine: {
          silent:true,
          lineStyle: { color:'rgba(255,255,255,0.07)', type:'dashed' },
          data: [{ type:'average' }],
          label: { formatter: p => 'Med: ' + Number(p.value).toFixed(1) + unit,
                   color:'rgba(255,255,255,0.2)', fontSize:9 },
        },
        markArea: {
          silent:true,
          itemStyle: { color:'rgba(0,170,228,0.12)', borderWidth:0 },
          label: { show:false },
          data: markAreaData,
        },
      }],
    }, true);
  }, [data, unit]);

  return (
    <div>
      <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginBottom:6, flexWrap:'wrap' }}>
        <LegBadge color="#f59e0b" label="Temperatura" type="line" />
        <LegBadge color="rgba(0,170,228,0.25)" label="Aireación activa" border="rgba(0,170,228,0.4)" />
      </div>
      <div ref={ref} style={{ width:'100%', height:240 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function Card({ label, meta, children }) {
  return (
    <div style={{
      background:'linear-gradient(135deg,rgba(10,22,40,0.95),rgba(15,30,55,0.95))',
      borderRadius:12, border:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px',
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
  return (
    <>
      <span style={{ display:'inline-block', animation:'hcSpin 0.8s linear infinite' }}>⟳</span>
      <style>{`@keyframes hcSpin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function LegBadge({ color, label, type, border }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      {type === 'line'
        ? <div style={{ width:16, height:2, background:color, borderRadius:2 }} />
        : <div style={{ width:13, height:9, background:color, borderRadius:2,
            border:`1px solid ${border || 'transparent'}` }} />
      }
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{label}</span>
    </div>
  );
}