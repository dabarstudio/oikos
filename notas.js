// Oikos — "Enviar notinha": foto do cupom (NFC-e). Lê o QR Code quando possível e guarda a foto com segurança.
(function () {
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let input, sheet;

  function lerImagem(file) {
    return new Promise((ok, err) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = u; });
  }
  function lerQR(im) {
    if (!window.jsQR) return null;
    const tentar = (w, crop) => {
      const c = document.createElement('canvas'); const r = w / Math.max(im.width, im.height);
      const sw = im.width * crop, sh = im.height * crop, sx = (im.width - sw) / 2, sy = (im.height - sh) / 2;
      c.width = Math.round(sw * r / crop); c.height = Math.round(sh * r / crop);
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height); const q = window.jsQR(d.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
      return q && q.data;
    };
    for (const [w, crop] of [[1000, 1], [1400, 1], [1000, 0.6], [1400, 0.5], [800, 1]]) { try { const r = tentar(w, crop); if (r) return r; } catch (e) { /* segue */ } }
    return null;
  }
  function comprimir(im) {
    const max = 1600, r = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  }

  function abrirFolha(html) {
    sheet.querySelector('.nt-body').innerHTML = html;
    document.body.classList.add('nt-open');
  }
  const fechar = () => document.body.classList.remove('nt-open');

  const OQUE = [['mercado', '🛒', 'Mercado'], ['acougue', '🥩', 'Açougue'], ['comerfora', '🍔', 'Comer fora'], ['farmacia', '💊', 'Farmácia'],
    ['presente', '🎁', 'Presente'], ['abner', '👶', 'Abner'], ['casa', '🏠', 'Casa'], ['combustivel', '⛽', 'Combustível'], ['outros', '📦', 'Outros']];
  const FORMAS = [['pix', '⚡ PIX'], ['debito', '🏦 Débito'], ['credito', '💳 Crédito'], ['dinheiro', '💵 Dinheiro']];
  let pend = null;
  function perguntar() {
    const p = pend;
    abrirFolha(`<img class="nt-thumb" src="${p.url}" alt="">
      <p class="nt-t" style="margin-top:8px">O que foi essa compra?</p>
      <div class="nt-grid">${OQUE.map(([k, e, n]) => `<button type="button" data-oq="${k}" class="${p.envelope === k ? 'on' : ''}"><span>${e}</span>${n}</button>`).join('')}</div>
      <p class="nt-l">Como pagou?</p>
      <div class="nt-ops">${FORMAS.map(([k, n]) => `<button type="button" data-fp="${k}" class="${p.forma === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <label class="nt-l">Quer explicar? <small>(opcional)</small><input id="nt-obs" class="sv-in" value="${(p.obs || '').replace(/"/g, '&quot;')}" placeholder="${p.envelope === 'presente' ? 'Ex.: presente para o Emanuel' : 'Ex.: compra do mês'}" maxlength="80"></label>
      <button type="button" class="nt-btn" data-enviar ${p.envelope ? '' : 'disabled'}>Enviar notinha</button>
      <button type="button" class="nt-btn sec" data-fechar>Cancelar</button>`);
  }
  async function processar(file) {
    try { const im = await lerImagem(file); pend = { im, url: im.src, envelope: null, forma: 'pix', obs: '' }; perguntar(); }
    catch (e) { console.error(e); abrirFolha('<div class="nt-big">😕</div><p class="nt-t">Não consegui abrir a foto</p><button type="button" class="nt-btn" data-mais>Tentar de novo</button>'); }
  }
  async function enviar() {
    abrirFolha('<div class="nt-big">⏳</div><p class="nt-t">Enviando a notinha…</p><p class="nt-s">Só um instante.</p>');
    try {
      const im = pend.im;
      const qr = lerQR(im);
      const blob = await comprimir(im);
      await window.APP.enviarNota(blob, qr, { envelope: pend.envelope, forma: pend.forma, obs: pend.obs });
      abrirFolha(`<div class="nt-big">✅</div><p class="nt-t">Notinha recebida!</p>
        <p class="nt-s">${qr ? 'Consegui ler o código da nota. Os produtos vão aparecer na aba Mercado na próxima atualização.' : 'Guardei a foto. Os produtos vão aparecer na aba Mercado na próxima atualização.'}</p>
        <button type="button" class="nt-btn" data-mais>📸 Enviar outra</button><button type="button" class="nt-btn sec" data-fechar>Pronto</button>`);
      listar();
    } catch (e) {
      console.error(e);
      abrirFolha(`<div class="nt-big">😕</div><p class="nt-t">Não consegui enviar</p><p class="nt-s">Confira a internet e tente de novo.</p>
        <button type="button" class="nt-btn" data-mais>Tentar de novo</button><button type="button" class="nt-btn sec" data-fechar>Fechar</button>`);
    }
  }

  async function listar() {
    const box = document.getElementById('nt-lista'); if (!box || !window.APP || !window.APP.listarNotas) return;
    try {
      const l = await window.APP.listarNotas();
      if (!l.length) { box.innerHTML = ''; return; }
      const OQ = Object.fromEntries(OQUE.map(([k, e, nm]) => [k, e + ' ' + nm]));
      box.innerHTML = '<p class="nt-lh">Últimas notinhas</p>' + l.slice(0, 5).map((n) => {
        const rot = n.obs || OQ[n.envelope] || n.loja || 'Notinha';
        const st = n.status === 'lida' ? (n.total ? BRL.format(n.total) : '✅ Lida') : n.status === 'erro' ? 'Ilegível' : '✅ Recebida';
        return `<div class="nt-it"><span>${n.envelope ? (OQ[n.envelope] || '🧾').split(' ')[0] : '🧾'} ${rot} · ${fmt.format(new Date(n.criado_em))}</span><b class="${n.status === 'pendente' ? 'ok' : n.status}">${st}</b></div>`;
      }).join('');
    } catch (e) { box.innerHTML = ''; }
  }

  function botao() {
    const b = document.createElement('div'); b.className = 'nt-wrap';
    b.innerHTML = '<button type="button" class="nt-cta"><span aria-hidden="true">📸</span><span><b>Enviar notinha</b><small>Tire foto do cupom do mercado</small></span></button><div id="nt-lista"></div>';
    b.querySelector('.nt-cta').addEventListener('click', () => input.click());
    return b;
  }

  function montar() {
    input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment'); input.hidden = true;
    input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; if (f) processar(f); });
    sheet = document.createElement('div'); sheet.className = 'nt-sheet'; sheet.setAttribute('role', 'dialog');
    sheet.innerHTML = '<div class="nt-scrim"></div><div class="nt-panel"><div class="nt-body"></div></div>';
    sheet.addEventListener('click', (e) => {
      const oq = e.target.closest('[data-oq]'); if (oq && pend) { pend.obs = (document.getElementById('nt-obs') || {}).value || pend.obs; pend.envelope = oq.dataset.oq; return perguntar(); }
      const fp = e.target.closest('[data-fp]'); if (fp && pend) { pend.obs = (document.getElementById('nt-obs') || {}).value || pend.obs; pend.forma = fp.dataset.fp; return perguntar(); }
      if (e.target.closest('[data-enviar]') && pend) { pend.obs = (document.getElementById('nt-obs') || {}).value || ''; return enviar(); }
      if (e.target.closest('[data-fechar]') || e.target.classList.contains('nt-scrim')) fechar();
      if (e.target.closest('[data-mais]')) { fechar(); input.click(); }
    });
    document.body.append(input, sheet);
    // no Início (Casa): logo depois do quadro principal
    const tentar = () => {
      const hero = document.querySelector('#casa .cs-hero');
      if (hero && !document.querySelector('#casa .nt-wrap')) { hero.after(botao()); listar(); }
      const merc = document.getElementById('mercado');
      if (merc && !merc.querySelector('.nt-wrap')) merc.prepend(botao());
    };
    new MutationObserver(tentar).observe(document.getElementById('dash-root') || document.body, { childList: true, subtree: true });
    tentar();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 50));
})();
