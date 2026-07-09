import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.CURRENCY || 'MXN' }).format(Number(n || 0));
const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const $ = (s,p=document) => p.querySelector(s);
const $$ = (s,p=document) => [...p.querySelectorAll(s)];
let settings = { brand_name: cfg.BRAND_NAME || 'MAOS', logo_url: '', store_whatsapp: cfg.STORE_WHATSAPP || '523112648451' };
let product = null;

function productImages(product) { return [...(product.product_images || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(i=>i.url).filter(Boolean); }
function productVariants(product) { return [...(product.product_variants || [])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)); }
function productColors(product) { const arr=[]; productVariants(product).forEach(v=>{ if(v.color && !arr.some(x=>normalize(x)===normalize(v.color))) arr.push(v.color); }); return arr; }
function productSizes(product) { const arr=[]; productVariants(product).forEach(v=>{ if(v.size && !arr.some(x=>normalize(x)===normalize(v.size))) arr.push(v.size); }); return arr; }
async function loadSettings() {
  try { const { data } = await supabase.from('app_settings').select('*').eq('id', 'main').maybeSingle(); if (data) settings = { ...settings, ...data }; } catch {}
  if ($('#productShopWhatsapp')) $('#productShopWhatsapp').href = `https://wa.me/${settings.store_whatsapp || cfg.STORE_WHATSAPP}`;
}
function gallery(product) {
  const imgs = productImages(product);
  if (!imgs.length) return '<div class="product-gallery-main empty">Sin foto</div>';
  return `<div class="product-gallery"><div class="product-gallery-main"><img id="mainProductImage" src="${imgs[0]}" alt="${escapeHTML(product.name)}"></div><div class="product-thumb-row">${imgs.map((url,i)=>`<button type="button" class="product-thumb ${i===0?'active':''}" data-thumb="${escapeHTML(url)}"><img src="${url}" alt="mini ${i+1}"></button>`).join('')}</div></div>`;
}
function renderProduct() {
  if (!product) return;
  const variants = productVariants(product).filter(v => Number(v.stock || 0) > 0);
  $('#productDetail').innerHTML = `<div class="product-detail-grid"><div>${gallery(product)}</div><div class="product-detail-info"><span class="section-kicker">${escapeHTML(product.category || 'MAOS SELECT')}</span><h1>${escapeHTML(product.name)}</h1><strong class="product-detail-price">${money(product.price)}</strong>${product.description ? `<p class="product-detail-description">${escapeHTML(product.description)}</p>` : ''}<div class="product-detail-meta"><p><strong>SKU:</strong> ${escapeHTML(product.sku || '—')}</p><p><strong>Colores:</strong> ${escapeHTML(productColors(product).join(', ') || '—')}</p><p><strong>Tallas:</strong> ${escapeHTML(productSizes(product).join(', ') || '—')}</p></div><div class="product-order-box"><label>Variante<select id="detailVariant">${variants.map(v=>`<option value="${v.id}">${escapeHTML([v.size,v.color].filter(Boolean).join(' / '))} · ${v.stock} disp.</option>`).join('')}</select></label><label>Cantidad<input id="detailQty" type="number" min="1" step="1" value="1"></label><div class="product-detail-actions"><button class="button ghost" id="copyProductInfo" type="button">Copiar info</button><button class="button primary" id="detailOrder" type="button">Pedir por WhatsApp</button></div></div></div></div>`;
}
function whatsappMessage() {
  const qty = Math.max(1, Number($('#detailQty')?.value || 1));
  const select = $('#detailVariant');
  const v = productVariants(product).find(x => x.id === select?.value);
  const variant = v ? [v.size, v.color].filter(Boolean).join(' / ') : 'Sin variante';
  return ['Hola, quiero hacer un pedido desde el catálogo de MAOS.', `Producto: ${product.name}`, `SKU: ${product.sku || '—'}`, `Cantidad: ${qty}`, `Talla / color: ${variant}`, `Precio referencia: ${money(Number(product.price || 0) * qty)}`, '', 'Te comparto el pedido para confirmar disponibilidad.'].join('
');
}
async function loadProduct() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { $('#productDetail').innerHTML = '<p class="status">No se encontró producto.</p>'; return; }
  const { data, error } = await supabase.from('products').select('*, product_images(*), product_variants(*)').eq('id', id).maybeSingle();
  if (error || !data) { $('#productDetail').innerHTML = '<p class="status">No se pudo cargar el producto.</p>'; return; }
  product = data;
  document.title = `${product.name} — MAOS`;
  renderProduct();
}

document.addEventListener('click', (event) => {
  const thumb = event.target.closest('[data-thumb]');
  if (thumb) {
    $('#mainProductImage').src = thumb.dataset.thumb;
    $$('.product-thumb').forEach(btn => btn.classList.toggle('active', btn === thumb));
  }
  if (event.target.closest('#detailOrder')) {
    const wa = settings.store_whatsapp || cfg.STORE_WHATSAPP;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(whatsappMessage())}`, '_blank');
  }
  if (event.target.closest('#copyProductInfo')) {
    navigator.clipboard.writeText(whatsappMessage());
  }
});

await loadSettings();
await loadProduct();
