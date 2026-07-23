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


## v30

- Animación de carga al abrir el catálogo público.
- Botones con hover/press más pulidos.
- Flechas del carrusel siempre visibles dentro de Vista rápida.
- Pequeños efectos visuales en tarjetas y modal de Vista rápida.


## v31

- Mejoras visuales en Vista rápida: más aire interno, mejor distribución y botones menos pegados a los bordes.
- Micro-animaciones en botones y controles sin usar degradados.
- Flechas del carrusel más visibles y con mejor efecto hover/click.
- Se removió el efecto de brillo con degradado para mantener el look minimalista limpio.


## v32

- Corrección de Vista rápida en móvil: ahora el modal tiene scroll propio y se bloquea el scroll de la página del fondo.
- El encabezado de la Vista rápida se mantiene visible al hacer scroll en móvil.
- Ajustes de altura y padding para que se vea toda la información del producto en celular.


## v33

- Rediseño visual de las secciones **Productos** y **Clientes** del panel admin.
- Tablas convertidas en filas tipo card con miniaturas, avatares, chips y micro-animaciones.
- Formularios con mejor espaciado, foco visual y inputs más limpios.
- Mejoras responsive para móvil/tablet.

## v34

- La sección **Clientes** ahora queda como lista limpia; el formulario se abre en ventana modal al presionar **Nuevo cliente** o **Editar**.
- Productos ahora permite agregar **URLs externas de imágenes** además de subir archivos. Pega una URL por línea en el campo "URLs de imágenes".
- Al guardar un producto se sincronizan las URLs pegadas y las fotos subidas en el catálogo.

## v35

- La sección **Productos** ahora funciona como Clientes: lista limpia y formulario solo en ventana modal.
- Botón **Nuevo producto** abre una ventana para registrar productos.
- Botón **Editar** abre la misma ventana con los datos cargados.
- Agregado buscador de productos por nombre, SKU, categoría, proveedor o estado.
- Se mantienen URLs de imágenes externas y subida de archivos.


## v37

- Corrección visual del carrusel en Vista rápida.
- Flechas alineadas al centro vertical real del carrusel.
- Imagen con margen interno y centrado más estable dentro del modal.
- Dots separados de la foto para evitar que tapen el producto.

## v38

- Ajuste de encuadre visual en Vista rápida.
- Las fotos del modal ahora usan `object-fit: cover` para compensar imágenes con mucho lienzo blanco.
- Flechas y dots quedan alineados al centro real del carrusel.


## v39

- Corrección más fuerte de centrado visual en la imagen de Vista rápida.
- Se eliminó la posibilidad de seleccionar el texto de las flechas del carrusel.
- Las flechas ahora se renderizan con CSS, no como texto seleccionable.
- El producto se muestra con un zoom sutil para compensar fotos con mucho lienzo blanco.


## v40 White Label Responsive

Primera base para convertir la app en producto/membresía.

### Nuevo
- Configuración de tienda desde el panel.
- Solo logo como personalización visual libre.
- Redes sociales: Facebook, Instagram y TikTok.
- 5 diseños de catálogo:
  - Minimal Streetwear
  - Boutique Clean
  - Drop Catalog
  - Market Grid
  - Editorial Simple
- Colores editables: principal, fondo y texto.
- Sección de novedades activable/desactivable.
- Catálogo responsive reforzado para móvil/tablet/desktop.

### Antes de usar
Ejecuta en Supabase:

`PEGAR_EN_SUPABASE_V40_WHITE_LABEL.sql`

### Subir a GitHub
Reemplaza:

- index.html
- public-catalog.js
- admin.html
- admin.js
- styles.css
- README_CLOUD.md
- PEGAR_EN_SUPABASE_V40_WHITE_LABEL.sql

No reemplaces `cloud-config.js` si ya tiene tus llaves correctas.


## v41 White Label + Super Usuario

- Se corrigió el cambio de tema para que los 5 diseños sean más visibles y diferenciados en el catálogo.
- Se agregó botón **Restablecer colores** dentro de Tienda / Tema.
- El botón aplica la paleta base del diseño seleccionado.
- Se agregó estructura `platform_admins` para dejar preparado el rol de **super usuario**.
- Oscar queda agregado como super usuario inicial con `oskxrt@gmail.com` en el SQL v41.
- En el panel aparece un badge de **SUPER USUARIO** cuando el correo autenticado está registrado en `platform_admins`.

## v42 — Multi-tienda base / Super Admin

Esta versión convierte la app en una base de membresía multi-tienda.

### Incluye

- Tabla `stores` para manejar tiendas.
- Tabla `store_members` para asignar usuarios a tiendas.
- Tabla `platform_admins` para super usuarios.
- Oscar queda como super usuario con `oskxrt@gmail.com`.
- Todos los módulos principales ahora trabajan con `store_id`:
  - productos
  - clientes
  - pedidos internos
  - pedidos web
  - configuración de tienda
- Panel nuevo **Super Admin**.
- Desde el Super Admin puedes:
  - crear tienda
  - asignar dueño por email
  - asignar usuarios a tiendas
  - activar/suspender tiendas
  - abrir catálogo público de cada tienda
- Cada tienda tiene su link público:

```txt
index.html?store=slug-de-la-tienda
```

### Importante sobre usuarios

Por seguridad, el panel web no usa la secret key de Supabase. Por eso la creación real del usuario de Auth puede hacerse de dos formas:

1. El usuario crea cuenta desde `signup.html` usando el mismo email que asignaste a la tienda.
2. Tú lo creas manualmente en Supabase > Authentication > Users.

Cuando ese email entra al panel, la app busca sus tiendas asignadas en `store_members` y solo carga esas tiendas.

### Actualización

1. Ejecuta completo:

```txt
PEGAR_EN_SUPABASE_V42_MULTI_TIENDA.sql
```

2. Sube/reemplaza en GitHub:

```txt
admin.html
admin.js
index.html
public-catalog.js
styles.css
signup.html
signup.js
README_CLOUD.md
PEGAR_EN_SUPABASE_V42_MULTI_TIENDA.sql
```

3. No reemplaces `cloud-config.js`.


## v43 fix Super Admin

- Corrige el error `infinite recursion detected in policy for relation "platform_admins"`.
- Rehace las políticas RLS de `stores`, `store_members` y `platform_admins` usando funciones `SECURITY DEFINER`.
- Mantiene a `oskxrt@gmail.com` como super usuario.
- No borra productos, clientes, pedidos ni imágenes.

Corre `PEGAR_EN_SUPABASE_V43_FIX_SUPER_ADMIN.sql` en Supabase y refresca `/admin`.
