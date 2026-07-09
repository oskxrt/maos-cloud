import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.MAOS_CONFIG || {};
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let products = [];
let cart = [];
let selectedCategory = '';
let settings = { brand_name: cfg.BRAND_NAME || 'MAOS', logo_url: '', store_whatsapp: cfg.STORE_WHATSAPP || '523112648451' };

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

function brandInitial() { return (settings.brand_name || 'M').slice(0,1).toUpperCase(); }
function renderBrand() {
  const name = settings.brand_name || cfg.BRAND_NAME || 'MAOS';
  const logoWrap = $('#publicBrandLogo');
  const wordmark = $('#publicBrandWordmark');
  if (wordmark) wordmark.textContent = name;
  if (logoWrap) {
    logoWrap.innerHTML = settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo ${escapeHTML(name)}">` : `<span>${escapeHTML(name)}</span>`;
  }
  const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
  if ($('#shopWhatsappTop')) $('#shopWhatsappTop').href = `https://wa.me/${wa}`;
}

async function loadSettings() {
  try {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle();
    if (data) settings = { ...settings, ...data };
  } catch (err) { console.warn('Sin settings cloud todavía', err); }
  renderBrand();
}

function colorNameToHex(name) {
  const key = normalize(name);
  const map = {
    negro: '#111111', black: '#111111', blanco: '#f5f5f4', white: '#f5f5f4', gris: '#9ca3af', gray: '#9ca3af',
    azul: '#2563eb', blue: '#2563eb', marino: '#1e3a8a', navy: '#1e3a8a', rojo: '#dc2626', red: '#dc2626',
    verde: '#16a34a', green: '#16a34a', beige: '#d6c6a5', crema: '#ece5d8', ecru: '#ece5d8', cafe: '#7c4a21', brown: '#7c4a21',
    rosa: '#f472b6', pink: '#f472b6', morado: '#7c3aed', purple: '#7c3aed', amarillo: '#facc15', yellow: '#facc15'
  };
  return map[key] || '#cbd5e1';
}

function productImages(product) {
  const imgs = [...(product.product_images || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(i => i.url).filter(Boolean);
  return imgs.length ? imgs : [];
}

function productVariants(product) {
  return [...(product.product_variants || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function productColors(product) {
  const colors = [];
  productVariants(product).forEach(v => {
    const c = (v.color || '').trim();
    if (c && !colors.some(x => normalize(x) === normalize(c))) colors.push(c);
  });
  return colors;
}

function carousel(product) {
  const imgs = productImages(product);
  if (!imgs.length) return '<div class="catalog-photo"><div class="empty">Sin foto</div></div>';
  const slides = imgs.map((url, i) => `<div class="slide ${i === 0 ? 'active' : ''}"><img src="${url}" alt="${escapeHTML(product.name)} ${i+1}"></div>`).join('');
  const controls = imgs.length > 1 ? `<button class="carousel-btn prev" data-prev="${product.id}" type="button">‹</button><button class="carousel-btn next" data-next="${product.id}" type="button">›</button><div class="dots">${imgs.map((_, i) => `<button class="dot ${i === 0 ? 'active' : ''}" data-dot="${product.id}:${i}" type="button"></button>`).join('')}</div>` : '';
  return `<div class="catalog-photo" data-carousel="${product.id}" data-index="0" data-count="${imgs.length}">${slides}${controls}</div>`;
}

function setCarousel(productId, index) {
  const el = document.querySelector(`[data-carousel="${productId}"]`);
  if (!el) return;
  const count = Number(el.dataset.count || 0);
  if (!count) return;
  index = (index + count) % count;
  el.dataset.index = String(index);
  $$('.slide', el).forEach((slide, i) => slide.classList.toggle('active', i === index));
  $$('.dot', el).forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function variantSelect(product) {
  const variants = productVariants(product).filter(v => Number(v.stock || 0) > 0);
  if (!variants.length) return `<input class="variant-text" placeholder="Talla / color">`;
  return `<select class="variant-select">${variants.map(v => `<option value="${v.id}">${escapeHTML([v.size, v.color].filter(Boolean).join(' / ') || 'Variante')} · ${v.stock} disp.</option>`).join('')}</select>`;
}

function card(product) {
  const variants = productVariants(product).filter(v => Number(v.stock || 0) > 0);
  const colors = productColors(product);
  const subtitle = product.category || colors[0] || 'Streetwear';
  const swatches = colors.length ? `<div class="color-row"><div class="color-dots">${colors.slice(0,4).map(c => `<span class="color-dot" style="--swatch:${colorNameToHex(c)}" title="${escapeHTML(c)}"></span>`).join('')}</div><span>${colors.length} ${colors.length === 1 ? 'color' : 'colores'}</span></div>` : '';
  return `<article class="catalog-card" data-card="${product.id}">
    ${carousel(product)}
    <div class="card-body">
      <div class="title-row"><h3>${escapeHTML(product.name)}</h3><span class="price">${money(product.price)}</span></div>
      <p class="subtitle">${escapeHTML(subtitle)}</p>
      ${swatches}
      ${product.description ? `<p class="description">${escapeHTML(product.description)}</p>` : ''}
      <div class="order-controls"><label>Variante${variantSelect(product)}</label><label>Cant.<input class="qty" type="number" min="1" step="1" value="1"></label></div>
      <div class="card-actions"><button class="ghost small" data-add="${product.id}" type="button">Agregar</button><button class="primary small" data-order="${product.id}" type="button">Pedir por WhatsApp</button></div>
    </div>
  </article>`;
}

function getSelection(productId) {
  const product = products.find(p => p.id === productId);
  const cardEl = document.querySelector(`[data-card="${productId}"]`);
  const qty = Math.max(1, Number($('.qty', cardEl)?.value || 1));
  let variant = '';
  const select = $('.variant-select', cardEl);
  if (select) {
    const v = productVariants(product).find(x => x.id === select.value);
    variant = v ? [v.size, v.color].filter(Boolean).join(' / ') : select.selectedOptions[0]?.textContent || '';
  } else {
    variant = $('.variant-text', cardEl)?.value || product.variants_text || '';
  }
  return { product, qty, variant };
}

function renderCart() {
  const box = $('#cart');
  if (!cart.length) {
    box.innerHTML = '<div class="cart-head"><div><strong>Carrito para clientes</strong><p class="muted">Agrega productos y manda el pedido completo por WhatsApp.</p></div></div>';
    return;
  }
  const total = cart.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  box.innerHTML = `<div class="cart-head"><div><strong>Carrito</strong><p class="muted">${cart.length} producto${cart.length === 1 ? '' : 's'} · ${money(total)}</p></div><div class="toolbar"><button class="ghost small" id="clearCart">Vaciar</button><button class="primary small" id="sendCart">Enviar pedido por WhatsApp</button></div></div><div class="cart-lines">${cart.map((item, i) => `<div class="cart-line"><div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.variant || 'Sin variante')} · x${item.qty} · ${money(item.price * item.qty)}</span></div><button class="danger small" data-remove="${i}">Quitar</button></div>`).join('')}</div>`;
}

async function saveWebOrder(items) {
  try {
    const total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
    const message = whatsappMessage(items, total);
    const { data: order, error } = await supabase.from('catalog_orders').insert({ total_reference: total, message, status: 'Nuevo' }).select().single();
    if (error) throw error;
    const rows = items.map(item => ({ order_id: order.id, product_id: item.product_id, product_name: item.name, sku: item.sku, variant: item.variant, qty: item.qty, unit_price: item.price, line_total: item.price * item.qty }));
    if (rows.length) await supabase.from('catalog_order_items').insert(rows);
  } catch (err) {
    console.warn('Pedido no guardado en Supabase, pero WhatsApp funcionará:', err);
  }
}

function whatsappMessage(items, total = null) {
  if (total === null) total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  const lines = [
    'Hola, quiero hacer un pedido desde el catálogo de MAOS.',
    '',
    'Productos:',
    ...items.map((item, i) => `${i + 1}. ${item.name}${item.sku ? ` (${item.sku})` : ''} · ${item.variant || 'Sin variante'} · x${item.qty} · ${money(item.price * item.qty)}`),
    '',
    `Total referencia: ${money(total)}`,
    '',
    'Te comparto el pedido para confirmar disponibilidad.'
  ];
  return lines.join('\n');
}

async function sendWhatsApp(items) {
  const total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  await saveWebOrder(items);
  const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
  const url = `https://wa.me/${wa}?text=${encodeURIComponent(whatsappMessage(items, total))}`;
  window.open(url, '_blank');
}

function populateCategories() {
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  $('#categoryFilter').innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  const nav = $('#categoryNav');
  nav.innerHTML = cats.map(c => `<button class="catalog-side-link" data-side-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
}

function updateCategoryUI() {
  $('#categoryFilter').value = selectedCategory;
  $$('.catalog-side-link').forEach(btn => {
    const active = (btn.dataset.sideCategory || '') === selectedCategory;
    btn.classList.toggle('active', active);
  });
  const label = selectedCategory || 'TODOS LOS PRODUCTOS';
  if ($('#activeCategoryLabel')) $('#activeCategoryLabel').textContent = label.toUpperCase();
  if ($('#catalogTitle')) $('#catalogTitle').textContent = selectedCategory ? `${selectedCategory}` : 'Todos los productos';
}

function filteredProducts() {
  const search = normalize($('#searchInput').value);
  return products.filter(p => (!selectedCategory || p.category === selectedCategory) && (!search || normalize([p.name, p.sku, p.category, p.description, p.variants_text, ...(p.product_variants || []).map(v => `${v.size} ${v.color}`)].join(' ')).includes(search)));
}

function renderFeatured() {
  const featured = products.slice(0, 4);
  $('#featuredGrid').innerHTML = featured.length ? featured.map(card).join('') : '<div class="empty">No hay novedades todavía.</div>';
}

function render() {
  const filtered = filteredProducts();
  $('#catalogGrid').innerHTML = filtered.length ? filtered.map(card).join('') : '<div class="empty">No hay productos disponibles.</div>';
  renderFeatured();
  updateCategoryUI();
  renderCart();
}

async function loadProducts() {
  $('#catalogStatus').textContent = 'Cargando catálogo...';
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)')
    .eq('status', 'Disponible')
    .order('created_at', { ascending: false });
  if (error) {
    $('#catalogStatus').textContent = `Error al cargar Supabase: ${error.message}`;
    return;
  }
  products = data || [];
  populateCategories();
  $('#catalogStatus').textContent = '';
  render();
}

renderBrand();
$('#searchInput').addEventListener('input', render);
$('#categoryFilter').addEventListener('change', (e) => { selectedCategory = e.target.value; render(); });
$('#scrollCartBtn').addEventListener('click', () => $('#cart')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

document.addEventListener('click', async (event) => {
  const categoryBtn = event.target.closest('[data-side-category]');
  if (categoryBtn) {
    selectedCategory = categoryBtn.dataset.sideCategory || '';
    render();
  }
  const prev = event.target.closest('[data-prev]')?.dataset.prev;
  if (prev) setCarousel(prev, Number(document.querySelector(`[data-carousel="${prev}"]`)?.dataset.index || 0) - 1);
  const next = event.target.closest('[data-next]')?.dataset.next;
  if (next) setCarousel(next, Number(document.querySelector(`[data-carousel="${next}"]`)?.dataset.index || 0) + 1);
  const dot = event.target.closest('[data-dot]')?.dataset.dot;
  if (dot) { const [id, index] = dot.split(':'); setCarousel(id, Number(index)); }
  const add = event.target.closest('[data-add]')?.dataset.add;
  if (add) {
    const { product, qty, variant } = getSelection(add);
    cart.push({ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) });
    renderCart();
  }
  const order = event.target.closest('[data-order]')?.dataset.order;
  if (order) {
    const { product, qty, variant } = getSelection(order);
    await sendWhatsApp([{ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) }]);
  }
  const remove = event.target.closest('[data-remove]')?.dataset.remove;
  if (remove !== undefined) { cart.splice(Number(remove), 1); renderCart(); }
  if (event.target.closest('#clearCart')) { cart = []; renderCart(); }
  if (event.target.closest('#sendCart')) { await sendWhatsApp(cart); }
});

await loadSettings();
loadProducts();
