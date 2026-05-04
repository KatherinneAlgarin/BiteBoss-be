# BiteBoss - Backend

API REST del sistema de gestión para restaurantes **BiteBoss**, construida con Node.js, Express y TypeScript, conectada a Supabase como base de datos.

---

## Requisitos previos

Asegurate de tener instalado lo siguiente antes de comenzar:

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/) v9 o superior
- Cuenta en [Supabase](https://supabase.com/) con un proyecto creado

---

## Instalacion

1. Clona el repositorio:

```bash
git clone <url-del-repositorio>
cd biteboss-be
```

2. Instala las dependencias:

```bash
npm install
```

---

## Configuracion de variables de entorno

Crea un archivo `.env` en la raiz del proyecto con el siguiente contenido:

```env
# SUPABASE
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>

# SERVIDOR
PORT=3000
NODE_ENV=development

# SEGURIDAD
JWT_SECRET=<tu-secreto-jwt>
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> Las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET` son **obligatorias**. El servidor no arrancara si alguna falta.


---

## Ejecucion

### Modo desarrollo

```bash
npm run dev
```

El servidor se reinicia automaticamente al guardar cambios en la carpeta `src/`.

### Modo produccion

1. Compila el proyecto:

```bash
npm run build
```

2. Inicia el servidor:

```bash
npm start
```

---

El servidor corre por defecto en: `http://localhost:3000`

---


