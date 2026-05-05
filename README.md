# SIGEPED - Backend

Este es el backend del sistema **SIGEPED** (Sistema de Gestión de Pedidos para ESIAD Proyectos). Construido con Node.js, Express, Prisma y PostgreSQL.

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (v22 LTS recomendado)
- [PostgreSQL](https://www.postgresql.org/) (v18 recomendada)
- [npm](https://www.npmjs.com/)

## 🛠️ Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd esiad-backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

## ⚙️ Configuración

1. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus credenciales locales:
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/sigeped"
   PORT=3000
   JWT_SECRET="una_clave_secreta_muy_segura"
   ```

## 🗄️ Base de Datos

1. Ejecuta las migraciones de Prisma para crear las tablas:
   ```bash
   npx prisma migrate dev --name init
   ```

2. (Opcional) Carga los datos iniciales (Seed):
   ```bash
   npx prisma db seed
   ```

## 🏃 Ejecución

Para iniciar el servidor en modo desarrollo con recarga automática:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

## 📚 Documentación API (Swagger)

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva de la API en:

`http://localhost:3000/api/docs`

## 🏗️ Estructura del Proyecto

El proyecto sigue una arquitectura modular:

- `src/config`: Configuraciones de base de datos y variables de entorno.
- `src/middlewares`: Middlewares de autenticación, roles y manejo de errores.
- `src/modules`: Lógica de negocio dividida por dominios (auth, users, orders, etc.).
- `prisma/`: Esquema de la base de datos y migraciones.

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npx prisma studio`: Abre la interfaz visual de Prisma para explorar la base de datos.
- `npx prisma generate`: Genera el cliente de Prisma.

---
© 2026 ESIAD Proyectos.
