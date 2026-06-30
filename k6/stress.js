// Prueba de ESTRÉS: se incrementa la carga muy por encima de lo esperado para
// encontrar el punto de quiebre (dónde la latencia se dispara o aparecen errores).
// No "falla" por superar un umbral: el objetivo es OBSERVAR el comportamiento.
//
// Ejecutar (con el stack arriba en :8080):
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:8080 \
//     -v "$PWD/k6:/scripts" grafana/k6 run /scripts/stress.js

import http from 'k6/http';
import { check } from 'k6';
import { registerAndLogin, BASE } from './lib.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '30s', target: 0 },
  ],
  // Umbral informativo y laxo: documenta el límite, no aborta la corrida.
  thresholds: {
    http_req_failed: ['rate<0.10'],
  },
};

export function setup() {
  const token = registerAndLogin();
  return { token };
}

export default function (data) {
  const h = http.get(`${BASE}/health`);
  check(h, { 'health ok': (r) => r.status === 200 });

  if (data.token) {
    const o = http.get(`${BASE}/api/orders/my`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    check(o, { 'orders ok': (r) => r.status === 200 });
  }
}
