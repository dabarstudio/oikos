// Oikos — "Meu negócio" (ex.: QuickBox): tela própria com a marca, meta de lucro do mês, estoque, a receber e vendas.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const DICAS = ['📸 Poste um produto nos stories hoje — com preço e “chama no direct”.', '💬 Mande mensagem para 3 clientes que já compraram: “chegou novidade!”.',
    '🏷️ Faça uma oferta relâmpago de 24h para o produto parado há mais tempo.', '🤝 Peça para um cliente feliz indicar um amigo (e dê um mimo).', '🎥 Grave um vídeo curto mostrando o produto funcionando.',
    '📦 Monte um kit com 2 produtos e um precinho especial.', '⭐ Peça um depoimento de quem comprou e poste.'];
  let itens = [], root, sh, f, banner;

  const info = () => (window.APP && window.APP.familia ? window.APP.familia.negocioInfo() : { nome: '', meta: 0 });
  const ativo = () => !!(info().nome || itens.length);
  const nome = () => info().nome || 'Minhas vendas';
  const logo = (s) => { const i = info(); return i.logo ? `<img class="ng-logo" src="${esc(i.logo)}" alt="" width="${s}" height="${s}" style="width:${s}px;height:${s}px">` : `<span class="ng-logo ng-logo-e" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.55)}px">🏷️</span>`; };

  function calc() {
    const m = mesDe(hoje());
    const vendidos = itens.filter((g) => g.venda_valor);
    const doMes = vendidos.filter((g) => mesDe(g.venda_em || g.data) === m);
    const vendido = doMes.reduce((s, g) => s + Number(g.venda_valor), 0);
    const lucro = doMes.reduce((s, g) => s + Number(g.venda_valor) - Number(g.valor || 0), 0);
    const receber = vendidos.filter((g) => !g.venda_recebido);
    const estoque = itens.filter((g) => !g.venda_valor);
    const ult = vendidos.map((g) => g.venda_em || g.data).sort().pop();
    const diasSem = ult ? Math.round((new Date(hoje() + 'T12:00') - new Date(ult + 'T12:00')) / 864e5) : null;
    const lucMedio = vendidos.length ? vendidos.reduce((s, g) => s + Number(g.venda_valor) - Number(g.valor || 0), 0) / vendidos.length : 0;
    const meses = []; const d = new Date(); d.setDate(1);
    for (let i = 5; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); const k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
      meses.push({ k, rot: MESES[x.getMonth()], v: vendidos.filter((g) => mesDe(g.venda_em || g.data) === k).reduce((s, g) => s + Number(g.venda_valor) - Number(g.valor || 0), 0) }); }
    return { m, doMes, vendido, lucro, receber, estoque, diasSem, lucMedio, meses, meta: info().meta || 0 };
  }

  // ---------- faixa no Início ----------
  function desenharBanner() {
    const casa = document.getElementById('casa'); if (!casa) return;
    let b = casa.querySelector('.ng-banner');
    if (!ativo()) { if (b) b.remove(); return; }
    if (!b) { const anc = casa.querySelector('.cs-hero'); if (!anc) return; b = document.createElement('button'); b.type = 'button'; b.className = 'ng-banner'; anc.after(b); b.addEventListener('click', () => (window.OIKOS_IR ? window.OIKOS_IR('negocio') : show())); }
    const c = calc(); const p = c.meta ? Math.min(100, Math.max(0, c.lucro / c.meta * 100)) : 0;
    b.innerHTML = `${logo(46)}<span class="ng-bt"><b>${esc(nome())}</b><small>Lucro em ${MESES_L[+c.m.slice(5) - 1]}: <strong>${BRL.format(c.lucro)}</strong>${c.meta ? ' · ' + Math.round(p) + '% da meta' : ''}</small>
      ${c.meta ? `<span class="ng-mbar"><i style="width:${Math.max(3, p)}%"></i></span>` : ''}${c.receber.length ? `<small class="ng-alert">💰 ${BRL.format(c.receber.reduce((s, g) => s + Number(g.venda_valor), 0))} para receber</small>` : ''}</span><span class="ng-go">›</span>`;
  }

  // ---------- tela ----------
  function render() {
    if (!root) return;
    const c = calc(); const p = c.meta ? Math.min(100, c.lucro / c.meta * 100) : 0; const falta = Math.max(0, c.meta - c.lucro);
    const nVendas = c.lucMedio > 0 ? Math.ceil(falta / c.lucMedio) : 0;
    const dica = DICAS[new Date().getDate() % DICAS.length];
    const max = Math.max(1, ...c.meses.map((x) => x.v));
    const linha = (g, acao) => `<div class="ng-it"><div class="ng-il"><b>${esc(g.descricao || 'Produto')}</b><small>${g.venda_para ? esc(g.venda_para) + ' · ' : ''}custou ${BRL.format(Number(g.valor || 0))}${g.venda_valor ? ' · vendeu ' + BRL.format(Number(g.venda_valor)) + ' · <b class="pos">lucro ' + BRL.format(Number(g.venda_valor) - Number(g.valor || 0)) + '</b>' : ''}</small></div>${acao}</div>`;
    root.innerHTML = `
      <div class="ng-hero">
        <div class="ng-top">${logo(64)}<div><h2>${esc(nome())}</h2><small>Meta de lucro de ${MESES_L[+c.m.slice(5) - 1]}</small></div></div>
        <div class="ng-big">${BRL.format(c.lucro)}<small>${c.meta ? ' de ' + BRL0.format(c.meta) : ''}</small></div>
        ${c.meta ? `<div class="ng-bar"><i style="width:${Math.max(3, p)}%"></i></div>
          <p class="ng-msg">${p >= 100 ? '🏆 Meta batida! Que tal subir a meta do próximo mês?' : `Faltam <b>${BRL.format(falta)}</b>${nVendas ? ` — umas <b>${nVendas} venda${nVendas > 1 ? 's' : ''}</b> como as que vocês já fizeram` : ''}. Bora! 💪`}</p>`
        : '<p class="ng-msg">Defina uma meta de lucro para o mês e acompanhe aqui. 🎯</p>'}
        <button type="button" class="ng-meta" data-ngmeta>🎯 ${c.meta ? 'Mudar a meta' : 'Definir meta do mês'}</button>
      </div>
      <div class="ng-acts"><button type="button" class="ng-a1" data-ngvenda>💰 Registrar venda</button><button type="button" class="ng-a2" data-ngcompra>🛒 Comprei para revender</button></div>
      <div class="ng-kpis">
        <span><small>Vendido no mês</small><b>${BRL.format(c.vendido)}</b></span>
        <span><small>Vendas no mês</small><b>${c.doMes.length}</b></span>
        <span class="${c.receber.length ? 'warn' : ''}"><small>Para receber</small><b>${BRL.format(c.receber.reduce((s, g) => s + Number(g.venda_valor), 0))}</b></span>
        <span><small>Em estoque</small><b>${BRL.format(c.estoque.reduce((s, g) => s + Number(g.valor || 0), 0))}</b></span>
      </div>
      <div class="ng-card ng-nudge">${c.diasSem == null ? '<b>🚀 Registre a primeira venda!</b>' : c.diasSem === 0 ? '<b>🔥 Teve venda hoje! Continue assim.</b>' : `<b>${c.diasSem >= 7 ? '⏰' : '📅'} Última venda há ${c.diasSem} dia${c.diasSem > 1 ? 's' : ''}</b>`}<p>${dica}</p></div>
      ${c.receber.length ? `<div class="ng-card"><h3>💰 Para receber</h3>${c.receber.map((g) => linha(g, `<button type="button" class="ng-b" data-ngrec="${g.id}">Recebi</button>`)).join('')}</div>` : ''}
      ${c.estoque.length ? `<div class="ng-card"><h3>📦 Para vender</h3>${c.estoque.map((g) => linha(g, `<button type="button" class="ng-b" data-ngvendi="${g.id}">Vendi</button>`)).join('')}</div>` : ''}
      <div class="ng-card"><h3>📈 Lucro por mês</h3><div class="ng-chart">${c.meses.map((x) => `<div class="ng-col"><small>${x.v ? BRL0.format(x.v) : ''}</small><i style="height:${Math.max(2, x.v / max * 100)}%"></i><span>${x.rot}</span></div>`).join('')}</div></div>
      ${itens.some((g) => g.venda_valor && g.venda_recebido) ? `<div class="ng-card"><h3>✅ Vendas recebidas</h3>${itens.filter((g) => g.venda_valor && g.venda_recebido).slice(0, 10).map((g) => linha(g, '')).join('')}</div>` : ''}`;
  }

  // ---------- folhas (venda / meta) ----------
  const abrirSh = (html) => { sh.querySelector('.vc-body').innerHTML = html; document.body.classList.add('ngs-open'); };
  const fechar = () => document.body.classList.remove('ngs-open');
  function formVenda() {
    const g = f.item;
    abrirSh(`<p class="vc-t">💰 ${g ? 'Vendi: ' + esc(g.descricao || 'produto') : 'Registrar venda'}</p>
      ${g ? `<p class="vc-s">Custou ${BRL.format(Number(g.valor || 0))}.</p>` : `<label class="vc-l">O que vendeu?<input id="ng-desc" class="sv-in" value="${esc(f.desc)}" placeholder="Ex.: bastão de selfie" maxlength="80"></label>
      <label class="vc-l">Quanto você pagou nele?<input id="ng-custo" class="sv-in" inputmode="decimal" value="${esc(f.custo)}" placeholder="0,00"></label>`}
      <label class="vc-l">Por quanto vendeu?<input id="ng-venda" class="sv-in" inputmode="decimal" value="${esc(f.venda)}" placeholder="0,00"></label>
      <label class="vc-l">Para quem? <small>(opcional)</small><input id="ng-para" class="sv-in" value="${esc(f.para)}" placeholder="Ex.: Carlos Henrique" maxlength="50"></label>
      <p class="vc-l">Já recebeu?</p><div class="vc-ops"><button type="button" data-ngr="0" class="${!f.rec ? 'on' : ''}">Ainda não</button><button type="button" data-ngr="1" class="${f.rec ? 'on' : ''}">Sim, recebi</button></div>
      <p class="vc-erro" id="ng-erro"></p><button type="button" class="nt-btn" data-ngsalvar>Salvar venda</button><button type="button" class="nt-btn sec" data-ngfechar>Cancelar</button>`);
  }
  function lerVenda() { const g = (id) => document.getElementById(id); if (g('ng-desc')) f.desc = g('ng-desc').value; if (g('ng-custo')) f.custo = g('ng-custo').value; if (g('ng-venda')) f.venda = g('ng-venda').value; if (g('ng-para')) f.para = g('ng-para').value; }
  function formMeta() {
    const i = info();
    abrirSh(`<p class="vc-t">🎯 ${i.nome ? 'Meta de lucro do mês' : 'Minhas vendas'}</p>
      <label class="vc-l">Nome do negócio<input id="ng-nome" class="sv-in" value="${esc(i.nome)}" placeholder="Ex.: Doces da Ana" maxlength="40"></label>
      <label class="vc-l">Quanto querem de lucro por mês?<input id="ng-meta" class="sv-in" inputmode="numeric" value="${i.meta || ''}" placeholder="500"></label>
      <div class="vc-ops">${[300, 500, 1000, 2000].map((v) => `<button type="button" data-ngsug="${v}">${BRL0.format(v)}</button>`).join('')}</div>
      <p class="vc-erro" id="ng-erro"></p><button type="button" class="nt-btn" data-ngmsalvar>Salvar</button><button type="button" class="nt-btn sec" data-ngfechar>Cancelar</button>`);
  }

  async function recarregar() {
    try { itens = await window.APP.gastos.revendas(); } catch (e) { console.error(e); }
    document.body.classList.toggle('tem-negocio', ativo()); montarNav(); desenharBanner(); render(); sync();
  }
  const sync = () => document.dispatchEvent(new Event('oikos:tab'));

  async function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (e.target.classList.contains('vc-scrim')) return fechar();
    if (b.hasAttribute('data-ngfechar')) return fechar();
    if (b.hasAttribute('data-ngmeta')) return formMeta();
    if (b.hasAttribute('data-ngcompra')) return window.OIKOS_ANOTAR && window.OIKOS_ANOTAR({ envelope: 'revenda' });
    if (b.hasAttribute('data-ngvenda')) { f = { item: null, desc: '', custo: '', venda: '', para: '', rec: false }; return formVenda(); }
    if (b.dataset.ngvendi) { f = { item: itens.find((x) => String(x.id) === b.dataset.ngvendi), venda: '', para: '', rec: false }; return formVenda(); }
    if (b.dataset.ngr) { lerVenda(); f.rec = b.dataset.ngr === '1'; return formVenda(); }
    if (b.dataset.ngsug) { document.getElementById('ng-meta').value = b.dataset.ngsug; return; }
    if (b.dataset.ngrec) { b.disabled = true; b.textContent = '…'; try { await window.APP.gastos.atualizar(b.dataset.ngrec, { venda_recebido: true }); } catch (err) { console.error(err); } return atualizarTudo(); }
    if (b.hasAttribute('data-ngmsalvar')) {
      const n = document.getElementById('ng-nome').value.trim(), m = num(document.getElementById('ng-meta').value);
      if (!n) { document.getElementById('ng-erro').textContent = 'Dê um nome para o negócio.'; return; }
      b.disabled = true; try { await window.APP.familia.definirNegocio(n, m || null); fechar(); recarregar(); } catch (err) { console.error(err); b.disabled = false; document.getElementById('ng-erro').textContent = 'Não salvou. Tente de novo.'; }
      return;
    }
    if (b.hasAttribute('data-ngsalvar')) {
      lerVenda(); const er = document.getElementById('ng-erro'); const venda = num(f.venda);
      if (!venda) { er.textContent = 'Escreva por quanto vendeu.'; return; }
      if (!f.item && !String(f.desc).trim()) { er.textContent = 'Escreva o que vendeu.'; return; }
      b.disabled = true; b.textContent = 'Salvando…';
      try {
        const campos = { venda_valor: venda, venda_para: f.para.trim() || null, venda_recebido: f.rec, venda_em: hoje() };
        if (f.item) await window.APP.gastos.atualizar(f.item.id, campos);
        else await window.APP.gastos.salvar({ data: hoje(), valor: num(f.custo), envelope: 'revenda', descricao: f.desc.trim(), forma: 'pix', reembolsar: false, ...campos });
        const luc = venda - (f.item ? Number(f.item.valor || 0) : num(f.custo));
        abrirSh(`<div class="nt-big">🎉</div><p class="nt-t">Venda registrada!</p><p class="nt-s">Lucro de <b>${BRL.format(luc)}</b>${f.rec ? '' : ' — avise quando receber'}.</p><button type="button" class="nt-btn" data-ngfechar>Pronto</button>`);
        atualizarTudo();
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; }
    }
  }
  function atualizarTudo() { document.dispatchEvent(new Event('oikos:recarregar-gastos')); }

  // ---------- navegação ----------
  function montarNav() {
    const nav = document.querySelector('.ob-nav');
    if (nav) {
      let b = nav.querySelector('[data-ng]');
      if (ativo() && !b) {
        b = document.createElement('button'); b.type = 'button'; b.dataset.ng = '1'; b.dataset.go = 'negocio'; b.className = 'ng-navb';
        const ref = nav.querySelector('[data-go="lanc"]'); nav.insertBefore(b, ref);
        b.addEventListener('click', () => (window.OIKOS_IR ? window.OIKOS_IR('negocio') : show()));
      }
      if (b) b.innerHTML = `${logo(40)}<span>${esc(nome().split(' ')[0])}</span>`;
    }
    const sheet = document.querySelector('.ob-sheet');
    if (sheet && !sheet.querySelector('[data-ngmerc]')) {
      const m = document.createElement('button'); m.type = 'button'; m.dataset.ngmerc = '1'; m.className = 'ng-merc';
      m.innerHTML = '<span class="fx-ic">🛒</span><span>Mercado<small>Notinhas e preços dos produtos</small></span>';
      m.addEventListener('click', () => { document.body.classList.remove('ob-open'); window.OIKOS_IR && window.OIKOS_IR('mercado'); });
      const atv = document.createElement('button'); atv.type = 'button'; atv.dataset.ngativar = '1'; atv.className = 'ng-ativar';
      atv.innerHTML = '<span class="fx-ic">🏷️</span><span>Minhas vendas<small>Vende algo por fora? Acompanhe o lucro</small></span>';
      atv.addEventListener('click', () => { document.body.classList.remove('ob-open'); formMeta(); });
      sheet.insertBefore(m, sheet.querySelector('h3').nextSibling); sheet.insertBefore(atv, sheet.querySelector('.ob-sair'));
    }
    const tabs = document.querySelector('.fv-tabs');
    if (tabs && ativo() && !document.getElementById('tab-negocio')) { const t = document.createElement('button'); t.className = 'fv-tab'; t.type = 'button'; t.id = 'tab-negocio'; t.textContent = '🏷️ ' + nome(); t.addEventListener('click', show); tabs.appendChild(t); document.querySelectorAll('.fv-tab[data-tab]').forEach((x) => x.addEventListener('click', hide)); }
  }
  function show() {
    document.body.classList.remove('cs-on', 'og-on'); document.body.classList.add('ng-on');
    const t = document.getElementById('tab-negocio'); document.querySelectorAll('.fv-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    render(); scrollTo(0, 0); sync();
  }
  function hide() { if (document.body.classList.contains('ng-on')) { document.body.classList.remove('ng-on'); sync(); } }

  function montar() {
    const dr = document.getElementById('dash-root'); if (!dr || !window.APP || !window.APP.gastos) return;
    root = document.createElement('section'); root.className = 'ng'; root.id = 'negocio-pg'; root.setAttribute('aria-label', 'Meu negócio'); dr.prepend(root);
    sh = document.createElement('div'); sh.className = 'vc-sheet ng-sheet'; sh.innerHTML = '<div class="vc-scrim"></div><div class="vc-panel"><div class="vc-body"></div></div>'; document.body.append(sh);
    root.addEventListener('click', onClick); sh.addEventListener('click', onClick);
    window.OIKOS_NEG = { show, hide, nome };
    document.addEventListener('oikos:gastos', recarregar);
    new MutationObserver(() => { const c = document.getElementById('casa'); if (c && ativo() && !c.querySelector('.ng-banner')) desenharBanner(); montarNav(); })
      .observe(dr, { childList: true, subtree: true });
    if (window.dash) { let ok = false; dash.onData(() => { if (!ok && dash.data('mensal').status === 'ok') { ok = true; recarregar(); } }); }
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 90));
})();
