// Oikos — "Revendas": compras para revender ficam fora dos envelopes; mostra lucro e o que falta receber.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lista = () => (window.OIKOS_GASTOS ? window.OIKOS_GASTOS.lista() : []).filter((g) => g.envelope === 'revenda');
  function desenhar() {
    const casa = document.getElementById('casa'); if (!casa) return;
    let box = casa.querySelector('.rv-wrap');
    const l = lista();
    if (!l.length) { if (box) box.remove(); return; }
    if (!box) {
      const ancora = casa.querySelector('.vc-wrap') || casa.querySelector('.nt-wrap') || casa.querySelector('.cs-hero'); if (!ancora) return;
      box = document.createElement('div'); box.className = 'rv-wrap'; ancora.after(box);
    }
    const neg = window.APP && window.APP.familia ? window.APP.familia.negocio() : '';
    const custo = l.reduce((s, g) => s + Number(g.valor || 0), 0);
    const vendido = l.filter((g) => g.venda_valor).reduce((s, g) => s + Number(g.venda_valor), 0);
    const custoVend = l.filter((g) => g.venda_valor).reduce((s, g) => s + Number(g.valor || 0), 0);
    const receber = l.filter((g) => g.venda_valor && !g.venda_recebido).reduce((s, g) => s + Number(g.venda_valor), 0);
    box.innerHTML = `<div class="rv-card"><div class="rv-h">${neg ? `<h3 class="rv-neg"><span class="rv-logo">📦</span>${esc(neg)}</h3>` : '<h3>🏷️ Revendas</h3>'}<small>fora dos envelopes da casa</small></div>
      <div class="rv-kpi"><span><small>Lucro</small><b class="${vendido - custoVend >= 0 ? 'pos' : 'neg'}">${BRL.format(vendido - custoVend)}</b></span><span><small>A receber</small><b>${BRL.format(receber)}</b></span><span><small>Comprado</small><b>${BRL.format(custo)}</b></span></div>
      ${l.slice(0, 8).map((g) => {
        const lucro = g.venda_valor ? Number(g.venda_valor) - Number(g.valor) : null;
        const st = !g.venda_valor ? '<em>Ainda não vendeu</em>' : g.venda_recebido ? '✅ Recebido' : `<button type="button" data-rvrec="${g.id}">Recebi ${BRL.format(Number(g.venda_valor))}</button>`;
        return `<div class="rv-it"><div class="rv-l"><b>${esc(g.descricao || 'Revenda')}</b><small>${g.venda_para ? 'para ' + esc(g.venda_para) + ' · ' : ''}custou ${BRL.format(Number(g.valor))}${lucro != null ? ' · lucro <b>' + BRL.format(lucro) + '</b>' : ''}</small></div><div class="rv-s">${st}</div></div>`;
      }).join('')}</div>`;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rvrec]'); if (!b) return;
    b.disabled = true; b.textContent = 'Salvando…';
    try { await window.APP.gastos.atualizar(b.dataset.rvrec, { venda_recebido: true }); } catch (err) { console.error(err); }
    document.dispatchEvent(new Event('oikos:recarregar-gastos'));
  });
  document.addEventListener('oikos:gastos', desenhar);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new MutationObserver(() => { const c = document.getElementById('casa'); if (c && !c.querySelector('.rv-wrap') && lista().length) desenhar(); })
      .observe(document.getElementById('dash-root') || document.body, { childList: true, subtree: true }), 100);
  });
})();
