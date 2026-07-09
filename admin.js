import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let products = [];
let currentImages = [];
let selectedFiles = [];

function setStatus(id, msg) { const el = $(id); if (el) el.textContent = msg || ''; }
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
    return {
      size: parts[0] || '',
      color: parts[1] || '',
      stock: Number(parts[2] || 0),
      sort_order: index
    };
  }).filter(Boolean);
}

function variantsText(variants = []) {
  return variants.map(v => [v.size, v.color, v.stock].filter(v => v !== undefined && v !== null && v !== '').join(' / ')).join('\n');
}

function renderPreview() {
  const imgs = [...currentImages.map(i => i.url), ...selectedFiles.map(f => URL.createObjectURL(f))];
  $('#imagePreview').innerHTML = imgs.map(src => `<img src="${src}" alt="preview">`).join('');
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) showAdmin(); else showLogin();
}

function showLogin() { $('#loginView').classList.remove('hidden'); $('#adminView').classList.add('hidden'); }
async function showAdmin() {
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
  await loadProducts();
  await loadOrders();
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)')
    .order('created_at', { ascending: false });
  if (error) { setStatus('#productStatusText', `Error: ${error.message}`); return; }
  products = data || [];
  $('#productsTable').innerHTML = products.map(product => {
    const variants = product.product_variants || [];
    const stock = variants.length ? variants.reduce((s, v) => s + Number(v.stock || 0), 0) : 0;
    return `<tr><td><strong>${escapeHTML(product.name)}</strong><br><span class="muted">${escapeHTML(product.sku || 'Sin SKU')} · ${escapeHTML(product.category || 'Sin categoría')} · Stock ${stock}</span></td><td>${money(product.price)}</td><td><span class="badge">${escapeHTML(product.status || '—')}</span></td><td><button class="ghost small" data-edit="${product.id}">Editar</button></td></tr>`;
  }).join('') || '<tr><td colspan="4">Sin productos todavía.</td></tr>';
}

async function loadOrders() {
  const { data, error } = await supabase
    .from('catalog_orders')
    .select('*, catalog_order_items(*)')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) { $('#ordersTable').innerHTML = `<tr><td colspan="4">${escapeHTML(error.message)}</td></tr>`; return; }
  $('#ordersTable').innerHTML = (data || []).map(order => {
    const items = (order.catalog_order_items || []).map(i => `${i.qty}× ${i.product_name} (${i.variant || 'sin variante'})`).join('<br>');
    return `<tr><td>${new Date(order.created_at).toLocaleString('es-MX')}</td><td>${items || escapeHTML(order.message || '')}</td><td>${money(order.total_reference)}</td><td><span class="badge">${escapeHTML(order.status || 'Nuevo')}</span></td></tr>`;
  }).join('') || '<tr><td colspan="4">Sin pedidos web todavía.</td></tr>';
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
  $('#productVariants').value = variantsText([...(p.product_variants || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)));
  currentImages = [...(p.product_images || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
  selectedFiles = [];
  renderPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function uploadImages(productId, files) {
  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${productId}/${uid()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    rows.push({ product_id: productId, path, url: data.publicUrl, sort_order: currentImages.length + i });
  }
  if (rows.length) await supabase.from('product_images').insert(rows);
}

async function saveProduct(event) {
  event.preventDefault();
  const id = $('#productId').value || null;
  const payload = {
    name: $('#productName').value.trim(),
    sku: $('#productSku').value.trim() || nextSku($('#productCategory').value, $('#productName').value),
    category: $('#productCategory').value.trim(),
    supplier: $('#productSupplier').value.trim(),
    cost: Number($('#productCost').value || 0),
    price: Number($('#productPrice').value || 0),
    status: $('#productStatus').value,
    description: $('#productDescription').value.trim(),
    variants_text: $('#productVariants').value.trim(),
    updated_at: new Date().toISOString()
  };
  if (!payload.name) { setStatus('#productStatusText', 'Escribe el nombre del producto.'); return; }
  setStatus('#productStatusText', 'Guardando...');
  let productId = id;
  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) { setStatus('#productStatusText', error.message); return; }
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) { setStatus('#productStatusText', error.message); return; }
    productId = data.id;
  }
  const variants = parseVariants($('#productVariants').value).map(v => ({ ...v, product_id: productId }));
  await supabase.from('product_variants').delete().eq('product_id', productId);
  if (variants.length) await supabase.from('product_variants').insert(variants);
  if (selectedFiles.length) await uploadImages(productId, selectedFiles);
  setStatus('#productStatusText', 'Producto guardado.');
  clearForm();
  await loadProducts();
}

async function hideProduct() {
  const id = $('#productId').value;
  if (!id) return;
  await supabase.from('products').update({ status: 'Oculto', updated_at: new Date().toISOString() }).eq('id', id);
  clearForm();
  await loadProducts();
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

async function importLocalJson() {
  const file = $('#importJson').files?.[0];
  if (!file) { setStatus('#importStatus', 'Selecciona un respaldo JSON.'); return; }
  setStatus('#importStatus', 'Importando...');
  const text = await file.text();
  const json = JSON.parse(text);
  const items = Array.isArray(json.products) ? json.products : [];
  let count = 0;
  for (const old of items) {
    const payload = {
      name: old.name || 'Producto', sku: old.sku || nextSku(old.category, old.name), category: old.category || '', supplier: old.supplier || '',
      cost: Number(old.cost || 0), price: Number(old.price || 0), status: old.status || 'Disponible', description: old.description || '',
      variants_text: old.variants || '', updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) continue;
    const productId = data.id;
    const variants = (old.variantsStock || []).map((v, index) => ({ product_id: productId, size: v.size || '', color: v.color || '', stock: Number(v.stock || 0), sort_order: index }));
    if (variants.length) await supabase.from('product_variants').insert(variants);
    const imgs = Array.isArray(old.images) && old.images.length ? old.images : (old.image ? [old.image] : []);
    const files = [];
    for (let i = 0; i < imgs.length; i++) {
      if (String(imgs[i]).startsWith('data:')) files.push(await dataUrlToFile(imgs[i], `${payload.sku || productId}-${i}.jpg`));
      else await supabase.from('product_images').insert({ product_id: productId, url: imgs[i], sort_order: i });
    }
    if (files.length) { currentImages = []; await uploadImages(productId, files); }
    count++;
  }
  setStatus('#importStatus', `Importados ${count} productos.`);
  await loadProducts();
}

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('#loginStatus', 'Entrando...');
  const { error } = await supabase.auth.signInWithPassword({ email: $('#loginEmail').value, password: $('#loginPassword').value });
  if (error) { setStatus('#loginStatus', error.message); return; }
  setStatus('#loginStatus', '');
  showAdmin();
});

$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); showLogin(); });
$('#productForm').addEventListener('submit', saveProduct);
$('#productImages').addEventListener('change', (event) => { selectedFiles = [...(event.target.files || [])]; renderPreview(); });
$('#clearProductBtn').addEventListener('click', clearForm);
$('#hideProductBtn').addEventListener('click', hideProduct);
$('#refreshBtn').addEventListener('click', loadProducts);
$('#refreshOrdersBtn').addEventListener('click', loadOrders);
$('#importBtn').addEventListener('click', importLocalJson);
$('#productCategory').addEventListener('input', () => { if (!$('#productSku').value.trim()) $('#productSku').value = nextSku($('#productCategory').value, $('#productName').value); });
$('#productName').addEventListener('input', () => { if (!$('#productSku').value.trim()) $('#productSku').value = nextSku($('#productCategory').value, $('#productName').value); });

document.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]')?.dataset.edit;
  if (edit) editProduct(edit);
  const tab = event.target.closest('[data-tab]')?.dataset.tab;
  if (tab) {
    $$('.nav [data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    $$('.tab').forEach(el => el.classList.add('hidden'));
    $(`#${tab}Tab`).classList.remove('hidden');
  }
});

supabase.auth.onAuthStateChange((_event, session) => { if (!session) showLogin(); });
requireSession();
