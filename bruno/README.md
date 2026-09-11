# Colección Bruno — API de Contacts

Pruebas HTTP del módulo `contacts` contra un servidor en ejecución.

## Requisitos

- API levantada (`pnpm --filter @alxarafe/api start` o `pnpm dev`).
- BD con las tablas del módulo y un usuario válido.

## Uso

1. Abre esta carpeta (`bruno/alxarafe-contacts`) en Bruno.
2. Entorno `local` (o crea el tuyo) con:
   - `BASE_URL`: URL de la API (p. ej. `http://localhost:8080`).
   - `EMAIL` / `PASSWORD`: credenciales de un usuario para `/auth/login`.
3. Habilita la **cookie jar** de la colección para que la sesión de `login`
   persista en el resto de peticiones (Settings → Cookies → *Store cookies*).
4. Ejecuta en orden: **Login** → **Create contact (nested)** (captura
   `contactId`) → el resto. Cada petición que crea recursos guarda las
   variables (`contactId`, `addressId`, `channelId`) automáticamente.

## Secuencia

| # | Petición | Notas |
|---|----------|-------|
| 10 | Login | Sesión en cookie jar |
| 20 | Create contact (nested) | Crea contacto + dirección + email/phone en un POST atómico |
| 30 | List contacts | `$filter`, `$orderby`, paginación |
| 40 | Get contact | Detalle con `addresses` y `channels` |
| 50 | List channel types | Tipos disponibles (EMAIL, PHONE, …) |
| 60 | Add address | Sub-recurso `POST /contacts/:id/addresses` |
| 70 | Add channel (phone) | Sub-recurso `POST /contacts/:id/channels` (por nombre) |
| 80 | Add channel (email by id) | Por `channelTypeId` (avisa: usa `channelTypeId: 2`, ajústalo si cambia) |
| 90 | Update contact (replace methods) | PUT reemplaza `addresses`/`channels` si se envían |
| 100 | Remove channel | `DELETE /contacts/:id/channels/:channelId` |
| 110 | Remove address | `DELETE /contacts/:id/addresses/:addressId` |
| 120 | Delete contact | Borra en cascada direcciones y canales |

Los tipos de canal se crean solos por nombre (`channelTypeName`) si no
existen; la petición 80 usa `channelTypeId` para probar la resolución por id.