// Guarda só a "casca" do app para abrir rápido e funcionar como app instalado.
// Os dados financeiros NÃO são guardados em cache: vêm sempre do servidor, com login.
const CACHE = 'denario-v45';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'mobile.css', 'mobile.js', 'mobile-contas.js', 'casa.js', 'casa.css', 'notas.js', 'notas.css', 'objetivos.js', 'objetivos.css', 'avatar.js', 'anotar.js', 'anotar.css', 'bancos.js', 'bancos.css', 'vales.js', 'vales.css', 'projetos.js', 'voz.js', 'voz.css', 'negocio.css', 'icons/negocio-quickbox.png', 'onboarding.js', 'onboarding.css', 'vendor/jsQR.js', 'config.js', 'manifest.webmanifest', 'vendor/d3.min.js', 'vendor/supabase.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Supabase e CDNs: sempre pela rede
  // a página e os arquivos sempre conferem se há versão nova (o GitHub guarda cópia por 10 min)
  const fresco = e.request.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  e.respondWith(fetch(e.request, fresco ? { cache: 'no-cache' } : undefined).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
