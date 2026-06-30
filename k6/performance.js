// Prueba de RENDIMIENTO: carga sostenida y moderada para medir la línea base
// (latencia p95 y tasa de error) bajo un nivel de uso esperado.
//
// Ejecutar (con el stack arriba en :8080):
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:8080 \
//     -v "$PWD/k6:/scripts" grafana/k6 run /scripts/performance.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { registerAndLogin, BASE } from './lib.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp-up a 20 usuarios virtuales
    { duration: '1m', target: 20 },  // sostener
    { duration: '20s', target: 0 },  // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],     // < 1% de errores
    http_req_duration: ['p(95)<500'],   // p95 por debajo de 500 ms
  },
};

export function setup() {
  const token = registerAndLogin();
  return { token };
}

export default function (data) {
  // Endpoint público: healthcheck (incluye un SELECT 1 a la DB).
  const h = http.get(`${BASE}/health`);
  check(h, { 'health 200': (r) => r.status === 200 });

  // Endpoint protegido de lectura.
  if (data.token) {
    const o = http.get(`${BASE}/api/orders/my`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    check(o, { 'orders 200': (r) => r.status === 200 });
  }

  sleep(1);
}
