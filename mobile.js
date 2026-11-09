// Oikos — navegação mobile (rodapé + "Mais"), título da seção e textos de toque.
(function () {
  const I = {
    casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    visao: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    mercado: '<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    lanc: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    contas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    fixos: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>',
    patrimonio: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
    plano: '<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
    sair: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  };
  const svg = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[k] + '</svg>';
  const NOMES = { casa: 'Início', visao: 'Resumo do ano', metas: 'Metas', mercado: 'Mercado', lanc: 'Gastos', contas: 'Contas', fixos: 'Gastos fixos', patrimonio: 'Patrimônio', plano: 'Plano de aportes' };
  const MAIS = [['visao', 'Números do ano e gráficos'], ['contas', 'Entradas e saídas por conta, mês a mês'], ['fixos', 'Contas que se repetem todo mês'], ['patrimonio', 'O que a família tem e deve'], ['plano', 'Para onde vai a sobra do mês']];

  function montar() {
    if (document.querySelector('.ob-nav') || !document.getElementById('tab-visao')) return;
    const nav = document.createElement('nav'); nav.className = 'ob-nav'; nav.setAttribute('aria-label', 'Navegação');
    nav.innerHTML = ['casa', 'metas', 'mercado', 'lanc'].map((k) => `<button type="button" data-go="${k}">${svg(k)}<span>${NOMES[k]}</span></button>`).join('')
      + `<button type="button" data-mais>${svg('mais')}<span>Mais</span></button>`;
    const scrim = document.createElement('div'); scrim.className = 'ob-scrim';
    const sheet = document.createElement('div'); sheet.className = 'ob-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Mais seções');
    sheet.innerHTML = '<div class="ob-grab"></div><h3>Mais seções</h3>' + MAIS.map(([k, d]) => `<button type="button" data-go="${k}">${svg(k)}<span>${k==='contas'?'Contas mês a mês':NOMES[k]}<small>${d}</small></span></button>`).join('')
      + `<button type="button" class="ob-sair">${svg('sair')}<span>Sair da conta</span></button>`;
    document.body.append(nav, scrim, sheet);

    const fechar = () => document.body.classList.remove('ob-open');
    const ir = (k) => { fechar(); if (k === 'casa') { window.OIKOS_CASA && window.OIKOS_CASA.show(); sync(); return; } window.OIKOS_CASA && window.OIKOS_CASA.hide(); const b = document.getElementById('tab-' + k); if (b) b.click(); window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); };
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ir(b.dataset.go)));
    nav.querySelector('[data-mais]').addEventListener('click', () => document.body.classList.toggle('ob-open'));
    scrim.addEventListener('click', fechar);
    sheet.querySelector('.ob-sair').addEventListener('click', () => { fechar(); const s = document.getElementById('sv-sair'); if (s) s.click(); });
    let y0 = null; sheet.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', (e) => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 60) fechar(); y0 = null; });

    // título da seção na barra fixa
    const bar = document.querySelector('.fv-bar');
    const t = document.createElement('h2'); t.className = 'ob-pagetitle'; bar && bar.prepend(t);

    const sync = () => {
      const ativa = document.querySelector('.fv-tab[aria-selected="true"]');
      const k = document.body.classList.contains('cs-on') ? 'casa' : (ativa ? ativa.dataset.tab : 'visao');
      document.body.dataset.tab = k;
      t.textContent = NOMES[k] || '';
      nav.querySelectorAll('button').forEach((b) => b.removeAttribute('aria-current'));
      const alvo = nav.querySelector(`[data-go="${k}"]`) || nav.querySelector('[data-mais]');
      alvo.setAttribute('aria-current', 'page');
    };
    new MutationObserver(sync).observe(document.querySelector('.fv-tabs'), { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
    sync();
    document.addEventListener('oikos:tab', sync);

    // lançamentos: tocar na linha mostra o "Mover para…" (corrigir categoria)
    const tb = document.querySelector('#tb-lanc tbody');
    if (tb) {
      tb.addEventListener('click', (e) => {
        if (e.target.closest('select')) return;
        const tr = e.target.closest('tr'); if (!tr) return;
        const on = tr.classList.contains('ob-sel');
        tb.querySelectorAll('tr.ob-sel').forEach((r) => r.classList.remove('ob-sel'));
        if (!on) tr.classList.add('ob-sel');
      });
      const cnt = document.getElementById('lanc-count');
      if (cnt && matchMedia('(max-width: 760px)').matches) { const d = document.createElement('p'); d.className = 'ob-dica'; d.textContent = 'Toque num lançamento para corrigir a categoria.'; cnt.after(d); }
    }
  }

  // "Clique" vira "Toque" em telas de toque
  const toque = matchMedia('(hover: none)').matches;
  function textos(root) {
    if (!toque) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { if (/Cliqu|clique/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Clique/g, 'Toque').replace(/clique/g, 'toque').replace(/Clicar/g, 'Tocar').replace(/clicar/g, 'tocar'); }
  }
  // esconde o rodapé enquanto a tela de login estiver aberta
  function vigiarLogin() {
    const lg = document.getElementById('sv-login'); if (!lg) return;
    const up = () => document.body.classList.toggle('ob-logout', !lg.hidden);
    new MutationObserver(up).observe(lg, { attributes: true, attributeFilter: ['hidden'] }); up();
  }
  // iPhone (app instalado): às vezes o teclado não aparece no 1º toque. Reabre o foco uma vez.
  function teclado() {
    const st = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!st) return;
    document.querySelectorAll('#sv-login input').forEach((i) => {
      let feito = false;
      i.addEventListener('focus', () => { if (feito) return; feito = true; setTimeout(() => { i.blur(); setTimeout(() => i.focus(), 60); }, 250); });
    });
    // corrige a tela "encolhida" depois que o teclado fecha
    let maxH = innerHeight; addEventListener('resize', () => { maxH = Math.max(maxH, innerHeight); });
    document.addEventListener('focusout', () => setTimeout(() => { if (maxH - innerHeight > 4) { const r = document.body; r.style.display = 'none'; void r.offsetHeight; r.style.display = ''; } }, 150));
  }
  document.addEventListener('DOMContentLoaded', () => {
    vigiarLogin(); teclado();
    montar(); textos(document.body);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && textos(n)))).observe(document.body, { childList: true, subtree: true });
  });
})();
