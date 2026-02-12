import { InfluxDB } from '@influxdata/influxdb-client-browser';

const influxDB = new InfluxDB({
  url: import.meta.env.VITE_INFLUX_URL,
  token: import.meta.env.VITE_INFLUX_TOKEN
});

const queryApi = influxDB.getQueryApi(import.meta.env.VITE_INFLUX_ORG);

export async function demoData(bucket, measurement, field, timeRange) {
    const fluxQuery = `from(bucket: "${bucket}")
  |> range(start: -${timeRange})
  |> filter(fn: (r) => r._measurement == "${measurement}")
  |> filter(fn: (r) => r._field == "${field}")
  |> yield(name: "demoData")`;  
  
  const data = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        data.push({ time: o._time, value: o._value }); ////mapea los datos a un formato más simple
      },
      error(error) {
        reject(error);
        console.error('Error al obtener datos de InfluxDB:', error);
      },
      complete() {
        resolve(data);
        console.log('Datos obtenidos para gráfico:', data);
      }
    });
  });
}

export async function getDemoLatestValue({bucket, measurement, field }) {
  let fluxQuery = `from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "${measurement}")
  |> filter(fn: (r) => r._field == "${field}")
  |> last()`;

  console.log('Ejecutando consulta gauge InfluxDB con query:', fluxQuery);

  const data = [];

  return new Promise((resolve, reject) => { 
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const record = tableMeta.toObject(row);
            data.push({
                value: record._value,
            });
        },
        error(error) {
            reject(error);
        },
        complete() {
           resolve(data[0]?.value ?? null);
           console.log('Valor obtenido para gauge:', data[0]?.value);
      } 
    });
  });
}