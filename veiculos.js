// Denário — "Carros": abastecimentos (km/L), serviços com lembrete, despesas e lista de compras de cada veículo.
// Cada gasto pode entrar na hora no orçamento (envelope Carro), sem digitar duas vezes.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const nf = (v, d) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const brl = (v) => (v == null || !isFinite(v) ? '—' : BRL.format(v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { if (v == null || String(v).trim() === '') return null; let s = String(v).replace(/[^\d.,-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = parseFloat(s); return isFinite(n) ? n : null; };
  const kmv = (v) => { const s = String(v == null ? '' : v).replace(/\D/g, ''); return s ? parseInt(s, 10) : null; };
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const br = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const dias = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(hoje() + 'T12:00:00')) / 864e5);
  const opts = (arr, sel) => arr.map((o) => `<option${o === sel ? ' selected' : ''}>${esc(o)}</option>`).join('');

  const COMB = ['Gasolina comum', 'Gasolina aditivada', 'Gasolina premium', 'Etanol', 'Diesel S10', 'Diesel S500', 'GNV'];
  const SERV = ['Troca de óleo', 'Filtro de óleo', 'Filtro de ar', 'Filtro de combustível', 'Filtro de cabine', 'Velas e cabos', 'Correia dentada', 'Correia do alternador', 'Pastilhas de freio', 'Discos de freio', 'Fluido de freio', 'Sistema de arrefecimento', 'Bateria', 'Pneus', 'Alinhamento e balanceamento', 'Calibragem', 'Suspensão', 'Embreagem', 'Elétrica', 'Ar-condicionado', 'Revisão geral', 'Funilaria e pintura', 'Lavagem', 'Outro'];
  const DESP = ['IPVA', 'Licenciamento', 'Seguro', 'Multa', 'Financiamento', 'Estacionamento', 'Pedágio', 'Lavagem', 'Acessórios', 'Documentação', 'Outro'];
  const FORMAS = [['pix', '⚡', 'PIX'], ['credito', '💳', 'Crédito'], ['debito', '🏦', 'Débito'], ['dinheiro', '💵', 'Dinheiro']];
  const EMOJIS = ['🚗', '🚙', '🛻', '🏍️', '🚐', '🚚', '🚜'];
  const TIPO = { abast: ['⛽', 'Abastecimento'], servico: ['🔧', 'Serviço'], despesa: ['🧾', 'Despesa'] };

  let root, sh, carros = [], regs = [], atual = null, aba = 'hist', filtro = 'tudo', f = null, carregando = false;
  const carro = () => carros.find((c) => c.id === atual) || carros[0];
  const D = (r) => r.dados || {};

  // ---------- cálculos ----------
  function odometro() { const ks = regs.filter((r) => r.km != null && r.tipo !== 'compra').map((r) => r.km); return ks.length ? { max: Math.max(...ks), min: Math.min(...ks) } : null; }
  function consumo() {
    // método do tanque cheio: km entre dois tanques cheios ÷ litros colocados depois do primeiro
    const a = regs.filter((r) => r.tipo === 'abast' && r.km != null).sort((x, y) => x.km - y.km || String(x.data).localeCompare(y.data));
    const res = {}; let prev = null, lit = 0;
    for (const r of a) {
      const d = D(r); if (d.esqueci) { prev = null; lit = 0; }
      lit += Number(d.litros) || 0;
      if (d.cheio !== false) { if (prev != null && lit > 0 && r.km > prev) res[r.id] = { kml: (r.km - prev) / lit, km: r.km - prev, lit }; prev = r.km; lit = 0; }
    }
    return res;
  }
  function lembretes() {
    const od = odometro(), km = od ? od.max : null, por = {};
    regs.filter((r) => r.tipo === 'servico' && (D(r).proxKm != null || D(r).proxData)).forEach((r) => { const k = D(r).servico === 'Outro' ? r.id : D(r).servico; if (!por[k] || r.data > por[k].data) por[k] = r; });
    const out = Object.values(por).map((r) => {
      const d = D(r); let st = 'ok'; const tx = [];
      if (d.proxKm != null) { if (km != null) { const fa = d.proxKm - km; tx.push(fa >= 0 ? 'faltam ' + nf(fa, 0) + ' km' : 'passou ' + nf(-fa, 0) + ' km'); if (fa < 0) st = 'venc'; else if (fa <= 1000) st = 'breve'; } else tx.push('aos ' + nf(d.proxKm, 0) + ' km'); }
      if (d.proxData) { const dd = dias(d.proxData); tx.push(dd >= 0 ? (dd === 0 ? 'vence hoje' : 'em ' + dd + ' dia' + (dd > 1 ? 's' : '')) + ' (' + br(d.proxData).slice(0, 5) + ')' : 'venceu em ' + br(d.proxData)); if (dd < 0) st = 'venc'; else if (dd <= 30 && st !== 'venc') st = 'breve'; }
      return { r, st, tx: tx.join(' · ') };
    });
    const o = { venc: 0, breve: 1, ok: 2 }; return out.sort((a, b) => o[a.st] - o[b.st]);
  }
  function resumo() {
    const c = consumo(), ks = Object.values(c), od = odometro();
    const kmT = ks.reduce((s, x) => s + x.km, 0), ltT = ks.reduce((s, x) => s + x.lit, 0);
    const ab = regs.filter((r) => r.tipo === 'abast').sort((a, b) => (b.km || 0) - (a.km || 0) || String(b.data).localeCompare(a.data));
    const ultKml = ab.find((r) => c[r.id]);
    const soma = (t) => regs.filter((r) => r.tipo === t).reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const g = { abast: soma('abast'), servico: soma('servico'), despesa: soma('despesa') }; g.tot = g.abast + g.servico + g.despesa;
    return { c, od, media: ltT ? kmT / ltT : null, ult: ultKml ? c[ultKml.id].kml : null, ultPreco: ab[0] && D(ab[0]).preco, g, rodado: od ? od.max - od.min : 0 };
  }

  // ---------- tela ----------
  function render() {
    if (!root) return;
    if (carregando && !carros.length) { root.innerHTML = '<h1 class="vh-h">Carros</h1><div class="vh-card"><p class="vh-muted">Carregando…</p></div>'; return; }
    if (!carros.length) {
      root.innerHTML = `<h1 class="vh-h">Carros</h1><p class="vh-sub">Combustível, manutenção e despesas de cada veículo, num lugar só.</p>
        <div class="vh-card vh-vazio"><div class="vh-big">🚗</div><p>Cadastre o primeiro carro para começar.</p><button type="button" class="vh-btn" data-vnovo>＋ Cadastrar veículo</button></div>`;
      return;
    }
    const v = carro(), R = resumo(), L = lembretes();
    const sub = [v.modelo, v.ano, v.placa].filter(Boolean).join(' · ');
    let h = `<h1 class="vh-h">Carros</h1>
      <div class="vh-chips">${carros.map((c) => `<button type="button" class="vh-chip${c.id === v.id ? ' on' : ''}" data-vsel="${c.id}">${c.emoji || '🚗'} ${esc(c.nome)}</button>`).join('')}<button type="button" class="vh-chip vh-plus" data-vnovo aria-label="Adicionar veículo">＋</button></div>
      <div class="vh-carro"><span class="vh-em">${v.emoji || '🚗'}</span><span class="vh-cn"><b>${esc(v.nome)}</b><small>${esc(sub) || 'Toque em ✏️ para completar os dados'}</small></span><button type="button" class="vh-ed" data-vedit aria-label="Editar veículo">✏️</button></div>
      <div class="vh-acts"><button type="button" data-vform="abast"><span>⛽</span>Abastecer</button><button type="button" data-vform="servico"><span>🔧</span>Serviço</button><button type="button" data-vform="despesa"><span>🧾</span>Despesa</button></div>
      <div class="vh-stats">
        <div><b>${R.od ? nf(R.od.max, 0) : '—'}</b><span>km no painel</span></div>
        <div><b>${nf(R.media, 1)}</b><span>km/L médio</span></div>
        <div><b>${R.rodado > 0 && R.g.tot ? brl(R.g.tot / R.rodado) : '—'}</b><span>custo por km</span></div>
      </div>`;
    if (R.ult != null) h += `<p class="vh-ultimo">Último tanque: <b>${nf(R.ult, 1)} km/L</b>${R.ultPreco ? ' · último preço <b>' + brl(R.ultPreco) + '/L</b>' : ''}</p>`;
    h += `<div class="vh-card"><div class="vh-ct"><h3>🔔 Próximas manutenções</h3></div>${L.length ? L.map((l) => `<div class="vh-lem vh-${l.st}"><span class="vh-dot"></span><span class="vh-lt"><b>${esc(D(l.r).servico === 'Outro' ? D(l.r).desc : D(l.r).servico)}</b><small>${l.tx}</small></span><em>${l.st === 'venc' ? 'Vencido' : l.st === 'breve' ? 'Em breve' : 'Ok'}</em></div>`).join('') : '<p class="vh-muted">Ao anotar um serviço, diga quando é a próxima (em km ou data) e o aviso aparece aqui.</p>'}</div>`;
    if (R.g.tot > 0) {
      const p = (x) => (x / R.g.tot * 100).toFixed(1) + '%';
      h += `<div class="vh-card"><div class="vh-ct"><h3>💰 Quanto o ${esc(v.nome)} já custou</h3><span>${brl(R.g.tot)}</span></div>
        <div class="vh-bar"><i style="width:${p(R.g.abast)};background:#1b7a4e"></i><i style="width:${p(R.g.servico)};background:#3d6fa8"></i><i style="width:${p(R.g.despesa)};background:#c2702f"></i></div>
        ${[['⛽ Combustível', R.g.abast, '#1b7a4e'], ['🔧 Serviços', R.g.servico, '#3d6fa8'], ['🧾 Despesas', R.g.despesa, '#c2702f']].map(([n, x, c]) => `<div class="vh-leg"><span><i style="background:${c}"></i>${n}</span><b>${brl(x)}</b></div>`).join('')}</div>`;
    }
    const nCompra = regs.filter((r) => r.tipo === 'compra' && !D(r).ok).length;
    h += `<div class="vh-tabs"><button type="button" data-vaba="hist" class="${aba === 'hist' ? 'on' : ''}">Histórico</button><button type="button" data-vaba="compras" class="${aba === 'compras' ? 'on' : ''}">Compras${nCompra ? ' <small>' + nCompra + '</small>' : ''}</button></div>`;
    h += aba === 'compras' ? telaCompras() : telaHist(R.c);
    root.innerHTML = h;
  }

  function telaHist(c) {
    const FL = [['tudo', 'Tudo'], ['abast', '⛽'], ['servico', '🔧'], ['despesa', '🧾']];
    const l = regs.filter((r) => r.tipo !== 'compra' && (filtro === 'tudo' || r.tipo === filtro)).sort((a, b) => String(b.data).localeCompare(a.data) || (b.km || 0) - (a.km || 0));
    let h = `<div class="vh-fl">${FL.map(([k, n]) => `<button type="button" data-vfil="${k}" class="${filtro === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="vh-card vh-list">`;
    if (!l.length) h += '<p class="vh-muted">Nada anotado ainda. Use os botões ⛽ 🔧 🧾 lá em cima.</p>';
    let mes = '';
    for (const r of l.slice(0, 300)) {
      const d = D(r), m = String(r.data).slice(0, 7);
      if (m !== mes) { mes = m; const [a, mm] = m.split('-'); h += `<p class="vh-mes">${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+mm - 1]} ${a}</p>`; }
      let t = '', s = '';
      if (r.tipo === 'abast') { t = nf(d.litros, 2) + ' L · ' + esc(d.comb || ''); s = (d.preco ? brl(d.preco) + '/L' : '') + (c[r.id] ? ' · <b>' + nf(c[r.id].kml, 1) + ' km/L</b>' : d.cheio === false ? ' · tanque parcial' : ''); }
      else if (r.tipo === 'servico') { t = esc(d.servico === 'Outro' ? (d.desc || 'Serviço') : d.servico); s = esc(d.servico !== 'Outro' && d.desc ? d.desc : '') ; }
      else { t = esc(d.despesa); s = esc(d.obs || ''); }
      const info = [br(r.data).slice(0, 5), r.km != null ? nf(r.km, 0) + ' km' : '', d.posto || d.local || ''].filter(Boolean).map(esc).join(' · ');
      h += `<button type="button" class="vh-row" data-vreg="${r.id}"><span class="vh-ri">${TIPO[r.tipo][0]}</span><span class="vh-rt"><b>${t}</b><small>${info}${s ? ' · ' + s : ''}</small></span><span class="vh-rv">${r.valor != null ? brl(+r.valor) : ''}</span></button>`;
    }
    return h + '</div>';
  }

  function telaCompras() {
    const cs = regs.filter((r) => r.tipo === 'compra');
    let h = '';
    for (const [k, n] of [['comprar', '🛒 Comprar'], ['orcar', '💬 Orçar']]) {
      const l = cs.filter((r) => (D(r).lista || 'comprar') === k).sort((a, b) => (!!D(a).ok - !!D(b).ok) || ((D(b).prio === 'alta') - (D(a).prio === 'alta')));
      const tot = l.filter((r) => !D(r).ok).reduce((s, r) => s + (Number(r.valor) || 0), 0);
      h += `<div class="vh-card vh-list"><div class="vh-ct"><h3>${n}</h3>${tot ? '<span>' + brl(tot) + '</span>' : ''}</div>`;
      if (!l.length) h += '<p class="vh-muted">Nada aqui.</p>';
      for (const r of l) { const d = D(r); h += `<div class="vh-cp${d.ok ? ' ok' : ''}"><button type="button" class="vh-ck" data-vck="${r.id}" aria-label="Marcar">${d.ok ? '✓' : ''}</button><span class="vh-rt"><b>${d.prio === 'alta' ? '<i class="vh-pri">Prioridade</i>' : ''}${esc(d.nome)}</b>${d.nota ? '<small>' + esc(d.nota) + '</small>' : ''}</span><button type="button" class="vh-pr${r.valor == null ? ' vz' : ''}" data-vpreco="${r.id}">${r.valor == null ? '+ preço' : brl(+r.valor)}</button><button type="button" class="vh-x" data-vdelc="${r.id}" aria-label="Apagar">×</button></div>`; }
      h += '</div>';
    }
    h += `<form class="vh-card vh-addc" id="vh-addc"><input name="nome" placeholder="Peça ou acessório (ex.: palheta)" autocomplete="off" required><div class="vh-r2"><select name="lista"><option value="comprar">Comprar</option><option value="orcar">Orçar</option></select><input name="preco" inputmode="decimal" placeholder="R$ (se souber)"></div><button class="vh-btn">＋ Pôr na lista</button></form>`;
    return h;
  }

  // ---------- folha (formulários) ----------
  const abrir = (html) => { sh.querySelector('.vh-body').innerHTML = html; document.body.classList.add('vh-open'); };
  const fechar = () => document.body.classList.remove('vh-open');
  const formas = (sel) => `<p class="vh-l">Como pagou?</p><div class="vh-pick">${FORMAS.map(([k, e, n]) => `<button type="button" data-vforma="${k}" class="${sel === k ? 'on' : ''}">${e} ${n}</button>`).join('')}</div>`;
  const lancar = (on) => `<label class="vh-chk"><input type="checkbox" id="vh-lanc"${on ? ' checked' : ''}> Lançar também no orçamento <small>(envelope Carro)</small></label>`;

  function formReg(tipo, r) {
    const v = carro(), d = r ? D(r) : {}, ed = !!r, od = odometro();
    f = { tipo, id: r ? r.id : null, forma: 'pix' };
    const ultComb = (regs.filter((x) => x.tipo === 'abast').sort((a, b) => String(b.data).localeCompare(a.data))[0] || {}).dados;
    const comb = d.comb || (ultComb && ultComb.comb) || (/diesel/i.test(v.combustivel) ? 'Diesel S10' : v.combustivel === 'Etanol' ? 'Etanol' : 'Gasolina comum');
    const kmIn = `<label class="vh-f"><span>Km no painel</span><input id="vh-km" inputmode="numeric" placeholder="${od ? nf(od.max, 0) : 'ex.: 318.976'}" value="${r && r.km != null ? r.km : ''}"></label>`;
    const dataIn = `<label class="vh-f"><span>Data</span><input id="vh-data" type="date" value="${r ? r.data : hoje()}"></label>`;
    let h = `<div class="vh-grab"></div><p class="vh-q">${TIPO[tipo][0]} ${ed ? 'Editar ' + TIPO[tipo][1].toLowerCase() : tipo === 'abast' ? 'Abastecimento' : tipo === 'servico' ? 'Serviço ou manutenção' : 'Despesa'}<small>${esc(v.nome)}</small></p>`;
    if (tipo === 'abast') {
      h += `<div class="vh-r2">${dataIn}${kmIn}</div>
        <label class="vh-f"><span>Combustível</span><select id="vh-comb">${opts(COMB, comb)}</select></label>
        <div class="vh-r3"><label class="vh-f"><span>Preço/L</span><input id="vh-preco" inputmode="decimal" placeholder="6,29" value="${d.preco ? nf(d.preco, 3) : ''}"></label><label class="vh-f"><span>Litros</span><input id="vh-lit" inputmode="decimal" placeholder="15,90" value="${d.litros ? nf(d.litros, 2) : ''}"></label><label class="vh-f"><span>Total R$</span><input id="vh-tot" inputmode="decimal" placeholder="100,00" value="${r && r.valor != null ? nf(+r.valor, 2) : ''}"></label></div>
        <p class="vh-hint">Preencha 2 dos 3. O outro a gente calcula.</p>
        <label class="vh-f"><span>Posto <small>(opcional)</small></span><input id="vh-posto" value="${esc(d.posto || '')}" maxlength="40"></label>
        <label class="vh-chk"><input type="checkbox" id="vh-cheio"${d.cheio === false ? '' : ' checked'}> Enchi o tanque</label>
        <label class="vh-chk"><input type="checkbox" id="vh-esq"${d.esqueci ? ' checked' : ''}> Esqueci de anotar o abastecimento anterior</label>`;
    } else if (tipo === 'servico') {
      h += `<label class="vh-f"><span>O que foi feito?</span><select id="vh-serv">${opts(SERV, d.servico || 'Troca de óleo')}</select></label>
        <label class="vh-f"><span>Detalhes <small>(opcional)</small></span><input id="vh-desc" value="${esc(d.desc || '')}" placeholder="ex.: óleo 15W40, 3,5 L" maxlength="120"></label>
        <div class="vh-r2">${dataIn}${kmIn}</div>
        <div class="vh-r2"><label class="vh-f"><span>Custo R$</span><input id="vh-val" inputmode="decimal" value="${r && r.valor != null ? nf(+r.valor, 2) : ''}"></label><label class="vh-f"><span>Oficina</span><input id="vh-local" value="${esc(d.local || '')}" maxlength="40"></label></div>
        <p class="vh-l">🔔 Quando é a próxima?</p>
        <div class="vh-r2"><label class="vh-f"><span>Daqui a quantos km</span><input id="vh-pkm" inputmode="numeric" placeholder="ex.: 5.000" value="${d.proxKm != null && r && r.km != null ? d.proxKm - r.km : ''}"></label><label class="vh-f"><span>ou na data</span><input id="vh-pdata" type="date" value="${d.proxData || ''}"></label></div>`;
    } else {
      h += `<div class="vh-r2"><label class="vh-f"><span>O que é?</span><select id="vh-desp">${opts(DESP, d.despesa || 'IPVA')}</select></label><label class="vh-f"><span>Valor R$</span><input id="vh-val" inputmode="decimal" value="${r && r.valor != null ? nf(+r.valor, 2) : ''}"></label></div>
        <div class="vh-r2">${dataIn}${kmIn}</div>
        <label class="vh-f"><span>Observação <small>(opcional)</small></span><input id="vh-obs" value="${esc(d.obs || '')}" maxlength="120"></label>`;
    }
    if (!ed) h += formas(f.forma) + lancar(true);
    h += `<p class="vh-erro" id="vh-erro"></p><button type="button" class="vh-btn" data-vsalvar>${ed ? 'Salvar' : 'Anotar'}</button><button type="button" class="vh-btn sec" data-vfechar>Cancelar</button>`;
    abrir(h);
    if (tipo === 'abast') calc();
  }
  // preço × litros = total: calcula o campo que falta
  function calc() {
    const F = { preco: document.getElementById('vh-preco'), lit: document.getElementById('vh-lit'), tot: document.getElementById('vh-tot') }; let ord = [];
    for (const k of Object.keys(F)) F[k].addEventListener('input', () => {
      F[k].classList.remove('vh-auto'); ord = ord.filter((x) => x !== k); if (F[k].value.trim()) ord.push(k);
      if (ord.length < 2) return;
      const alvo = ['preco', 'lit', 'tot'].find((x) => x !== ord[ord.length - 1] && x !== ord[ord.length - 2]);
      const p = num(F.preco.value), l = num(F.lit.value), t = num(F.tot.value); let r = null;
      if (alvo === 'tot' && p && l) r = nf(p * l, 2); if (alvo === 'lit' && p && t) r = nf(t / p, 2); if (alvo === 'preco' && l && t) r = nf(t / l, 3);
      if (r) { F[alvo].value = r.replace(/\./g, ''); F[alvo].classList.add('vh-auto'); }
    });
  }
  async function salvarReg(b) {
    const g = (id) => document.getElementById(id), er = g('vh-erro'), v = carro();
    const r = { id: f.id, veiculo_id: v.id, tipo: f.tipo, data: g('vh-data').value || hoje(), km: kmv(g('vh-km').value), valor: null, dados: {} };
    let desc = '';
    if (f.tipo === 'abast') {
      let p = num(g('vh-preco').value), l = num(g('vh-lit').value), t = num(g('vh-tot').value);
      if (p && l && !t) t = p * l; if (p && t && !l) l = t / p; if (l && t && !p) p = t / l;
      if (r.km == null) { er.textContent = 'Escreva os km que estão no painel.'; return; }
      if (!l || !t) { er.textContent = 'Preencha 2 destes: preço por litro, litros ou total.'; return; }
      r.valor = Math.round(t * 100) / 100;
      r.dados = { comb: g('vh-comb').value, preco: Math.round(p * 1000) / 1000, litros: Math.round(l * 100) / 100, cheio: g('vh-cheio').checked, esqueci: g('vh-esq').checked, posto: g('vh-posto').value.trim() || null };
      desc = '⛽ ' + v.nome + ': ' + nf(l, 2) + ' L ' + r.dados.comb.toLowerCase();
    } else if (f.tipo === 'servico') {
      const pk = kmv(g('vh-pkm').value);
      if (pk != null && r.km == null) { er.textContent = 'Para avisar por km, escreva os km do painel.'; return; }
      r.valor = num(g('vh-val').value);
      r.dados = { servico: g('vh-serv').value, desc: g('vh-desc').value.trim() || null, local: g('vh-local').value.trim() || null, proxKm: pk != null ? r.km + pk : null, proxData: g('vh-pdata').value || null };
      desc = '🔧 ' + v.nome + ': ' + (r.dados.servico === 'Outro' ? r.dados.desc || 'serviço' : r.dados.servico);
    } else {
      r.valor = num(g('vh-val').value);
      if (r.valor == null) { er.textContent = 'Escreva o valor.'; return; }
      r.dados = { despesa: g('vh-desp').value, obs: g('vh-obs').value.trim() || null };
      desc = '🧾 ' + v.nome + ': ' + r.dados.despesa;
    }
    const lanc = g('vh-lanc') && g('vh-lanc').checked && r.valor;
    b.disabled = true; b.textContent = 'Anotando…';
    try {
      await window.APP.veiculos.salvarReg(r, lanc ? { envelope: f.tipo === 'abast' ? 'combustivel' : 'veiculo', descricao: desc, forma: f.forma } : null);
      await recarregarRegs();
      if (f.id) return fechar();
      const R = resumo(), k = R.c[(regs.find((x) => x.tipo === 'abast' && x.km === r.km && x.data === r.data) || {}).id];
      abrir(`<div class="vh-big">${f.tipo === 'abast' ? '⛽' : '👍'}</div><p class="vh-q vh-c">Anotado!</p><p class="vh-s">${k ? 'Esse tanque fez <b>' + nf(k.kml, 1) + ' km/L</b>.' : f.tipo === 'abast' && r.dados.cheio ? 'O consumo aparece a partir do próximo tanque cheio.' : ''}${lanc ? ' Também entrou no orçamento.' : ''}</p><button type="button" class="vh-btn" data-vfechar>Pronto</button>`);
    } catch (e) { console.error(e); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; }
  }
  function detalhe(r) {
    const d = D(r), c = consumo()[r.id];
    const L = [];
    if (r.tipo === 'abast') L.push(['Combustível', esc(d.comb)], ['Litros', nf(d.litros, 2) + ' L'], ['Preço/L', brl(d.preco)], ['Tanque', d.cheio === false ? 'parcial' : 'cheio'], ...(c ? [['Consumo', nf(c.kml, 1) + ' km/L em ' + nf(c.km, 0) + ' km']] : []), ...(d.posto ? [['Posto', esc(d.posto)]] : []));
    if (r.tipo === 'servico') L.push(['Serviço', esc(d.servico)], ...(d.desc ? [['Detalhes', esc(d.desc)]] : []), ...(d.local ? [['Oficina', esc(d.local)]] : []), ...(d.proxKm != null ? [['Próxima', nf(d.proxKm, 0) + ' km']] : []), ...(d.proxData ? [['Próxima', br(d.proxData)]] : []));
    if (r.tipo === 'despesa') L.push(['Tipo', esc(d.despesa)], ...(d.obs ? [['Obs.', esc(d.obs)]] : []));
    L.unshift(['Data', br(r.data)], ['Km', r.km != null ? nf(r.km, 0) : '—'], ['Valor', r.valor != null ? brl(+r.valor) : '—']);
    f = { det: r };
    abrir(`<div class="vh-grab"></div><p class="vh-q">${TIPO[r.tipo][0]} ${TIPO[r.tipo][1]}</p><div class="vh-det">${L.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('')}</div>${r.gasto_id ? '<p class="vh-hint">Este gasto também está no orçamento. Apagar aqui tira de lá também.</p>' : ''}
      <button type="button" class="vh-btn" data-veditr>✏️ Editar</button><button type="button" class="vh-btn sec vh-danger" data-vapagar>Apagar</button><button type="button" class="vh-btn sec" data-vfechar>Fechar</button>`);
  }
  function formCarro(c) {
    f = { carro: c || null, emoji: (c && c.emoji) || '🚗' };
    abrir(`<div class="vh-grab"></div><p class="vh-q">${c ? 'Editar veículo' : 'Novo veículo'}</p>
      <div class="vh-pick vh-emo">${EMOJIS.map((e) => `<button type="button" data-vemo="${e}" class="${f.emoji === e ? 'on' : ''}">${e}</button>`).join('')}</div>
      <label class="vh-f"><span>Apelido</span><input id="vh-nome" value="${esc(c ? c.nome : '')}" placeholder="ex.: Uno, Hilux da fazenda" maxlength="30"></label>
      <label class="vh-f"><span>Marca e modelo</span><input id="vh-mod" value="${esc(c ? c.modelo || '' : '')}" maxlength="50"></label>
      <div class="vh-r2"><label class="vh-f"><span>Ano</span><input id="vh-ano" inputmode="numeric" value="${esc(c ? c.ano || '' : '')}" maxlength="9"></label><label class="vh-f"><span>Placa</span><input id="vh-placa" value="${esc(c ? c.placa || '' : '')}" maxlength="8" style="text-transform:uppercase"></label></div>
      <label class="vh-f"><span>Combustível</span><select id="vh-vcomb">${opts(['Flex', 'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Elétrico', 'Híbrido'], c ? c.combustivel : 'Flex')}</select></label>
      <p class="vh-erro" id="vh-erro"></p><button type="button" class="vh-btn" data-vsalvarc>Salvar</button>
      ${c ? '<button type="button" class="vh-btn sec vh-danger" data-vapagarc>Apagar veículo e todo o histórico</button>' : ''}<button type="button" class="vh-btn sec" data-vfechar>Cancelar</button>`);
  }

  // ---------- ações ----------
  async function onClick(e) {
    if (e.target.classList.contains('vh-scrim')) return fechar();
    const b = e.target.closest('button'); if (!b) return;
    const ds = b.dataset;
    if (ds.vsel) { atual = ds.vsel; aba = 'hist'; return recarregarRegs(); }
    if ('vnovo' in ds) return formCarro(null);
    if ('vedit' in ds) return formCarro(carro());
    if (ds.vform) return formReg(ds.vform, null);
    if (ds.vaba) { aba = ds.vaba; return render(); }
    if (ds.vfil) { filtro = ds.vfil; return render(); }
    if (ds.vreg) { const r = regs.find((x) => String(x.id) === ds.vreg); if (r) detalhe(r); return; }
    if (ds.vck) { const r = regs.find((x) => String(x.id) === ds.vck); if (!r) return; r.dados = { ...D(r), ok: !D(r).ok }; render(); try { await window.APP.veiculos.salvarReg(r); } catch (err) { console.error(err); } return; }
    if (ds.vpreco) { const r = regs.find((x) => String(x.id) === ds.vpreco); if (!r) return; f = { preco: r }; return abrir(`<div class="vh-grab"></div><p class="vh-q">Preço<small>${esc(D(r).nome)}</small></p><label class="vh-f"><span>R$ <small>(vazio para limpar)</small></span><input id="vh-pv" inputmode="decimal" value="${r.valor != null ? nf(+r.valor, 2) : ''}"></label><button type="button" class="vh-btn" data-vsalvarp>Salvar</button><button type="button" class="vh-btn sec" data-vfechar>Cancelar</button>`); }
    if (ds.vdelc) { if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'apagar?'; b.classList.add('arm'); return; } const r = regs.find((x) => String(x.id) === ds.vdelc); if (r) { try { await window.APP.veiculos.apagarReg(r); } catch (err) { console.error(err); } recarregarRegs(); } return; }
    if (!sh.contains(b)) return;
    if ('vfechar' in ds) return fechar();
    if (ds.vforma) { f.forma = ds.vforma; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (ds.vemo) { f.emoji = ds.vemo; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if ('vsalvar' in ds) return salvarReg(b);
    if ('veditr' in ds) return formReg(f.det.tipo, f.det);
    if ('vapagar' in ds) { if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'Toque de novo para apagar'; return; } try { await window.APP.veiculos.apagarReg(f.det); } catch (err) { console.error(err); } fechar(); return recarregarRegs(); }
    if ('vsalvarp' in ds) { const r = f.preco; r.valor = num(document.getElementById('vh-pv').value); fechar(); render(); try { await window.APP.veiculos.salvarReg(r); } catch (err) { console.error(err); } return; }
    if ('vsalvarc' in ds) {
      const g = (id) => document.getElementById(id).value.trim(); const nome = g('vh-nome');
      if (!nome) { document.getElementById('vh-erro').textContent = 'Dê um apelido para o veículo.'; return; }
      b.disabled = true;
      try { const c = await window.APP.veiculos.salvarVeiculo({ id: f.carro && f.carro.id, nome, modelo: g('vh-mod'), ano: g('vh-ano'), placa: g('vh-placa').toUpperCase(), combustivel: document.getElementById('vh-vcomb').value, emoji: f.emoji }); atual = c.id; fechar(); await recarregar(); }
      catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não salvou. Tentar de novo'; }
      return;
    }
    if ('vapagarc' in ds) { if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'Tem certeza? Toque de novo'; return; } try { await window.APP.veiculos.apagarVeiculo(f.carro.id); } catch (err) { console.error(err); } atual = null; fechar(); return recarregar(); }
  }
  async function onSubmit(e) {
    if (e.target.id !== 'vh-addc') return; e.preventDefault();
    const fm = e.target, nome = fm.nome.value.trim(); if (!nome) return;
    try { await window.APP.veiculos.salvarReg({ veiculo_id: carro().id, tipo: 'compra', data: hoje(), valor: num(fm.preco.value), dados: { nome, lista: fm.lista.value, ok: false } }); } catch (err) { console.error(err); }
    await recarregarRegs();
    const i = root.querySelector('#vh-addc input[name=nome]'); if (i) i.focus();
  }

  // ---------- dados ----------
  async function recarregarRegs() {
    const v = carro(); if (!v) { regs = []; render(); cartaoCasa(); return; }
    try { regs = await window.APP.veiculos.registros(v.id); } catch (e) { console.error(e); regs = []; }
    render(); cartaoCasa();
  }
  async function recarregar() {
    carregando = true; render();
    try { carros = await window.APP.veiculos.listar(); } catch (e) { console.error(e); carros = []; }
    carregando = false;
    if (!carros.find((c) => c.id === atual)) atual = carros[0] ? carros[0].id : null;
    await recarregarRegs();
  }

  // cartãozinho no Início: só aparece se houver carro cadastrado
  function cartaoCasa() {
    const casa = document.getElementById('casa'); if (!casa) return;
    let w = casa.querySelector('.vh-home');
    const v = carro();
    if (!v) { if (w) w.remove(); return; }
    const ancora = casa.querySelector('.vc-wrap') || casa.querySelector('.nt-wrap') || casa.querySelector('.cs-hero');
    if (!ancora) return;
    if (!w) { w = document.createElement('button'); w.type = 'button'; w.className = 'vh-home'; w.addEventListener('click', () => (window.OIKOS_IR ? window.OIKOS_IR('veiculos') : show())); }
    if (w.previousElementSibling !== ancora) ancora.after(w);
    const R = resumo(), L = lembretes()[0];
    const aviso = L && L.st !== 'ok' ? `<small class="vh-${L.st}">${L.st === 'venc' ? '⚠️' : '🔔'} ${esc(D(L.r).servico === 'Outro' ? D(L.r).desc : D(L.r).servico)}: ${L.tx}</small>` : `<small>${R.media != null ? nf(R.media, 1) + ' km/L de média' : 'Toque para anotar abastecimentos e manutenções'}</small>`;
    w.innerHTML = `<span class="vh-em">${v.emoji || '🚗'}</span><span class="vh-cn"><b>${esc(v.nome)}${carros.length > 1 ? ' <i>+' + (carros.length - 1) + '</i>' : ''}</b>${aviso}</span><span class="vh-go">›</span>`;
  }

  // ---------- navegação ----------
  const sync = () => document.dispatchEvent(new Event('oikos:tab'));
  function show() {
    document.body.classList.remove('cs-on', 'og-on', 'ng-on'); document.body.classList.add('vh-on');
    const t = document.getElementById('tab-veiculos'); document.querySelectorAll('.fv-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    if (!carros.length && !carregando) recarregar(); else render();
    scrollTo(0, 0); sync();
  }
  function hide() { if (document.body.classList.contains('vh-on')) { document.body.classList.remove('vh-on'); sync(); } }

  function montar() {
    const dr = document.getElementById('dash-root'); if (!dr || !window.APP || !window.APP.veiculos) return;
    root = document.createElement('section'); root.className = 'vh'; root.id = 'veiculos-pg'; root.setAttribute('aria-label', 'Carros'); dr.prepend(root);
    sh = document.createElement('div'); sh.className = 'vh-sheet'; sh.setAttribute('role', 'dialog'); sh.innerHTML = '<div class="vh-scrim"></div><div class="vh-panel"><div class="vh-body"></div></div>'; document.body.append(sh);
    root.addEventListener('click', onClick); sh.addEventListener('click', onClick); root.addEventListener('submit', onSubmit);
    // outra tela foi aberta: sai dos Carros
    new MutationObserver(() => { const c = document.body.classList; if (c.contains('vh-on') && (c.contains('cs-on') || c.contains('og-on') || c.contains('ng-on'))) { c.remove('vh-on'); sync(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const tabs = document.querySelector('.fv-tabs');
    if (tabs && !document.getElementById('tab-veiculos')) {
      const t = document.createElement('button'); t.className = 'fv-tab'; t.type = 'button'; t.id = 'tab-veiculos'; t.textContent = '🚗 Carros'; t.addEventListener('click', show); tabs.appendChild(t);
      document.querySelectorAll('.fv-tab[data-tab]').forEach((x) => x.addEventListener('click', hide));
    }
    new MutationObserver(() => { const c = document.getElementById('casa'); if (c && carros.length && !c.querySelector('.vh-home')) cartaoCasa(); }).observe(dr, { childList: true, subtree: true });
    window.OIKOS_VEI = { show, hide };
    if (window.dash) { let ok = false; dash.onData(() => { if (!ok && ['ok', 'error'].includes(dash.data('mensal').status)) { ok = true; recarregar(); } }); } else recarregar();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 95));
})();
