# Pruebas no funcionales (k6)

Suite de **rendimiento**, **estrés** y **concurrencia** para la API de SIGEPED.
Se ejecutan con [k6](https://k6.io) vía Docker, sin instalar nada.

## Requisitos

- El stack debe estar **arriba** (por ejemplo `deploy/docker-compose.yml` en `:8080`,
  o el backend solo en `:3000`).
- Docker Desktop corriendo.

## Cómo ejecutar

Desde la raíz del repo:

```bash
bash k6/run.sh performance
bash k6/run.sh stress
bash k6/run.sh concurrency
```

Para apuntar a otra URL base:

```bash
BASE_URL=http://host.docker.internal:3000 bash k6/run.sh performance
```

> En Docker Desktop (Windows/Mac), `host.docker.internal` resuelve al host, así k6
> (dentro de un contenedor) alcanza tu stack publicado en el host. En Linux puro,
> usa la IP del host o `--add-host=host.docker.internal:host-gateway`.

Alternativa de una línea (sin el runner):

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:8080 \
  -v "$PWD/k6:/scripts" grafana/k6 run /scripts/performance.js
```

## Qué mide cada prueba

| Script | Tipo | Objetivo | Criterio |
|---|---|---|---|
| `performance.js` | Rendimiento | Línea base con carga esperada (20 VUs) | p95 < 500 ms y < 1% errores (thresholds) |
| `stress.js` | Estrés | Subir hasta 300 VUs para hallar el punto de quiebre | Observacional (umbral laxo < 10% errores) |
| `concurrency.js` | Concurrencia | Ráfaga súbita + carrera sobre el constraint único | Como mucho 1 registro del mismo dni tiene éxito (`dup_success < 2`) |

La prueba de concurrencia es la más valiosa para correctitud: verifica que, ante
50 registros simultáneos del mismo DNI, la base de datos sólo permite uno (el
resto recibe 409), descartando condiciones de carrera en el alta de usuarios.

## Interpretar resultados

- **checks**: porcentaje de aserciones cumplidas (debe ser 100% en rendimiento).
- **http_req_duration p(95)**: latencia del 95% de las peticiones.
- **http_req_failed**: proporción de respuestas con error.
- **dup_success** (concurrencia): debe ser exactamente 1.
- Si un *threshold* falla, k6 termina con código de salida ≠ 0.
