// Prueba de CONCURRENCIA: dos escenarios.
//   1) spike    -> ráfaga súbita de usuarios concurrentes sobre lecturas.
//   2) unique_race -> 50 usuarios intentan registrar EL MISMO dni/phone a la vez.
//      Correctitud esperada: el constraint único de la DB deja pasar exactamente
//      UNO (201) y el resto recibe 409. Esto detecta condiciones de carrera.
//
// Ejecutar (con el stack arriba en :8080):
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:8080 \
//     -v "$PWD/k6:/scripts" grafana/k6 run /scripts/concurrency.js

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { registerAndLogin, randomDni, randomPhone, BASE, JSON_HEADERS } from './lib.js';

const dupSuccess = new Counter('dup_success'); // cuántos registros del mismo dni tuvieron éxito

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '20s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      exec: 'spikeRead',
    },
    unique_race: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      startTime: '45s', // arranca después del spike
      maxDuration: '30s',
      exec: 'uniqueRace',
    },
  },
  thresholds: {
    // Correctitud: como mucho 1 registro del mismo dni puede tener éxito.
    dup_success: ['count<2'],
  },
};

export function setup() {
  const token = registerAndLogin();
  // dni/phone compartidos para la prueba de carrera.
  return { token, dni: randomDni(), phone: randomPhone() };
}

// Escenario 1: lecturas bajo ráfaga.
export function spikeRead(data) {
  const h = http.get(`${BASE}/health`);
  check(h, { 'health ok': (r) => r.status === 200 });

  if (data.token) {
    const o = http.get(`${BASE}/api/orders/my`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    check(o, { 'orders ok': (r) => r.status === 200 });
  }
}

// Escenario 2: 50 VUs registran el MISMO dni/phone simultáneamente.
export function uniqueRace(data) {
  const res = http.post(
    `${BASE}/api/auth/register`,
    JSON.stringify({
      dni: data.dni,
      first_name: 'Race',
      last_name: 'Test',
      phone: data.phone,
      password: 'Secret123',
    }),
    { headers: JSON_HEADERS }
  );

  if (res.status === 201) dupSuccess.add(1);

  // Cada intento debe resolverse limpio: o crea (201) o rechaza por duplicado (409).
  check(res, {
    'resuelto sin error de servidor (201/409)': (r) => r.status === 201 || r.status === 409,
  });
}
