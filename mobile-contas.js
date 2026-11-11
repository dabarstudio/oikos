// Denário — "Contas mês a mês" no celular: chips de mês + resumo + lista de categorias com barras (no lugar da tabela larga).
(function () {
  const MQ = matchMedia('(max-width: 760px)');
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const BRL2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const cap = (s) => { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const abertos = new Set();
  let box;

  function render() {
    if (!box || !window.dash) return;
    const me = dash.data('mensal'), ma = dash.data('maes'), co = dash.data('contas');
    if ([me, ma, co].some((d) => d.status !== 'ok')) { box.innerHTML = '<p class="ob-dica">Carregando…</p>'; return; }
    const mes = (window.FV && window.FV.mes && window.FV.mes()) || 'total';
    const meses = me.data.filter((r) => r.mes !== 'total').map((r) => r.mes);
    const linha = me.data.find((r) => r.mes === mes) || {};
    const ent = linha.entradas || 0, sai = linha.saidas || 0, res = linha.resultado != null ? linha.resultado : ent - sai;

    const chips = ['total', ...meses.slice().reverse()].map((k) => `<button type="button" class="ob-chip${k === mes ? ' on' : ''}" data-mes="${k}">${k === 'total' ? 'Ano todo' : MES[+k.slice(5) - 1]}</button>`).join('');
    const grupo = (tipo, total, titulo, cor) => {
      const lista = ma.data.filter((r) => r.tipo === tipo && r.mes === mes && r.valor)
        .sort((a, b) => (a.mae.includes('IDENTIFICAR') ? 1 : 0) - (b.mae.includes('IDENTIFICAR') ? 1 : 0) || b.valor - a.valor);
      if (!lista.length) return '';
      const max = Math.max(...lista.map((r) => r.valor));
      return `<h4 class="ob-gh">${titulo}</h4><ul class="ob-cats">` + lista.map((r) => {
        const filhas = co.data.filter((x) => x.tipo === tipo && x.mae === r.mae && x.mes === mes && x.valor).sort((a, b) => b.valor - a.valor);
        const tem = !(filhas.length === 1 && filhas[0].conta === r.mae);
        const pct = total ? Math.round(r.valor / total * 100) : 0;
        const ab = abertos.has(tipo + r.mae);
        const ident = r.mae.includes('IDENTIFICAR');
        return `<li class="ob-cat${ident ? ' ident' : ''}${ab ? ' open' : ''}">
          <button type="button" class="ob-row" data-mae="${encodeURIComponent(r.mae)}" data-tipo="${tipo}" data-tem="${tem ? 1 : 0}">
            <span class="ob-nm">${cap(r.mae)}</span><span class="ob-vl">${BRL.format(r.valor)}</span>
            <span class="ob-bar"><i style="width:${Math.max(2, r.valor / max * 100)}%;background:${ident ? 'var(--color-warn)' : cor}"></i></span>
            <span class="ob-pc">${pct}%</span>${tem ? `<span class="ob-chev" aria-hidden="true">${ab ? '▴' : '▾'}</span>` : '<span class="ob-chev" aria-hidden="true">›</span>'}
          </button>
          ${tem && ab ? '<ul class="ob-sub">' + filhas.map((f) => `<li><button type="button" class="ob-subrow" data-conta="${encodeURIComponent(f.conta)}"><span>${cap(f.conta)}</span><span>${BRL2.format(f.valor)}</span><span class="ob-chev">›</span></button></li>`).join('') + '</ul>' : ''}
        </li>`;
      }).join('') + '</ul>';
    };
    const rot = mes === 'total' ? 'no ano' : 'em ' + MES[+mes.slice(5) - 1];
    box.innerHTML = `<div class="ob-chips" role="tablist" aria-label="Mês">${chips}</div>
      <div class="ob-sum">
        <div><span>Entrou</span><b class="in">${BRL.format(ent)}</b></div>
        <div><span>Saiu</span><b>${BRL.format(sai)}</b></div>
        <div><span>Sobrou</span><b class="${res < 0 ? 'neg' : 'in'}">${(res >= 0 ? '+' : '−') + BRL.format(Math.abs(res)).replace('-', '')}</b></div>
      </div>
      <p class="ob-dica">Toque numa categoria para ver o que tem dentro; toque de novo para ver os lançamentos. Valores ${rot}; % sobre o que ${'entrou'}.</p>
      ${grupo('Saída', ent || sai, 'Para onde foi o dinheiro', 'var(--sv-orange)')}
      ${grupo('Entrada', ent, 'De onde veio', 'var(--sv-green)')}`;
    const on = box.querySelector('.ob-chip.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function montar() {
    const tb = document.getElementById('tb-pivot'); if (!tb || !window.dash) return;
    const wrap = tb.closest('.fv-scroll') || tb;
    box = document.createElement('div'); box.className = 'ob-contas'; wrap.after(box);
    wrap.classList.add('ob-pivot-wrap');
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('.ob-chip');
      if (chip) { dash.setParams({ mes: chip.dataset.mes }); return; }
      const row = e.target.closest('.ob-row');
      if (row) {
        const mae = decodeURIComponent(row.dataset.mae);
        if (row.dataset.tem === '1') { const k = row.dataset.tipo + mae; abertos.has(k) ? abertos.delete(k) : abertos.add(k); render(); }
        else { window.FV.filtroLanc = { conta: mae }; document.getElementById('tab-lanc').click(); scrollTo(0, 0); }
        return;
      }
      const sub = e.target.closest('.ob-subrow');
      if (sub) { window.FV.filtroLanc = { conta: decodeURIComponent(sub.dataset.conta) }; document.getElementById('tab-lanc').click(); scrollTo(0, 0); }
    });
    dash.onData(() => { if (MQ.matches) render(); });
    MQ.addEventListener && MQ.addEventListener('change', render);
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 0));
})();
