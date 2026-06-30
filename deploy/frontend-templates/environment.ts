// esiad-frontend/src/environments/environment.ts
// Desarrollo local (ng serve). Apunta al backend en localhost:3000.
// Alternativa: configurar un proxy de Angular (proxy.conf.json) hacia /api.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
