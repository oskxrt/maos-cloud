import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const escapeAttr = (v) => escapeHTML(v).replace(/`/g, '&#96;');
const toNumber = (value) => { if (typeof value === 'number') return Number.isFinite(value) ? value : 0; const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : 0; };
const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let products = [];
let webOrders = [];
let adminOrders = [];
let customers = [];
let settings = { brand_name: cfg.BRAND_NAME || 'MAOS', store_whatsapp: cfg.STORE_WHATSAPP || '523112648451', logo_url: '' };
let currentImages = [];
let selectedFiles = [];
let editingOrder = null;
let receiptOrderId = null;

function setStatus(id, msg) { const el = $(id); if (el) el.textContent = msg || ''; }
function brandInitial() { return (settings.brand_name || cfg.BRAND_NAME || 'M').slice(0,1).toUpperCase(); }
function renderBrand() {
  const name = settings.brand_name || cfg.BRAND_NAME || 'MAOS';
  const logo = settings.logo_url || '';
  $('#sidebarBrandName').textContent = name;
  ['#sidebarBrandMark', '#loginBrandMark'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = logo ? `<img src="${logo}" alt="Logo ${escapeHTML(name)}">` : brandInitial();
  });
  const preview = $('#brandLogoPreview');
  if (preview) preview.innerHTML = logo ? `<img src="${logo}" alt="Logo actual">` : '<span class="muted">Sin logo cargado</span>';
  if ($('#brandNameInput')) $('#brandNameInput').value = name;
  if ($('#storeWhatsappInput')) $('#storeWhatsappInput').value = settings.store_whatsapp || cfg.STORE_WHATSAPP || '';
}

async function loadSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle();
  if (!error && data) settings = { ...settings, ...data };
  renderBrand();
}

async function saveBrandSettings() {
  setStatus('#settingsStatus', 'Guardando identidad...');
  let logoUrl = settings.logo_url || '';
  const file = $('#brandLogoInput').files?.[0];
  if (file) {
    const path = `brand/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
    const { error: upError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (upError) { setStatus('#settingsStatus', upError.message); return; }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    logoUrl = data.publicUrl;
  }
  settings = {
    ...settings,
    id: 'main',
    brand_name: $('#brandNameInput').value.trim() || 'MAOS',
    store_whatsapp: normalizeWhatsapp($('#storeWhatsappInput').value) || '523112648451',
    logo_url: logoUrl,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('app_settings').upsert(settings, { onConflict: 'id' });
  if (error) { setStatus('#settingsStatus', error.message); return; }
  $('#brandLogoInput').value = '';
  renderBrand();
  setStatus('#settingsStatus', 'Identidad guardada.');
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) await showAdmin(); else showLogin();
}
function showLogin() { $('#loginView').classList.remove('hidden'); $('#adminView').classList.add('hidden'); }
async function showAdmin() {
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
  await loadSettings();
  await Promise.all([loadProducts(), loadWebOrders(), loadAdminOrders(), loadCustomers()]);
  renderDashboard();
}

function productVariants(product) { return [...(product?.product_variants || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)); }
function productStock(product) { return productVariants(product).reduce((s, v) => s + Number(v.stock || 0), 0); }
function productOptionHtml(selected = '') {
  return '<option value="">Producto manual</option>' + products.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${escapeHTML(p.name)} — ${money(p.price)}</option>`).join('');
}
function variantOptionHtml(productId, selected = '') {
  const product = products.find(p => p.id === productId);
  const vars = productVariants(product);
  if (!vars.length) return '<option value="">Sin variante</option>';
  return '<option value="">Sin variante</option>' + vars.map(v => `<option value="${v.id}" ${v.id === selected ? 'selected' : ''}>${escapeHTML([v.size, v.color].filter(Boolean).join(' / ') || 'Variante')} · stock ${v.stock}</option>`).join('');
}

function clearForm() {
  $('#formTitle').textContent = 'Nuevo producto';
  $('#productId').value = '';
  $('#productName').value = '';
  $('#productSku').value = '';
  $('#productCategory').value = '';
  $('#productSupplier').value = '';
  $('#productCost').value = 0;
  $('#productPrice').value = 0;
  $('#productStatus').value = 'Disponible';
  $('#productDescription').value = '';
  $('#productVariants').value = '';
  $('#productImages').value = '';
  currentImages = [];
  selectedFiles = [];
  renderPreview();
  setStatus('#productStatusText', '');
}
function nextSku(category = '', name = '') {
  const prefix = (category || name || 'PROD').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'PRO';
  const nums = products.map(p => String(p.sku || '').match(new RegExp(`MAOS-${prefix}-(\\d+)`))?.[1]).filter(Boolean).map(Number);
  const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
  return `MAOS-${prefix}-${next}`;
}
function parseVariants(text) {
  return String(text || '').split('\n').map((line, index) => {
    const parts = line.split('/').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    return { size: parts[0] || '', color: parts[1] || '', stock: Number(parts[2] || 0), sort_order: index };
  }).filter(Boolean);
}
function variantsText(variants = []) { return variants.map(v => [v.size, v.color, v.stock].filter(v => v !== undefined && v !== null && v !== '').join(' / ')).join('\n'); }
function renderPreview() {
  const imgs = [...currentImages.map(i => i.url), ...selectedFiles.map(f => URL.createObjectURL(f))];
  $('#imagePreview').innerHTML = imgs.map(src => `<img src="${src}" alt="preview">`).join('') || '<span class="muted">Sin fotos</span>';
}
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*, product_images(*), product_variants(*)').order('created_at', { ascending: false });
  if (error) { setStatus('#productStatusText', `Error: ${error.message}`); return; }
  products = data || [];
  $('#productsTable').innerHTML = products.map(product => {
    const stock = productStock(product);
    return `<tr><td><strong>${escapeHTML(product.name)}</strong><br><span class="muted">${escapeHTML(product.sku || 'Sin SKU')} · ${escapeHTML(product.category || 'Sin categoría')} · Stock ${stock}</span></td><td>${money(product.price)}</td><td><span class="badge">${escapeHTML(product.status || '—')}</span></td><td><button class="ghost small" data-edit="${product.id}">Editar</button></td></tr>`;
  }).join('') || '<tr><td colspan="4">Sin productos todavía.</td></tr>';
}
async function uploadImages(productId, files) {
  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `${productId}/${Date.now()}-${i}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    rows.push({ product_id: productId, url: data.publicUrl, path, sort_order: currentImages.length + i });
  }
  if (rows.length) await supabase.from('product_images').insert(rows);
}
async function saveProduct(event) {
  event.preventDefault();
  setStatus('#productStatusText', 'Guardando...');
  const id = $('#productId').value;
  const payload = {
    name: $('#productName').value.trim(), sku: $('#productSku').value.trim() || nextSku($('#productCategory').value, $('#productName').value),
    category: $('#productCategory').value.trim(), supplier: $('#productSupplier').value.trim(), cost: Number($('#productCost').value || 0), price: Number($('#productPrice').value || 0),
    status: $('#productStatus').value, description: $('#productDescription').value.trim(), variants_text: $('#productVariants').value.trim(), updated_at: new Date().toISOString()
  };
  let productId = id;
  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) { setStatus('#productStatusText', error.message); return; }
    await supabase.from('product_variants').delete().eq('product_id', id);
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) { setStatus('#productStatusText', error.message); return; }
    productId = data.id;
  }
  const variants = parseVariants($('#productVariants').value).map(v => ({ ...v, product_id: productId }));
  if (variants.length) await supabase.from('product_variants').insert(variants);
  if (selectedFiles.length) await uploadImages(productId, selectedFiles);
  await loadProducts();
  clearForm();
  renderDashboard();
  setStatus('#productStatusText', 'Producto guardado.');
}
function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $('#formTitle').textContent = 'Editar producto';
  $('#productId').value = p.id;
  $('#productName').value = p.name || '';
  $('#productSku').value = p.sku || '';
  $('#productCategory').value = p.category || '';
  $('#productSupplier').value = p.supplier || '';
  $('#productCost').value = p.cost || 0;
  $('#productPrice').value = p.price || 0;
  $('#productStatus').value = p.status || 'Disponible';
  $('#productDescription').value = p.description || '';
  $('#productVariants').value = variantsText(productVariants(p));
  currentImages = [...(p.product_images || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  selectedFiles = [];
  renderPreview();
  activateTab('products');
}
async function hideProduct() {
  const id = $('#productId').value;
  if (!id) return;
  await supabase.from('products').update({ status: 'Oculto', updated_at: new Date().toISOString() }).eq('id', id);
  clearForm();
  await loadProducts();
}

async function loadWebOrders() {
  const { data, error } = await supabase.from('catalog_orders').select('*, catalog_order_items(*)').order('created_at', { ascending: false }).limit(80);
  if (error) return;
  webOrders = data || [];
  $('#ordersTable').innerHTML = webOrders.map(order => `<tr><td>${new Date(order.created_at).toLocaleString('es-MX')}</td><td>${(order.catalog_order_items || []).map(item => `<strong>${escapeHTML(item.product_name)}</strong><br><span class="muted">${escapeHTML(item.variant || 'Sin variante')} · x${item.qty}</span>`).join('<hr>')}</td><td>${money(order.total_reference)}</td><td><span class="badge">${escapeHTML(order.status || 'Nuevo')}</span></td><td><div class="row-actions"><button class="ghost small" data-convert-web-order="${order.id}">Pasar a pedido</button><button class="danger small" data-delete-web-order="${order.id}">Eliminar</button></div></td></tr>`).join('') || '<tr><td colspan="5">Sin pedidos web todavía.</td></tr>';
}

function calcOrder(order) {
  const subtotal = (order.order_items || []).reduce((s, item) => s + toNumber(item.qty) * toNumber(item.price), 0);
  const cost = (order.order_items || []).reduce((s, item) => s + toNumber(item.qty) * toNumber(item.cost), 0);
  const discount = toNumber(order.discount);
  const total = Math.max(0, subtotal - discount);
  const paid = (order.order_payments || []).reduce((s, p) => s + toNumber(p.amount), 0);
  const balance = Math.max(0, total - paid);
  return { subtotal, discount, total, paid, balance, profit: total - cost };
}
function nextFolio() {
  const nums = adminOrders.map(o => String(o.folio || '').match(/MAOS-(\d+)/)?.[1]).filter(Boolean).map(Number);
  return `MAOS-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
}
async function loadAdminOrders() {
  const { data, error } = await supabase.from('orders').select('*, order_items(*), order_payments(*)').order('created_at', { ascending: false });
  if (error) { console.warn(error); return; }
  adminOrders = data || [];
  renderAdminOrdersTable();
  renderDashboard();
}
function renderAdminOrdersTable() {
  const rows = adminOrders.map(order => {
    const totals = calcOrder(order);
    return `<tr><td><strong>${escapeHTML(order.folio)}</strong><br><span class="muted">${order.order_date || '—'} ${order.order_time || ''}</span></td><td>${escapeHTML(order.customer_name || 'Sin cliente')}<br><span class="muted">${escapeHTML(order.customer_phone || '')}</span></td><td><span class="badge">${escapeHTML(order.status || '—')}</span></td><td>${money(totals.total)}</td><td>${money(totals.paid)}</td><td><strong>${money(totals.balance)}</strong></td><td><div class="row-actions"><button class="ghost small" data-receipt="${order.id}">Recibo</button><button class="ghost small" data-whatsapp-receipt="${order.id}">WhatsApp</button><button class="ghost small" data-edit-order="${order.id}">Editar</button><button class="danger small" data-delete-order="${order.id}">Eliminar</button></div></td></tr>`;
  }).join('') || '<tr><td colspan="7">Sin pedidos todavía.</td></tr>';
  $('#adminOrdersTable').innerHTML = rows;
}

function customerKeyFrom(name = '', phone = '') {
  const normalizedPhone = normalizeWhatsapp(phone);
  if (normalizedPhone) return `phone:${normalizedPhone}`;
  return `name:${normalize(name)}`;
}
function matchingOrdersForCustomer(customer) {
  const key = customerKeyFrom(customer.name, customer.phone);
  return adminOrders.filter(order => customerKeyFrom(order.customer_name, order.customer_phone) === key);
}
function customerStats(customer) {
  const orders = matchingOrdersForCustomer(customer).filter(order => order.status !== 'Cancelado');
  return orders.reduce((acc, order) => {
    const t = calcOrder(order);
    acc.orders += 1;
    acc.total += t.total;
    acc.paid += t.paid;
    acc.balance += t.balance;
    acc.lastDate = !acc.lastDate || String(order.order_date || '') > acc.lastDate ? String(order.order_date || '') : acc.lastDate;
    return acc;
  }, { orders: 0, total: 0, paid: 0, balance: 0, lastDate: '' });
}
async function loadCustomers() {
  const table = $('#clientsTable');
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn(error);
    customers = [];
    if (table) table.innerHTML = `<tr><td colspan="4">Falta ejecutar el schema de clientes: ${escapeHTML(error.message)}</td></tr>`;
    return;
  }
  customers = data || [];
  renderClientsTable();
  renderCustomerSelect();
  renderDashboard();
}
function renderClientsTable() {
  const table = $('#clientsTable');
  if (!table) return;
  const search = normalize($('#clientSearch')?.value || '');
  const filtered = customers.filter(customer => !search || normalize([customer.name, customer.phone, customer.social, customer.email, customer.notes].join(' ')).includes(search));
  table.innerHTML = filtered.length ? filtered.map(customer => {
    const stats = customerStats(customer);
    const phone = normalizeWhatsapp(customer.phone || '');
    return `<tr>
      <td><strong>${escapeHTML(customer.name || 'Sin nombre')}</strong><br><span class="muted">${escapeHTML(customer.phone || 'Sin teléfono')}${customer.social ? ` · ${escapeHTML(customer.social)}` : ''}</span>${customer.notes ? `<br><span class="muted">${escapeHTML(customer.notes)}</span>` : ''}</td>
      <td>${stats.orders}<br><span class="muted">Último: ${stats.lastDate || '—'}</span></td>
      <td><strong>${money(stats.balance)}</strong><br><span class="muted">Vendido: ${money(stats.total)}</span></td>
      <td><div class="row-actions"><button class="ghost small" data-edit-client="${customer.id}">Editar</button><button class="ghost small" data-client-order="${customer.id}">Pedido</button>${phone ? `<button class="ghost small" data-client-wa="${customer.id}">WhatsApp</button>` : ''}</div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="4">Sin clientes registrados.</td></tr>';
}
function renderCustomerSelect(selectedId = '') {
  const select = $('#orderCustomerSelect');
  if (!select) return;
  const current = selectedId || select.value || '';
  const sorted = [...customers].sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
  select.innerHTML = '<option value="">Nuevo cliente / escribir manual</option>' + sorted.map(customer => `<option value="${customer.id}">${escapeHTML(customer.name || 'Sin nombre')}${customer.phone ? ` · ${escapeHTML(customer.phone)}` : ''}</option>`).join('');
  select.value = current && sorted.some(c => c.id === current) ? current : '';
}
function findCustomerForOrder(order = {}) {
  if (order.customer_id) {
    const byId = customers.find(c => c.id === order.customer_id);
    if (byId) return byId;
  }
  const phone = normalizeWhatsapp(order.customer_phone || '');
  if (phone) {
    const byPhone = customers.find(c => normalizeWhatsapp(c.phone || '') === phone);
    if (byPhone) return byPhone;
  }
  const name = normalize(order.customer_name || '');
  if (name) return customers.find(c => normalize(c.name || '') === name) || null;
  return null;
}
function fillOrderCustomer(customer) {
  if (!customer) return;
  $('#orderCustomerSelect').value = customer.id || '';
  $('#orderCustomerName').value = customer.name || '';
  $('#orderCustomerPhone').value = customer.phone || '';
  $('#orderCustomerSocial').value = customer.social || '';
  if (!$('#orderDelivery').value) $('#orderDelivery').value = customer.address || '';
}
function clearClientForm() {
  $('#clientFormTitle').textContent = 'Nuevo cliente';
  $('#clientId').value = '';
  $('#clientName').value = '';
  $('#clientPhone').value = '';
  $('#clientSocial').value = '';
  $('#clientEmail').value = '';
  $('#clientAddress').value = '';
  $('#clientNotes').value = '';
  setStatus('#clientStatusText', '');
}
function editClient(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  activateTab('clients');
  $('#clientFormTitle').textContent = `Editar ${customer.name || 'cliente'}`;
  $('#clientId').value = customer.id || '';
  $('#clientName').value = customer.name || '';
  $('#clientPhone').value = customer.phone || '';
  $('#clientSocial').value = customer.social || '';
  $('#clientEmail').value = customer.email || '';
  $('#clientAddress').value = customer.address || '';
  $('#clientNotes').value = customer.notes || '';
}
async function saveClient(event) {
  event?.preventDefault?.();
  const name = $('#clientName').value.trim();
  if (!name) { setStatus('#clientStatusText', 'Escribe el nombre del cliente.'); return; }
  const payload = {
    name,
    phone: $('#clientPhone').value.trim(),
    phone_normalized: normalizeWhatsapp($('#clientPhone').value),
    social: $('#clientSocial').value.trim(),
    email: $('#clientEmail').value.trim(),
    address: $('#clientAddress').value.trim(),
    notes: $('#clientNotes').value.trim(),
    updated_at: new Date().toISOString()
  };
  const id = $('#clientId').value;
  setStatus('#clientStatusText', 'Guardando cliente...');
  const result = id ? await supabase.from('customers').update(payload).eq('id', id) : await supabase.from('customers').insert(payload);
  if (result.error) { setStatus('#clientStatusText', result.error.message); return; }
  clearClientForm();
  await loadCustomers();
  setStatus('#clientStatusText', 'Cliente guardado.');
}
async function deleteClient() {
  const id = $('#clientId')?.value;
  if (!id) { clearClientForm(); return; }
  if (!confirm('¿Borrar este cliente? Sus pedidos existentes no se borran.')) return;
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) { setStatus('#clientStatusText', error.message); return; }
  clearClientForm();
  await loadCustomers();
}
async function upsertCustomerFromOrderPayload(payload) {
  const selectedId = $('#orderCustomerSelect')?.value || payload.customer_id || '';
  if (selectedId) {
    const selected = customers.find(c => c.id === selectedId);
    if (selected) return selected.id;
  }
  const name = (payload.customer_name || '').trim();
  const phone = (payload.customer_phone || '').trim();
  if (!name && !phone) return null;
  const keyPhone = normalizeWhatsapp(phone);
  try {
    let existing = null;
    if (keyPhone) {
      const { data } = await supabase.from('customers').select('*').eq('phone_normalized', keyPhone).maybeSingle();
      existing = data;
    }
    if (!existing && name) {
      const { data } = await supabase.from('customers').select('*').eq('name', name).maybeSingle();
      existing = data;
    }
    const data = { name: name || existing?.name || 'Cliente', phone, phone_normalized: keyPhone || null, social: payload.customer_social || '', updated_at: new Date().toISOString() };
    if (existing?.id) {
      await supabase.from('customers').update({ ...data, social: data.social || existing.social || '' }).eq('id', existing.id);
      return existing.id;
    }
    const { data: inserted } = await supabase.from('customers').insert(data).select('id').single();
    return inserted?.id || null;
  } catch (error) {
    console.warn('No se pudo sincronizar cliente', error);
    return null;
  }
}
function newOrderForClient(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  activateTab('orders');
  openOrderDialog();
  fillOrderCustomer(customer);
}
function whatsappClient(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  const phone = normalizeWhatsapp(customer.phone);
  if (!phone) return;
  const stats = customerStats(customer);
  const lines = ['Hola, te escribimos de MAOS.', stats.balance > 0 ? `Saldo pendiente: ${money(stats.balance)}` : '', 'Quedamos atentos.'].filter(Boolean);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

function renderDashboard() {
  if (!$('#dashboardStats')) return;
  const activeOrders = adminOrders.filter(order => order.status !== 'Cancelado');
  const productCount = products.filter(p => p.status !== 'Oculto').length;
  const stock = products.reduce((s, p) => s + productStock(p), 0);
  const lowStockItems = products.filter(p => p.status !== 'Oculto' && productStock(p) <= 1);
  const inventoryCost = products.reduce((s, p) => s + productStock(p) * toNumber(p.cost), 0);
  const inventoryValue = products.reduce((s, p) => s + productStock(p) * toNumber(p.price), 0);
  const totals = activeOrders.reduce((acc, order) => {
    const t = calcOrder(order);
    acc.total += t.total; acc.paid += t.paid; acc.balance += t.balance; acc.profit += t.profit;
    if (['Pendiente', 'Apartado', 'Cotización'].includes(order.status)) acc.pending += 1;
    return acc;
  }, { total: 0, paid: 0, balance: 0, profit: 0, pending: 0 });

  $('#dashboardStats').innerHTML = `
    <article class="stat-card old-style-stat"><span>Ventas</span><strong>${money(totals.total)}</strong><small>Pedidos no cancelados</small></article>
    <article class="stat-card old-style-stat"><span>Ganancia estimada</span><strong>${money(totals.profit)}</strong><small>Venta - costo - descuento</small></article>
    <article class="stat-card old-style-stat"><span>Saldo pendiente</span><strong>${money(totals.balance)}</strong><small>Clientes por cobrar</small></article>
    <article class="stat-card old-style-stat"><span>Pedidos pendientes</span><strong>${totals.pending}</strong><small>Pendiente / apartado</small></article>
    <article class="stat-card old-style-stat"><span>Productos</span><strong>${productCount}</strong><small>Activos registrados</small></article>
    <article class="stat-card old-style-stat"><span>Clientes</span><strong>${customers.length}</strong><small>Contactos guardados</small></article>
    <article class="stat-card old-style-stat"><span>Stock bajo</span><strong>${lowStockItems.length}</strong><small>En o bajo mínimo</small></article>
    <article class="stat-card old-style-stat"><span>Invertido en stock</span><strong>${money(inventoryCost)}</strong><small>Costo x piezas</small></article>
    <article class="stat-card old-style-stat"><span>Valor de inventario</span><strong>${money(inventoryValue)}</strong><small>Precio venta x piezas</small></article>`;

  const recentOrdersHtml = adminOrders.slice(0, 5).map(order => {
    const t = calcOrder(order);
    const overdue = t.balance > 0 && order.due_date && order.due_date < today() && !['Entregado', 'Pagado', 'Cancelado'].includes(order.status);
    return `<div class="dashboard-line">
      <div><strong>${escapeHTML(order.folio || 'Sin folio')}</strong><span>${escapeHTML(order.customer_name || 'Sin cliente')} · ${order.order_date || '—'}</span></div>
      <div class="line-end">${overdue ? '<em class="danger-pill">Atrasado</em>' : `<em>${escapeHTML(order.status || '—')}</em>`}<strong>${money(t.total)}</strong></div>
    </div>`;
  }).join('') || '<div class="empty-widget">Sin pedidos todavía.</div>';

  const alertsHtml = lowStockItems.slice(0, 5).map(product => {
    const variants = productVariants(product).filter(v => Number(v.stock || 0) <= 1);
    const variantText = variants.length ? variants.slice(0, 3).map(v => `${[v.size, v.color].filter(Boolean).join(' / ') || 'Variante'}: ${v.stock}`).join(' · ') : `Stock ${productStock(product)}`;
    return `<div class="dashboard-line">
      <div><strong>${escapeHTML(product.name)}</strong><span>${escapeHTML(product.sku || 'Sin SKU')} · ${escapeHTML(variantText)}${variants.length > 3 ? ' · + más' : ''}</span></div>
      <div class="line-end"><em class="warn-pill">Stock bajo</em><strong>${productStock(product)}</strong></div>
    </div>`;
  }).join('') || '<div class="empty-widget">Sin alertas de inventario.</div>';

  const receivableMap = new Map();
  activeOrders.forEach(order => {
    const t = calcOrder(order);
    if (t.balance <= 0) return;
    const key = order.customer_name || 'Sin cliente';
    const current = receivableMap.get(key) || { name: key, phone: order.customer_phone || '', balance: 0, overdue: false };
    current.balance += t.balance;
    current.phone = current.phone || order.customer_phone || '';
    current.overdue = current.overdue || Boolean(order.due_date && order.due_date < today());
    receivableMap.set(key, current);
  });
  const receivables = [...receivableMap.values()].sort((a,b) => b.balance - a.balance);
  const receivablesHtml = receivables.slice(0, 5).map(client => `<div class="dashboard-line">
    <div><strong>${escapeHTML(client.name)}</strong><span>${escapeHTML(client.phone || 'Sin teléfono')}</span></div>
    <div class="line-end">${client.overdue ? '<em class="danger-pill">Atrasado</em>' : '<em>Pendiente</em>'}<strong>${money(client.balance)}</strong></div>
  </div>`).join('') || '<div class="empty-widget">Sin cuentas por cobrar.</div>';

  const productSales = new Map();
  activeOrders.forEach(order => (order.order_items || []).forEach(item => {
    const key = `${item.product_name || 'Producto'} ${item.variant_label || ''}`.trim();
    const current = productSales.get(key) || { name: key, qty: 0, revenue: 0, profit: 0 };
    current.qty += toNumber(item.qty);
    current.revenue += toNumber(item.qty) * toNumber(item.price);
    current.profit += toNumber(item.qty) * (toNumber(item.price) - toNumber(item.cost));
    productSales.set(key, current);
  }));
  const topProducts = [...productSales.values()].sort((a,b) => b.revenue - a.revenue);
  const topProductsHtml = topProducts.slice(0, 5).map(item => `<div class="dashboard-line">
    <div><strong>${escapeHTML(item.name)}</strong><span>${item.qty} piezas vendidas</span></div>
    <div class="line-end"><strong>${money(item.revenue)}</strong><span>gan. ${money(item.profit)}</span></div>
  </div>`).join('') || '<div class="empty-widget">Sin ventas todavía.</div>';

  if ($('#dashboardWidgets')) $('#dashboardWidgets').innerHTML = `
    <section class="panel dashboard-panel"><div class="panel-head-inline"><h3>Pedidos recientes</h3><button class="ghost small" data-tab="orders">Ver todos</button></div><div class="widget-list">${recentOrdersHtml}</div></section>
    <section class="panel dashboard-panel"><div class="panel-head-inline"><h3>Alertas de inventario</h3><button class="ghost small" data-tab="products">Revisar</button></div><div class="widget-list">${alertsHtml}</div></section>
    <section class="panel dashboard-panel"><div class="panel-head-inline"><h3>Cuentas por cobrar</h3><button class="ghost small" data-tab="orders">Pedidos</button></div><div class="widget-list">${receivablesHtml}</div></section>
    <section class="panel dashboard-panel"><div class="panel-head-inline"><h3>Productos más vendidos</h3><button class="ghost small" data-tab="products">Productos</button></div><div class="widget-list">${topProductsHtml}</div></section>`;
}


function addOrderItemRow(item = {}) {
  const row = document.createElement('div');
  row.className = 'order-edit-row';
  const product = products.find(p => p.id === item.product_id);
  row.innerHTML = `
    <label>Producto<select class="order-product">${productOptionHtml(item.product_id || '')}</select></label>
    <label>Variante<select class="order-variant">${variantOptionHtml(item.product_id || '', item.variant_id || '')}</select></label>
    <label>Nombre manual<input class="order-product-name" value="${escapeAttr(item.product_name || product?.name || '')}" placeholder="Producto"></label>
    <label>Cant.<input class="order-qty" type="number" min="1" step="1" value="${item.qty || 1}"></label>
    <label>Precio<input class="order-price" type="number" min="0" step="0.01" value="${item.price ?? product?.price ?? 0}"></label>
    <label>Costo<input class="order-cost" type="number" min="0" step="0.01" value="${item.cost ?? product?.cost ?? 0}"></label>
    <button type="button" class="remove-row" title="Quitar">×</button>`;
  $('#orderItemsBox').appendChild(row);
  const prodSel = $('.order-product', row);
  const varSel = $('.order-variant', row);
  prodSel.addEventListener('change', () => {
    const p = products.find(x => x.id === prodSel.value);
    varSel.innerHTML = variantOptionHtml(prodSel.value, '');
    $('.order-product-name', row).value = p?.name || '';
    $('.order-price', row).value = p?.price || 0;
    $('.order-cost', row).value = p?.cost || 0;
    updateOrderPreview();
  });
  row.addEventListener('input', updateOrderPreview);
  varSel.addEventListener('change', updateOrderPreview);
  $('.remove-row', row).addEventListener('click', () => { row.remove(); updateOrderPreview(); });
  updateOrderPreview();
}
function addPaymentRow(payment = {}) {
  const row = document.createElement('div');
  row.className = 'payment-edit-row';
  row.innerHTML = `<label>Fecha<input class="payment-date" type="date" value="${payment.payment_date || today()}"></label><label>Hora<input class="payment-time" type="time" value="${payment.payment_time || nowTime()}"></label><label>Monto<input class="payment-amount" type="number" min="0" step="0.01" value="${payment.amount || 0}"></label><label>Método / nota<input class="payment-method" value="${escapeAttr(payment.method || '')}" placeholder="Efectivo, transferencia..."></label><button type="button" class="remove-row" title="Quitar">×</button>`;
  $('#paymentsBox').appendChild(row);
  row.addEventListener('input', updateOrderPreview);
  $('.remove-row', row).addEventListener('click', () => { row.remove(); updateOrderPreview(); });
  updateOrderPreview();
}
function collectOrderItems() {
  return $$('.order-edit-row', $('#orderItemsBox')).map(row => {
    const product = products.find(p => p.id === $('.order-product', row).value);
    const variant = productVariants(product).find(v => v.id === $('.order-variant', row).value);
    return {
      product_id: product?.id || null,
      product_name: $('.order-product-name', row).value.trim() || product?.name || 'Producto',
      sku: product?.sku || '', variant_id: variant?.id || null,
      variant_label: variant ? [variant.size, variant.color].filter(Boolean).join(' / ') : '',
      qty: Math.max(1, Number($('.order-qty', row).value || 1)), price: Number($('.order-price', row).value || 0), cost: Number($('.order-cost', row).value || 0)
    };
  }).filter(x => x.product_name && x.qty > 0);
}
function collectPayments() {
  return $$('.payment-edit-row', $('#paymentsBox')).map(row => ({ payment_date: $('.payment-date', row).value || today(), payment_time: $('.payment-time', row).value || '', amount: Number($('.payment-amount', row).value || 0), method: $('.payment-method', row).value.trim() })).filter(p => p.amount > 0 || p.method);
}
function updateOrderPreview() {
  const fake = { discount: Number($('#orderDiscount')?.value || 0), order_items: collectOrderItems(), order_payments: collectPayments() };
  const t = calcOrder(fake);
  if ($('#orderPreviewTotals')) $('#orderPreviewTotals').innerHTML = `<span>Subtotal <strong>${money(t.subtotal)}</strong></span><span>Descuento <strong>${money(t.discount)}</strong></span><span>Total <strong>${money(t.total)}</strong></span><span>Abonos <strong>${money(t.paid)}</strong></span><span>Saldo <strong>${money(t.balance)}</strong></span>`;
}
function openOrderDialog(order = null) {
  editingOrder = order;
  $('#orderModalTitle').textContent = order ? `Editar ${order.folio}` : 'Nuevo pedido';
  $('#orderId').value = order?.id || '';
  const matchedCustomer = order ? findCustomerForOrder(order) : null;
  renderCustomerSelect(matchedCustomer?.id || order?.customer_id || '');
  $('#orderCustomerSelect').value = matchedCustomer?.id || order?.customer_id || '';
  $('#orderCustomerName').value = order?.customer_name || matchedCustomer?.name || '';
  $('#orderCustomerPhone').value = order?.customer_phone || matchedCustomer?.phone || '';
  $('#orderCustomerSocial').value = order?.customer_social || matchedCustomer?.social || '';
  $('#orderStatus').value = order?.status || 'Pendiente';
  $('#orderDate').value = order?.order_date || today();
  $('#orderTime').value = order?.order_time || nowTime();
  $('#orderDueDate').value = order?.due_date || '';
  $('#orderDelivery').value = order?.delivery || '';
  $('#orderDiscount').value = order?.discount || 0;
  $('#orderNotes').value = order?.notes || '';
  $('#orderItemsBox').innerHTML = '';
  $('#paymentsBox').innerHTML = '';
  (order?.order_items || []).forEach(addOrderItemRow);
  if (!order?.order_items?.length) addOrderItemRow();
  (order?.order_payments || []).forEach(addPaymentRow);
  if (!order?.order_payments?.length) addPaymentRow({ amount: 0, method: 'Efectivo' });
  setStatus('#orderFormStatus', '');
  updateOrderPreview();
  $('#orderDialog').showModal();
}
async function saveOrder(event) {
  event.preventDefault();
  const id = $('#orderId').value;
  const items = collectOrderItems();
  if (!items.length) { setStatus('#orderFormStatus', 'Agrega al menos un producto.'); return; }
  const payload = {
    folio: editingOrder?.folio || nextFolio(), customer_id: $('#orderCustomerSelect')?.value || null, customer_name: $('#orderCustomerName').value.trim(), customer_phone: $('#orderCustomerPhone').value.trim(), customer_social: $('#orderCustomerSocial').value.trim(),
    status: $('#orderStatus').value, order_date: $('#orderDate').value || today(), order_time: $('#orderTime').value || '', due_date: $('#orderDueDate').value || null, delivery: $('#orderDelivery').value.trim(), discount: Number($('#orderDiscount').value || 0), notes: $('#orderNotes').value.trim(), updated_at: new Date().toISOString()
  };
  let orderId = id;
  const customerId = await upsertCustomerFromOrderPayload(payload);
  payload.customer_id = customerId || payload.customer_id || null;
  setStatus('#orderFormStatus', 'Guardando pedido...');
  if (id) {
    const { error } = await supabase.from('orders').update(payload).eq('id', id);
    if (error) { setStatus('#orderFormStatus', error.message); return; }
    await supabase.from('order_items').delete().eq('order_id', id);
    await supabase.from('order_payments').delete().eq('order_id', id);
  } else {
    const { data, error } = await supabase.from('orders').insert(payload).select().single();
    if (error) { setStatus('#orderFormStatus', error.message); return; }
    orderId = data.id;
  }
  await supabase.from('order_items').insert(items.map(item => ({ ...item, order_id: orderId })));
  const payments = collectPayments();
  if (payments.length) await supabase.from('order_payments').insert(payments.map(p => ({ ...p, order_id: orderId })));
  $('#orderDialog').close();
  await Promise.all([loadAdminOrders(), loadCustomers()]);
  setStatus('#orderFormStatus', '');
}
async function convertWebOrder(webOrderId) {
  const web = webOrders.find(o => o.id === webOrderId);
  if (!web) return;
  const payload = { folio: nextFolio(), customer_name: 'Cliente web', status: 'Pendiente', order_date: today(), order_time: nowTime(), notes: web.message || '', updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('orders').insert(payload).select().single();
  if (error) { alert(error.message); return; }
  const rows = (web.catalog_order_items || []).map(item => ({ order_id: data.id, product_id: item.product_id, product_name: item.product_name, sku: item.sku || '', variant_label: item.variant || '', qty: item.qty || 1, price: item.unit_price || 0, cost: 0 }));
  if (rows.length) await supabase.from('order_items').insert(rows);
  await supabase.from('catalog_orders').update({ status: 'Pasado a pedido' }).eq('id', webOrderId);
  await Promise.all([loadWebOrders(), loadAdminOrders()]);
  activateTab('orders');
  editOrder(data.id);
}
function editOrder(id) { const order = adminOrders.find(o => o.id === id); if (order) openOrderDialog(order); }

async function deleteOrder(id) {
  const order = adminOrders.find(o => o.id === id);
  if (!order) return;
  const ok = confirm(`¿Eliminar el pedido ${order.folio || ''}? Esta acción no se puede deshacer.`);
  if (!ok) return;
  const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', id);
  if (itemsError) { alert(itemsError.message); return; }
  const { error: paymentsError } = await supabase.from('order_payments').delete().eq('order_id', id);
  if (paymentsError) { alert(paymentsError.message); return; }
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await Promise.all([loadAdminOrders(), loadCustomers()]);
}

async function deleteWebOrder(id) {
  const ok = confirm('¿Eliminar este pedido web del catálogo? Esta acción no se puede deshacer.');
  if (!ok) return;
  await supabase.from('catalog_order_items').delete().eq('order_id', id);
  const { error } = await supabase.from('catalog_orders').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await loadWebOrders();
}

function normalizeWhatsapp(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('044')) digits = digits.slice(3);
  if (digits.startsWith('045')) digits = digits.slice(3);
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length === 13 && digits.startsWith('521')) digits = `52${digits.slice(3)}`;
  return digits;
}
function receiptText(order) {
  const t = calcOrder(order);
  return [`Recibo ${order.folio}`, `Cliente: ${order.customer_name || '—'}`, `Total del pedido: ${money(t.total)}`, `Abonos / anticipos: ${money(t.paid)}`, `Saldo pendiente: ${money(t.balance)}`, '', 'Gracias por tu compra.'].join('\n');
}
function receiptHtml(order) {
  const t = calcOrder(order);
  const logo = settings.logo_url ? `<img class="receipt-logo" src="${settings.logo_url}" alt="Logo">` : `<div class="brand-mark receipt-logo-fallback">${brandInitial()}</div>`;
  const items = (order.order_items || []).map(item => `<tr><td>${escapeHTML(item.product_name)}</td><td>${escapeHTML(item.variant_label || '—')}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(toNumber(item.qty)*toNumber(item.price))}</td></tr>`).join('');
  const payments = (order.order_payments || []).length ? (order.order_payments || []).map(p => `<tr><td>${p.payment_date || '—'}</td><td>${p.payment_time || '—'}</td><td>${escapeHTML(p.method || '—')}</td><td>${money(p.amount)}</td></tr>`).join('') : '<tr><td colspan="4">Sin abonos registrados</td></tr>';
  return `<div class="receipt"><div class="receipt-head"><div class="receipt-brand">${logo}<span>Recibo / pedido</span></div><div class="receipt-folio"><span>FOLIO</span><strong>${escapeHTML(order.folio)}</strong><em>${order.order_date || ''} · ${order.order_time || ''}</em><b>Saldo: ${money(t.balance)}</b></div></div><hr><div class="receipt-meta"><section><span>CLIENTE</span><h4>${escapeHTML(order.customer_name || '—')}</h4><p>Teléfono: ${escapeHTML(order.customer_phone || '—')}</p><p>Red: ${escapeHTML(order.customer_social || '—')}</p></section><section><span>ENTREGA</span><h4>${escapeHTML(order.delivery || '—')}</h4><p>Fecha/límite: ${order.due_date || '—'}</p><p>Estado: ${escapeHTML(order.status || '—')}</p></section></div><table><thead><tr><th>Producto</th><th>Variante</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><h3>Abonos / pagos</h3><table><thead><tr><th>Fecha</th><th>Hora</th><th>Método / nota</th><th>Monto</th></tr></thead><tbody>${payments}</tbody></table><div class="receipt-summary"><div><span>MENSAJE</span><p>Gracias por tu compra. Guarda este recibo para cualquier aclaración.</p></div><div class="receipt-totals"><p>Subtotal: <strong>${money(t.subtotal)}</strong></p><p>Descuento: <strong>${money(t.discount)}</strong></p><p>Total del pedido: <strong>${money(t.total)}</strong></p><p>Abonos / anticipos: <strong>− ${money(t.paid)}</strong></p><h2>Saldo pendiente</h2><h1>${money(t.balance)}</h1></div></div><p class="receipt-footer">PDF como imagen · anti-edición</p></div>`;
}
function showReceipt(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;
  receiptOrderId = orderId;
  $('#receiptContent').innerHTML = receiptHtml(order);
  $('#receiptDialog').showModal();
}
async function loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
async function makeReceiptCanvas(order) {
  const t = calcOrder(order);
  const items = order.order_items || [];
  const payments = order.order_payments || [];
  const width = 1080;
  const height = Math.max(960, 700 + items.length * 46 + Math.max(1,payments.length) * 42);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const ink = '#111827', muted = '#475569', line = '#dbe3ee', green = '#16a34a';
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height);
  if (settings.logo_url) { try { const img = await loadImage(settings.logo_url); ctx.drawImage(img, 70, 62, 150, 150); } catch { } }
  if (!settings.logo_url) { ctx.fillStyle = ink; ctx.font='bold 90px Arial'; ctx.fillText(brandInitial(), 88, 156); }
  ctx.fillStyle = muted; ctx.font='32px Arial'; ctx.fillText('Recibo / pedido', 240, 148);
  ctx.textAlign='right'; ctx.fillStyle=green; ctx.font='700 18px Arial'; ctx.fillText('FOLIO', 1010, 92); ctx.fillStyle=ink; ctx.font='700 34px Arial'; ctx.fillText(order.folio || 'Sin folio', 1010, 132); ctx.fillStyle=muted; ctx.font='24px Arial'; ctx.fillText(`${order.order_date || '—'} · ${order.order_time || '—'}`, 1010, 164); ctx.fillText(`Estado: ${order.status || '—'}`, 1010, 194); ctx.fillStyle=green; ctx.font='700 28px Arial'; ctx.fillText(`Saldo: ${money(t.balance)}`, 1010, 230); ctx.textAlign='left';
  let y=270; ctx.strokeStyle=ink; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); y+=34;
  const meta = (x, title, h, lines) => { ctx.fillStyle=green; ctx.font='700 16px Arial'; ctx.fillText(title,x,y); ctx.fillStyle=ink; ctx.font='700 28px Arial'; ctx.fillText(h,x,y+36); ctx.fillStyle=muted; ctx.font='22px Arial'; lines.forEach((l,i)=>ctx.fillText(l,x,y+70+i*28)); };
  meta(86,'CLIENTE', order.customer_name || '—', [`Teléfono: ${order.customer_phone || '—'}`, `Red: ${order.customer_social || '—'}`]);
  meta(560,'ENTREGA', order.delivery || '—', [`Fecha/límite: ${order.due_date || '—'}`, `Estado: ${order.status || '—'}`]);
  y+=135; ctx.strokeStyle=line; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); y+=34;
  const header = cols => { ctx.fillStyle=muted; ctx.font='700 18px Arial'; cols.forEach(c=>ctx.fillText(c.label,c.x,y)); y+=18; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); y+=30; };
  header([{label:'PRODUCTO',x:86},{label:'VARIANTE',x:560},{label:'CANT.',x:735},{label:'PRECIO',x:825},{label:'TOTAL',x:940}]);
  ctx.fillStyle=ink; ctx.font='22px Arial'; items.forEach(item=>{ ctx.fillText(item.product_name || 'Producto',86,y); ctx.fillText(item.variant_label || '—',560,y); ctx.fillText(String(item.qty||0),745,y); ctx.fillText(money(item.price),825,y); ctx.fillText(money(toNumber(item.qty)*toNumber(item.price)),940,y); y+=34; ctx.strokeStyle=line; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); y+=18; });
  ctx.fillStyle=ink; ctx.font='700 30px Arial'; ctx.fillText('Abonos / pagos',64,y); y+=34;
  header([{label:'FECHA',x:86},{label:'HORA',x:260},{label:'MÉTODO / NOTA',x:390},{label:'MONTO',x:904}]);
  ctx.fillStyle=ink; ctx.font='22px Arial'; if (payments.length) { payments.forEach(p=>{ ctx.fillText(p.payment_date || '—',86,y); ctx.fillText(p.payment_time || '—',260,y); ctx.fillText(p.method || '—',390,y); ctx.fillText(money(p.amount),904,y); y+=34; ctx.strokeStyle=line; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); y+=18; }); } else { ctx.fillStyle=muted; ctx.fillText('Sin abonos registrados',86,y); y+=52; }
  y+=12; ctx.strokeStyle=ink; ctx.beginPath(); ctx.moveTo(64,y); ctx.lineTo(1016,y); ctx.stroke(); const sy=y;
  ctx.fillStyle=green; ctx.font='700 16px Arial'; ctx.fillText('MENSAJE',86,sy+34); ctx.fillStyle=ink; ctx.font='22px Arial'; ctx.fillText('Gracias por tu compra. Guarda este recibo para cualquier aclaración.',86,sy+74);
  const lx=690, vx=1010; const rows=[['Subtotal',money(t.subtotal)],['Descuento',money(t.discount)],['Total del pedido',money(t.total)],['Abonos / anticipos',`− ${money(t.paid)}`]]; rows.forEach((r,i)=>{ const yy=sy+34+i*30; ctx.textAlign='left'; ctx.fillStyle=muted; ctx.font='22px Arial'; ctx.fillText(`${r[0]}:`,lx,yy); ctx.textAlign='right'; ctx.fillStyle=ink; ctx.font='700 22px Arial'; ctx.fillText(r[1],vx,yy); });
  ctx.textAlign='left'; ctx.fillStyle=green; ctx.font='700 24px Arial'; ctx.fillText('Saldo pendiente',lx,sy+170); ctx.textAlign='right'; ctx.font='700 42px Arial'; ctx.fillText(money(t.balance),vx,sy+170); ctx.textAlign='left';
  ctx.fillStyle=muted; ctx.font='18px Arial'; ctx.textAlign='right'; ctx.fillText('PDF como imagen · anti-edición',1010,height-34); ctx.textAlign='left';
  return canvas;
}
function downloadCanvas(canvas, filename) { canvas.toBlob(blob => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }, 'image/png'); }
async function downloadReceiptImage() { const order = adminOrders.find(o => o.id === receiptOrderId); if (!order) return; const canvas = await makeReceiptCanvas(order); downloadCanvas(canvas, `${order.folio || 'recibo'}.png`); }
async function protectedPdf() { const order = adminOrders.find(o => o.id === receiptOrderId); if (!order) return; const canvas = await makeReceiptCanvas(order); const dataUrl = canvas.toDataURL('image/png'); const win = window.open('', '_blank'); win.document.write(`<title>${order.folio}</title><body style="margin:0;background:#e5e7eb;"><img src="${dataUrl}" style="width:100%;max-width:900px;display:block;margin:auto;"><script>setTimeout(()=>print(),400)<\/script></body>`); win.document.close(); }
async function sendReceiptToWhatsApp(orderId) {
  const order = adminOrders.find(o => o.id === orderId);
  if (!order) return;
  const canvas = await makeReceiptCanvas(order);
  canvas.toBlob(async blob => {
    const file = new File([blob], `${order.folio || 'recibo'}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Recibo ${order.folio}`, text: 'Recibo del pedido.' }); return; } catch {}
    }
    downloadCanvas(canvas, `${order.folio || 'recibo'}.png`);
    const phone = normalizeWhatsapp(order.customer_phone) || settings.store_whatsapp || cfg.STORE_WHATSAPP;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(receiptText(order))}`, '_blank');
  }, 'image/png');
}

async function dataUrlToFile(dataUrl, filename) { const res = await fetch(dataUrl); const blob = await res.blob(); return new File([blob], filename, { type: blob.type || 'image/jpeg' }); }
async function importLocalJson() {
  const file = $('#importJson').files?.[0];
  if (!file) { setStatus('#importStatus', 'Selecciona un respaldo JSON.'); return; }
  setStatus('#importStatus', 'Importando...');
  const json = JSON.parse(await file.text());
  const items = Array.isArray(json.products) ? json.products : [];
  let count = 0;
  for (const old of items) {
    const payload = { name: old.name || 'Producto', sku: old.sku || nextSku(old.category, old.name), category: old.category || '', supplier: old.supplier || '', cost: Number(old.cost || 0), price: Number(old.price || 0), status: old.status || 'Disponible', description: old.description || '', variants_text: old.variants || '', updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) continue;
    const productId = data.id;
    const variants = (old.variantsStock || []).map((v, index) => ({ product_id: productId, size: v.size || '', color: v.color || '', stock: Number(v.stock || 0), sort_order: index }));
    if (variants.length) await supabase.from('product_variants').insert(variants);
    const imgs = Array.isArray(old.images) && old.images.length ? old.images : (old.image ? [old.image] : []);
    const files = [];
    for (let i=0;i<imgs.length;i++) {
      if (String(imgs[i]).startsWith('data:')) files.push(await dataUrlToFile(imgs[i], `${payload.sku || productId}-${i}.jpg`));
      else await supabase.from('product_images').insert({ product_id: productId, url: imgs[i], sort_order: i });
    }
    if (files.length) { currentImages = []; await uploadImages(productId, files); }
    count++;
  }
  setStatus('#importStatus', `Importados ${count} productos.`);
  await loadProducts();
}
function activateTab(tab) {
  $$('.nav [data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.tab').forEach(el => el.classList.add('hidden'));
  $(`#${tab}Tab`).classList.remove('hidden');
}

$('#loginForm').addEventListener('submit', async (event) => { event.preventDefault(); setStatus('#loginStatus', 'Entrando...'); const { error } = await supabase.auth.signInWithPassword({ email: $('#loginEmail').value, password: $('#loginPassword').value }); if (error) { setStatus('#loginStatus', error.message); return; } setStatus('#loginStatus', ''); await showAdmin(); });
$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });
$('#productForm').addEventListener('submit', saveProduct);
$('#productImages').addEventListener('change', (event) => { selectedFiles = [...(event.target.files || [])]; renderPreview(); });
$('#clearProductBtn').addEventListener('click', clearForm);
$('#hideProductBtn').addEventListener('click', hideProduct);
$('#refreshBtn').addEventListener('click', loadProducts);
$('#refreshOrdersBtn').addEventListener('click', loadWebOrders);
$('#refreshAdminOrdersBtn').addEventListener('click', loadAdminOrders);
$('#refreshClientsBtn')?.addEventListener('click', loadCustomers);
$('#clientForm')?.addEventListener('submit', saveClient);
$('#clearClientBtn')?.addEventListener('click', clearClientForm);
$('#deleteClientBtn')?.addEventListener('click', deleteClient);
$('#clientSearch')?.addEventListener('input', renderClientsTable);
$('#clientNewOrderBtn')?.addEventListener('click', () => {
  const id = $('#clientId')?.value;
  if (id) newOrderForClient(id);
  else { activateTab('orders'); openOrderDialog(); }
});
$('#refreshDashboardBtn').addEventListener('click', async () => { await Promise.all([loadProducts(), loadWebOrders(), loadAdminOrders(), loadCustomers()]); renderDashboard(); });
$('#newOrderBtn').addEventListener('click', () => openOrderDialog());
$('#newOrderFromDashboardBtn').addEventListener('click', () => { activateTab('orders'); openOrderDialog(); });
$('#orderForm').addEventListener('submit', saveOrder);
$('#orderCustomerSelect')?.addEventListener('change', (event) => {
  const customer = customers.find(c => c.id === event.target.value);
  if (customer) fillOrderCustomer(customer);
});
$('#addOrderItemBtn').addEventListener('click', () => addOrderItemRow());
$('#addPaymentBtn').addEventListener('click', () => addPaymentRow({ amount: 0, method: 'Efectivo' }));
$('#orderDiscount').addEventListener('input', updateOrderPreview);
$('#importBtn').addEventListener('click', importLocalJson);
$('#saveBrandBtn').addEventListener('click', saveBrandSettings);
$('#productCategory').addEventListener('input', () => { if (!$('#productSku').value.trim()) $('#productSku').value = nextSku($('#productCategory').value, $('#productName').value); });
$('#productName').addEventListener('input', () => { if (!$('#productSku').value.trim()) $('#productSku').value = nextSku($('#productCategory').value, $('#productName').value); });
$('#downloadReceiptBtn').addEventListener('click', downloadReceiptImage);
$('#protectedPdfBtn').addEventListener('click', protectedPdf);
$('#whatsappReceiptBtn').addEventListener('click', () => { if (receiptOrderId) sendReceiptToWhatsApp(receiptOrderId); });

document.addEventListener('click', (event) => {
  const close = event.target.closest('[data-close]')?.dataset.close;
  if (close) $(`#${close}`).close();
  const edit = event.target.closest('[data-edit]')?.dataset.edit;
  if (edit) editProduct(edit);
  const tab = event.target.closest('[data-tab]')?.dataset.tab;
  if (tab) activateTab(tab);
  const editOrderId = event.target.closest('[data-edit-order]')?.dataset.editOrder;
  if (editOrderId) editOrder(editOrderId);
  const receipt = event.target.closest('[data-receipt]')?.dataset.receipt;
  if (receipt) showReceipt(receipt);
  const waReceipt = event.target.closest('[data-whatsapp-receipt]')?.dataset.whatsappReceipt;
  if (waReceipt) sendReceiptToWhatsApp(waReceipt);
  const editClientId = event.target.closest('[data-edit-client]')?.dataset.editClient;
  if (editClientId) editClient(editClientId);
  const clientOrderId = event.target.closest('[data-client-order]')?.dataset.clientOrder;
  if (clientOrderId) newOrderForClient(clientOrderId);
  const clientWaId = event.target.closest('[data-client-wa]')?.dataset.clientWa;
  if (clientWaId) whatsappClient(clientWaId);
  const convert = event.target.closest('[data-convert-web-order]')?.dataset.convertWebOrder;
  if (convert) convertWebOrder(convert);
  const deleteOrderId = event.target.closest('[data-delete-order]')?.dataset.deleteOrder;
  if (deleteOrderId) deleteOrder(deleteOrderId);
  const deleteWebOrderId = event.target.closest('[data-delete-web-order]')?.dataset.deleteWebOrder;
  if (deleteWebOrderId) deleteWebOrder(deleteWebOrderId);
});

supabase.auth.onAuthStateChange((_event, session) => { if (!session) showLogin(); });
requireSession();
