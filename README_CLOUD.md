# MAOS Cloud v18

Esta versión está preparada para subir la app online con:

- `/index.html` o `/disponibles` = catálogo público para clientes.
- `/admin.html` o `/admin` = panel privado con login.
- Supabase = base de datos, login y fotos.
- Vercel = hosting gratis para publicar la web.

## 1. Crear proyecto en Supabase

1. Entra a Supabase y crea un proyecto nuevo.
2. Ve a **SQL Editor**.
3. Copia todo el contenido de `supabase-schema.sql`.
4. Ejecuta el script.
5. Ve a **Authentication > Users** y crea tu usuario admin.
6. Recomendado: en **Authentication > Providers / Email**, desactiva registros públicos si no quieres que cualquiera cree cuenta.

## 2. Pegar llaves de Supabase

Abre `cloud-config.js` y reemplaza:

```js
SUPABASE_URL: 'PEGA_AQUI_TU_SUPABASE_URL',
SUPABASE_ANON_KEY: 'PEGA_AQUI_TU_SUPABASE_ANON_KEY',
```

Las encuentras en Supabase:

**Project Settings > API**

Usa:

- Project URL
- anon public key

No pegues la service role key en la web.

## 3. Probar local

Puedes abrir `index.html` directamente, pero para evitar problemas de navegador es mejor correr servidor local:

```bash
npx serve .
```

Luego abre:

- `http://localhost:3000` para catálogo público.
- `http://localhost:3000/admin.html` para panel.

## 4. Subir a Vercel

Opción simple:

1. Sube esta carpeta a GitHub.
2. En Vercel elige **Add New Project**.
3. Conecta el repositorio.
4. Framework: **Other** o sin framework.
5. Deploy.

Rutas:

- `/` catálogo público.
- `/disponibles` catálogo público.
- `/admin` panel privado.

## 5. Importar datos de la app local

Entra a `/admin`.

1. Inicia sesión.
2. Ve a **Config / import**.
3. Sube el JSON exportado desde la app local.
4. Da clic en **Importar productos**.

Importa productos, variantes y fotos guardadas como data URL.

## 6. Funcionamiento

### Catálogo público

Los clientes pueden:

- ver productos disponibles,
- ver carrusel de fotos,
- elegir talla/color,
- elegir cantidad,
- agregar al carrito,
- enviar pedido por WhatsApp.

También se intenta guardar el pedido en Supabase en `catalog_orders`.

### Panel privado

Tú puedes:

- iniciar sesión,
- agregar productos,
- subir fotos,
- editar precios,
- ocultar productos,
- cargar variantes y stock,
- ver pedidos web.

## 7. Sobre seguridad

Esta versión usa Supabase Auth. Las tablas tienen RLS activado.

- El catálogo público solo lee productos con `status = 'Disponible'`.
- El panel admin requiere usuario autenticado.
- Las fotos son públicas para que el catálogo las pueda mostrar.
- Solo usuarios autenticados pueden subir/modificar productos.

Recomendación: crea solo tu usuario admin y no habilites registro público.

## 8. Qué falta para una v19 más completa

Esta v18 es cloud-ready y funcional para catálogo + panel básico. La siguiente versión podría migrar también:

- clientes completos,
- pedidos internos,
- abonos,
- recibos PDF anti-edición en nube,
- roles admin más estrictos por correo,
- dashboard de ventas,
- actualización automática de stock cuando llega pedido web.

## Actualización v19 — panel completo

Esta versión agrega al panel cloud:

- Dashboard con resumen de productos, pedidos, vendido, abonos y saldos.
- Control de pedidos interno.
- Crear y editar pedidos.
- Agregar productos al pedido.
- Registrar abonos / anticipos.
- Recibos con saldo pendiente.
- Descargar recibo como imagen.
- PDF anti-edición desde imagen.
- Compartir recibo por WhatsApp.
- Identidad de marca: nombre, WhatsApp y logo.
- Pedidos web convertibles a pedido interno.

### Paso extra para actualizar Supabase

Si ya ejecutaste el esquema v18, ahora entra al SQL Editor y ejecuta:

```text
supabase-schema-v19.sql
```

También puedes ejecutar `supabase-schema-full-v19.sql` en proyectos nuevos.

### Importante al subir a GitHub / Vercel

Si tu `cloud-config.js` ya tiene tus llaves reales de Supabase, no lo sobrescribas con el archivo de ejemplo del ZIP, o vuelve a pegar:

```js
SUPABASE_URL
SUPABASE_ANON_KEY
```

Después de subir los archivos a GitHub, Vercel redespliega solo.

## v20

- Se restauró el estilo del dashboard anterior tipo **MAOS Control**.
- Nuevo resumen con 8 métricas: ventas, ganancia, saldo, pedidos pendientes, productos, stock bajo, invertido y valor de inventario.
- Nuevos módulos del resumen: pedidos recientes, alertas de inventario, cuentas por cobrar y productos más vendidos.
- Menú lateral oscuro más parecido a la app local original.
