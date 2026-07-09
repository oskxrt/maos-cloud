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

## v28

- Se corrigió el catálogo público: se quitaron secciones de novedades y se dejó el grid principal más limpio/minimal.
- El carrito vacío ya no ocupa espacio en la página principal.
- El catálogo ahora muestra un mensaje de error si Supabase falla, en lugar de quedarse visualmente en blanco.
- La carga pública ahora trae productos visibles de forma más tolerante y excluye solo ocultos/archivados/cancelados.
- En el modal de pedido interno se agregó selector de **Cliente registrado**.
- Al elegir un cliente registrado, se llenan nombre, teléfono, red social y dirección automáticamente.
- Los pedidos guardan `customer_id` cuando existe, manteniendo también nombre/teléfono para compatibilidad.
- Se incluye `PEGAR_EN_SUPABASE_TODO_CORREGIDO_V28.sql` como archivo único para copiar/pegar en Supabase.


## v29

- El catálogo ya no abre página individual de producto.
- Las tarjetas del catálogo solo muestran foto, nombre y precio. Al hacer clic abren **Vista rápida**.
- El carrusel vive dentro de la Vista rápida para evitar que cambie foto y navegue a otra página.
- En Nuevo pedido se quitó el selector extra de cliente: ahora el campo Cliente autocompleta clientes registrados.
- Los diálogos se cierran al hacer clic fuera del cuadro.
- Se corrigió el recibo/PDF anti-edición para evitar textos encimados.
- En móvil se centra el logo y los filtros/search quedan contraídos como en desktop.
