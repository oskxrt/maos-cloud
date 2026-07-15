import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

let products = [];
let cart = [];
let selectedCategory = '';
let filtersVisible = false;
let settings = { brand_name: cfg.BRAND_NAME || 'MAOS', logo_url: '', store_whatsapp: cfg.STORE_WHATSAPP || '523112648451' };

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

let quickViewScrollY = 0;
function lockPageScroll() {
  quickViewScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('quickview-scroll-lock');
  document.body.style.top = `-${quickViewScrollY}px`;
}
function unlockPageScroll() {
  document.body.classList.remove('quickview-scroll-lock');
  document.body.style.top = '';
  window.scrollTo(0, quickViewScrollY || 0);
}

function setCatalogLoading(isLoading) {
  const loader = $('#catalogLoader');
  document.body.classList.toggle('catalog-is-loading', isLoading);
  if (loader) loader.classList.toggle('is-active', isLoading);
}

function hideCatalogLoader() {
  setTimeout(() => setCatalogLoading(false), 260);
}

function unique(list) { return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))]; }
function productImages(product) { return [...(product.product_images || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(i => i.url).filter(Boolean); }
function productVariants(product) { return [...(product.product_variants || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)); }
function productColors(product) { return unique(productVariants(product).map(v => v.color)); }
function productSizes(product) { return unique(productVariants(product).map(v => v.size)); }
function productStock(product) { return productVariants(product).reduce((s,v)=>s + Number(v.stock || 0), 0); }
function statusIsPublic(product) {
  const s = normalize(product.status || 'Disponible');
  return !['oculto','archivado','cancelado','eliminado'].includes(s);
}
function colorNameToHex(name) {
  const key = normalize(name);
  const map = { negro:'#111', black:'#111', blanco:'#f8f8f6', white:'#f8f8f6', gris:'#9ca3af', gray:'#9ca3af', azul:'#2563eb', blue:'#2563eb', marino:'#1e3a8a', navy:'#1e3a8a', rojo:'#dc2626', red:'#dc2626', verde:'#16a34a', green:'#16a34a', beige:'#d6c6a5', crema:'#ece5d8', ecru:'#ece5d8', cafe:'#7c4a21', brown:'#7c4a21', rosa:'#f472b6', pink:'#f472b6', morado:'#7c3aed', purple:'#7c3aed', amarillo:'#facc15', yellow:'#facc15' };
  return map[key] || '#cbd5e1';
}

function renderBrand() {
  const logo = $('#publicBrandLogo');
  const name = settings.brand_name || cfg.BRAND_NAME || 'MAOS';
  if (logo) logo.innerHTML = settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo ${escapeHTML(name)}">` : `<span>${escapeHTML(name)}</span>`;
  const loaderBrand = $('#loaderBrand');
  if (loaderBrand) loaderBrand.innerHTML = settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo ${escapeHTML(name)}">` : `<span>${escapeHTML(name)}</span>`;
}

async function loadSettings() {
  try {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle();
    if (data) settings = { ...settings, ...data };
  } catch (err) { console.warn('No se pudieron cargar settings', err); }
  renderBrand();
}

function firstPhoto(product) {
  const imgs = productImages(product);
  if (!imgs.length) return `<div class="minimal-product-photo"><div class="minimal-no-photo">Sin foto</div></div>`;
  return `<div class="minimal-product-photo"><img src="${imgs[0]}" alt="${escapeHTML(product.name)}"></div>`;
}

function carousel(product, mode='quick') {
  const imgs = productImages(product);
  if (!imgs.length) return `<div class="minimal-product-photo quick-photo"><div class="minimal-no-photo">Sin foto</div></div>`;
  const slides = imgs.map((url, i) => `<div class="slide ${i === 0 ? 'active' : ''}"><img src="${url}" alt="${escapeHTML(product.name)} ${i+1}" draggable="false" loading="lazy" decoding="async"></div>`).join('');
  const controls = imgs.length > 1 ? `<button class="carousel-btn prev" data-prev="${product.id}:${mode}" type="button" aria-label="Foto anterior"></button><button class="carousel-btn next" data-next="${product.id}:${mode}" type="button" aria-label="Foto siguiente"></button><div class="quick-dots">${imgs.map((_, i) => `<button class="dot ${i===0?'active':''}" data-dot="${product.id}:${i}:${mode}" type="button" aria-label="Ver foto ${i + 1}"></button>`).join('')}</div>` : '';
  return `<div class="minimal-product-photo quick-photo" data-carousel="${product.id}:${mode}" data-index="0" data-count="${imgs.length}">${slides}${controls}</div>`;
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
  return `<article class="minimal-product-card minimal-card-clean" data-open-quick="${product.id}" data-card="${product.id}" tabindex="0" role="button" aria-label="Ver ${escapeHTML(product.name)}">
    ${firstPhoto(product)}
    <div class="minimal-product-info clean-info">
      <div class="minimal-product-title"><span>${escapeHTML(product.name)}</span><strong>${money(product.price)}</strong></div>
    </div>
  </article>`;
}

function getSelection(productId, root=null, selectClass='.variant-select') {
  const product = products.find(p => p.id === productId);
  const scope = root || document.querySelector(`[data-card="${productId}"]`) || document;
  const qty = Math.max(1, Number($('.qty', scope)?.value || 1));
  let variant = '';
  const select = $(selectClass, scope);
  if (select?.tagName === 'SELECT') {
    const v = productVariants(product).find(x => x.id === select.value);
    variant = v ? [v.size, v.color].filter(Boolean).join(' / ') : select.selectedOptions[0]?.textContent || '';
  } else variant = $('.variant-text', scope)?.value || product?.variants_text || '';
  return { product, qty, variant };
}

function renderCart() {
  const box = $('#cart');
  if (!box) return;
  if (!cart.length) { box.innerHTML = ''; box.classList.remove('active'); return; }
  box.classList.add('active');
  const total = cart.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  box.innerHTML = `<div><strong>BAG</strong><span>${cart.length} producto${cart.length === 1 ? '' : 's'} · ${money(total)}</span></div><div class="minimal-cart-lines">${cart.map((item, i) => `<p><b>${escapeHTML(item.name)}</b> ${escapeHTML(item.variant || '')} · x${item.qty} <button data-remove="${i}">Quitar</button></p>`).join('')}</div><div class="minimal-cart-actions"><button id="clearCart">Vaciar</button><button id="sendCart">Enviar WhatsApp</button></div>`;
}

function whatsappMessage(items, total = null) {
  if (total === null) total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  return ['Hola, quiero hacer un pedido desde el catálogo de MAOS.', '', 'Productos:', ...items.map((item, i) => `${i + 1}. ${item.name}${item.sku ? ` (${item.sku})` : ''} · ${item.variant || 'Sin variante'} · x${item.qty} · ${money(item.price * item.qty)}`), '', `Total referencia: ${money(total)}`, '', 'Te comparto el pedido para confirmar disponibilidad.'].join('\n');
}

async function saveWebOrder(items) {
  try {
    const total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
    const message = whatsappMessage(items, total);
    const { data: order, error } = await supabase.from('catalog_orders').insert({ total_reference: total, message, status: 'Nuevo' }).select().single();
    if (error) throw error;
    const rows = items.map(item => ({ order_id: order.id, product_id: item.product_id, product_name: item.name, sku: item.sku, variant: item.variant, qty: item.qty, unit_price: item.price, line_total: item.price * item.qty }));
    if (rows.length) await supabase.from('catalog_order_items').insert(rows);
  } catch (err) { console.warn('Pedido no guardado, WhatsApp funciona:', err); }
}

async function sendWhatsApp(items) {
  if (!items.length) return;
  const total = items.reduce((s, item) => s + Number(item.price || 0) * Number(item.qty || 0), 0);
  await saveWebOrder(items);
  const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(whatsappMessage(items, total))}`, '_blank');
}

function populateFilters() {
  const cats = unique(products.map(p => p.category)).sort();
  const sizes = unique(products.flatMap(productSizes)).sort();
  const colors = unique(products.flatMap(productColors)).sort();
  $('#categoryFilter').innerHTML = '<option value="">Todas</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('#sizeFilter').innerHTML = '<option value="">Talla</option>' + sizes.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
  $('#colorFilter').innerHTML = '<option value="">Color</option>' + colors.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('#categoryNav').innerHTML = cats.map(c => `<button class="catalog-side-link" data-side-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
}

function updateCategoryUI() {
  $('#categoryFilter').value = selectedCategory;
  $$('.catalog-side-link').forEach(btn => btn.classList.toggle('active', (btn.dataset.sideCategory || '') === selectedCategory));
  $('#activeCategoryLabel').textContent = (selectedCategory || 'SHOP ALL').toUpperCase();
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
  const grid = $('#catalogGrid');
  const status = $('#catalogStatus');
  const filtered = filteredProducts();
  grid.innerHTML = filtered.length ? filtered.map(card).join('') : '';
  status.textContent = filtered.length ? '' : 'No hay productos disponibles con esos filtros.';
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
    </div>
  </div>`;
}
function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  const modal = $('#quickViewModal');
  if (!product || !modal) return;
  $('#quickViewContent').innerHTML = quickViewTemplate(product);
  lockPageScroll();
  modal.showModal();
  const scrollBox = modal.querySelector('.quickview-card');
  if (scrollBox) scrollBox.scrollTop = 0;
}

function toggleFilters(force=null) {
  filtersVisible = force === null ? !filtersVisible : !!force;
  document.body.classList.toggle('filters-open', filtersVisible);
}

async function loadProducts() {
  const status = $('#catalogStatus');
  setCatalogLoading(true);
  status.textContent = 'Cargando catálogo...';
  try {
    const { data, error } = await supabase.from('products').select('*, product_images(*), product_variants(*)').order('created_at', { ascending: false });
    if (error) throw error;
    products = (data || []).filter(statusIsPublic).filter(p => productStock(p) > 0 || !productVariants(p).length);
    populateFilters();
    status.textContent = '';
    render();
  } catch (err) {
    console.error(err);
    status.textContent = `Error al cargar catálogo: ${err.message || err}`;
  } finally {
    hideCatalogLoader();
  }
}


// Avoid accidental text/image selection while using the carousel controls.
document.addEventListener('pointerdown', (event) => {
  if (event.target.closest?.('.quick-photo .carousel-btn, .quick-photo .dot')) {
    event.preventDefault();
  }
});

document.addEventListener('click', async (event) => {
  const categoryBtn = event.target.closest('[data-side-category]');
  if (categoryBtn) { selectedCategory = categoryBtn.dataset.sideCategory || ''; render(); }
  if (event.target.closest('#toggleFiltersBtn') || event.target.closest('#searchToggleBtn')) toggleFilters();
  const prev = event.target.closest('[data-prev]')?.dataset.prev;
  if (prev) { event.preventDefault(); event.stopPropagation(); setCarousel(prev, Number(document.querySelector(`[data-carousel="${prev}"]`)?.dataset.index || 0) - 1); return; }
  const next = event.target.closest('[data-next]')?.dataset.next;
  if (next) { event.preventDefault(); event.stopPropagation(); setCarousel(next, Number(document.querySelector(`[data-carousel="${next}"]`)?.dataset.index || 0) + 1); return; }
  const dot = event.target.closest('[data-dot]')?.dataset.dot;
  if (dot) { event.preventDefault(); event.stopPropagation(); const [id, index, mode='quick'] = dot.split(':'); setCarousel(`${id}:${mode}`, Number(index)); return; }
  const open = event.target.closest('[data-open-quick]')?.dataset.openQuick;
  if (open) { openQuickView(open); return; }
  const modalAdd = event.target.closest('[data-modal-add]')?.dataset.modalAdd;
  if (modalAdd) { const root = event.target.closest('[data-quick-root]'); const { product, qty, variant } = getSelection(modalAdd, root, '.variant-select-quick'); cart.push({ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) }); renderCart(); $('#quickViewModal')?.close(); }
  const modalOrder = event.target.closest('[data-modal-order]')?.dataset.modalOrder;
  if (modalOrder) { const root = event.target.closest('[data-quick-root]'); const { product, qty, variant } = getSelection(modalOrder, root, '.variant-select-quick'); await sendWhatsApp([{ product_id: product.id, name: product.name, sku: product.sku || '', variant, qty, price: Number(product.price || 0) }]); }
  const remove = event.target.closest('[data-remove]')?.dataset.remove;
  if (remove !== undefined) { cart.splice(Number(remove), 1); renderCart(); }
  if (event.target.closest('#clearCart')) { cart = []; renderCart(); }
  if (event.target.closest('#sendCart')) await sendWhatsApp(cart);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const card = event.target.closest?.('[data-open-quick]');
    if (card) openQuickView(card.dataset.openQuick);
  }
});

$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.id === 'quickViewModal') unlockPageScroll();
  });
});

$('#searchInput').addEventListener('input', render);
$('#categoryFilter').addEventListener('change', e => { selectedCategory = e.target.value; render(); });
$('#sizeFilter').addEventListener('change', render);
$('#colorFilter').addEventListener('change', render);
$('#scrollCartBtn').addEventListener('click', () => $('#cart')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
$('#closeQuickView')?.addEventListener('click', () => $('#quickViewModal')?.close());

await loadSettings();
await loadProducts();
