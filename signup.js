import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const cfg = window.MAOS_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
$('#signupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#signupStatus').textContent = 'Creando cuenta...';
  const email = $('#signupEmail').value.trim().toLowerCase();
  const password = $('#signupPassword').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) { $('#signupStatus').textContent = error.message; return; }
  $('#signupStatus').textContent = 'Cuenta creada. Si Supabase pide confirmar email, revisa tu correo. Después entra al panel.';
});
