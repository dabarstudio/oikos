// Denário — Patrimônio: resumo visual, galeria de bens com foto e "📸 Cadastrar bem".
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const ym = (s) => (s ? s.slice(5, 7) + '/' + s.slice(0, 4) : '–');
  const TIPOS = [
    ['Eletrodomésticos', '🧺', 'Eletrodoméstico', 10],
    ['Móveis', '🛋️', 'Móvel', 10],
    ['Equipamentos', '📱', 'Eletrônico', 4],
    ['Lazer', '🚲', 'Lazer / esporte', 8],
    ['Abner', '🧸', 'Das crianças', 4],
    ['Ferramentas', '🛠️', 'Ferramenta', 8],
    ['Outros', '📦', 'Outro', 8],
  ];
  const emoji = (g) => { const t = TIPOS.find((x) => x[0] === g); if (t) return t[1]; if (/eletro/i.test(g || '')) return '🧺'; if (/móve/i.test(g || '')) return '🛋️'; return '📦'; };
  const fotos = new Map();
  let sh, f, fotoBlob = null, fotoPrev = null;

  // ---------- resumo do topo ----------
  function resumo(bal) {
    const v = (re) => { const r = bal.find((x) => re.test(x.item)); return r && r.valor != null ? Number(r.valor) : 0; };
    const ativo = v(/^TOTAL DO ATIVO$/), pc = v(/^PASSIVO CIRCULANTE$/), pnc = v(/^PASSIVO NÃO CIRCULANTE$/), pl = v(/^PATRIMÔNIO LÍQUIDO$/);
    if (!ativo) return '';
    const fatias = [
      ['Lotes', v(/^Terrenos/), '#8a6d3b'],
      ['Carro', v(/^Veículo/), '#4a7fb5'],
      ['Bens da casa', v(/^Bens da casa/), '#e2a72e'],
      ['Dinheiro e aplicações', v(/^Disponível$/) + v(/^Aplicações/) + v(/^Criptoativos/), '#0e5a3a'],
      ['A receber', v(/^A receber/), '#7fb89a'],
    ].filter((x) => x[1] > 0);
    const outros = ativo - fatias.reduce((s, x) => s + x[1], 0); if (outros > 1) fatias.push(['Outros', outros, '#b9b2a3']);
    const divida = pc + pnc, pend = bal.filter((x) => x.a_informar).length;
    return `<div class="bn-hero">
      <p class="bn-k">A família tem, de verdade</p>
      <p class="bn-pl">${BRL0.format(pl)}</p>
      <p class="bn-s">${BRL0.format(ativo)} em bens e dinheiro − ${BRL0.format(divida)} de dívidas${pend ? ` <span class="bn-pend">· ${pend} dívida${pend > 1 ? 's' : ''} ainda sem valor</span>` : ''}</p>
      <div class="bn-bar" role="img" aria-label="Do que é feito o patrimônio">${fatias.map(([n, x, c]) => `<i style="flex:${x};background:${c}"></i>`).join('')}</div>
      <ul class="bn-leg">${fatias.map(([n, x, c]) => `<li><i style="background:${c}"></i>${n}<b>${Math.round((x / ativo) * 100)}%</b></li>`).join('')}</ul>
    </div>`;
  }

  // ---------- galeria de bens ----------
  function cartao(b) {
    const hoje = new Date().toISOString().slice(0, 7);
    const ini = b.data_aquisicao ? b.data_aquisicao.slice(0, 7) : hoje;
    const meses = (a, z) => (+z.slice(0, 4) - +a.slice(0, 4)) * 12 + (+z.slice(5, 7) - +a.slice(5, 7));
    const tot = Math.max(1, (b.vida_util || 8) * 12), usado = Math.max(0, Math.min(1, meses(ini, hoje) / tot));
    const falta = b.renovar_em ? meses(hoje, b.renovar_em) : null;
    const cls = falta != null && falta <= 0 ? 'bn-venc' : falta != null && falta <= 12 ? 'bn-logo' : '';
    const quando = falta == null ? '' : falta <= 0 ? 'Já passou da hora de trocar' : falta <= 12 ? `Trocar em ${ym(b.renovar_em)} · faltam ${falta} ${falta > 1 ? 'meses' : 'mês'}` : `Trocar em ${ym(b.renovar_em)}`;
    const foto = b.foto_path ? `<span class="bn-foto" data-bnfoto="${esc(b.foto_path)}"></span>` : `<span class="bn-foto bn-emo">${emoji(b.grupo)}</span>`;
    const tag = b.app_id ? 'button type="button" data-bnedit="' + esc(b.app_id) + '"' : 'div';
    return `<${tag} class="bn-it ${cls}">${foto}<span class="bn-tx"><b>${esc(b.item)}${b.qtd > 1 ? ` <small>×${b.qtd}</small>` : ''}</b>
      <span class="bn-vl">Vale hoje <b>${b.valor_atual != null ? BRL0.format(b.valor_atual) : 'a informar'}</b>${b.valor_compra != null ? ` <small>de ${BRL0.format(b.valor_compra)}</small>` : ''}</span>
      <span class="bn-vida"><i style="width:${Math.round(usado * 100)}%"></i></span>
      <span class="bn-q">${quando}${b.provisao_mes ? ` · guardar ${BRL.format(b.provisao_mes)}/mês` : ''}</span></span>${b.app_id ? '<span class="bn-ed" aria-hidden="true">✏️</span>' : ''}</${tag.split(' ')[0]}>`;
  }
  function desenhar() {
    const pg = document.getElementById('patrimonio'); if (!pg || !window.dash) return;
    const bal = dash.data('balanco'), bens = dash.data('bens');
    let topo = document.getElementById('bn-topo');
    if (!topo) { topo = document.createElement('div'); topo.id = 'bn-topo'; pg.prepend(topo); }
    topo.innerHTML = (bal.status === 'ok' ? resumo(bal.data) : '') +
      '<button type="button" class="bn-add" data-bnnovo>📸 Cadastrar um bem <small>tire uma foto e diga quanto pagou</small></button>';
    const card = document.getElementById('card-bens'); if (!card) return;
    let gal = document.getElementById('bn-gal');
    if (!gal) {
      gal = document.createElement('div'); gal.id = 'bn-gal';
      const nota = card.querySelector('.fv-note');
      if (nota && !nota.closest('details')) { const d = document.createElement('details'); d.className = 'bn-como'; d.innerHTML = '<summary>Como o app calcula?</summary>'; nota.replaceWith(d); d.appendChild(nota); }
      card.querySelector('.fv-scroll').before(gal);
    }
    const h3 = card.querySelector('h3'); if (h3) h3.textContent = 'Bens da casa';
    const lista = bens.status === 'ok' ? [...bens.data].sort((x, y) => (x.renovar_em || '9').localeCompare(y.renovar_em || '9')) : [];
    gal.innerHTML = lista.length ? lista.map(cartao).join('') : '<p class="bn-vazio">Nenhum bem cadastrado ainda. Comece pelos maiores: geladeira, sofá, celulares…</p>';
    gal.insertAdjacentHTML('beforeend', '<button type="button" class="vc-add bn-add2" data-bnnovo>＋ Cadastrar outro bem</button>');
    gal.querySelectorAll('[data-bnfoto]').forEach(async (el) => {
      const p = el.dataset.bnfoto; let u = fotos.get(p);
      if (!u) { try { u = await window.APP.bens.fotoUrl(p); } catch (e) { u = null; } if (u) fotos.set(p, u); }
      if (u) el.style.backgroundImage = `url("${u}")`; else { el.classList.add('bn-emo'); el.textContent = '📷'; }
    });
  }

  // ---------- cadastro ----------
  const abrirSh = (html) => { sh.querySelector('.vc-body').innerHTML = html; document.body.classList.add('bn-open'); };
  const fechar = () => { document.body.classList.remove('bn-open'); if (fotoPrev && fotoPrev.startsWith('blob:')) URL.revokeObjectURL(fotoPrev); fotoBlob = null; fotoPrev = null; };
  function prev() {
    if (!f.valor_compra) return '<p class="bn-prev bn-prev0">Diga quanto pagou que o app calcula quanto vale hoje e quanto guardar para trocar.</p>';
    const c = window.APP.bens.calc({ ...f });
    return `<div class="bn-prev"><span>Vale hoje<b>${BRL0.format(c.valor_atual)}</b></span><span>Trocar em<b>${ym(c.renovar_em)}</b></span><span>Guardar por mês<b>${BRL.format(c.provisao_mes)}</b></span></div>`;
  }
  function form() {
    const ft = fotoPrev || (f.foto_path ? fotos.get(f.foto_path) : null);
    abrirSh(`<p class="vc-t">${f.id ? 'Editar bem' : 'Cadastrar um bem'}</p>
      <label class="bn-cam ${ft ? 'tem' : ''}" ${ft ? `style="background-image:url('${ft}')"` : ''}><input type="file" accept="image/*" capture="environment" id="bn-file" hidden>
        <span>${ft ? '🔄 Trocar foto' : '📸 Tirar foto do bem<small>ou da nota fiscal (opcional)</small>'}</span></label>
      <label class="vc-l">O que é?<input id="bn-item" class="sv-in" placeholder="Ex.: Geladeira Brastemp, Sofá retrátil" value="${esc(f.item)}" maxlength="60"></label>
      <p class="vc-l">Tipo</p><div class="vc-ops">${TIPOS.map(([k, e, n]) => `<button type="button" data-bntipo="${k}" class="${f.grupo === k ? 'on' : ''}">${e} ${n}</button>`).join('')}</div>
      <div class="bn-2"><label class="vc-l">Quanto pagou? <small>(cada um)</small><input id="bn-val" class="sv-in" inputmode="decimal" placeholder="0,00" value="${f.valor_unit ? String(f.valor_unit).replace('.', ',') : ''}"></label>
      <label class="vc-l">Quantos?<input id="bn-qtd" class="sv-in" inputmode="numeric" value="${f.qtd || 1}"></label></div>
      <label class="vc-l">Quando comprou? <small>(mês e ano, aproximado serve)</small><input id="bn-data" type="month" class="sv-in" value="${f.data_aquisicao ? f.data_aquisicao.slice(0, 7) : ''}" max="${new Date().toISOString().slice(0, 7)}"></label>
      <p class="vc-l">Dura uns quantos anos?</p><div class="vc-ops">${[2, 4, 6, 8, 10, 12, 15, 20].map((n) => `<button type="button" data-bnvida="${n}" class="${f.vida_util === n ? 'on' : ''}">${n} anos</button>`).join('')}</div>
      <div id="bn-prev">${prev()}</div>
      <label class="vc-l">Observação <small>(opcional)</small><input id="bn-obs" class="sv-in" placeholder="Ex.: presente da sogra, garantia até 2027" value="${esc(f.obs)}" maxlength="120"></label>
      <p class="vc-erro" id="bn-erro"></p>
      <button type="button" class="nt-btn" data-bnsalvar>${f.id ? 'Salvar' : 'Cadastrar'}</button>
      ${f.id ? '<button type="button" class="nt-btn sec bn-del" data-bnapagar>Apagar este bem</button>' : ''}
      <button type="button" class="nt-btn sec" data-bnfechar>Cancelar</button>`);
  }
  function ler() {
    const g = (id) => document.getElementById(id);
    if (g('bn-item')) f.item = g('bn-item').value.trim();
    if (g('bn-val')) f.valor_unit = num(g('bn-val').value) || null;
    if (g('bn-qtd')) f.qtd = Math.max(1, parseInt(g('bn-qtd').value, 10) || 1);
    if (g('bn-data')) f.data_aquisicao = g('bn-data').value ? g('bn-data').value + '-01' : null;
    if (g('bn-obs')) f.obs = g('bn-obs').value.trim();
    f.valor_compra = f.valor_unit;
  }
  function novo(b) {
    f = b ? { id: b.id, item: b.item, grupo: b.grupo, qtd: b.qtd || 1, valor_unit: b.valor_compra != null ? Number(b.valor_compra) : null, valor_compra: b.valor_compra, data_aquisicao: b.data_aquisicao, vida_util: b.vida_util || 8, obs: b.obs || '', foto_path: b.foto_path }
      : { item: '', grupo: null, qtd: 1, valor_unit: null, valor_compra: null, data_aquisicao: null, vida_util: 8, obs: '' };
    fotoBlob = null; fotoPrev = null; form();
  }
  async function comprimir(file) {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
    const s = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.82));
  }

  function montar() {
    sh = document.createElement('div'); sh.className = 'vc-sheet bn-sheet';
    sh.innerHTML = '<div class="vc-scrim" data-bnfechar></div><div class="vc-panel" role="dialog" aria-modal="true" aria-label="Cadastrar bem"><div class="vc-body"></div></div>';
    document.body.appendChild(sh);
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-bnnovo],[data-bnedit],[data-bntipo],[data-bnvida],[data-bnsalvar],[data-bnapagar],[data-bnfechar]'); if (!t) return;
      if (t.dataset.bnnovo != null) return novo();
      if (t.dataset.bnedit) { const b = window.APP.bens.lista().find((x) => String(x.id) === t.dataset.bnedit); if (b) novo(b); return; }
      if (t.dataset.bnfechar != null) return fechar();
      ler();
      if (t.dataset.bntipo) { f.grupo = t.dataset.bntipo; const tp = TIPOS.find((x) => x[0] === f.grupo); if (tp && !f.id) f.vida_util = tp[3]; return form(); }
      if (t.dataset.bnvida) { f.vida_util = +t.dataset.bnvida; return form(); }
      if (t.dataset.bnapagar != null) {
        if (!t.classList.contains('conf')) { t.classList.add('conf'); t.textContent = 'Toque de novo para apagar'; return; }
        try { await window.APP.bens.remover(f.id); fechar(); } catch (er) { document.getElementById('bn-erro').textContent = 'Não deu para apagar: ' + (er.message || er); }
        return;
      }
      if (t.dataset.bnsalvar != null) {
        const er = document.getElementById('bn-erro');
        if (!f.item) { er.textContent = 'Diga o que é o bem.'; return; }
        if (!f.valor_compra) { er.textContent = 'Diga quanto pagou (pode ser aproximado).'; return; }
        t.disabled = true; t.textContent = 'Salvando…';
        try { await window.APP.bens.salvar({ ...f, grupo: f.grupo || 'Outros' }, fotoBlob); fechar(); }
        catch (x) { t.disabled = false; t.textContent = 'Tentar de novo'; er.textContent = 'Não deu para salvar: ' + (x.message || x); }
      }
    });
    document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('.bn-sheet') && /bn-(val|qtd|data)/.test(e.target.id)) { ler(); document.getElementById('bn-prev').innerHTML = prev(); } });
    document.addEventListener('change', async (e) => {
      if (e.target.id !== 'bn-file' || !e.target.files[0]) return;
      ler(); try { fotoBlob = await comprimir(e.target.files[0]); } catch (x) { fotoBlob = e.target.files[0]; }
      fotoPrev = URL.createObjectURL(fotoBlob); form();
    });
    if (window.dash && dash.onData) dash.onData(desenhar);
    desenhar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
