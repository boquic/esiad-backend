// esiad-frontend/src/environments/environment.prod.ts
// Producción / Docker: el frontend va detrás del reverse proxy (nginx),
// mismo origen que la API -> ruta RELATIVA, sin host ni puerto. Esto evita CORS.

export const environment = {
  production: true,
  apiUrl: '/api',
};
