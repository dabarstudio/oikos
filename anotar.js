// Denário — "Anotar gasto": 3 passos bem simples (quanto → com o quê → como pagou). Entra na hora nos envelopes.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const CATS = [
    ['mercado', '🛒', 'Mercado'], ['acougue', '🥩', 'Açougue'], ['comerfora', '🍔', 'Comer fora'], ['combustivel', '⛽', 'Combustível'],
    ['transporte', '🚌', 'Ônibus / Uber'], ['saude', '💊', 'Saúde / Farmácia'], ['abner', '👶', 'Abner'], ['casa', '🏠', 'Casa'],
    ['lazer', '🎁', 'Lazer / Presentes'], ['revenda', '🪙', 'Talento / revenda'], ['outros', '📦', 'Outros'],
  ];
  // envelope do app → (nível, chave) da planilha, para somar nos envelopes do Início
  const MAPA = { mercado: ['conta', 'MERCADO'], acougue: ['conta', 'AÇOUGUE'], comerfora: ['conta', 'ALIMENTAÇÃO FORA'], combustivel: ['mae', 'VEÍCULO E TRANSPORTE'],
    transporte: ['mae', 'VEÍCULO E TRANSPORTE'], saude: ['mae', 'SAÚDE E BEM-ESTAR'], abner: ['mae', 'ABNER'], casa: ['mae', 'CASA'], lazer: ['mae', 'LAZER, PRESENTES E ASSINATURAS'] };
  const FORMAS = [['dinheiro', '💵', 'Dinheiro'], ['pix', '⚡', 'PIX'], ['credito', '💳', 'Cartão de crédito'], ['debito', '🏦', 'Débito']];
  const cat = (k) => CATS.find((c) => c[0] === k) || CATS[CATS.length - 1];
  const num = (v) => { const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const ontem = () => { const d = new Date(Date.now() - 864e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  let sh, f, lista = [];

  window.OIKOS_GASTOS = { lista: () => lista, mapa: MAPA };
  async function recarregar() {
    try { lista = await window.APP.gastos.listar(); } catch (e) { console.error(e); lista = []; }
    document.dispatchEvent(new Event('oikos:gastos')); listaGastos();
  }

  function abrir(opts) { const pre = opts && opts.envelope ? opts.envelope : null; f = { passo: 1, preset: pre, valor: '', envelope: null, forma: 'dinheiro', data: hoje(), reembolsar: false, reembolso_de: 'Vital', descricao: '', conta: null, venda_para: '', venda_valor: '', venda_recebido: false }; if (pre) f.envelope = pre; if (opts && opts.prefill) { Object.assign(f, opts.prefill); f.passo = !f.valor ? 1 : f.envelope ? 3 : 2; } f.editId = opts && opts.editId ? opts.editId : null; passo(); document.body.classList.add('ag-open'); setTimeout(() => { const i = document.getElementById('ag-val'); if (i) i.focus(); }, 280); }
  const fechar = () => document.body.classList.remove('ag-open');
  function passo() {
    const b = sh.querySelector('.ag-body');
    if (f.passo === 1) {
      b.innerHTML = `<p class="ag-q">Quanto você gastou?</p>
        <div class="ag-money"><span>R$</span><input id="ag-val" inputmode="decimal" placeholder="0,00" value="${f.valor}" autocomplete="off"></div>
        <button type="button" class="ag-next" data-next1>Continuar</button>
        ${window.OIKOS_VOZ ? '<button type="button" class="ag-voz" data-voz>🎤 Prefere falar? Toque aqui</button>' : ''}`;
    } else if (f.passo === 2) {
      b.innerHTML = `<button type="button" class="ag-back" data-back>‹ ${BRL.format(f.valor)}</button><p class="ag-q">Com o quê?</p>
        <div class="ag-grid">${CATS.map(([k, e, n]) => [k, e, k === 'abner' ? (window.OIKOS_FILHOS || 'Filhos') : n]).map(([k, e, n]) => `<button type="button" data-env="${k}"><span>${e}</span>${n}</button>`).join('')}</div>`;
    } else {
      const c = cat(f.envelope);
      b.innerHTML = `<button type="button" class="ag-back" data-back>‹ Voltar</button>
        <p class="ag-q">${c[1]} ${BRL.format(f.valor)} <small>${c[2]}</small></p>
        <p class="ag-l">Como pagou?</p><div class="ag-ops">${FORMAS.map(([k, e, n]) => `<button type="button" data-forma="${k}" class="${f.forma === k ? 'on' : ''}">${e} ${n}</button>`).join('')}</div>
        ${f.forma !== 'dinheiro' ? '<p class="ag-l">De qual conta saiu?</p><div id="ag-bk"></div>' : ''}
        ${f.forma === 'credito' ? `<p class="ag-l">Em quantas vezes?</p><div class="ag-ops">${[1, 2, 3, 4, 5, 6, 10, 12].map((n) => `<button type="button" data-parc="${n}" class="${(f.parcelas || 1) === n ? 'on' : ''}">${n === 1 ? 'À vista' : n + 'x'}</button>`).join('')}</div>
          ${(f.parcelas || 1) > 1 ? `<p class="ag-pinfo">${f.parcelas}x de <b>${BRL.format(f.valor / f.parcelas)}</b> · entra nas dívidas de curto prazo até a última parcela</p><label class="ag-l">1ª parcela vence em<input type="date" id="ag-p1" class="sv-in" value="${f.parcela1 || prox(f.data)}"></label>` : ''}` : ''}
        <p class="ag-l">Quando?</p><div class="ag-ops"><button type="button" data-dia="${hoje()}" class="${f.data === hoje() ? 'on' : ''}">Hoje</button><button type="button" data-dia="${ontem()}" class="${f.data === ontem() ? 'on' : ''}">Ontem</button><input type="date" id="ag-data" value="${f.data}" max="${hoje()}"></div>
        ${f.envelope === 'revenda' ? `<div class="ag-rv"><p class="ag-l">🪙 Gasto de talento (negócio) — não entra nos envelopes da casa.</p>${projChips(f)}
          <label class="ag-l">Vendeu para quem? <small>(se já vendeu)</small><input id="ag-vpara" class="sv-in" value="${f.venda_para.replace(/"/g, '&quot;')}" placeholder="Ex.: Carlos Henrique" maxlength="50"></label>
          <label class="ag-l">Por quanto vendeu?<input id="ag-vval" class="sv-in" inputmode="decimal" value="${f.venda_valor}" placeholder="0,00"></label>
          <p class="ag-l">Já recebeu o dinheiro da venda?</p><div class="ag-ops"><button type="button" data-vrec="0" class="${!f.venda_recebido ? 'on' : ''}">Ainda não</button><button type="button" data-vrec="1" class="${f.venda_recebido ? 'on' : ''}">Sim, recebi</button></div></div>`
        : `<p class="ag-l">Alguém vai te devolver esse dinheiro?</p><div class="ag-ops"><button type="button" data-reemb="0" class="${!f.reembolsar ? 'on' : ''}">Não</button><button type="button" data-reemb="1" class="${f.reembolsar ? 'on' : ''}">Sim, é reembolso</button></div>
        ${f.reembolsar ? `<label class="ag-l">Quem vai devolver?<input id="ag-quem" class="sv-in" value="${f.reembolso_de}" placeholder="Ex.: Vital, cliente…"></label>` : ''}`}
        <label class="ag-l">O que foi? <small>(opcional)</small><input id="ag-desc" class="sv-in" value="${f.descricao.replace(/"/g, '&quot;')}" placeholder="Ex.: passagem de ônibus" maxlength="80"></label>
        <button type="button" class="ag-next" data-salvar ${f.forma !== 'dinheiro' && !f.conta ? 'disabled' : ''}>${f.editId ? 'Salvar alteração' : 'Anotar gasto'}</button>
        <p class="ag-falta" id="ag-falta">${f.forma !== 'dinheiro' && !f.conta ? '👆 Toque na conta que pagou' : ''}</p>`;
      const bk = document.getElementById('ag-bk');
      if (bk && window.OIKOS_BANCOS) window.OIKOS_BANCOS.montar(bk, f.conta, (v) => { f.conta = v; const s = sh.querySelector('[data-salvar]'); if (s) s.disabled = false; const x = document.getElementById('ag-falta'); if (x) x.textContent = ''; });
    }
  }
  function projChips(o) {
    const ps = window.OIKOS_PROJ ? window.OIKOS_PROJ.lista() : []; if (!ps.length) return '';
    if (!o.projeto_id || !ps.some((p) => String(p.id) === String(o.projeto_id))) o.projeto_id = ps[0].id;
    if (ps.length < 2) return '';
    return `<p class="ag-l">Qual talento?</p><div class="ag-ops pj-esc">${ps.map((p) => `<button type="button" data-proj="${p.id}" class="${String(o.projeto_id) === String(p.id) ? 'on' : ''}">${window.OIKOS_PROJ.logo(p, 22)} ${p.nome.replace(/</g, '&lt;')}</button>`).join('')}</div>`;
  }
  window.OIKOS_PROJ_CHIPS = projChips;
  function prox(d) { const x = new Date((d || hoje()) + 'T12:00:00'); x.setMonth(x.getMonth() + 1); return x.toISOString().slice(0, 10); }
  function lerCampos() {
    const p1 = document.getElementById('ag-p1'); if (p1 && p1.value) f.parcela1 = p1.value;
    const d = document.getElementById('ag-desc'); if (d) f.descricao = d.value;
    const q = document.getElementById('ag-quem'); if (q) f.reembolso_de = q.value;
    const dt = document.getElementById('ag-data'); if (dt && dt.value) f.data = dt.value;
    const vp = document.getElementById('ag-vpara'); if (vp) f.venda_para = vp.value;
    const vv = document.getElementById('ag-vval'); if (vv) f.venda_valor = vv.value;
  }
  async function onClick(e) {
    if (e.target.classList.contains('ag-scrim')) return fechar();
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-voz')) { fechar(); return window.OIKOS_VOZ.abrir(); }
    if (b.hasAttribute('data-next1')) { const v = num(document.getElementById('ag-val').value); if (!v) { document.getElementById('ag-val').focus(); return; } f.valor = v; f.passo = f.preset ? 3 : 2; return passo(); }
    if (b.hasAttribute('data-back')) { lerCampos(); f.passo = f.preset && f.passo === 3 ? 1 : f.passo - 1; return passo(); }
    if (b.dataset.env) { f.envelope = b.dataset.env; f.reembolsar = false; f.passo = 3; return passo(); }
    if (b.dataset.forma) { lerCampos(); f.forma = b.dataset.forma; return passo(); }
    if (b.dataset.parc) { lerCampos(); f.parcelas = +b.dataset.parc; if (f.parcelas > 1 && !f.parcela1) f.parcela1 = prox(f.data); return passo(); }
    if (b.dataset.dia) { lerCampos(); f.data = b.dataset.dia; return passo(); }
    if (b.dataset.proj) { lerCampos(); f.projeto_id = b.dataset.proj; return passo(); }
    if (b.dataset.vrec) { lerCampos(); f.venda_recebido = b.dataset.vrec === '1'; return passo(); }
    if (b.dataset.reemb) { lerCampos(); f.reembolsar = b.dataset.reemb === '1'; return passo(); }
    if (b.hasAttribute('data-salvar')) {
      lerCampos(); b.disabled = true; b.textContent = 'Anotando…';
      try {
        const parc = f.forma === 'credito' && (f.parcelas || 1) > 1 ? { parcelas: f.parcelas, parcela1: f.parcela1 || prox(f.data) } : { parcelas: 1, parcela1: null };
        const campos = { ...parc, data: f.data, valor: f.valor, envelope: f.envelope, descricao: f.descricao || cat(f.envelope)[2], forma: f.forma, reembolsar: f.reembolsar, reembolso_de: f.reembolsar ? (f.reembolso_de || null) : null, conta: f.forma === 'dinheiro' ? null : f.conta, ...(f.envelope === 'revenda' ? { venda_para: f.venda_para || null, venda_valor: num(f.venda_valor) || null, venda_recebido: f.venda_recebido, venda_em: num(f.venda_valor) ? f.data : null, projeto_id: f.projeto_id || null } : {}) };
        if (f.editId) await window.APP.gastos.atualizar(f.editId, campos); else await window.APP.gastos.salvar(campos);
        sh.querySelector('.ag-body').innerHTML = `<div class="ag-big">✅</div><p class="ag-q" style="text-align:center">${f.editId ? 'Alterado!' : 'Anotado!'}</p>
          <p class="ag-s">${cat(f.envelope)[1]} ${BRL.format(f.valor)} em ${cat(f.envelope)[2]}${f.reembolsar ? ' · <b>a receber de ' + (f.reembolso_de || 'alguém') + '</b> (não conta nos envelopes)' : ''}${f.envelope === 'revenda' && num(f.venda_valor) ? ' · lucro de <b>' + BRL.format(num(f.venda_valor) - f.valor) + '</b>' : ''}.</p>
          <button type="button" class="ag-next" data-outro>➕ Anotar outro</button><button type="button" class="ag-sec" data-fim>Pronto</button>`;
        recarregar();
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não anotou. Tentar de novo'; }
      return;
    }
    if (b.hasAttribute('data-outro')) return abrir();
    if (b.hasAttribute('data-fim')) return fechar();
  }

  // lista "Anotados no app" na tela Gastos
  function listaGastos() {
    const card = document.getElementById('card-lanc'); if (!card) return;
    let box = document.getElementById('ag-lista');
    if (!box) { box = document.createElement('div'); box.id = 'ag-lista'; box.className = 'ag-lista'; card.before(box); }
    if (!lista.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<h3>Anotados no app <small>ainda não chegaram pelo extrato</small></h3>' + lista.slice(0, 20).map((g) => {
      const c = cat(g.envelope); const d = g.data.split('-').reverse().slice(0, 2).join('/');
      return `<div class="ag-it"><span class="ag-ie">${c[1]}</span><span class="ag-in"><b>${g.descricao || c[2]}</b><small>${d} · ${(FORMAS.find((x) => x[0] === g.forma) || ['', '', g.forma])[2]}${g.conta ? ' · ' + g.conta : ''}${g.parcelas > 1 ? ' · <em>' + g.parcelas + 'x de ' + BRL.format(g.valor / g.parcelas) + '</em>' : ''}${g.reembolsar ? ' · <em>a receber de ' + (g.reembolso_de || '?') + '</em>' : ''}</small></span><span class="ag-iv">${BRL.format(g.valor)}</span><span class="ag-acts"><button type="button" class="ag-edit" data-edit="${g.id}" aria-label="Editar">✏️</button><button type="button" class="ag-del" data-del="${g.id}" aria-label="Apagar">🗑️</button></span></div>`;
    }).join('');
  }

  function montar() {
    if (!window.APP || !window.APP.gastos) return;
    sh = document.createElement('div'); sh.className = 'ag-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Anotar gasto');
    sh.innerHTML = '<div class="ag-scrim"></div><div class="ag-panel"><div class="ob-grab"></div><div class="ag-body"></div></div>';
    sh.addEventListener('click', onClick);
    sh.addEventListener('keydown', (e) => { if (e.key === 'Enter' && f && f.passo === 1) { e.preventDefault(); sh.querySelector('[data-next1]').click(); } });
    const fab = document.createElement('button'); fab.type = 'button'; fab.className = 'ag-fab'; fab.setAttribute('aria-label', 'Anotar gasto'); fab.innerHTML = '<span>＋</span><b>Anotar gasto</b>';
    fab.addEventListener('click', abrir);
    document.body.append(sh, fab);
    document.addEventListener('click', (e) => {
      const ed = e.target.closest('.ag-edit'); if (!ed) return;
      const g = lista.find((x) => String(x.id) === ed.dataset.edit); if (!g) return;
      abrir({ editId: g.id, prefill: { valor: Number(g.valor), envelope: g.envelope, forma: g.forma || 'pix', data: g.data, descricao: g.descricao || '', conta: g.conta || null, reembolsar: !!g.reembolsar, reembolso_de: g.reembolso_de || 'Vital', venda_para: g.venda_para || '', venda_valor: g.venda_valor || '', venda_recebido: !!g.venda_recebido, projeto_id: g.projeto_id || null, parcelas: g.parcelas || 1, parcela1: g.parcela1 || null } });
    });
    document.addEventListener('click', async (e) => {
      const d = e.target.closest('.ag-del'); if (!d) return;
      if (!d.dataset.ok) { d.dataset.ok = '1'; d.textContent = 'Apagar?'; return; }
      try { await window.APP.gastos.apagar(d.dataset.del); } catch (err) { console.error(err); } recarregar();
    });
    window.OIKOS_ANOTAR = abrir;
    document.addEventListener('oikos:recarregar-gastos', recarregar);
    recarregar();
    if (window.dash) { let primeira = true; dash.onData(() => { if (primeira && dash.data('mensal').status === 'ok') { primeira = false; recarregar(); } }); }
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 30));
})();
