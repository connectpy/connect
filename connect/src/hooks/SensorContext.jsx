 import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

/**
 * SensorContext
 *
 * Tiempo real — polling HTTP cada 5s:
 *   GET http://nodered.connectparaguay.com/api/estado/:clientId
 *   Respuesta: { [sensorId]: { id, tags, fields } }
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

function normalizeFieldValue(value) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed === '') return value;

  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? value : numeric;
}

function normalizeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeFieldValue(value)])
  );
}

/**
 * Aplana un objeto anidado usando notación de puntos
 * Ej: { cliente1: { device1: { campos: { temp: 26 } } } }
 *   → { "cliente1.device1.campos.temp": 26 }
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

export function SensorProvider({ clientId, clientName = '', apiBase = 'https://nodered.connectparaguay.com', children }) {
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

      // Aplanar por si viene estructura anidada (cliente.deviceId.campos.campo)
      const flattened = flattenObject(raw);

      setSensorData(prev => {
        const next = { ...prev };
        Object.entries(flattened).forEach(([sensorId, sensor]) => {
          // Si sensor es objeto con fields (formato original)
          if (typeof sensor === 'object' && sensor !== null && sensor.fields) {
            const fields = normalizeFields(sensor.fields || {});
            const value = Object.prototype.hasOwnProperty.call(fields, 'value')
              ? fields.value
              : null;
            next[sensorId] = { value, tags: sensor.tags || {}, fields };
          } else {
            // Formato nuevo: valor escalar directo
            const val = typeof sensor === 'object' && sensor !== null ? sensor : { value: sensor };
            const fields = normalizeFields(typeof sensor === 'object' && sensor !== null ? sensor : { value: sensor });
            next[sensorId] = {
              value: typeof sensor === 'object' && sensor !== null ? (sensor.value ?? null) : sensor,
              tags: {},
              fields,
            };
          }
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
  // Devuelve { [deviceId]: [{ timestamp, value }] }
  // Se envía deviceId en params y cliente en el header
  const fetchHistorico = useCallback(async ({
    deviceIds,   // string[] - IDs de dispositivos
    desde,       // ISO string o 'YYYY-MM-DD'
    hasta,       // ISO string o 'YYYY-MM-DD'
    fields,      // string | string[]  (ej: 'value' o ['value', 'hayGrano'])
    window: win, // '1h' | '12h' | '1d' ...
    fn,          // 'mean' | 'last' | 'median'
  }) => {
    const fieldsStr = Array.isArray(fields) ? fields.join(',') : (fields || 'value');
    const params = new URLSearchParams({
      deviceId: Array.isArray(deviceIds) ? deviceIds.join(',') : deviceIds,
      desde,
      hasta,
      field: fieldsStr,
      window: win || '1h',
      fn: fn || 'mean',
    });

    const headers = {};
    // Enviar nombre del cliente en el header
    if (clientName) {
      headers['cliente'] = clientName;
    }

    const res = await fetch(`${apiBase}/api/consulta/${clientId}?${params}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }, [clientId, clientName, apiBase]);

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
    value: sensor?.value ?? null,
    unit: sensor?.tags?.unit ?? '',
    tags: sensor?.tags ?? {},
    fields: sensor?.fields ?? {},
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

  sensorIds.forEach(sensorId => {
    const sensor = ctx.sensorData[sensorId];

    result[sensorId] = {
      value: sensor?.value ?? null,
      unit: sensor?.tags?.unit ?? '',
      tags: sensor?.tags ?? {},
      fields: sensor?.fields ?? {},
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
