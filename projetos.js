// Oikos — "Meus projetos": negócios e rendas extras da família (ex.: QuickBox). O próprio usuário cria e personaliza
// nome, logo, cor, tipo (revenda ou serviço), quem participa e a meta de lucro do mês.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const ICONES = ['🏷️', '📦', '🧁', '🎂', '🍕', '🍫', '✂️', '💅', '👗', '🧴', '🎨', '📸', '🔧', '💻', '📚', '🐶', '🌱', '🎵'];
  const CORES = ['#1a2753', '#0f5c3a', '#7a1f3d', '#5b2a86', '#8a3b12', '#1d5f8a', '#2b2f29', '#b0303a', '#a05a00', '#3d6b2f'];
  const FORMAS = [['pix', '⚡ PIX'], ['debito', '🏦 Débito'], ['credito', '💳 Crédito'], ['dinheiro', '💵 Dinheiro']];
  const DICAS = ['📸 Poste um produto nos stories hoje — com preço e “chama no direct”.', '💬 Mande mensagem para 3 clientes que já compraram: “chegou novidade!”.',
    '🏷️ Faça uma oferta relâmpago de 24h.', '🤝 Peça para um cliente feliz indicar um amigo (e dê um mimo).', '🎥 Grave um vídeo curto mostrando o produto ou o serviço.',
    '📦 Monte um combo com um precinho especial.', '⭐ Peça um depoimento de quem comprou e poste.'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const AV = () => window.OIKOS_AVATAR;

  // cor escura o bastante para texto branco por cima
  function escura(hex) {
    let [r, g, b] = [1, 3, 5].map((i) => parseInt((hex || '#1a2753').slice(i, i + 2), 16) || 0);
    const lum = () => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    let k = 0; while (lum() > 0.42 && k++ < 12) { r *= 0.88; g *= 0.88; b *= 0.88; }
    return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  let projetos = [], itens = [], pessoas = [], atual = null, root, sh, f, wz, w;
  const doProj = (p) => itens.filter((g) => (g.projeto_id ? g.projeto_id === p.id : projetos[0] && p.id === projetos[0].id));
  const achar = (id) => projetos.find((p) => String(p.id) === String(id));
  const logo = (p, s) => (p && p.logo_url ? `<img class="ng-logo" src="${esc(p.logo_url)}" alt="" style="width:${s}px;height:${s}px">`
    : `<span class="ng-logo ng-logo-e" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.52)}px;background:${escura(p && p.cor)}">${esc((p && p.icone) || '🏷️')}</span>`);

  function calc(p) {
    const l = doProj(p), m = mesDe(hoje()), serv = p.tipo === 'servico';
    const vendidos = l.filter((g) => g.venda_valor);
    const doMes = vendidos.filter((g) => mesDe(g.venda_em || g.data) === m);
    const vendido = doMes.reduce((s, g) => s + Number(g.venda_valor), 0);
    const gastos = l.filter((g) => !g.venda_valor);
    const gastosMes = gastos.filter((g) => mesDe(g.data) === m).reduce((s, g) => s + Number(g.valor || 0), 0);
    const lucroDe = (k) => serv
      ? vendidos.filter((g) => mesDe(g.venda_em || g.data) === k).reduce((s, g) => s + Number(g.venda_valor), 0) - l.filter((g) => mesDe(g.data) === k).reduce((s, g) => s + Number(g.valor || 0), 0)
      : vendidos.filter((g) => mesDe(g.venda_em || g.data) === k).reduce((s, g) => s + Number(g.venda_valor) - Number(g.valor || 0), 0);
    const lucro = lucroDe(m);
    const receber = vendidos.filter((g) => !g.venda_recebido);
    const ult = vendidos.map((g) => g.venda_em || g.data).sort().pop();
    const diasSem = ult ? Math.round((new Date(hoje() + 'T12:00') - new Date(ult + 'T12:00')) / 864e5) : null;
    const lucMedio = vendidos.length ? vendidos.reduce((s, g) => s + Number(g.venda_valor) - (serv ? 0 : Number(g.valor || 0)), 0) / vendidos.length : 0;
    const meses = []; const d = new Date();
    for (let i = 5; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); const k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); meses.push({ rot: MESES[x.getMonth()], v: lucroDe(k) }); }
    return { m, doMes, vendido, lucro, receber, estoque: serv ? [] : gastos, gastos, gastosMes, diasSem, lucMedio, meses, meta: Number(p.meta || 0), serv, l };
  }
  const mesNome = () => MESES_L[new Date().getMonth()];

  // ---------- faixas no Início ----------
  function desenharBanner() {
    const casa = document.getElementById('casa'); if (!casa) return;
    let box = casa.querySelector('.ng-banners');
    if (!projetos.length) { if (box) box.remove(); return; }
    if (!box) { const anc = casa.querySelector('.cs-hero'); if (!anc) return; box = document.createElement('div'); box.className = 'ng-banners'; anc.after(box); }
    box.innerHTML = projetos.slice(0, 4).map((p) => {
      const c = calc(p); const pc = c.meta ? Math.min(100, Math.max(0, c.lucro / c.meta * 100)) : 0; const rec = c.receber.reduce((s, g) => s + Number(g.venda_valor), 0);
      return `<button type="button" class="ng-banner" data-ngabre="${p.id}" style="--ng-navy:${escura(p.cor)}">${logo(p, 46)}<span class="ng-bt"><b>${esc(p.nome)}</b><small>Lucro em ${mesNome()}: <strong>${BRL.format(c.lucro)}</strong>${c.meta ? ' · ' + Math.round(pc) + '% da meta' : ''}</small>
        ${c.meta ? `<span class="ng-mbar"><i style="width:${Math.max(3, pc)}%"></i></span>` : ''}${rec ? `<small class="ng-alert">💰 ${BRL.format(rec)} para receber</small>` : ''}</span><span class="ng-go">›</span></button>`;
    }).join('');
  }

  // ---------- telas ----------
  function render() {
    if (!root) return;
    const p = atual ? achar(atual) : projetos.length === 1 ? projetos[0] : null;
    root.style.removeProperty('--ng-navy');
    if (!p) return renderLista();
    root.style.setProperty('--ng-navy', escura(p.cor));
    const c = calc(p); const pc = c.meta ? Math.min(100, c.lucro / c.meta * 100) : 0; const falta = Math.max(0, c.meta - c.lucro);
    const nVendas = c.lucMedio > 0 ? Math.ceil(falta / c.lucMedio) : 0;
    const max = Math.max(1, ...c.meses.map((x) => x.v));
    const donos = (p.donos || []).map((k) => pessoas.find((x) => x.chave === k)).filter(Boolean);
    const linha = (g, acao) => `<div class="ng-it"><div class="ng-il"><b>${esc(g.descricao || 'Item')}</b><small>${g.venda_para ? esc(g.venda_para) + ' · ' : ''}${g.venda_valor ? (c.serv ? '' : 'custou ' + BRL.format(Number(g.valor || 0)) + ' · ') + 'vendeu ' + BRL.format(Number(g.venda_valor)) + (c.serv ? '' : ' · <b class="pos">lucro ' + BRL.format(Number(g.venda_valor) - Number(g.valor || 0)) + '</b>') : (c.serv ? 'gastou ' : 'custou ') + BRL.format(Number(g.valor || 0)) + ' · ' + g.data.split('-').reverse().slice(0, 2).join('/')}</small></div>${acao}</div>`;
    root.innerHTML = `
      ${projetos.length > 1 ? '<button type="button" class="ng-voltar" data-nglista>‹ Meus projetos</button>' : ''}
      <div class="ng-hero">
        <div class="ng-top">${logo(p, 64)}<div class="ng-tt"><h2>${esc(p.nome)}</h2><small>${c.serv ? '🛠️ Serviço' : '📦 Revenda'}${donos.length ? ' · ' + donos.map((x) => esc(x.nome)).join(' e ') : ''}</small></div>
          <button type="button" class="ng-cfg" data-ngedit="${p.id}" aria-label="Editar projeto">⚙️</button></div>
        <small class="ng-lbl">Lucro de ${mesNome()}</small>
        <div class="ng-big">${BRL.format(c.lucro)}<small>${c.meta ? ' de ' + BRL0.format(c.meta) : ''}</small></div>
        ${c.meta ? `<div class="ng-bar"><i style="width:${Math.max(3, pc)}%"></i></div>
          <p class="ng-msg">${pc >= 100 ? '🏆 Meta batida! Que tal subir a meta do próximo mês?' : `Faltam <b>${BRL.format(falta)}</b>${nVendas ? ` — umas <b>${nVendas} venda${nVendas > 1 ? 's' : ''}</b> como as que vocês já fizeram` : ''}. Bora! 💪`}</p>`
        : `<p class="ng-msg">Defina uma meta de lucro para o mês e acompanhe aqui. 🎯</p><button type="button" class="ng-meta" data-ngedit="${p.id}" data-passo="4">🎯 Definir meta</button>`}
      </div>
      <div class="ng-acts"><button type="button" class="ng-a1" data-ngvenda>💰 Registrar venda</button><button type="button" class="ng-a2" data-nggasto>${c.serv ? '🧾 Gastei no projeto' : '🛒 Comprei para revender'}</button></div>
      <div class="ng-kpis">
        <span><small>Vendido no mês</small><b>${BRL.format(c.vendido)}</b></span>
        <span><small>Vendas no mês</small><b>${c.doMes.length}</b></span>
        <span class="${c.receber.length ? 'warn' : ''}"><small>Para receber</small><b>${BRL.format(c.receber.reduce((s, g) => s + Number(g.venda_valor), 0))}</b></span>
        <span><small>${c.serv ? 'Gastos no mês' : 'Em estoque'}</small><b>${BRL.format(c.serv ? c.gastosMes : c.estoque.reduce((s, g) => s + Number(g.valor || 0), 0))}</b></span>
      </div>
      <div class="ng-card ng-nudge">${c.diasSem == null ? '<b>🚀 Registre a primeira venda!</b>' : c.diasSem === 0 ? '<b>🔥 Teve venda hoje! Continue assim.</b>' : `<b>${c.diasSem >= 7 ? '⏰' : '📅'} Última venda há ${c.diasSem} dia${c.diasSem > 1 ? 's' : ''}</b>`}<p>${DICAS[new Date().getDate() % DICAS.length]}</p></div>
      ${c.receber.length ? `<div class="ng-card"><h3>💰 Para receber</h3>${c.receber.map((g) => linha(g, `<button type="button" class="ng-b" data-ngrec="${g.id}">Recebi</button>`)).join('')}</div>` : ''}
      ${!c.serv && c.estoque.length ? `<div class="ng-card"><h3>📦 Para vender</h3>${c.estoque.map((g) => linha(g, `<button type="button" class="ng-b" data-ngvendi="${g.id}">Vendi</button>`)).join('')}</div>` : ''}
      ${c.serv && c.gastos.length ? `<div class="ng-card"><h3>🧾 Gastos do projeto</h3>${c.gastos.slice(0, 10).map((g) => linha(g, '')).join('')}</div>` : ''}
      <div class="ng-card"><h3>📈 Lucro por mês</h3><div class="ng-chart">${c.meses.map((x) => `<div class="ng-col"><small>${x.v ? BRL0.format(x.v) : ''}</small><i style="height:${Math.max(2, Math.max(0, x.v) / max * 100)}%"></i><span>${x.rot}</span></div>`).join('')}</div></div>
      ${c.l.some((g) => g.venda_valor && g.venda_recebido) ? `<div class="ng-card"><h3>✅ Vendas recebidas</h3>${c.l.filter((g) => g.venda_valor && g.venda_recebido).slice(0, 10).map((g) => linha(g, '')).join('')}</div>` : ''}`;
  }
  function renderLista() {
    root.innerHTML = `<h2 class="ng-lt">Meus projetos</h2><p class="ng-ls">Negócios e rendas extras da família. Toque para abrir.</p>
      ${projetos.map((p) => { const c = calc(p); const pc = c.meta ? Math.min(100, Math.max(0, c.lucro / c.meta * 100)) : 0;
        return `<button type="button" class="ng-banner" data-ngabre="${p.id}" style="--ng-navy:${escura(p.cor)}">${logo(p, 52)}<span class="ng-bt"><b>${esc(p.nome)}</b><small>Lucro em ${mesNome()}: <strong>${BRL.format(c.lucro)}</strong></small>${c.meta ? `<span class="ng-mbar"><i style="width:${Math.max(3, pc)}%"></i></span>` : ''}</span><span class="ng-go">›</span></button>`; }).join('')}
      <button type="button" class="ng-novo" data-ngcriar>＋ Criar projeto</button>`;
  }

  // ---------- folhas: venda / gasto ----------
  const abrirSh = (html) => { sh.querySelector('.vc-body').innerHTML = html; document.body.classList.add('ngs-open'); };
  const fechar = () => document.body.classList.remove('ngs-open');
  const projAtual = () => (atual ? achar(atual) : projetos[0]);
  function formVenda() {
    const g = f.item; const p = projAtual(); const serv = p && p.tipo === 'servico';
    abrirSh(`<p class="vc-t">💰 ${g ? 'Vendi: ' + esc(g.descricao || 'produto') : 'Registrar venda'}</p>
      ${g ? `<p class="vc-s">Custou ${BRL.format(Number(g.valor || 0))}.</p>` : `<label class="vc-l">${serv ? 'O que fez/vendeu?' : 'O que vendeu?'}<input id="ng-desc" class="sv-in" value="${esc(f.desc)}" placeholder="${serv ? 'Ex.: bolo de aniversário' : 'Ex.: bastão de selfie'}" maxlength="80"></label>
      ${serv ? '' : `<label class="vc-l">Quanto você pagou nele?<input id="ng-custo" class="sv-in" inputmode="decimal" value="${esc(f.custo)}" placeholder="0,00"></label>`}`}
      <label class="vc-l">Por quanto vendeu?<input id="ng-venda" class="sv-in" inputmode="decimal" value="${esc(f.venda)}" placeholder="0,00"></label>
      <label class="vc-l">Para quem? <small>(opcional)</small><input id="ng-para" class="sv-in" value="${esc(f.para)}" placeholder="Ex.: Carlos Henrique" maxlength="50"></label>
      <p class="vc-l">Já recebeu?</p><div class="vc-ops"><button type="button" data-ngr="0" class="${!f.rec ? 'on' : ''}">Ainda não</button><button type="button" data-ngr="1" class="${f.rec ? 'on' : ''}">Sim, recebi</button></div>
      <p class="vc-erro" id="ng-erro"></p><button type="button" class="nt-btn" data-ngsalvar>Salvar venda</button><button type="button" class="nt-btn sec" data-ngfechar>Cancelar</button>`);
  }
  function formGasto() {
    const p = projAtual(); const serv = p && p.tipo === 'servico';
    abrirSh(`<p class="vc-t">${serv ? '🧾 Gastei no projeto' : '🛒 Comprei para revender'}</p><p class="vc-s">Não entra nos envelopes da casa.</p>
      <label class="vc-l">${serv ? 'Com o quê?' : 'O que comprou?'}<input id="ng-gdesc" class="sv-in" value="${esc(f.desc)}" placeholder="${serv ? 'Ex.: ingredientes, embalagens' : 'Ex.: fone bluetooth'}" maxlength="80"></label>
      <label class="vc-l">Quanto custou?<input id="ng-gval" class="sv-in" inputmode="decimal" value="${esc(f.valor)}" placeholder="0,00"></label>
      <p class="vc-l">Como pagou?</p><div class="vc-ops">${FORMAS.map(([k, n]) => `<button type="button" data-ngforma="${k}" class="${f.forma === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${f.forma !== 'dinheiro' ? '<p class="vc-l">De qual conta saiu?</p><div id="ng-bk"></div>' : ''}
      <p class="vc-erro" id="ng-erro"></p><button type="button" class="nt-btn" data-nggsalvar>Salvar</button><button type="button" class="nt-btn sec" data-ngfechar>Cancelar</button>`);
    const bk = document.getElementById('ng-bk'); if (bk && window.OIKOS_BANCOS) window.OIKOS_BANCOS.montar(bk, f.conta, (v) => { f.conta = v; });
  }
  function lerVenda() { const g = (id) => document.getElementById(id); if (g('ng-desc')) f.desc = g('ng-desc').value; if (g('ng-custo')) f.custo = g('ng-custo').value; if (g('ng-venda')) f.venda = g('ng-venda').value; if (g('ng-para')) f.para = g('ng-para').value; if (g('ng-gdesc')) f.desc = g('ng-gdesc').value; if (g('ng-gval')) f.valor = g('ng-gval').value; }

  // ---------- assistente: criar / editar projeto ----------
  function wzTela(html) { wz.querySelector('.ob1-in').innerHTML = html; wz.scrollTop = 0; }
  const dots = (n) => `<div class="ob1-dots">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  const topo = (n, volta) => `<button type="button" class="ob1-back" data-wzvolta="${volta}">‹ ${volta === 'sair' ? 'Cancelar' : 'Voltar'}</button>${dots(n)}`;
  const preview = () => `<div class="pj-prev"><div class="ng-banner" style="--ng-navy:${escura(w.cor)}">${logo(w, 46)}<span class="ng-bt"><b>${esc(w.nome || 'Meu projeto')}</b><small>Lucro em ${mesNome()}: <strong>R$ 0,00</strong></small></span><span class="ng-go">›</span></div></div>`;
  function wzPasso() {
    if (w.passo === 1) {
      wzTela(`${topo(1, 'sair')}<h2>${w.id ? 'Editar projeto' : 'Como se chama o projeto?'}</h2><p class="ob1-s">Pode ser uma loja, um serviço ou uma renda extra. Ex.: QuickBox, Bolos da Ana, Aulas de violão.</p>
        <input id="wz-nome" class="sv-in pj-in" value="${esc(w.nome)}" placeholder="Nome do projeto" maxlength="40" autocomplete="off">
        <p class="ob1-erro" id="wz-erro"></p><button type="button" class="ob1-go" data-wzok="1">Continuar</button>
        ${w.id ? '<button type="button" class="ob1-link" data-wzarq>Arquivar este projeto</button>' : ''}`);
      setTimeout(() => { const i = document.getElementById('wz-nome'); if (i && !w.id) i.focus(); }, 200);
    } else if (w.passo === 2) {
      wzTela(`${topo(2, 1)}<h2>Tem uma logo?</h2><p class="ob1-s">Escolha a foto da logo (o app deixa redondinha). Não tem? Escolha um ícone.</p>
        ${preview()}
        <button type="button" class="ob1-big pj-foto" data-wzfoto><span>🖼️</span><b>${w.logo_url ? 'Trocar a logo' : 'Escolher a logo'}</b><small>Da galeria ou tire uma foto</small></button>
        ${w.logo_url ? '<button type="button" class="ob1-link" data-wzsemlogo>Tirar a logo e usar ícone</button>' : ''}
        <p class="og-f" style="margin-top:16px">Ou use um ícone</p><div class="pj-icones">${ICONES.map((i) => `<button type="button" data-wzicone="${i}" class="${!w.logo_url && w.icone === i ? 'on' : ''}">${i}</button>`).join('')}</div>
        <button type="button" class="ob1-go" data-wzok="2">Continuar</button>`);
    } else if (w.passo === 3) {
      wzTela(`${topo(3, 2)}<h2>Escolha a cor</h2><p class="ob1-s">${w.corLogo ? 'Já separei a cor da sua logo. Pode trocar se quiser.' : 'É a cor da faixa e da tela do projeto.'}</p>
        ${preview()}
        <div class="pj-cores">${[...(w.corLogo ? [w.corLogo] : []), ...CORES.filter((c) => c !== w.corLogo)].map((c, i) => `<button type="button" data-wzcor="${c}" class="${w.cor === c ? 'on' : ''}" style="background:${escura(c)}" aria-label="cor">${w.corLogo && i === 0 ? '<small>da logo</small>' : ''}</button>`).join('')}</div>
        <button type="button" class="ob1-go" data-wzok="3">Continuar</button>`);
    } else {
      const adultos = pessoas.filter((p) => !(p.avatar && p.avatar.crianca));
      wzTela(`${topo(4, 3)}<h2>Como funciona?</h2>
        <div class="pj-tipos"><button type="button" data-wztipo="revenda" class="${w.tipo === 'revenda' ? 'on' : ''}"><span>📦</span><b>Revenda</b><small>Compro produtos e revendo (tem estoque)</small></button>
        <button type="button" data-wztipo="servico" class="${w.tipo === 'servico' ? 'on' : ''}"><span>🛠️</span><b>Serviço ou encomenda</b><small>Faço e vendo: bolo, aula, conserto, arte…</small></button></div>
        ${adultos.length ? `<p class="og-f">Quem toca o projeto?</p><div class="bk-donos">${adultos.map((p) => `<button type="button" data-wzdono="${esc(p.chave)}" class="${(w.donos || []).includes(p.chave) ? 'on' : ''}">${AV() ? AV().svg(p.avatar, 28) : ''}<span>${esc(p.nome)}</span></button>`).join('')}</div>` : ''}
        <p class="og-f" style="margin-top:14px">Meta de lucro por mês</p>
        <div class="ag-money ob1-money"><span>R$</span><input id="wz-meta" inputmode="numeric" placeholder="500" value="${w.meta || ''}" autocomplete="off"></div>
        <div class="ob1-sug">${[300, 500, 1000, 2000].map((v) => `<button type="button" data-wzsug="${v}">${BRL0.format(v)}</button>`).join('')}</div>
        <p class="ob1-erro" id="wz-erro"></p><button type="button" class="ob1-go" data-wzsalvar>${w.id ? 'Salvar mudanças' : 'Criar projeto 🚀'}</button>`);
    }
  }
  function abrirWz(p, passo) {
    w = p ? { ...p, donos: [...(p.donos || [])], passo: passo || 1 } : { nome: '', tipo: 'revenda', icone: '🏷️', cor: CORES[0], logo_url: null, meta: '', donos: pessoas.filter((x) => !(x.avatar && x.avatar.crianca)).slice(0, 1).map((x) => x.chave), passo: 1 };
    document.body.classList.add('pjwz-on'); wzPasso();
  }
  const fecharWz = () => document.body.classList.remove('pjwz-on');
  function lerWz() { const n = document.getElementById('wz-nome'); if (n) w.nome = n.value.trim(); const m = document.getElementById('wz-meta'); if (m) w.meta = num(m.value) || ''; }

  // logo: recorta quadrado 256px e descobre a cor principal
  function processarLogo(file) {
    return new Promise((ok, err) => {
      const u = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        const s = Math.min(im.width, im.height); const c = document.createElement('canvas'); c.width = c.height = 256;
        const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
        x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256);
        const d = x.getImageData(0, 0, 256, 256).data; const bins = {};
        for (let i = 0; i < d.length; i += 16) {
          const r = d[i], g = d[i + 1], b = d[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 40 || mx < 40 || mn > 215) continue; // ignora branco, preto e cinza
          const k = [r >> 5, g >> 5, b >> 5].join(','); (bins[k] = bins[k] || [0, 0, 0, 0]); bins[k][0] += r; bins[k][1] += g; bins[k][2] += b; bins[k][3]++;
        }
        const top = Object.values(bins).sort((a, b) => b[3] - a[3])[0];
        const cor = top ? '#' + [0, 1, 2].map((j) => Math.round(top[j] / top[3]).toString(16).padStart(2, '0')).join('') : null;
        c.toBlob((blob) => ok({ blob, cor }), 'image/jpeg', 0.9); URL.revokeObjectURL(u);
      };
      im.onerror = err; im.src = u;
    });
  }

  async function recarregar() {
    try { projetos = await window.APP.projetos.listar(); } catch (e) { console.error(e); projetos = []; }
    try { itens = await window.APP.gastos.revendas(); } catch (e) { console.error(e); }
    try { pessoas = await window.APP.pessoas.listar(); } catch (e) { pessoas = []; }
    if (atual && !achar(atual)) atual = null;
    document.body.classList.toggle('tem-negocio', projetos.length > 0); montarNav(); desenharBanner(); render(); sync();
  }
  const sync = () => document.dispatchEvent(new Event('oikos:tab'));
  const atualizarTudo = () => document.dispatchEvent(new Event('oikos:recarregar-gastos'));

  async function onClick(e) {
    const b = e.target.closest('button'); if (!b) { if (e.target.classList.contains('vc-scrim')) fechar(); return; }
    if (b.dataset.ngabre) { atual = b.dataset.ngabre; return window.OIKOS_IR ? window.OIKOS_IR('negocio') : show(); }
    if (b.hasAttribute('data-nglista')) { atual = null; render(); scrollTo(0, 0); return; }
    if (b.hasAttribute('data-ngcriar')) return abrirWz(null);
    if (b.dataset.ngedit) return abrirWz(achar(b.dataset.ngedit), +(b.dataset.passo || 1));
    if (b.hasAttribute('data-ngfechar')) return fechar();
    if (b.hasAttribute('data-ngvenda')) { f = { item: null, desc: '', custo: '', venda: '', para: '', rec: false }; return formVenda(); }
    if (b.hasAttribute('data-nggasto')) { f = { desc: '', valor: '', forma: 'pix', conta: null }; return formGasto(); }
    if (b.dataset.ngforma) { lerVenda(); f.forma = b.dataset.ngforma; return formGasto(); }
    if (b.dataset.ngvendi) { f = { item: itens.find((x) => String(x.id) === b.dataset.ngvendi), venda: '', para: '', rec: false }; return formVenda(); }
    if (b.dataset.ngr) { lerVenda(); f.rec = b.dataset.ngr === '1'; return formVenda(); }
    if (b.dataset.ngrec) { b.disabled = true; b.textContent = '…'; try { await window.APP.gastos.atualizar(b.dataset.ngrec, { venda_recebido: true }); } catch (err) { console.error(err); } return atualizarTudo(); }
    const p = projAtual();
    if (b.hasAttribute('data-nggsalvar')) {
      lerVenda(); const er = document.getElementById('ng-erro'); const v = num(f.valor);
      if (!String(f.desc).trim()) { er.textContent = 'Escreva o que foi.'; return; }
      if (!v) { er.textContent = 'Escreva quanto custou.'; return; }
      if (f.forma !== 'dinheiro' && !f.conta) { er.textContent = 'Toque na conta que pagou.'; return; }
      b.disabled = true; b.textContent = 'Salvando…';
      try { await window.APP.gastos.salvar({ data: hoje(), valor: v, envelope: 'revenda', descricao: f.desc.trim(), forma: f.forma, conta: f.forma === 'dinheiro' ? null : f.conta, reembolsar: false, projeto_id: p ? p.id : null }); fechar(); atualizarTudo(); }
      catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; }
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
        else await window.APP.gastos.salvar({ data: hoje(), valor: num(f.custo), envelope: 'revenda', descricao: f.desc.trim(), forma: 'pix', reembolsar: false, projeto_id: p ? p.id : null, ...campos });
        const luc = venda - (f.item ? Number(f.item.valor || 0) : num(f.custo));
        abrirSh(`<div class="nt-big">🎉</div><p class="nt-t">Venda registrada!</p><p class="nt-s">${p && p.tipo === 'servico' ? 'Entrou ' + BRL.format(venda) : 'Lucro de <b>' + BRL.format(luc) + '</b>'}${f.rec ? '' : ' — avise quando receber'}.</p><button type="button" class="nt-btn" data-ngfechar>Pronto</button>`);
        atualizarTudo();
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; }
    }
  }

  async function onWz(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.wzvolta) { lerWz(); if (b.dataset.wzvolta === 'sair') return fecharWz(); w.passo = +b.dataset.wzvolta; return wzPasso(); }
    if (b.dataset.wzok === '1') { lerWz(); if (!w.nome) { document.getElementById('wz-erro').textContent = 'Escreva o nome do projeto.'; return; } w.passo = 2; return wzPasso(); }
    if (b.dataset.wzok === '2') { w.passo = 3; return wzPasso(); }
    if (b.dataset.wzok === '3') { w.passo = 4; return wzPasso(); }
    if (b.hasAttribute('data-wzfoto')) return wzInput.click();
    if (b.hasAttribute('data-wzsemlogo')) { w.logo_url = null; w.corLogo = null; return wzPasso(); }
    if (b.dataset.wzicone) { w.icone = b.dataset.wzicone; w.logo_url = null; return wzPasso(); }
    if (b.dataset.wzcor) { w.cor = b.dataset.wzcor; return wzPasso(); }
    if (b.dataset.wztipo) { lerWz(); w.tipo = b.dataset.wztipo; return wzPasso(); }
    if (b.dataset.wzdono) { lerWz(); const k = b.dataset.wzdono; w.donos = w.donos.includes(k) ? w.donos.filter((x) => x !== k) : [...w.donos, k]; return wzPasso(); }
    if (b.dataset.wzsug) { document.getElementById('wz-meta').value = b.dataset.wzsug; return; }
    if (b.hasAttribute('data-wzarq')) {
      if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'Toque de novo para arquivar (as vendas ficam guardadas)'; return; }
      try { await window.APP.projetos.salvar({ ...w, ativo: false }); } catch (err) { console.error(err); }
      atual = null; fecharWz(); return recarregar();
    }
    if (b.hasAttribute('data-wzsalvar')) {
      lerWz(); b.disabled = true; b.textContent = 'Salvando…';
      try {
        const salvo = await window.APP.projetos.salvar({ id: w.id, nome: w.nome, tipo: w.tipo, logo_url: w.logo_url, icone: w.icone, cor: w.cor, meta: w.meta || null, donos: w.donos });
        atual = salvo && salvo.id; fecharWz(); await recarregar();
        if (window.OIKOS_IR) window.OIKOS_IR('negocio'); else show();
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; const er = document.getElementById('wz-erro'); if (er) er.textContent = 'Confira a internet e tente de novo.'; }
    }
  }
  let wzInput;

  // ---------- navegação ----------
  function montarNav() {
    const nav = document.querySelector('.ob-nav');
    if (nav) {
      let b = nav.querySelector('[data-ng]');
      if (!projetos.length) { if (b) b.remove(); }
      else {
        if (!b) {
          b = document.createElement('button'); b.type = 'button'; b.dataset.ng = '1'; b.dataset.go = 'negocio'; b.className = 'ng-navb';
          nav.insertBefore(b, nav.querySelector('[data-go="lanc"]'));
          b.addEventListener('click', () => { if (projetos.length > 1) atual = null; return window.OIKOS_IR ? window.OIKOS_IR('negocio') : show(); });
        }
        const um = projetos.length === 1;
        b.innerHTML = um ? `${logo(projetos[0], 40)}<span>${esc(projetos[0].nome.split(' ')[0])}</span>` : `<span class="ng-pilha">${projetos.slice(0, 2).map((p) => logo(p, 34)).join('')}</span><span>Projetos</span>`;
      }
    }
    const sheet = document.querySelector('.ob-sheet');
    if (sheet && !sheet.querySelector('[data-ngmerc]')) {
      const m = document.createElement('button'); m.type = 'button'; m.dataset.ngmerc = '1'; m.className = 'ng-merc';
      m.innerHTML = '<span class="fx-ic">🛒</span><span>Mercado<small>Notinhas e preços dos produtos</small></span>';
      m.addEventListener('click', () => { document.body.classList.remove('ob-open'); window.OIKOS_IR && window.OIKOS_IR('mercado'); });
      const c = document.createElement('button'); c.type = 'button'; c.dataset.ngcriarmais = '1';
      c.innerHTML = '<span class="fx-ic">🚀</span><span>Criar projeto<small>Negócio ou renda extra, com sua logo e meta</small></span>';
      c.addEventListener('click', () => { document.body.classList.remove('ob-open'); abrirWz(null); });
      sheet.insertBefore(m, sheet.querySelector('h3').nextSibling); sheet.insertBefore(c, sheet.querySelector('.ob-sair'));
    }
    const tabs = document.querySelector('.fv-tabs');
    if (tabs) {
      let t = document.getElementById('tab-negocio');
      if (projetos.length && !t) { t = document.createElement('button'); t.className = 'fv-tab'; t.type = 'button'; t.id = 'tab-negocio'; t.addEventListener('click', show); tabs.appendChild(t); document.querySelectorAll('.fv-tab[data-tab]').forEach((x) => x.addEventListener('click', hide)); }
      if (t) { t.hidden = !projetos.length; t.textContent = projetos.length === 1 ? '🏷️ ' + projetos[0].nome : '🚀 Projetos'; }
    }
  }
  function show() {
    document.body.classList.remove('cs-on', 'og-on'); document.body.classList.add('ng-on');
    const t = document.getElementById('tab-negocio'); document.querySelectorAll('.fv-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    render(); scrollTo(0, 0); sync();
  }
  function hide() { if (document.body.classList.contains('ng-on')) { document.body.classList.remove('ng-on'); sync(); } }
  const nome = () => { const p = atual ? achar(atual) : projetos.length === 1 ? projetos[0] : null; return p ? p.nome : 'Meus projetos'; };

  function montar() {
    const dr = document.getElementById('dash-root'); if (!dr || !window.APP || !window.APP.projetos) return;
    root = document.createElement('section'); root.className = 'ng'; root.id = 'negocio-pg'; root.setAttribute('aria-label', 'Meus projetos'); dr.prepend(root);
    sh = document.createElement('div'); sh.className = 'vc-sheet ng-sheet'; sh.innerHTML = '<div class="vc-scrim"></div><div class="vc-panel"><div class="vc-body"></div></div>'; document.body.append(sh);
    wz = document.createElement('div'); wz.className = 'ob1 pj-wz'; wz.setAttribute('role', 'dialog'); wz.setAttribute('aria-label', 'Projeto'); wz.innerHTML = '<div class="ob1-in"></div>'; document.body.append(wz);
    wzInput = document.createElement('input'); wzInput.type = 'file'; wzInput.accept = 'image/*'; wzInput.hidden = true; document.body.append(wzInput);
    wzInput.addEventListener('change', async () => {
      const file = wzInput.files && wzInput.files[0]; wzInput.value = ''; if (!file) return;
      wzTela('<div class="ob1-logo">⏳</div><h2 style="text-align:center">Preparando a logo…</h2>');
      try { const { blob, cor } = await processarLogo(file); w.logo_url = await window.APP.projetos.subirLogo(blob); if (cor) { w.corLogo = cor; w.cor = cor; } }
      catch (err) { console.error(err); }
      w.passo = 2; wzPasso();
    });
    root.addEventListener('click', onClick); sh.addEventListener('click', onClick); wz.addEventListener('click', onWz);
    wz.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); const g = wz.querySelector('.ob1-go'); if (g) g.click(); } });
    document.addEventListener('click', (e) => { const b = e.target.closest('.ng-banners [data-ngabre]'); if (b) onClick(e); });
    window.OIKOS_NEG = { show, hide, nome };
    window.OIKOS_PROJ = { lista: () => projetos, logo, criar: () => abrirWz(null) };
    document.addEventListener('oikos:gastos', recarregar);
    new MutationObserver(() => { const c = document.getElementById('casa'); if (c && projetos.length && !c.querySelector('.ng-banners')) desenharBanner(); })
      .observe(dr, { childList: true, subtree: true });
    if (window.dash) { let ok = false; dash.onData(() => { if (!ok && dash.data('mensal').status === 'ok') { ok = true; recarregar(); } }); }
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 90));
})();
