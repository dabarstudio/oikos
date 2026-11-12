// Denário — "Enviar notinha": foto do cupom (NFC-e). Lê o QR Code quando possível e guarda a foto com segurança.
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
    ['presente', '🎁', 'Presente'], ['abner', '👶', 'Abner'], ['casa', '🏠', 'Casa'], ['combustivel', '⛽', 'Combustível'], ['revenda', '🪙', 'Talento / revenda'], ['outros', '📦', 'Outros']];
  const FORMAS = [['pix', '⚡ PIX'], ['debito', '🏦 Débito'], ['credito', '💳 Crédito'], ['dinheiro', '💵 Dinheiro']];
  let pend = null;
  function perguntar() {
    const p = pend;
    abrirFolha(`<img class="nt-thumb" src="${p.url}" alt="">
      <p class="nt-t" style="margin-top:8px">O que foi essa compra?</p>
      <div class="nt-grid">${OQUE.map(([k, e, n]) => [k, e, k === 'abner' ? (window.OIKOS_FILHOS || 'Filhos') : n]).map(([k, e, n]) => `<button type="button" data-oq="${k}" class="${p.envelope === k ? 'on' : ''}"><span>${e}</span>${n}</button>`).join('')}</div>
      <p class="nt-l">Como pagou?</p>
      <div class="nt-ops">${FORMAS.map(([k, n]) => `<button type="button" data-fp="${k}" class="${p.forma === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${p.forma !== 'dinheiro' ? '<p class="nt-l">De qual conta saiu?</p><div id="nt-bk"></div>' : ''}
      ${p.envelope === 'revenda' ? `<div class="nt-rv"><p class="nt-l">🪙 Gasto de talento (negócio) — não entra nos envelopes da casa.</p>${window.OIKOS_PROJ_CHIPS ? window.OIKOS_PROJ_CHIPS(p).replace(/ag-ops/g, 'nt-ops').replace(/ag-l/g, 'nt-l') : ''}
        <label class="nt-l">Quanto custou?<input id="nt-custo" class="sv-in" inputmode="decimal" placeholder="0,00" value="${p.custo || ''}"></label>
        <label class="nt-l">Vendeu para quem? <small>(se já vendeu)</small><input id="nt-vpara" class="sv-in" placeholder="Ex.: Carlos Henrique" value="${(p.venda_para || '').replace(/"/g, '&quot;')}" maxlength="50"></label>
        <label class="nt-l">Por quanto vendeu?<input id="nt-vval" class="sv-in" inputmode="decimal" placeholder="0,00" value="${p.venda_valor || ''}"></label>
        <p class="nt-l">Já recebeu o dinheiro da venda?</p><div class="nt-ops"><button type="button" data-vrec="0" class="${!p.venda_recebido ? 'on' : ''}">Ainda não</button><button type="button" data-vrec="1" class="${p.venda_recebido ? 'on' : ''}">Sim, recebi</button></div></div>` : ''}
      <label class="nt-l">Quer explicar? <small>(opcional)</small><input id="nt-obs" class="sv-in" value="${(p.obs || '').replace(/"/g, '&quot;')}" placeholder="${p.envelope === 'presente' ? 'Ex.: presente para o Emanuel' : 'Ex.: compra do mês'}" maxlength="80"></label>
      <button type="button" class="nt-btn" data-enviar ${pronto() ? '' : 'disabled'}>Enviar notinha</button>
      <p class="nt-falta" id="nt-falta">${falta()}</p>
      <button type="button" class="nt-btn sec" data-fechar>Cancelar</button>`);
    const bk = document.getElementById('nt-bk');
    if (bk && window.OIKOS_BANCOS) window.OIKOS_BANCOS.montar(bk, p.conta, (v) => { p.conta = v; atualizarBotao(); });
  }
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  function lerNt() {
    if (!pend) return; const g = (id) => document.getElementById(id);
    if (g('nt-obs')) pend.obs = g('nt-obs').value;
    if (g('nt-custo')) pend.custo = g('nt-custo').value;
    if (g('nt-vpara')) pend.venda_para = g('nt-vpara').value;
    if (g('nt-vval')) pend.venda_valor = g('nt-vval').value;
  }
  const pronto = () => pend && pend.envelope && (pend.forma === 'dinheiro' || pend.conta);
  const falta = () => !pend ? '' : !pend.envelope ? '👆 Toque no que foi a compra' : (pend.forma !== 'dinheiro' && !pend.conta) ? '👆 Toque na conta que pagou' : '';
  function atualizarBotao() {
    const b = sheet.querySelector('[data-enviar]'); if (b) b.disabled = !pronto();
    const f = document.getElementById('nt-falta'); if (f) f.textContent = falta();
  }
  async function processar(file) {
    try { const im = await lerImagem(file); pend = { im, url: im.src, envelope: null, forma: 'pix', obs: '', conta: null }; perguntar(); }
    catch (e) { console.error(e); abrirFolha('<div class="nt-big">😕</div><p class="nt-t">Não consegui abrir a foto</p><button type="button" class="nt-btn" data-mais>Tentar de novo</button>'); }
  }
  async function enviar() {
    abrirFolha('<div class="nt-big">⏳</div><p class="nt-t">Enviando a notinha…</p><p class="nt-s">Só um instante.</p>');
    try {
      const im = pend.im;
      const qr = lerQR(im);
      const blob = await comprimir(im);
      const env = await window.APP.enviarNota(blob, qr, { envelope: pend.envelope, forma: pend.forma, obs: pend.obs, conta: pend.forma === 'dinheiro' ? null : pend.conta });
      if (pend.envelope === 'revenda' && window.APP.gastos) {
        const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        await window.APP.gastos.salvar({ data: d.toISOString().slice(0, 10), valor: num(pend.custo), envelope: 'revenda', descricao: pend.obs || 'Compra para revenda', forma: pend.forma, reembolsar: false, conta: pend.forma === 'dinheiro' ? null : pend.conta,
          venda_para: pend.venda_para || null, venda_valor: num(pend.venda_valor) || null, venda_recebido: !!pend.venda_recebido, venda_em: num(pend.venda_valor) ? d.toISOString().slice(0, 10) : null, projeto_id: pend.projeto_id || null });
        document.dispatchEvent(new Event('oikos:recarregar-gastos'));
      }
      listar();
      if (env && env.id && pend.envelope !== 'revenda') { await lerAgora(env.id, pend.envelope); return; }
      abrirFolha(`<div class="nt-big">✅</div><p class="nt-t">Notinha guardada!</p><p class="nt-s">${pend.envelope === 'revenda' ? 'A compra já entrou na tela do seu negócio.' : 'Guardei a foto.'}</p>
        <button type="button" class="nt-btn" data-mais>📸 Enviar outra</button><button type="button" class="nt-btn sec" data-fechar>Pronto</button>`);
    } catch (e) {
      console.error(e);
      abrirFolha(`<div class="nt-big">😕</div><p class="nt-t">Não consegui enviar</p><p class="nt-s">Confira a internet e tente de novo.</p>
        <button type="button" class="nt-btn" data-mais>Tentar de novo</button><button type="button" class="nt-btn sec" data-fechar>Fechar</button>`);
    }
  }

  const OQN = () => Object.fromEntries(OQUE.map(([k, e, nm]) => [k, e + ' ' + nm]));
  async function lerAgora(id, envPadrao) {
    abrirFolha('<div class="nt-big nt-spin">🔎</div><p class="nt-t">Lendo a notinha…</p><p class="nt-s">Só uns segundinhos.</p>');
    const r = await window.APP.lerNota(id);
    listar();
    if (r && r.ok && r.nota && (r.nota.total || (r.nota.itens || []).length)) {
      const n = r.nota; const it = (n.itens || []).slice(0, 8);
      if (r.gasto) document.dispatchEvent(new Event('oikos:recarregar-gastos'));
      abrirFolha(`<div class="nt-big">✅</div><p class="nt-t">${n.total ? BRL.format(n.total) : 'Notinha lida'}</p>
        <p class="nt-s">${n.loja ? n.loja.replace(/</g, '&lt;') : ''}${r.gasto ? '<br><b>Já descontei do envelope ' + (OQN()[n.envelope || envPadrao] || '') + '.</b>' : ''}</p>
        ${it.length ? `<div class="nt-itens">${it.map((x) => `<div><span>${String(x.descricao || '').replace(/</g, '&lt;')}</span><b>${x.total != null ? BRL.format(x.total) : ''}</b></div>`).join('')}${(n.itens || []).length > 8 ? `<small>+ ${(n.itens.length - 8)} itens</small>` : ''}</div>` : ''}
        <button type="button" class="nt-btn" data-mais>📸 Enviar outra</button><button type="button" class="nt-btn sec" data-fechar>Pronto</button>`);
    } else {
      const semChave = r && r.erro === 'sem_chave';
      abrirFolha(`<div class="nt-big">📥</div><p class="nt-t">Notinha guardada</p><p class="nt-s">${semChave ? 'A leitura automática ainda está sendo ligada. A foto está salva e será lida assim que ligar.' : (r && r.nota && r.nota.obs_leitura) ? String(r.nota.obs_leitura).replace(/</g, '&lt;') : 'Não consegui ler agora (foto tremida ou sem internet). A foto está salva — toque em “Ler” na lista para tentar de novo.'}</p>
        <button type="button" class="nt-btn" data-mais>📸 Enviar outra</button><button type="button" class="nt-btn sec" data-fechar>Pronto</button>`);
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
        const st = n.status === 'lida' ? (n.total ? BRL.format(n.total) : '✅ Lida') : `<button type="button" class="nt-ler" data-ler="${n.id}">🔎 Ler</button>`;
        return `<div class="nt-it"><span>${n.envelope ? (OQ[n.envelope] || '🧾').split(' ')[0] : '🧾'} ${rot} · ${fmt.format(new Date(n.criado_em))}${n.conta ? ' · ' + n.conta : ''}</span><b class="${n.status === 'pendente' ? 'ok' : n.status}">${st}</b></div>`;
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
      const oq = e.target.closest('[data-oq]'); if (oq && pend) { lerNt(); pend.envelope = oq.dataset.oq; return perguntar(); }
      const fp = e.target.closest('[data-fp]'); if (fp && pend) { lerNt(); pend.forma = fp.dataset.fp; return perguntar(); }
      const pj = e.target.closest('[data-proj]'); if (pj && pend) { lerNt(); pend.projeto_id = pj.dataset.proj; return perguntar(); }
      const vr = e.target.closest('[data-vrec]'); if (vr && pend) { lerNt(); pend.venda_recebido = vr.dataset.vrec === '1'; return perguntar(); }
      if (e.target.closest('[data-enviar]') && pend) {
        lerNt();
        if (pend.envelope === 'revenda' && !num(pend.custo)) { const c = document.getElementById('nt-custo'); if (c) { c.focus(); c.placeholder = 'Escreva quanto custou'; } return; }
        return enviar();
      }
      if (e.target.closest('[data-fechar]') || e.target.classList.contains('nt-scrim')) fechar();
      if (e.target.closest('[data-mais]')) { fechar(); input.click(); }
    });
    document.body.append(input, sheet);
    document.addEventListener('click', (e) => { const l = e.target.closest('[data-ler]'); if (l) { e.preventDefault(); lerAgora(l.dataset.ler); } });
    // no Início (Casa): logo depois do quadro principal
    const tentar = () => {
      const hero = document.querySelector('#casa .cs-hero');
      if (hero && !document.querySelector('#casa .nt-wrap')) { (document.querySelector('#casa .ng-banner') || hero).after(botao()); listar(); }
      const merc = document.getElementById('mercado');
      if (merc && !merc.querySelector('.nt-wrap')) merc.prepend(botao());
    };
    new MutationObserver(tentar).observe(document.getElementById('dash-root') || document.body, { childList: true, subtree: true });
    tentar();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 50));
})();
