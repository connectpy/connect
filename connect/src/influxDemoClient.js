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
      },
      complete() {
        resolve(data);
      }
    });
  });
}