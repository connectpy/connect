import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

/**
 * SensorContext
 *
 * Tiempo real — polling HTTP cada 5s:
 *   GET http://nodered.connectparaguay.com/api/estado/:clientId
 *   Respuesta: { [sensorId]: { id, measurement, tags, fields } }
 *
 * Histórico — fetch bajo demanda (botón Consultar):
 *   GET http://nodered.connectparaguay.com/api/consulta/:clientId
 *   Params: sensorId, desde, hasta, field, window, fn
 *   Respuesta: [{ timestamp, value }]  por sensor
 *
 * Hooks expuestos:
 *   useSensor(sensorId)          → { value, unit, tags, connected }
 *   useSensors(sensorIds[])      → { [sensorId]: { value, unit, tags } }
 *   useSensorStatus()            → { status, lastUpdate, clientId }
 *   useHistorico()               → { query, data, loading, error }
 */

const SensorContext = createContext(null);
const POLL_INTERVAL = 5000;

export function SensorProvider({ clientId, apiBase = 'https://nodered.connectparaguay.com', children }) {
  const [sensorData, setSensorData] = useState({});   // { [sensorId]: { value, tags } }
  const [status,     setStatus]     = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);

  const timerRef     = useRef(null);
  const isMounted    = useRef(false);
  const abortRef     = useRef(null);

  const fetchEstado = useCallback(async () => {
    if (!isMounted.current || !clientId) return;

    // Cancelar fetch anterior si sigue pendiente
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${apiBase}/api/estado/${clientId}`,
        { signal: abortRef.current.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.json();
      if (!isMounted.current) return;

      // Parsear respuesta plana: { [sensorId]: { id, tags, fields } }
      setSensorData(prev => {
        const next = { ...prev };
        Object.entries(raw).forEach(([sensorId, sensor]) => {
          const value = sensor.fields?.value;
          if (value === undefined || value === null) return;
          next[sensorId] = {
            value:  Number(value),
            tags:   sensor.tags  || {},
            fields: sensor.fields || {},
          };
        });
        return next;
      });

      setStatus('connected');
      setLastUpdate(new Date());
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (isMounted.current) setStatus('error');
    }
  }, [clientId, apiBase]);

  useEffect(() => {
    isMounted.current = true;
    setStatus('connecting');
    setSensorData({});

    fetchEstado();
    timerRef.current = setInterval(fetchEstado, POLL_INTERVAL);

    return () => {
      isMounted.current = false;
      clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [fetchEstado]);

  // ── Función de consulta histórica ─────────────────────────────────────────
  // Llamada manualmente desde componentes (botón Consultar).
  // Devuelve { [sensorId]: [{ timestamp, value }] }
  const fetchHistorico = useCallback(async ({
    sensorIds,   // string[]
    desde,       // ISO string o 'YYYY-MM-DD'
    hasta,       // ISO string o 'YYYY-MM-DD'
    field,       // 'value' | 'humedad' | 'hay_grano' | ...
    window: win, // '1h' | '12h' | '1d' ...
    fn,          // 'mean' | 'last' | 'median'
  }) => {
    const params = new URLSearchParams({
      sensorId: Array.isArray(sensorIds) ? sensorIds.join(',') : sensorIds,
      desde,
      hasta,
      field,
      window: win,
      fn,
    });

    const res = await fetch(`${apiBase}/api/consulta/${clientId}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
    // Respuesta esperada: { [sensorId]: [{ timestamp, value }] }
    // o si es un solo sensor: [{ timestamp, value }]
  }, [clientId, apiBase]);

  return (
    <SensorContext.Provider value={{ sensorData, status, lastUpdate, fetchHistorico, clientId, apiBase }}>
      {children}
    </SensorContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useSensor(sensorId)
 * Suscripción a un sensor individual.
 */
export function useSensor(sensorId) {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensor debe usarse dentro de SensorProvider');
  const sensor = ctx.sensorData[sensorId];
  return {
    value:     sensor?.value      ?? null,
    unit:      sensor?.tags?.unit ?? '',
    tags:      sensor?.tags       ?? {},
    connected: sensor !== undefined,
  };
}

/**
 * useSensors(sensorIds[])
 * Suscripción a múltiples sensores.
 * Devuelve objeto { [sensorId]: { value, unit, tags } }
 */
export function useSensors(sensorIds = []) {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensors debe usarse dentro de SensorProvider');
  const result = {};
  sensorIds.forEach(id => {
    const s = ctx.sensorData[id];
    result[id] = {
      value: s?.value      ?? null,
      unit:  s?.tags?.unit ?? '',
      tags:  s?.tags       ?? {},
    };
  });
  return result;
}

/**
 * useSensorStatus()
 * Estado global del polling.
 */
export function useSensorStatus() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensorStatus debe usarse dentro de SensorProvider');
  return {
    status:     ctx.status,
    lastUpdate: ctx.lastUpdate,
    clientId:   ctx.clientId,
  };
}

/**
 * useHistorico()
 * Acceso a la función de consulta histórica.
 * El componente llama a query({sensorIds, desde, hasta, field, window, fn})
 * y recibe los datos de vuelta.
 */
export function useHistorico() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useHistorico debe usarse dentro de SensorProvider');

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const query = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await ctx.fetchHistorico(params);
      setData(result);
    } catch (err) {
      setError(err.message || 'Error al consultar');
    } finally {
      setLoading(false);
    }
  }, [ctx.fetchHistorico]);

  return { query, data, loading, error };
}