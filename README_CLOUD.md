# MAOS Cloud v27 — todo integrado

Esta versión junta en un solo paquete:

- catálogo público minimalista estilo streetwear, sin sección de novedades
- categorías al lado izquierdo
- grid limpio de productos
- WhatsApp / carrito / vista rápida / página individual de producto
- panel admin completo
- dashboard
- productos e inventario
- clientes
- pedidos internos
- abonos
- recibos
- logo / ajustes de marca
- eliminar pedidos internos y pedidos web

## SQL único para Supabase

Usa solamente este archivo:

`PEGAR_EN_SUPABASE_TODO_INTEGRADO.sql`

Copia todo el contenido en Supabase > SQL Editor > New query > Run.

El SQL es seguro para una base existente: no borra datos. Solo crea tablas/columnas/permisos que falten.

## Archivos para GitHub/Vercel

Sube/reemplaza estos archivos en tu repo:

- `index.html`
- `public-catalog.js`
- `styles.css`
- `product.html`
- `product-page.js`
- `admin.html`
- `admin.js`
- `README_CLOUD.md`
- `PEGAR_EN_SUPABASE_TODO_INTEGRADO.sql`

No reemplaces `cloud-config.js` si ya tiene tus llaves correctas.
