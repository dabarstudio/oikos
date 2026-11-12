// Denário — finanças à luz da Bíblia: "pílulas de sabedoria" (versículo + lição prática).
// Aparece no Início (uma por dia, ou conforme o mês), no Raio-X, no Patrimônio, nos Objetivos e numa tela própria.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // t = temas em que a pílula é oportuna
  const P = [
    { v: 'Tesouro desejável e azeite há na casa do sábio, mas o homem insensato o devora.', r: 'Provérbios 21:20', l: 'Quem é sábio não gasta tudo o que ganha. Separe uma parte antes de gastar.', t: ['reserva', 'sobra'] },
    { v: 'Prepara no verão o seu pão; na sega ajunta o seu mantimento.', r: 'Provérbios 6:8', l: 'A formiga guarda no tempo bom para o tempo difícil. Mês que sobra é mês de engordar a reserva.', t: ['reserva', 'sobra'] },
    { v: 'O prudente vê o mal e esconde-se; mas os simples passam e sofrem a pena.', r: 'Provérbios 22:3', l: 'Imprevisto vai acontecer. A reserva é o seu esconderijo.', t: ['reserva', 'bens'] },
    { v: 'O rico domina sobre os pobres, e o que toma emprestado é servo do que empresta.', r: 'Provérbios 22:7', l: 'Cada parcela e cada dia no cheque especial é um pedaço da sua liberdade emprestado.', t: ['dividas', 'cheque'] },
    { v: 'A ninguém devais coisa alguma, a não ser o amor com que vos ameis uns aos outros.', r: 'Romanos 13:8', l: 'Quite primeiro a dívida de juros mais altos e não abra uma nova para pagar a velha.', t: ['dividas', 'cheque'] },
    { v: 'O ímpio toma emprestado e não paga; mas o justo se compadece e dá.', r: 'Salmos 37:21', l: 'Honrar compromissos também é testemunho. Combine o que dá para cumprir.', t: ['dividas'] },
    { v: 'Pois qual de vós, querendo edificar uma torre, não se assenta primeiro a fazer as contas dos gastos, para ver se tem com que a acabar?', r: 'Lucas 14:28', l: 'Antes da compra grande, sente e faça a conta. Os limites do mês são essa conta.', t: ['planejamento', 'plano', 'objetivos'] },
    { v: 'Os pensamentos do diligente tendem só para a abundância, porém os de todo apressado, tão-somente para a pobreza.', r: 'Provérbios 21:5', l: 'Objetivo se alcança com pouco todo mês, não com pressa.', t: ['objetivos', 'planejamento'] },
    { v: 'Procura conhecer o estado das tuas ovelhas; põe o teu coração sobre os teus rebanhos.', r: 'Provérbios 27:23', l: 'Saber para onde vai cada real é cuidar do que Deus confiou. Anote na hora.', t: ['ident', 'conhecer'] },
    { v: 'Onde não há conselho os projetos saem vãos, mas, com a multidão de conselheiros, se confirmarão.', r: 'Provérbios 15:22', l: 'Decisão grande se toma a dois, e com quem entende do assunto.', t: ['planejamento', 'casal'] },
    { v: 'Confia ao Senhor as tuas obras, e teus pensamentos serão estabelecidos.', r: 'Provérbios 16:3', l: 'Planeje com cuidado e entregue o resultado. Ansiedade não paga conta.', t: ['planejamento', 'geral'] },
    { v: 'Honra ao Senhor com a tua fazenda e com as primícias de toda a tua renda.', r: 'Provérbios 3:9', l: 'Primícias é o primeiro, não o que sobra. Separe a oferta no dia em que o dinheiro cai.', t: ['dizimo'] },
    { v: 'Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa.', r: 'Malaquias 3:10', l: 'O dízimo entra no plano como prioridade, não como sobra.', t: ['dizimo'] },
    { v: 'Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria.', r: '2 Coríntios 9:7', l: 'Generosidade planejada é generosidade alegre. Defina o valor com antecedência.', t: ['dizimo', 'generosidade'] },
    { v: 'Ao que distribui mais se lhe acrescenta, e ao que retém mais do que é justo, é para a sua perda.', r: 'Provérbios 11:24', l: 'Mão aberta e casa organizada andam juntas.', t: ['generosidade'] },
    { v: 'Sejam vossos costumes sem avareza, contentando-vos com o que tendes.', r: 'Hebreus 13:5', l: 'Contentamento é o melhor freio de gasto. Antes de comprar, pergunte: preciso ou quero?', t: ['contentamento', 'plano'] },
    { v: 'Mas é grande ganho a piedade com contentamento.', r: '1 Timóteo 6:6', l: 'Gastar menos que ganha começa no coração, não na planilha.', t: ['contentamento'] },
    { v: 'O que amar o dinheiro nunca se fartará de dinheiro; e quem amar a abundância nunca se fartará da renda.', r: 'Eclesiastes 5:10', l: 'Ganhar mais não resolve se o gasto sobe junto. O limite do mês protege vocês.', t: ['contentamento', 'sobra'] },
    { v: 'Porque onde estiver o vosso tesouro, aí estará também o vosso coração.', r: 'Mateus 6:21', l: 'O extrato mostra o que a família ama. Faça os gastos contarem a história que vocês querem.', t: ['geral', 'objetivos'] },
    { v: 'A fazenda que procede da vaidade diminuirá, mas quem a ajunta pelo trabalho terá aumento.', r: 'Provérbios 13:11', l: 'Riqueza de verdade cresce aos poucos. Desconfie do dinheiro fácil.', t: ['patrimonio', 'talentos'] },
    { v: 'O homem de bem deixa uma herança aos filhos de seus filhos.', r: 'Provérbios 13:22', l: 'Patrimônio é pensar nos netos. Cada bem bem cuidado e cada real guardado é herança.', t: ['patrimonio'] },
    { v: 'Prepara de fora a tua obra, e aparelha-a no campo, e então edifica a tua casa.', r: 'Provérbios 24:27', l: 'Primeiro a fonte de renda e a reserva, depois o sonho grande.', t: ['patrimonio', 'objetivos', 'talentos'] },
    { v: 'Quem é fiel no mínimo também é fiel no muito.', r: 'Lucas 16:10', l: 'O cafezinho anotado de hoje é o treino para administrar muito amanhã.', t: ['ident', 'talentos', 'geral'] },
    { v: 'Além disso, requer-se nos despenseiros que cada um se ache fiel.', r: '1 Coríntios 4:2', l: 'Somos administradores, não donos. Cuidar bem é o que se espera de nós.', t: ['geral', 'patrimonio'] },
    { v: 'O que trabalha com mão enganosa empobrece, mas a mão dos diligentes enriquece.', r: 'Provérbios 10:4', l: 'Trabalho bem feito e honesto é a base de toda renda extra.', t: ['talentos'] },
    { v: 'Examina uma herdade e adquire-a; planta uma vinha com o fruto de suas mãos.', r: 'Provérbios 31:16', l: 'Avalie com calma, invista com o que já tem e faça render.', t: ['talentos', 'patrimonio'] },
    { v: 'Bem está, servo bom e fiel. Sobre o pouco foste fiel, sobre muito te colocarei.', r: 'Mateus 25:21', l: 'O talento enterrado não rende. Coloque o seu para trabalhar.', t: ['talentos'] },
    { v: 'Já aprendi a contentar-me com o que tenho.', r: 'Filipenses 4:11', l: 'Contentamento se aprende. Comemore o mês que fechou dentro do limite.', t: ['contentamento', 'sobra'] },
  ];
  const diaDoAno = () => { const d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); };
  function escolher(tema) {
    const l = tema ? P.filter((p) => p.t.includes(tema)) : P;
    const base = l.length ? l : P;
    return base[diaDoAno() % base.length];
  }
  function card(tema, opts) {
    opts = opts || {};
    const p = typeof tema === 'object' && tema ? tema : escolher(tema);
    const i = P.indexOf(p);
    return `<div class="sb-card${opts.mini ? ' sb-mini' : ''}"><div class="sb-top"><span class="sb-ic" aria-hidden="true">📖</span><span class="sb-lb">${esc(opts.titulo || 'Sabedoria para hoje')}</span>${opts.mini ? '' : `<button type="button" class="sb-sh" data-sbshare="${i}" aria-label="Compartilhar">Compartilhar</button>`}</div>
      <p class="sb-v">“${esc(p.v)}”</p><p class="sb-r">${esc(p.r)}</p><p class="sb-l"><b>Na prática:</b> ${esc(p.l)}</p></div>`;
  }
  // tela com todas as pílulas
  let sh;
  function abrirTodas() {
    if (!sh) {
      sh = document.createElement('div'); sh.className = 'vc-sheet sb-sheet';
      sh.innerHTML = '<div class="vc-scrim" data-sbfechar></div><div class="vc-panel" role="dialog" aria-modal="true" aria-label="Sabedoria financeira"><div class="vc-body"></div></div>';
      document.body.appendChild(sh);
    }
    const hoje = escolher();
    sh.querySelector('.vc-body').innerHTML = '<p class="vc-t">📖 Finanças à luz da Bíblia</p><p class="sb-intro">Pílulas de sabedoria para a família: um versículo e o que ele quer dizer no dia a dia do dinheiro.</p>'
      + card(hoje, { titulo: 'Para hoje' }) + '<h3 class="sb-h">Todas as pílulas</h3>' + P.filter((p) => p !== hoje).map((p) => card(p, { titulo: p.r.split(' ')[0] === 'Provérbios' ? 'Provérbios' : 'Palavra' })).join('')
      + '<button type="button" class="nt-btn sec" data-sbfechar>Fechar</button>';
    document.body.classList.add('sb-open'); sh.querySelector('.vc-panel').scrollTop = 0;
  }
  async function compartilhar(i, btn) {
    const p = P[i]; if (!p) return;
    const txt = `“${p.v}” (${p.r})\n\nNa prática: ${p.l}\n\nDenário · finanças à luz da Bíblia\nhttps://dabarstudio.github.io/oikos/conheca.html`;
    try {
      if (navigator.share) { await navigator.share({ text: txt }); return; }
      await navigator.clipboard.writeText(txt); btn.textContent = 'Copiado ✓'; setTimeout(() => { btn.textContent = 'Compartilhar'; }, 1800);
    } catch (e) { /* cancelado */ }
  }
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sbshare]'); if (s) return compartilhar(+s.dataset.sbshare, s);
    if (e.target.closest('[data-sbabrir]')) { document.body.classList.remove('ob-open'); return abrirTodas(); }
    if (e.target.closest('[data-sbfechar]')) document.body.classList.remove('sb-open');
  });

  // Patrimônio e Objetivos: inserem a pílula quando a tela é desenhada
  function decorar() {
    // no Início, a pílula fica em destaque logo abaixo do "quanto ainda dá"
    const hero = document.querySelector('#casa .cs-hero'), pil = document.querySelector('#casa .sb-card');
    if (hero && pil && hero.nextElementSibling !== pil) hero.after(pil);
    const topo = document.getElementById('bn-topo');
    if (topo && !topo.querySelector('.sb-card')) topo.insertAdjacentHTML('beforeend', card('patrimonio', { titulo: 'Patrimônio à luz da Palavra' }));
    const oh = document.querySelector('.og-h');
    if (oh && !oh.parentElement.querySelector(':scope > .sb-card')) oh.insertAdjacentHTML('afterend', card('objetivos', { titulo: 'Sabedoria para os sonhos', mini: true }));
    const sheet = document.querySelector('.ob-sheet');
    if (sheet && !sheet.querySelector('[data-sbabrir]') && sheet.querySelector('h3')) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.sbabrir = '1';
      b.innerHTML = '<span class="fx-ic">📖</span><span>Sabedoria financeira<small>Finanças à luz da Bíblia, uma pílula por dia</small></span>';
      sheet.insertBefore(b, sheet.querySelector('h3').nextSibling);
    }
  }
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(decorar, 80); }).observe(document.documentElement, { childList: true, subtree: true });

  window.OIKOS_SAB = { card, escolher, abrirTodas, lista: P };
})();
