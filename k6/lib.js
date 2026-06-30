// Utilidades compartidas para las pruebas k6.
import http from 'k6/http';

export const BASE = __ENV.BASE_URL || 'http://host.docker.internal:8080';
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

function pad(n, len) {
  let s = String(n);
  while (s.length < len) s = '0' + s;
  return s;
}

export function randomDni() {
  return pad(Math.floor(Math.random() * 100000000), 8);
}

export function randomPhone() {
  return '9' + pad(Math.floor(Math.random() * 100000000), 8);
}

// Registra un usuario nuevo y devuelve su token JWT (o null si falla).
export function registerAndLogin() {
  const dni = randomDni();
  const phone = randomPhone();
  const password = 'Secret123';

  http.post(
    `${BASE}/api/auth/register`,
    JSON.stringify({ dni, first_name: 'Perf', last_name: 'Test', phone, password }),
    { headers: JSON_HEADERS }
  );

  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ identifier: dni, password }),
    { headers: JSON_HEADERS }
  );

  try {
    return res.json('data.token');
  } catch (e) {
    return null;
  }
}
