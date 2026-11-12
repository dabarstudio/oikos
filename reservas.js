// Denário — Gastos fixos: "Reservas do mês" (objetivos + renovação dos bens) e a meta de faturamento da família.
// Cada objetivo novo vira um compromisso mensal; a meta é fazer a renda crescer até cobrir tudo.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const EMO = { reserva: '🛟', casa: '🏠', reforma: '🛠️', carro: '🚗', viagem: '✈️', estudos: '🎓', dividas: '💳', festa: '🎉', filho: '🧸', aposentadoria: '🌴', eletronicos: '📱', saude: '💪', outro: '⭐' };
  let objetivos = [];

  function mesesAte(prazo) {
    if (!prazo) return null; const h = new Date(); const p = new Date(prazo + 'T12:00:00');
    return Math.max(1, (p.getFullYear() - h.getFullYear()) * 12 + (p.getMonth() - h.getMonth()));
  }
  function d(id) { const r = window.dash && dash.data(id); return r && r.status === 'ok' ? r.data : []; }

  function contas() {
    const fixos = d('fixos');
    const tot = fixos.find((x) => /^TOTAL DE GASTOS FIXOS/i.test(x.item || ''));
    const prov = fixos.find((x) => /Provis/i.test(x.item || ''));
    const fixosTot = tot ? Number(tot.valor_mes || 0) : fixos.filter((x) => x.grupo !== 'Total').reduce((s, x) => s + Number(x.valor_mes || 0), 0);
    let renda = tot && tot.pct_renda ? fixosTot / tot.pct_renda : 0;
    if (!renda) { const m = d('mensal').filter((x) => x.mes !== 'total' && !/até/.test(x.rotulo || '')); renda = m.length ? m.reduce((s, x) => s + Number(x.entradas || 0), 0) / m.length : 0; }
    const metaTot = d('metas').find((x) => x.nivel === 'total');
    const teto = metaTot ? Number(metaTot.valor_meta || 0) : 0;
    const objs = objetivos.map((o) => {
      const falta = Math.max(0, Number(o.valor_alvo || 0) - Number(o.valor_guardado || 0)); const m = mesesAte(o.prazo);
      return { ...o, falta, meses: m, mensal: m && falta ? Math.ceil(falta / m) : 0 };
    }).filter((o) => o.falta > 0);
    const resObj = objs.reduce((s, o) => s + o.mensal, 0);
    const provBens = prov ? Number(prov.valor_mes || 0) : 0;
    return { fixosTot, renda, teto, objs, resObj, provBens };
  }

  function desenhar() {
    const pg = document.getElementById('fixos'); const card = document.getElementById('card-fixos');
    if (!pg || !card) return;
    const c = contas();
    // ---- reservas do mês ----
    let box = document.getElementById('card-reservas');
    if (!box) { box = document.createElement('div'); box.id = 'card-reservas'; box.className = 'fv-card rs-card'; card.after(box); }
    const linhas = c.objs.map((o) => {
      const pct = o.valor_alvo ? Math.min(100, Number(o.valor_guardado || 0) / Number(o.valor_alvo) * 100) : 0;
      const quando = o.prazo ? MES[+o.prazo.slice(5, 7) - 1] + '/' + o.prazo.slice(0, 4) : '';
      return `<div class="rs-it"><span class="rs-e">${EMO[o.categoria] || '⭐'}</span><span class="rs-n"><b>${esc(o.titulo)}</b>
        <small>${o.meses ? `faltam ${BRL0.format(o.falta)} até ${quando} · ${o.meses} ${o.meses > 1 ? 'meses' : 'mês'}` : `faltam ${BRL0.format(o.falta)} · <em>sem prazo: defina para calcular</em>`}</small>
        <span class="rs-bar"><i style="width:${Math.max(2, pct)}%"></i></span></span><span class="rs-v">${o.mensal ? BRL.format(o.mensal) : '—'}<small>${o.mensal ? '/mês' : ''}</small></span></div>`;
    }).join('');
    box.innerHTML = `<div class="rs-h"><h3>🎯 Reservas do mês para os objetivos</h3><span>${BRL.format(c.resObj)}/mês</span></div>
      <p class="fv-note">Quanto separar todo mês para cada objetivo chegar no prazo. Cada objetivo novo entra aqui e soma no compromisso mensal da família.</p>
      ${linhas || '<p class="rs-vazio">Nenhum objetivo com valor e prazo ainda. Crie em Objetivos que ele aparece aqui.</p>'}
      ${c.provBens ? `<div class="rs-it rs-bens"><span class="rs-e">🛋️</span><span class="rs-n"><b>Renovar os bens da casa</b><small>já está nos gastos fixos (depreciação)</small></span><span class="rs-v">${BRL.format(c.provBens)}<small>/mês</small></span></div>` : ''}
      <div class="rs-tot"><span>Gastos fixos</span><b>${BRL.format(c.fixosTot)}</b><span>+ reservas dos objetivos</span><b>${BRL.format(c.resObj)}</b><span class="rs-tt">Compromisso mensal da família</span><b class="rs-tt">${BRL.format(c.fixosTot + c.resObj)}</b></div>
      <button type="button" class="rs-btn" data-rsobj>＋ Criar ou ajustar objetivos</button>`;
    // ---- meta de faturamento ----
    let meta = document.getElementById('fx-meta');
    if (!meta) { meta = document.createElement('div'); meta.id = 'fx-meta'; meta.className = 'rs-meta'; pg.prepend(meta); }
    const base = c.teto || c.fixosTot;
    const precisa = base + c.provBens * (c.teto ? 1 : 0) + c.resObj;
    const falta = precisa - c.renda;
    const pctR = precisa ? Math.min(100, c.renda / precisa * 100) : 0;
    meta.innerHTML = `<p class="rs-k">Meta de faturamento mensal da família</p>
      <p class="rs-big">${BRL0.format(precisa)}</p>
      <div class="rs-mbar" role="img" aria-label="Renda atual em relação à meta"><i style="width:${pctR}%"></i></div>
      <p class="rs-s">Renda atual: <b>${BRL0.format(c.renda)}</b> · ${falta > 0 ? `faltam <b class="rs-falta">${BRL0.format(falta)} por mês</b> (+${Math.round(falta / Math.max(1, c.renda) * 100)}%)` : '<b>meta coberta! 🎉</b>'}</p>
      <ul class="rs-comp">
        <li><span>${c.teto ? 'Limite de gastos do mês (inclui os fixos)' : 'Gastos fixos'}</span><b>${BRL0.format(base)}</b></li>
        ${c.teto && c.provBens ? `<li><span>Renovar os bens da casa</span><b>${BRL0.format(c.provBens)}</b></li>` : ''}
        <li><span>Reservas dos objetivos</span><b>${BRL0.format(c.resObj)}</b></li></ul>
      <p class="rs-dica">${falta > 0 ? '🪙 Cortar gasto tem limite; aumentar a renda, não. Coloque seus <b>talentos</b> para render e acompanhe o lucro de cada um.' : 'Com a meta coberta, o que entrar a mais acelera os objetivos.'}</p>
      ${falta > 0 ? '<button type="button" class="rs-btn rs-btn2" data-rstal>🪙 Ver meus talentos</button>' : ''}`;
  }
  async function carregar() { try { objetivos = await window.APP.objetivos.listar(); } catch (e) { objetivos = []; } desenhar(); }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-rsobj]')) return window.OIKOS_IR ? window.OIKOS_IR('objetivos') : null;
    if (e.target.closest('[data-rstal]')) return window.OIKOS_IR ? window.OIKOS_IR('negocio') : null;
  });
  document.addEventListener('oikos:objetivos', (e) => { objetivos = e.detail || objetivos; desenhar(); });
  function montar() {
    if (!window.dash || !window.APP || !window.APP.objetivos) return;
    let ok = false; dash.onData(() => { if (dash.data('fixos').status === 'ok' || dash.data('mensal').status === 'ok') { if (!ok) { ok = true; carregar(); } else desenhar(); } });
    window.OIKOS_RESERVAS = { contas, carregar };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 50)); else setTimeout(montar, 50);
})();
