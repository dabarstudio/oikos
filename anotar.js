// Oikos — "Anotar gasto": 3 passos bem simples (quanto → com o quê → como pagou). Entra na hora nos envelopes.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const CATS = [
    ['mercado', '🛒', 'Mercado'], ['acougue', '🥩', 'Açougue'], ['comerfora', '🍔', 'Comer fora'], ['combustivel', '⛽', 'Combustível'],
    ['transporte', '🚌', 'Ônibus / Uber'], ['saude', '💊', 'Saúde / Farmácia'], ['abner', '👶', 'Abner'], ['casa', '🏠', 'Casa'],
    ['lazer', '🎁', 'Lazer / Presentes'], ['revenda', '🏷️', 'Revenda'], ['outros', '📦', 'Outros'],
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

  function abrir() { f = { passo: 1, valor: '', envelope: null, forma: 'dinheiro', data: hoje(), reembolsar: false, reembolso_de: 'Vital', descricao: '', conta: null, venda_para: '', venda_valor: '', venda_recebido: false }; passo(); document.body.classList.add('ag-open'); setTimeout(() => { const i = document.getElementById('ag-val'); if (i) i.focus(); }, 280); }
  const fechar = () => document.body.classList.remove('ag-open');
  function passo() {
    const b = sh.querySelector('.ag-body');
    if (f.passo === 1) {
      b.innerHTML = `<p class="ag-q">Quanto você gastou?</p>
        <div class="ag-money"><span>R$</span><input id="ag-val" inputmode="decimal" placeholder="0,00" value="${f.valor}" autocomplete="off"></div>
        <button type="button" class="ag-next" data-next1>Continuar</button>`;
    } else if (f.passo === 2) {
      b.innerHTML = `<button type="button" class="ag-back" data-back>‹ ${BRL.format(f.valor)}</button><p class="ag-q">Com o quê?</p>
        <div class="ag-grid">${CATS.map(([k, e, n]) => [k, e, k === 'abner' ? (window.OIKOS_FILHOS || 'Filhos') : n]).map(([k, e, n]) => `<button type="button" data-env="${k}"><span>${e}</span>${n}</button>`).join('')}</div>`;
    } else {
      const c = cat(f.envelope);
      b.innerHTML = `<button type="button" class="ag-back" data-back>‹ Voltar</button>
        <p class="ag-q">${c[1]} ${BRL.format(f.valor)} <small>${c[2]}</small></p>
        <p class="ag-l">Como pagou?</p><div class="ag-ops">${FORMAS.map(([k, e, n]) => `<button type="button" data-forma="${k}" class="${f.forma === k ? 'on' : ''}">${e} ${n}</button>`).join('')}</div>
        ${f.forma !== 'dinheiro' ? '<p class="ag-l">De qual conta saiu?</p><div id="ag-bk"></div>' : ''}
        <p class="ag-l">Quando?</p><div class="ag-ops"><button type="button" data-dia="${hoje()}" class="${f.data === hoje() ? 'on' : ''}">Hoje</button><button type="button" data-dia="${ontem()}" class="${f.data === ontem() ? 'on' : ''}">Ontem</button><input type="date" id="ag-data" value="${f.data}" max="${hoje()}"></div>
        ${f.envelope === 'revenda' ? `<div class="ag-rv"><p class="ag-l">🏷️ Comprou para revender — não entra nos envelopes da casa.</p>
          <label class="ag-l">Vendeu para quem? <small>(se já vendeu)</small><input id="ag-vpara" class="sv-in" value="${f.venda_para.replace(/"/g, '&quot;')}" placeholder="Ex.: Carlos Henrique" maxlength="50"></label>
          <label class="ag-l">Por quanto vendeu?<input id="ag-vval" class="sv-in" inputmode="decimal" value="${f.venda_valor}" placeholder="0,00"></label>
          <p class="ag-l">Já recebeu o dinheiro da venda?</p><div class="ag-ops"><button type="button" data-vrec="0" class="${!f.venda_recebido ? 'on' : ''}">Ainda não</button><button type="button" data-vrec="1" class="${f.venda_recebido ? 'on' : ''}">Sim, recebi</button></div></div>`
        : `<p class="ag-l">Alguém vai te devolver esse dinheiro?</p><div class="ag-ops"><button type="button" data-reemb="0" class="${!f.reembolsar ? 'on' : ''}">Não</button><button type="button" data-reemb="1" class="${f.reembolsar ? 'on' : ''}">Sim, é reembolso</button></div>
        ${f.reembolsar ? `<label class="ag-l">Quem vai devolver?<input id="ag-quem" class="sv-in" value="${f.reembolso_de}" placeholder="Ex.: Vital, cliente…"></label>` : ''}`}
        <label class="ag-l">O que foi? <small>(opcional)</small><input id="ag-desc" class="sv-in" value="${f.descricao.replace(/"/g, '&quot;')}" placeholder="Ex.: passagem de ônibus" maxlength="80"></label>
        <button type="button" class="ag-next" data-salvar ${f.forma !== 'dinheiro' && !f.conta ? 'disabled' : ''}>Anotar gasto</button>
        <p class="ag-falta" id="ag-falta">${f.forma !== 'dinheiro' && !f.conta ? '👆 Toque na conta que pagou' : ''}</p>`;
      const bk = document.getElementById('ag-bk');
      if (bk && window.OIKOS_BANCOS) window.OIKOS_BANCOS.montar(bk, f.conta, (v) => { f.conta = v; const s = sh.querySelector('[data-salvar]'); if (s) s.disabled = false; const x = document.getElementById('ag-falta'); if (x) x.textContent = ''; });
    }
  }
  function lerCampos() {
    const d = document.getElementById('ag-desc'); if (d) f.descricao = d.value;
    const q = document.getElementById('ag-quem'); if (q) f.reembolso_de = q.value;
    const dt = document.getElementById('ag-data'); if (dt && dt.value) f.data = dt.value;
    const vp = document.getElementById('ag-vpara'); if (vp) f.venda_para = vp.value;
    const vv = document.getElementById('ag-vval'); if (vv) f.venda_valor = vv.value;
  }
  async function onClick(e) {
    if (e.target.classList.contains('ag-scrim')) return fechar();
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-next1')) { const v = num(document.getElementById('ag-val').value); if (!v) { document.getElementById('ag-val').focus(); return; } f.valor = v; f.passo = 2; return passo(); }
    if (b.hasAttribute('data-back')) { lerCampos(); f.passo -= 1; return passo(); }
    if (b.dataset.env) { f.envelope = b.dataset.env; f.reembolsar = false; f.passo = 3; return passo(); }
    if (b.dataset.forma) { lerCampos(); f.forma = b.dataset.forma; return passo(); }
    if (b.dataset.dia) { lerCampos(); f.data = b.dataset.dia; return passo(); }
    if (b.dataset.vrec) { lerCampos(); f.venda_recebido = b.dataset.vrec === '1'; return passo(); }
    if (b.dataset.reemb) { lerCampos(); f.reembolsar = b.dataset.reemb === '1'; return passo(); }
    if (b.hasAttribute('data-salvar')) {
      lerCampos(); b.disabled = true; b.textContent = 'Anotando…';
      try {
        await window.APP.gastos.salvar({ data: f.data, valor: f.valor, envelope: f.envelope, descricao: f.descricao || cat(f.envelope)[2], forma: f.forma, reembolsar: f.reembolsar, reembolso_de: f.reembolsar ? (f.reembolso_de || null) : null, conta: f.forma === 'dinheiro' ? null : f.conta, ...(f.envelope === 'revenda' ? { venda_para: f.venda_para || null, venda_valor: num(f.venda_valor) || null, venda_recebido: f.venda_recebido } : {}) });
        sh.querySelector('.ag-body').innerHTML = `<div class="ag-big">✅</div><p class="ag-q" style="text-align:center">Anotado!</p>
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
      return `<div class="ag-it"><span class="ag-ie">${c[1]}</span><span class="ag-in"><b>${g.descricao || c[2]}</b><small>${d} · ${(FORMAS.find((x) => x[0] === g.forma) || ['', '', g.forma])[2]}${g.conta ? ' · ' + g.conta : ''}${g.reembolsar ? ' · <em>a receber de ' + (g.reembolso_de || '?') + '</em>' : ''}</small></span><span class="ag-iv">${BRL.format(g.valor)}</span><button type="button" class="ag-del" data-del="${g.id}" aria-label="Apagar">🗑️</button></div>`;
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
