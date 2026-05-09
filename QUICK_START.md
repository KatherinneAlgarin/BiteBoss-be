# 🚀 Quick Start - Módulo de Proveedores

## ⚡ Inicio Rápido (5 minutos)

### 1. Ejecutar Schema en Supabase

Copia y pega el contenido de `schema.sql` en el SQL Editor de Supabase:

```sql
-- Copiar el contenido del archivo schema.sql
-- y ejecutarlo en Supabase
```

✅ Se creará la tabla `proveedor` con datos de prueba

---

### 2. Compilar el Proyecto

```bash
npm run build
```

✅ Debe compilar sin errores

---

### 3. Iniciar el Servidor

```bash
npm run dev
```

✅ El servidor debe iniciar en puerto 3000

---

## 🧪 Prueba Rápida (1 minuto)

### Obtener token JWT

Primero, debes autenticarte para obtener un token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@biteboss.com",
    "password": "tu_password"
  }'
```

Copia el `token` de la respuesta.

---

### Listar Proveedores

```bash
curl -X GET http://localhost:3000/api/proveedores \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
[
  {
    "id_proveedor": 1,
    "nombre": "Proveedor ABC",
    "email": "contacto@proveedorabc.com",
    "telefono": "555-1001",
    "direccion": "Calle Distribuidora 456",
    "activo": true,
    "creado_en": "2024-05-08T10:30:00Z"
  }
]
```

---

### Crear Nuevo Proveedor

```bash
curl -X POST http://localhost:3000/api/proveedores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "nombre": "Mi Nuevo Proveedor",
    "email": "nuevo@proveedor.com",
    "telefono": "555-9999",
    "direccion": "Calle Nueva 999"
  }'
```

**Respuesta esperada (201):**
```json
{
  "id_proveedor": 3,
  "nombre": "Mi Nuevo Proveedor",
  "email": "nuevo@proveedor.com",
  "telefono": "555-9999",
  "direccion": "Calle Nueva 999",
  "activo": true
}
```

---

### Actualizar Proveedor

```bash
curl -X PATCH http://localhost:3000/api/proveedores/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "telefono": "555-8888"
  }'
```

**Respuesta esperada (200):**
```json
{
  "id_proveedor": 3,
  "nombre": "Mi Nuevo Proveedor",
  "email": "nuevo@proveedor.com",
  "telefono": "555-8888",
  "direccion": "Calle Nueva 999",
  "activo": true
}
```

---

### Eliminar Proveedor

```bash
curl -X DELETE http://localhost:3000/api/proveedores/3 \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

**Respuesta esperada (200):**
```json
{
  "mensaje": "Proveedor eliminado correctamente"
}
```

---

## ⚠️ Errores Comunes

### Error: "El proveedor debe tener al menos un dato de contacto"

**Causa:** Intentaste crear/actualizar sin email Y sin teléfono

**Solución:** Agrega al menos uno:
```json
{
  "nombre": "Test",
  "email": "test@test.com"  // ✅ O esto
  // O
  // "telefono": "555-1234"  // ✅ O esto
}
```

---

### Error: "El formato del email no es válido"

**Causa:** El email tiene formato incorrecto

**Solución:** Usa formato válido:
```json
{
  "nombre": "Test",
  "email": "correo@dominio.com"  // ✅ Válido
}
```

---

### Error: "No tienes permisos para realizar esta acción"

**Causa:** Tu rol no tiene permiso para esa operación

**Solución:** Usa un usuario con rol apropiado:
- Para crear/editar: admin o encargado
- Para eliminar: solo admin

---

### Error: "Token inválido o expirado"

**Causa:** El token JWT no es válido

**Solución:** Obtén un nuevo token con login

---

## 📚 Documentación Completa

Para más detalles, consulta:

- **API Endpoints:** [DOCUMENTACION_PROVEEDORES.md](DOCUMENTACION_PROVEEDORES.md)
- **Casos de Prueba:** [CASOS_PRUEBA_PROVEEDORES.md](CASOS_PRUEBA_PROVEEDORES.md)
- **Implementación Técnica:** [IMPLEMENTACION_PROVEEDORES.md](IMPLEMENTACION_PROVEEDORES.md)
- **Resumen General:** [RESUMEN_IMPLEMENTACION.md](RESUMEN_IMPLEMENTACION.md)

---

## 🔑 Referencia Rápida de Endpoints

| Método | Endpoint | Autenticación | Body |
|--------|----------|----------------|------|
| GET | `/api/proveedores` | ✅ | - |
| GET | `/api/proveedores/:id` | ✅ | - |
| POST | `/api/proveedores` | ✅ | nombre, email?, telefono?, direccion? |
| PATCH | `/api/proveedores/:id` | ✅ | campos a actualizar |
| DELETE | `/api/proveedores/:id` | ✅ (admin) | - |

---

## 💡 Ejemplos Prácticos

### Caso 1: Crear proveedor solo con teléfono

```bash
curl -X POST http://localhost:3000/api/proveedores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "nombre": "Carnicería Local",
    "telefono": "555-1234"
  }'
```

✅ Válido - tiene nombre y teléfono

---

### Caso 2: Editar solo la dirección

```bash
curl -X PATCH http://localhost:3000/api/proveedores/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "direccion": "Nueva Dirección 123"
  }'
```

✅ Válido - solo actualiza dirección, mantiene contacto anterior

---

### Caso 3: Cambiar email

```bash
curl -X PATCH http://localhost:3000/api/proveedores/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "email": "nuevo.email@proveedor.com"
  }'
```

✅ Válido - tiene teléfono anterior, nuevo email

---

### Caso 4: Intentar eliminar teléfono sin agregar email ❌

```bash
curl -X PATCH http://localhost:3000/api/proveedores/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "telefono": ""
  }'
```

❌ Error 400 - Quedaría sin contacto
✅ Solución: Agrega email antes:
```json
{
  "telefono": "",
  "email": "nuevo@email.com"
}
```

---

## 🎯 Checklist de Configuración

- [ ] Ejecuté schema.sql en Supabase
- [ ] El proyecto compila sin errores
- [ ] El servidor inicia correctamente
- [ ] Obtuve un token JWT válido
- [ ] Listado de proveedores funciona
- [ ] Creé un nuevo proveedor
- [ ] Actualicé el proveedor
- [ ] Eliminé el proveedor
- [ ] Verificué validaciones

---

## 📞 Soporte

Si tienes problemas:

1. Verifica el error en [CASOS_PRUEBA_PROVEEDORES.md](CASOS_PRUEBA_PROVEEDORES.md)
2. Revisa la [DOCUMENTACION_PROVEEDORES.md](DOCUMENTACION_PROVEEDORES.md)
3. Consulta los logs del servidor

---

**¡Listo para empezar! 🚀**

**Próximo paso:** Abre [DOCUMENTACION_PROVEEDORES.md](DOCUMENTACION_PROVEEDORES.md) para documentación completa.
