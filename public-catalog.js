import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

let products = [];
let cart = [];
let selectedCategory = '';
let filtersVisible = true;
let settings = { brand_name: cfg.BRAND_NAME || 'MAOS', logo_url: '', store_whatsapp: cfg.STORE_WHATSAPP || '523112648451' };

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

function productImages(product) {
  return [...(product.product_images || [])]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(x => x.url)
    .filter(Boolean);
}
function productVariants(product) {
  return [...(product.product_variants || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}
function uniqueValues(list) {
  return [...new Set(list.filter(Boolean))];
}
function productColors(product) {
  return uniqueValues(productVariants(product).map(v => (v.color || '').trim()));
}
function productSizes(product) {
  return uniqueValues(productVariants(product).map(v => (v.size || '').trim()));
}
function colorNameToHex(name) {
  const key = normalize(name);
  const map = { negro:'#111', black:'#111', blanco:'#f7f7f5', white:'#f7f7f5', gris:'#9ca3af', gray:'#9ca3af', azul:'#2563eb', blue:'#2563eb', marino:'#1e3a8a', navy:'#1e3a8a', rojo:'#dc2626', red:'#dc2626', verde:'#16a34a', green:'#16a34a', beige:'#d6c6a5', crema:'#ece5d8', ecru:'#ece5d8', cafe:'#7c4a21', brown:'#7c4a21', rosa:'#f472b6', pink:'#f472b6', morado:'#7c3aed', purple:'#7c3aed', amarillo:'#facc15', yellow:'#facc15' };
  return map[key] || '#cbd5e1';
}

function renderBrand() {
  const name = settings.brand_name || cfg.BRAND_NAME || 'MAOS';
  const logoWrap = $('#publicBrandLogo');
  if (logoWrap) {
    logoWrap.innerHTML = settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo ${escapeHTML(name)}">` : `<span>${escapeHTML(name)}</span>`;
  }
  const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
  const waHref = `https://wa.me/${wa}`;
  if ($('#shopWhatsappTop')) $('#shopWhatsappTop').href = waHref;
}

async function loadSettings() {
  try {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle();
    if (data) settings = { ...settings, ...data };
  } catch (err) {
    console.warn('No se pudieron cargar settings cloud', err);
  }
  renderBrand();
}

function productLink(product) {
  return `product.html?id=${encodeURIComponent(product.id)}`;
}

function carousel(product, mode='card') {
  const imgs = productImages(product);
  if (!imgs.length) return '<div class="catalog-photo"><div class="empty">Sin foto</div></div>';
  const slides = imgs.map((url, i) => `<div class="slide ${i === 0 ? 'active' : ''}"><img src="${url}" alt="${escapeHTML(product.name)} ${i+1}"></div>`).join('');
  const controls = imgs.length > 1 ? `<button class="carousel-btn prev" data-prev="${product.id}:${mode}" type="button">‹</button><button class="carousel-btn next" data-next="${product.id}:${mode}" type="button">›</button><div class="dots">${imgs.map((_, i) => `<button class="dot ${i === 0 ? 'active' : ''}" data-dot="${product.id}:${i}:${mode}" type="button"></button>`).join('')}</div>` : '';
  return `<div class="catalog-photo minimal-photo" data-carousel="${product.id}:${mode}" data-index="0" data-count="${imgs.length}">${slides}${controls}</div>`;
}

function setCarousel(key, index) {
  const el = document.querySelector(`[data-carousel="${key}"]`);
  if (!el) return;
  const count = Number(el.dataset.count || 0);
  if (!count) return;
  index = (index + count) % count;
  el.dataset.index = String(index);
  $$('.slide', el).forEach((slide, i) => slide.classList.toggle('active', i === index));
  $$('.dot', el).forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function variantSelect(product, cls='variant-select') {
  const variants = productVariants(product).filter(v => Number(v.stock || 0) > 0);
  if (!variants.length) return `<input class="variant-text ${cls}" placeholder="Talla / color">`;
  return `<select class="${cls}">${variants.map(v => `<option value="${v.id}">${escapeHTML([v.size, v.color].filter(Boolean).join(' / ') || 'Variante')} · ${v.stock} disp.</option>`).join('')}</select>`;
}

function card(product) {
  const colors = productColors(product);
  const subtitle = product.category || 'Streetwear';
  const swatches = colors.length ? `<div class="color-row minimal-color-row"><div class="color-dots">${colors.slice(0,4).map(c => `<span class="color-dot" style="--swatch:${colorNameToHex(c)}" title="${escapeHTML(c)}"></span>`).join('')}</div>${colors.length > 1 ? `<span>${colors.length} colours</span>` : ''}</div>` : '';
  return `<article class="catalog-card minimal-card" data-card="${product.id}">
    <a href="${productLink(product)}" class="card-link-wrap">${carousel(product)}</a>
    <div class="card-body minimal-card-body">
      <div class="title-row minimal-title-row">
        <h3><a href="${productLink(product)}">${escapeHTML(product.name)}</a></h3>
        <span class="price">${money(product.price)}</span>
      </div>
      <p class="subtitle">${escapeHTML(subtitle)}</p>
      ${swatches}
      <div class="minimal-hover-actions">
        <button class="ghost small" data-quick-view="${product.id}" type="button">Vista rápida</button>
        <button class="primary small" data-order="${product.id}" type="button">WhatsApp</button>
      </div>
      <div class="minimal-order-inline">
        <label>Variante${variantSelect(product)}</label>
        <label>Cant.<input class="qty" type="number" min="1" step="1" value="1"></label>
        <button class="ghost small" data-quick-add="${product.id}" type="button">Agregar</button>
      </div>
    </div>
  </article>`;
}

function getSelection(productId, root=null, selectClass='.variant-select') {
  const product = products.find(p => p.id === productId);
  const scope = root || document.querySelector(`[data-card="${productId}"]`);
  const qty = Math.max(1, Number($('.qty', scope)?.value || 1));
  let variant = '';
  const select = $(selectClass, scope);
  if (select?.tagName === 'SELECT') {
    const v = productVariants(product).find(x => x.id === select.value);
    variant = v ? [v.size, v.color].filter(Boolean).join(' / ') : select.selectedOptions[0]?.textContent || '';
  } else {
    variant = $('.variant-text', scope)?.value || product.variants_text || '';
  }
  return { product, qty, variant };
}

function renderCart() {
  const box = $('#cart');
  if (!cart.length) {
    box.innerHTML = '<div class="cart-head"><div><strong>Bag</strong><p class="muted">Agrega productos y envía el pedido completo por WhatsApp.</p></div></div>';
    return;
  }
  const total = cart.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  box.innerHTML = `<div class="cart-head"><div><strong>Bag</strong><p class="muted">${cart.length} producto${cart.length === 1 ? '' : 's'} · ${money(total)}</p></div><div class="toolbar"><button class="ghost small" id="clearCart">Vaciar</button><button class="primary small" id="sendCart">Enviar pedido por WhatsApp</button></div></div><div class="cart-lines">${cart.map((item, i) => `<div class="cart-line"><div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.variant || 'Sin variante')} · x${item.qty} · ${money(item.price * item.qty)}</span></div><button class="danger small" data-remove="${i}">Quitar</button></div>`).join('')}</div>`;
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
  return lines.join('
');
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

async function sendWhatsApp(items) {
  const total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  await saveWebOrder(items);
  const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(whatsappMessage(items, total))}`, '_blank');
}

function populateFilters() {
  const cats = uniqueValues(products.map(p => p.category)).sort();
  const sizes = uniqueValues(products.flatMap(productSizes)).sort();
  const colors = uniqueValues(products.flatMap(productColors)).sort();
  $('#categoryFilter').innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('#sizeFilter').innerHTML = '<option value="">Talla</option>' + sizes.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
  $('#colorFilter').innerHTML = '<option value="">Color</option>' + colors.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('#categoryNav').innerHTML = cats.map(c => `<button class="catalog-side-link" data-side-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
}

function updateCategoryUI() {
  $('#categoryFilter').value = selectedCategory;
  $$('.catalog-side-link').forEach(btn => btn.classList.toggle('active', (btn.dataset.sideCategory || '') === selectedCategory));
  const label = selectedCategory || 'SHOP ALL';
  if ($('#activeCategoryLabel')) $('#activeCategoryLabel').textContent = label.toUpperCase();
}

function filteredProducts() {
  const search = normalize($('#searchInput').value);
  const size = $('#sizeFilter').value;
  const color = $('#colorFilter').value;
  return products.filter(p => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSearch = !search || normalize([p.name, p.sku, p.category, p.description, p.variants_text, ...(p.product_variants || []).map(v => `${v.size} ${v.color}`)].join(' ')).includes(search);
    const matchesSize = !size || productVariants(p).some(v => normalize(v.size) === normalize(size));
    const matchesColor = !color || productVariants(p).some(v => normalize(v.color) === normalize(color));
    return matchesCategory && matchesSearch && matchesSize && matchesColor;
  });
}

function render() {
  const filtered = filteredProducts();
  $('#catalogGrid').innerHTML = filtered.length ? filtered.map(card).join('') : '<div class="empty">No hay productos disponibles.</div>';
  $('#catalogStatus').textContent = filtered.length ? '' : '';
  updateCategoryUI();
  renderCart();
}

function quickViewTemplate(product) {
  const colors = productColors(product);
  const sizes = productSizes(product);
  return `<div class="quickview-grid" data-quick-root="${product.id}">
    <div>${carousel(product, 'quick')}</div>
    <div class="quickview-info">
      <span class="section-kicker">${escapeHTML(product.category || 'MAOS SELECT')}</span>
      <h2>${escapeHTML(product.name)}</h2>
      <strong class="quickview-price">${money(product.price)}</strong>
      ${product.description ? `<p>${escapeHTML(product.description)}</p>` : ''}
      ${colors.length ? `<p><strong>Colores:</strong> ${escapeHTML(colors.join(', '))}</p>` : ''}
      ${sizes.length ? `<p><strong>Tallas:</strong> ${escapeHTML(sizes.join(', '))}</p>` : ''}
      <div class="order-controls quickview-controls"><label>Variante${variantSelect(product, 'variant-select-quick')}</label><label>Cant.<input class="qty" type="number" min="1" step="1" value="1"></label></div>
      <div class="card-actions quickview-actions"><button class="ghost" data-modal-add="${product.id}" type="button">Agregar al carrito</button><button class="primary" data-modal-order="${product.id}" type="button">Pedir por WhatsApp</button></div>
      <a class="button ghost" href="${productLink(product)}">Ver producto completo</a>
    </div>
  </div>`;
}

function openQuickView(productId) {
  const modal = $('#quickViewModal');
  const product = products.find(p => p.id === productId);
  if (!product || !modal) return;
  $('#quickViewContent').innerHTML = quickViewTemplate(product);
  modal.showModal();
}

function toggleFilters(force=null) {
  filtersVisible = force === null ? !filtersVisible : !!force;
  document.body.classList.toggle('filters-collapsed', !filtersVisible);
}

async function loadProducts() {
  $('#catalogStatus').textContent = 'Cargando catálogo...';
  const { data, error } = await supabase.from('products').select('*, product_images(*), product_variants(*)').eq('status', 'Disponible').order('created_at', { ascending: false });
  if (error) {
    $('#catalogStatus').textContent = `Error al cargar Supabase: ${error.message}`;
    return;
  }
  products = data || [];
  populateFilters();
  $('#catalogStatus').textContent = '';
  render();
}

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
  if (dot) {
    const [id, index, mode='card'] = dot.split(':');
    setCarousel(`${id}:${mode}`, Number(index));
  }
  const add = event.target.closest('[data-quick-add]')?.dataset.quickAdd;
  if (add) {
    const { product, qty, variant } = getSelection(add);
    cart.push({ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) });
    renderCart();
  }
  const modalAdd = event.target.closest('[data-modal-add]')?.dataset.modalAdd;
  if (modalAdd) {
    const root = event.target.closest('[data-quick-root]');
    const { product, qty, variant } = getSelection(modalAdd, root, '.variant-select-quick');
    cart.push({ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) });
    renderCart();
    $('#quickViewModal')?.close();
  }
  const order = event.target.closest('[data-order]')?.dataset.order;
  if (order) {
    const { product, qty, variant } = getSelection(order);
    await sendWhatsApp([{ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) }]);
  }
  const modalOrder = event.target.closest('[data-modal-order]')?.dataset.modalOrder;
  if (modalOrder) {
    const root = event.target.closest('[data-quick-root]');
    const { product, qty, variant } = getSelection(modalOrder, root, '.variant-select-quick');
    await sendWhatsApp([{ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) }]);
  }
  const qv = event.target.closest('[data-quick-view]')?.dataset.quickView;
  if (qv) openQuickView(qv);
  const remove = event.target.closest('[data-remove]')?.dataset.remove;
  if (remove !== undefined) {
    cart.splice(Number(remove), 1);
    renderCart();
  }
  if (event.target.closest('#clearCart')) {
    cart = [];
    renderCart();
  }
  if (event.target.closest('#sendCart')) {
    await sendWhatsApp(cart);
  }
  if (event.target.closest('#toggleFiltersBtn')) {
    toggleFilters();
  }
});

renderBrand();
$('#searchInput').addEventListener('input', render);
$('#categoryFilter').addEventListener('change', (e) => { selectedCategory = e.target.value; render(); });
$('#sizeFilter').addEventListener('change', render);
$('#colorFilter').addEventListener('change', render);
$('#scrollCartBtn').addEventListener('click', () => $('#cart')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
$('#closeQuickView')?.addEventListener('click', () => $('#quickViewModal')?.close());

await loadSettings();
await loadProducts();
