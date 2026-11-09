// Oikos — "Casa": tela inicial simples (princípio ELI5). Mostra o mês atual: quanto ainda dá para gastar e os envelopes.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  // envelopes do dia a dia: [rótulo, emoji, nível, chave na planilha]
  const ENV = [
    ['Mercado', '🛒', 'conta', 'MERCADO'],
    ['Açougue', '🥩', 'conta', 'AÇOUGUE'],
    ['Comer fora', '🍔', 'conta', 'ALIMENTAÇÃO FORA'],
    ['Carro', '🚗', 'mae', 'VEÍCULO E TRANSPORTE'],
    ['Saúde', '💊', 'mae', 'SAÚDE E BEM-ESTAR'],
    ['Abner', '👶', 'mae', 'ABNER'],
    ['Casa', '🏠', 'mae', 'CASA'],
    ['Lazer e presentes', '🎁', 'mae', 'LAZER, PRESENTES E ASSINATURAS'],
  ];
  let root;

  function estado(gasto, teto, ritmo) {
    if (!teto) return 'ok';
    const p = gasto / teto;
    if (p >= 1) return 'bad';
    if (p > ritmo + 0.12) return 'warn';
    return 'ok';
  }

  function render() {
    if (!root || !window.dash) return;
    const me = dash.data('mensal'), co = dash.data('contas'), mt = dash.data('metas'), la = dash.data('lancamentos');
    if ([me, co, mt, la].some((d) => d.status !== 'ok')) { root.innerHTML = '<div class="cs-card"><p class="cs-sub">Carregando…</p></div>'; return; }
    const meses = me.data.filter((r) => r.mes !== 'total').map((r) => r.mes).sort();
    const mes = meses[meses.length - 1];
    const [ano, mm] = mes.split('-').map(Number);
    const diasMes = new Date(ano, mm, 0).getDate();
    const ult = la.data.filter((r) => r.mes === mes).map((r) => r.data).sort().pop();
    const dia = ult ? +ult.slice(8, 10) : 1;
    const ritmo = dia / diasMes;
    const faltamDias = diasMes - dia;

    const meta = (nivel, chave) => (mt.data.find((m) => m.nivel === nivel && m.chave === chave) || {}).valor_meta || 0;
    const gastoDe = (nivel, chave) => co.data.filter((c) => c.tipo === 'Saída' && c.mes === mes && (nivel === 'conta' ? c.conta === chave : c.mae === chave)).reduce((s, c) => s + c.valor, 0);

    const teto = meta('total', 'SAÍDAS');
    const linha = me.data.find((r) => r.mes === mes) || {};
    const saiu = linha.saidas || 0;
    const resta = teto - saiu;
    const st = estado(saiu, teto, ritmo);
    const frase = st === 'bad' ? 'O dinheiro do mês para gastos acabou. Só o essencial até o fim do mês.'
      : st === 'warn' ? 'Cuidado: o mês está gastando mais rápido do que os dias estão passando.'
      : 'Tudo certo! Vocês estão gastando no ritmo do mês.';
    const usado = teto ? Math.min(100, saiu / teto * 100) : 0;

    const envs = ENV.map(([rot, em, nivel, chave]) => {
      const t = meta(nivel, chave), g = gastoDe(nivel, chave), e = estado(g, t, ritmo), f = t - g;
      const txt = !t ? BRL.format(g) + ' gastos' : f >= 0 ? 'Faltam <b>' + BRL.format(f) + '</b>' : 'Passou <b>' + BRL.format(-f) + '</b>';
      return `<button type="button" class="cs-env ${e}" data-nivel="${nivel}" data-chave="${encodeURIComponent(chave)}">
        <span class="cs-em" aria-hidden="true">${em}</span>
        <span class="cs-et">${rot}</span>
        <span class="cs-ef">${txt}</span>
        <span class="cs-bar"><i style="width:${t ? Math.min(100, Math.max(3, g / t * 100)) : 0}%"></i><u style="left:${ritmo * 100}%"></u></span>
        <span class="cs-de">${t ? 'de ' + BRL.format(t) : 'sem limite'}</span>
      </button>`;
    }).join('');

    root.innerHTML = `
      <p class="cs-hello">Olá! Hoje é dia ${dia} de ${MESES[mm - 1]}.</p>
      <div class="cs-card cs-hero ${st}">
        <span class="cs-lbl">${resta >= 0 ? 'Ainda dá para gastar este mês' : 'Passou do limite do mês'}</span>
        <span class="cs-big">${BRL.format(Math.abs(resta))}</span>
        <span class="cs-bar big"><i style="width:${Math.max(3, usado)}%"></i><u style="left:${ritmo * 100}%"></u></span>
        <span class="cs-sub">Gastou ${BRL.format(saiu)} de ${BRL.format(teto)} · faltam ${faltamDias} dias</span>
        <p class="cs-msg"><span aria-hidden="true">${st === 'ok' ? '😊' : st === 'warn' ? '⚠️' : '🛑'}</span> ${frase}</p>
      </div>
      <h2 class="cs-h">Envelopes do mês</h2>
      <p class="cs-hint">Toque num envelope para ver o que foi gasto.</p>
      <div class="cs-grid">${envs}</div>
      <div class="cs-legend"><span><i class="ok"></i>Tranquilo</span><span><i class="warn"></i>Cuidado</span><span><i class="bad"></i>Acabou</span><span><u></u>Hoje</span></div>
    `;
  }

  function abrirEnvelope(nivel, chave) {
    const meses = (dash.data('mensal').data || []).filter((r) => r.mes !== 'total').map((r) => r.mes).sort();
    dash.setParams({ mes: meses[meses.length - 1] });
    window.FV.filtroLanc = nivel === 'conta' ? { conta: chave } : { mae: chave };
    document.body.classList.remove('cs-on');
    document.getElementById('tab-lanc').click();
    scrollTo(0, 0);
  }

  function montar() {
    const dr = document.getElementById('dash-root'); if (!dr || !window.dash) return;
    root = document.createElement('section'); root.className = 'cs'; root.id = 'casa'; root.setAttribute('aria-label', 'Início');
    dr.prepend(root);
    root.addEventListener('click', (e) => { const b = e.target.closest('.cs-env'); if (b) abrirEnvelope(b.dataset.nivel, decodeURIComponent(b.dataset.chave)); });
    dash.onData(render);
    window.OIKOS_CASA = { show: () => { document.body.classList.add('cs-on'); render(); scrollTo(0, 0); document.dispatchEvent(new Event('oikos:tab')); }, hide: () => { document.body.classList.remove('cs-on'); document.dispatchEvent(new Event('oikos:tab')); } };
    if (matchMedia('(max-width: 760px)').matches && !location.hash) window.OIKOS_CASA.show();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 0));
})();
