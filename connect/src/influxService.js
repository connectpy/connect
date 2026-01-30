import { InfluxDB } from '@influxdata/influxdb-client';

const url = import.meta.env.VITE_INFLUX_URL;
const token = import.meta.env.VITE_INFLUX_TOKEN;

const client = new InfluxDB({ url, token });

export const testConnection = async (org, bucket) => {
  
  const queryApi = client.getQueryApi(org);
  // Esta consulta es súper simple: solo pide 1 registro de cualquier cosa
  const fluxQuery = `from(bucket: "${bucket}") |> range(start: -1d) |> limit(n:1)`;

  try {
    const data = await queryApi.collectRows(fluxQuery);
    console.log("✅ Conexión exitosa. Datos recibidos:", data);
    return data;
  } catch (error) {
    console.error("❌ Error en la prueba:", error);
    throw error;
  }
};