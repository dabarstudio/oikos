// Oikos — Objetivos (sonhos) da família e de cada pessoa. Feito para ser simples: escolher quem, escolher o sonho, dizer quanto e quando.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let pessoas = [];
  const AV = () => window.OIKOS_AVATAR;
  // [chave, ícone (html), nome]
  const PES = () => [['familia', AV() ? AV().familia(pessoas, 22) : '👨‍👩‍👦', 'Família'], ...pessoas.map((p) => [p.chave, AV() ? AV().svg(p.avatar, 24) : '🙂', p.nome])];
  const icone = (k, size) => { if (k === 'familia') return AV() ? AV().familia(pessoas, size) : '👨‍👩‍👦'; const p = pessoas.find((x) => x.chave === k); return p && AV() ? AV().svg(p.avatar, size) : '🙂'; };
  const CATS = [
    ['reserva', '🛟', 'Reserva de emergência'], ['casa', '🏠', 'Casa própria'], ['reforma', '🛠️', 'Reforma da casa'], ['carro', '🚗', 'Carro'],
    ['viagem', '✈️', 'Viagem'], ['estudos', '🎓', 'Estudos'], ['dividas', '💳', 'Quitar dívidas'], ['festa', '🎉', 'Festa / casamento'],
    ['filho', '🧸', 'Futuro do filho'], ['aposentadoria', '🌴', 'Aposentadoria'], ['eletronicos', '📱', 'Celular / eletrônicos'], ['saude', '💪', 'Saúde'],
    ['doacao', '🙏', 'Doação / missões'], ['negocio', '💼', 'Negócio próprio'], ['moto', '🏍️', 'Moto'], ['outro', '⭐', 'Outro sonho'],
  ];
  const PRAZOS = [[6, '6 meses'], [12, '1 ano'], [24, '2 anos'], [36, '3 anos'], [60, '5 anos'], [120, '10 anos']];
  const pes = (k) => PES().find((p) => p[0] === k) || PES()[0];
  const cat = (k) => CATS.find((c) => c[0] === k) || CATS[CATS.length - 1];
  let root, lista = [], filtro = 'todos', form = null;

  function mesesAte(prazo) {
    if (!prazo) return null; const h = new Date(); const p = new Date(prazo + 'T12:00:00');
    return Math.max(1, (p.getFullYear() - h.getFullYear()) * 12 + p.getMonth() - h.getMonth());
  }
  const num = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };

  function card(o) {
    const c = cat(o.categoria), p = pes(o.pessoa);
    const alvo = +o.valor_alvo || 0, g = +o.valor_guardado || 0, falta = Math.max(0, alvo - g), pct = alvo ? Math.min(100, g / alvo * 100) : 0;
    const m = mesesAte(o.prazo), porMes = m ? falta / m : null;
    const quando = o.prazo ? MES[+o.prazo.slice(5, 7) - 1] + '/' + o.prazo.slice(0, 4) : '';
    const feito = alvo && g >= alvo;
    return `<article class="ob-goal${feito ? ' done' : ''}" data-id="${o.id}">
      <div class="og-top"><span class="og-em" aria-hidden="true">${c[1]}</span>
        <div class="og-tt"><b>${o.titulo}</b><span class="og-who">${icone(o.pessoa, 20)} ${p[2]}</span></div></div>
      <div class="og-bar"><i style="width:${Math.max(2, pct)}%"></i></div>
      <div class="og-nums"><span><b>${BRL.format(g)}</b> de ${BRL.format(alvo)}</span><span>${Math.round(pct)}%</span></div>
      <p class="og-msg">${feito ? '🎉 Conseguiram! Objetivo alcançado.' : porMes ? `Guardar <b>${BRL.format(Math.ceil(porMes))} por mês</b> para chegar em ${quando}.` : `Faltam ${BRL.format(falta)}.`}</p>
      <div class="og-act"><button type="button" class="og-add" data-add>➕ Guardei dinheiro</button><button type="button" class="og-edit" data-edit aria-label="Editar">✏️</button></div>
    </article>`;
  }

  function render() {
    if (!root) return;
    const chips = [['todos', '✨', 'Todos'], ...PES()].map(([k, e, n]) => `<button type="button" class="ob-chip${filtro === k ? ' on' : ''}" data-f="${k}"><span class="og-ci">${e}</span>${n}</button>`).join('');
    const vis = lista.filter((o) => filtro === 'todos' || o.pessoa === filtro);
    const total = vis.reduce((s, o) => s + (+o.valor_guardado || 0), 0), alvo = vis.reduce((s, o) => s + (+o.valor_alvo || 0), 0);
    root.innerHTML = `<h1 class="og-h">Objetivos</h1>
      <p class="og-sub">Os sonhos da família e de cada um. Toque em <b>➕ Guardei dinheiro</b> sempre que separar um valor.</p>
      <div class="ob-chips">${chips}</div>
      ${vis.length ? `<p class="og-tot">Guardado: <b>${BRL.format(total)}</b> de ${BRL.format(alvo)}</p>` : ''}
      <div class="og-list">${vis.map(card).join('') || '<p class="og-empty">Nenhum objetivo aqui ainda. Que tal criar o primeiro? 🙂</p>'}</div>
      <button type="button" class="og-new" data-new>＋ Novo objetivo</button>
      <button type="button" class="og-people" data-people><span>${AV() ? AV().familia(pessoas, 28) : ''}</span> Pessoas da família <small>mudar fotos e nomes</small></button>`;
  }

  async function carregar() { try { pessoas = await window.APP.pessoas.listar(); } catch (e) { console.error(e); pessoas = window.APP.pessoas.PADRAO; } try { lista = await window.APP.objetivos.listar(); } catch (e) { console.error(e); lista = []; } render(); }

  // ---------- folha de criar / editar (3 passos) ----------
  const sheet = () => document.querySelector('.og-sheet');
  function abrir(o) {
    form = o ? { ...o, passo: 3 } : { pessoa: filtro !== 'todos' ? filtro : null, categoria: null, titulo: '', valor_alvo: '', valor_guardado: '', meses: null, passo: filtro !== 'todos' ? 2 : 1 };
    passo(); document.body.classList.add('og-open');
  }
  const fechar = () => { document.body.classList.remove('og-open'); form = null; };
  function passo() {
    const b = sheet().querySelector('.og-body');
    if (form.passo === 1) {
      b.innerHTML = '<p class="og-q">Para quem é esse sonho?</p><div class="og-pick big">' + PES().map(([k, , n]) => `<button type="button" data-pessoa="${k}"><span class="og-pav">${icone(k, 64)}</span>${n}</button>`).join('') + '</div>';
    } else if (form.passo === 2) {
      b.innerHTML = '<button type="button" class="og-back" data-back>‹ Voltar</button><p class="og-q">Qual é o sonho?</p><div class="og-pick">' + CATS.map(([k, e, n]) => `<button type="button" data-cat="${k}"><span>${e}</span>${n}</button>`).join('') + '</div>';
    } else {
      const c = cat(form.categoria), p = pes(form.pessoa);
      const prazoSel = form.prazo && !form.meses ? 'data' : form.meses;
      b.innerHTML = `${form.id ? '' : '<button type="button" class="og-back" data-back>‹ Voltar</button>'}
        <p class="og-q">${c[1]} ${form.id ? 'Editar objetivo' : c[2]} <small>${icone(form.pessoa || 'familia', 20)} ${p[2]}</small></p>
        <label class="og-f">Nome do objetivo<input id="og-tit" class="sv-in" value="${(form.titulo || c[2]).replace(/"/g, '&quot;')}" maxlength="60"></label>
        <label class="og-f">Quanto precisa? (R$)<input id="og-alvo" class="sv-in" inputmode="decimal" placeholder="Ex.: 10.000" value="${form.valor_alvo || ''}"></label>
        <label class="og-f">Já tem guardado? (R$)<input id="og-gu" class="sv-in" inputmode="decimal" placeholder="0" value="${form.valor_guardado || ''}"></label>
        <p class="og-f">Para quando?</p>
        <div class="og-prazos">${PRAZOS.map(([m, n]) => `<button type="button" data-m="${m}" class="${prazoSel == m ? 'on' : ''}">${n}</button>`).join('')}${form.prazo && !form.meses ? `<button type="button" class="on" data-m="">${MES[+form.prazo.slice(5, 7) - 1]}/${form.prazo.slice(0, 4)}</button>` : ''}</div>
        <button type="button" class="og-save" data-save>Salvar objetivo</button>
        ${form.id ? '<button type="button" class="og-del" data-del>Apagar objetivo</button>' : ''}`;
    }
  }
  function guardar(o) {
    const b = sheet().querySelector('.og-body'); const c = cat(o.categoria);
    form = { ...o, passo: 'add' };
    b.innerHTML = `<p class="og-q">${c[1]} Quanto você guardou para<br><b>${o.titulo}</b>?</p>
      <input id="og-val" class="sv-in og-bigin" inputmode="decimal" placeholder="R$ 0">
      <div class="og-prazos">${[50, 100, 200, 500].map((v) => `<button type="button" data-v="${v}">+ ${BRL.format(v)}</button>`).join('')}</div>
      <button type="button" class="og-save" data-addsave>Guardar</button>`;
    document.body.classList.add('og-open');
  }

  // ---------- pessoas da família (avatar personalizável) ----------
  const CAB = [['careca', 'Careca'], ['curto', 'Curto'], ['medio', 'Médio'], ['longo', 'Longo'], ['cacheado', 'Cacheado'], ['coque', 'Coque']];
  const BAR = [['nao', 'Sem barba'], ['curta', 'Barba curta'], ['cheia', 'Barba cheia']];
  function listaPessoas() {
    const b = sheet().querySelector('.og-body'); form = { passo: 'pes' };
    b.innerHTML = '<p class="og-q">Pessoas da família</p><div class="og-plist">' + pessoas.map((p) => `<button type="button" data-ped="${p.chave}">${AV().svg(p.avatar, 52)}<b>${p.nome}</b><span>✏️</span></button>`).join('')
      + '<button type="button" data-ped="__novo"><span class="og-plus">＋</span><b>Adicionar pessoa</b><span></span></button></div>';
    document.body.classList.add('og-open');
  }
  function editarPessoa(chave) {
    const p0 = pessoas.find((x) => x.chave === chave);
    form = { passo: 'ped', p: p0 ? JSON.parse(JSON.stringify(p0)) : { chave: null, nome: '', avatar: { pele: 2, cabelo: 'curto', cor: 'castanho', barba: 'nao', crianca: false, fundo: AV().FUNDOS[pessoas.length % 6] } } };
    desenharPessoa();
  }
  function desenharPessoa() {
    const b = sheet().querySelector('.og-body'); const p = form.p, a = p.avatar;
    const op = (campo, valor, conteudo, extra) => `<button type="button" class="og-op${a[campo] === valor ? ' on' : ''}" data-campo="${campo}" data-valor="${valor}" ${extra || ''}>${conteudo}</button>`;
    b.innerHTML = `<button type="button" class="og-back" data-pesback>‹ Voltar</button>
      <div class="og-prev">${AV().svg(a, 120)}</div>
      <label class="og-f">Nome<input id="og-pnome" class="sv-in" value="${(p.nome || '').replace(/"/g, '&quot;')}" placeholder="Ex.: Maria" maxlength="24"></label>
      <p class="og-f">Adulto ou criança?</p><div class="og-ops">${op('crianca', false, '🧑 Adulto')}${op('crianca', true, '🧒 Criança')}</div>
      <p class="og-f">Cor da pele</p><div class="og-ops">${AV().PELE.map((c, i) => op('pele', i + 1, '', `style="background:${c}" aria-label="Tom ${i + 1}"`)).join('')}</div>
      <p class="og-f">Cabelo</p><div class="og-ops av">${CAB.map(([k, n]) => op('cabelo', k, AV().svg({ ...a, cabelo: k }, 44) + `<small>${n}</small>`)).join('')}</div>
      <p class="og-f">Cor do cabelo</p><div class="og-ops">${Object.entries(AV().COR).map(([k, c]) => op('cor', k, '', `style="background:${c}" aria-label="${k}"`)).join('')}</div>
      ${a.crianca ? '' : `<p class="og-f">Barba</p><div class="og-ops av">${BAR.map(([k, n]) => op('barba', k, AV().svg({ ...a, barba: k }, 44) + `<small>${n}</small>`)).join('')}</div>`}
      <p class="og-f">Cor do fundo</p><div class="og-ops">${AV().FUNDOS.map((c) => op('fundo', c, '', `style="background:${c}"`)).join('')}</div>
      <button type="button" class="og-save" data-psave>Salvar</button>
      ${p.chave ? '<button type="button" class="og-del" data-pdel>Remover pessoa</button>' : ''}`;
    document.body.classList.add('og-open');
  }

  async function onSheet(e) {
    const t = e.target;
    if (t.classList.contains('og-scrim')) return fechar();
    const bt = t.closest('button'); if (!bt) return;
    if (bt.dataset.ped) return editarPessoa(bt.dataset.ped === '__novo' ? null : bt.dataset.ped);
    if (bt.hasAttribute('data-pesback')) return listaPessoas();
    if (bt.dataset.campo) {
      const n = document.getElementById('og-pnome'); if (n) form.p.nome = n.value;
      let v = bt.dataset.valor; if (bt.dataset.campo === 'pele') v = +v; if (bt.dataset.campo === 'crianca') v = v === 'true';
      form.p.avatar[bt.dataset.campo] = v; return desenharPessoa();
    }
    if (bt.hasAttribute('data-psave')) {
      form.p.nome = document.getElementById('og-pnome').value.trim();
      if (!form.p.nome) { document.getElementById('og-pnome').classList.add('err'); document.getElementById('og-pnome').focus(); return; }
      bt.disabled = true; bt.textContent = 'Salvando…';
      try { await window.APP.pessoas.salvar(form.p); pessoas = await window.APP.pessoas.listar(); render(); listaPessoas(); } catch (err) { console.error(err); bt.disabled = false; bt.textContent = 'Não salvou. Tentar de novo'; }
      return;
    }
    if (bt.hasAttribute('data-pdel')) {
      if (lista.some((o) => o.pessoa === form.p.chave)) { bt.textContent = 'Essa pessoa tem objetivos. Mude-os antes de remover.'; return; }
      if (bt.dataset.ok) { await window.APP.pessoas.apagar(form.p.chave); pessoas = await window.APP.pessoas.listar(); render(); listaPessoas(); }
      else { bt.dataset.ok = '1'; bt.textContent = 'Toque de novo para remover'; }
      return;
    }
    if (bt.dataset.pessoa) { form.pessoa = bt.dataset.pessoa; form.passo = 2; return passo(); }
    if (bt.dataset.cat) { form.categoria = bt.dataset.cat; form.titulo = ''; form.passo = 3; return passo(); }
    if (bt.hasAttribute('data-back')) { form.passo = form.passo === 3 ? 2 : 1; return passo(); }
    if (bt.dataset.m !== undefined && form.passo === 3) { sheet().querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === bt)); if (bt.dataset.m) { form.meses = +bt.dataset.m; } return; }
    if (bt.dataset.v) { const i = document.getElementById('og-val'); i.value = String(num(i.value) + +bt.dataset.v); return; }
    if (bt.hasAttribute('data-save')) {
      const tit = document.getElementById('og-tit').value.trim() || cat(form.categoria)[2];
      const alvo = num(document.getElementById('og-alvo').value), gu = num(document.getElementById('og-gu').value);
      if (!alvo) { document.getElementById('og-alvo').focus(); document.getElementById('og-alvo').classList.add('err'); return; }
      let prazo = form.prazo || null;
      if (form.meses) { const d = new Date(); d.setMonth(d.getMonth() + form.meses, 1); prazo = d.toISOString().slice(0, 10); }
      bt.disabled = true; bt.textContent = 'Salvando…';
      try { await window.APP.objetivos.salvar({ id: form.id, pessoa: form.pessoa || 'familia', categoria: form.categoria || 'outro', titulo: tit, valor_alvo: alvo, valor_guardado: gu, prazo }); fechar(); carregar(); }
      catch (err) { console.error(err); bt.disabled = false; bt.textContent = 'Não salvou. Tentar de novo'; }
      return;
    }
    if (bt.hasAttribute('data-addsave')) {
      const v = num(document.getElementById('og-val').value); if (!v) return;
      bt.disabled = true; bt.textContent = 'Guardando…';
      try { await window.APP.objetivos.salvar({ ...form, valor_guardado: (+form.valor_guardado || 0) + v }); fechar(); carregar(); }
      catch (err) { console.error(err); bt.disabled = false; bt.textContent = 'Não salvou. Tentar de novo'; }
      return;
    }
    if (bt.hasAttribute('data-del')) {
      if (bt.dataset.ok) { try { await window.APP.objetivos.apagar(form.id); } catch (err) { console.error(err); } fechar(); carregar(); }
      else { bt.dataset.ok = '1'; bt.textContent = 'Toque de novo para apagar'; }
    }
  }

  function montar() {
    const dr = document.getElementById('dash-root'); if (!dr || !window.APP) return;
    root = document.createElement('section'); root.className = 'og'; root.id = 'objetivos-pg'; dr.prepend(root);
    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-f]'); if (f) { filtro = f.dataset.f; return render(); }
      if (e.target.closest('[data-new]')) return abrir(null);
      if (e.target.closest('[data-people]')) return listaPessoas();
      const art = e.target.closest('.ob-goal'); if (!art) return;
      const o = lista.find((x) => String(x.id) === art.dataset.id); if (!o) return;
      if (e.target.closest('[data-add]')) return guardar(o);
      abrir(o);
    });
    const sh = document.createElement('div'); sh.className = 'og-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Objetivo');
    sh.innerHTML = '<div class="og-scrim"></div><div class="og-panel"><div class="ob-grab"></div><div class="og-body"></div></div>';
    sh.addEventListener('click', onSheet); document.body.append(sh);
    // aba no computador
    const tabs = document.querySelector('.fv-tabs');
    if (tabs) { const b = document.createElement('button'); b.className = 'fv-tab'; b.type = 'button'; b.id = 'tab-objetivos'; b.textContent = '🎯 Objetivos'; b.addEventListener('click', () => window.OIKOS_OBJ.show()); tabs.appendChild(b); }
    document.querySelectorAll('.fv-tab[data-tab]').forEach((b) => b.addEventListener('click', () => window.OIKOS_OBJ.hide()));
    window.OIKOS_OBJ = {
      show: () => { document.body.classList.remove('cs-on', 'ng-on'); document.body.classList.add('og-on'); const t = document.getElementById('tab-objetivos'); document.querySelectorAll('.fv-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t))); carregar(); scrollTo(0, 0); document.dispatchEvent(new Event('oikos:tab')); },
      hide: () => { if (document.body.classList.contains('og-on')) { document.body.classList.remove('og-on'); document.dispatchEvent(new Event('oikos:tab')); } },
    };
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 20));
})();
