// Oikos — Objetivos (sonhos) da família e de cada pessoa. Feito para ser simples: escolher quem, escolher o sonho, dizer quanto e quando.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const PESSOAS = [['familia', '👨‍👩‍👦', 'Família'], ['george', '🧔', 'George'], ['jheniffer', '👩', 'Jheniffer'], ['abner', '👶', 'Abner']];
  const CATS = [
    ['reserva', '🛟', 'Reserva de emergência'], ['casa', '🏠', 'Casa própria'], ['reforma', '🛠️', 'Reforma da casa'], ['carro', '🚗', 'Carro'],
    ['viagem', '✈️', 'Viagem'], ['estudos', '🎓', 'Estudos'], ['dividas', '💳', 'Quitar dívidas'], ['festa', '🎉', 'Festa / casamento'],
    ['filho', '🧸', 'Futuro do filho'], ['aposentadoria', '🌴', 'Aposentadoria'], ['eletronicos', '📱', 'Celular / eletrônicos'], ['saude', '💪', 'Saúde'],
    ['doacao', '🙏', 'Doação / missões'], ['negocio', '💼', 'Negócio próprio'], ['moto', '🏍️', 'Moto'], ['outro', '⭐', 'Outro sonho'],
  ];
  const PRAZOS = [[6, '6 meses'], [12, '1 ano'], [24, '2 anos'], [36, '3 anos'], [60, '5 anos'], [120, '10 anos']];
  const pes = (k) => PESSOAS.find((p) => p[0] === k) || PESSOAS[0];
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
        <div class="og-tt"><b>${o.titulo}</b><span class="og-who">${p[1]} ${p[2]}</span></div></div>
      <div class="og-bar"><i style="width:${Math.max(2, pct)}%"></i></div>
      <div class="og-nums"><span><b>${BRL.format(g)}</b> de ${BRL.format(alvo)}</span><span>${Math.round(pct)}%</span></div>
      <p class="og-msg">${feito ? '🎉 Conseguiram! Objetivo alcançado.' : porMes ? `Guardar <b>${BRL.format(Math.ceil(porMes))} por mês</b> para chegar em ${quando}.` : `Faltam ${BRL.format(falta)}.`}</p>
      <div class="og-act"><button type="button" class="og-add" data-add>➕ Guardei dinheiro</button><button type="button" class="og-edit" data-edit aria-label="Editar">✏️</button></div>
    </article>`;
  }

  function render() {
    if (!root) return;
    const chips = [['todos', '✨', 'Todos'], ...PESSOAS].map(([k, e, n]) => `<button type="button" class="ob-chip${filtro === k ? ' on' : ''}" data-f="${k}">${e} ${n}</button>`).join('');
    const vis = lista.filter((o) => filtro === 'todos' || o.pessoa === filtro);
    const total = vis.reduce((s, o) => s + (+o.valor_guardado || 0), 0), alvo = vis.reduce((s, o) => s + (+o.valor_alvo || 0), 0);
    root.innerHTML = `<h1 class="og-h">Objetivos</h1>
      <p class="og-sub">Os sonhos da família e de cada um. Toque em <b>➕ Guardei dinheiro</b> sempre que separar um valor.</p>
      <div class="ob-chips">${chips}</div>
      ${vis.length ? `<p class="og-tot">Guardado: <b>${BRL.format(total)}</b> de ${BRL.format(alvo)}</p>` : ''}
      <div class="og-list">${vis.map(card).join('') || '<p class="og-empty">Nenhum objetivo aqui ainda. Que tal criar o primeiro? 🙂</p>'}</div>
      <button type="button" class="og-new" data-new>＋ Novo objetivo</button>`;
  }

  async function carregar() { try { lista = await window.APP.objetivos.listar(); } catch (e) { console.error(e); lista = []; } render(); }

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
      b.innerHTML = '<p class="og-q">Para quem é esse sonho?</p><div class="og-pick big">' + PESSOAS.map(([k, e, n]) => `<button type="button" data-pessoa="${k}"><span>${e}</span>${n}</button>`).join('') + '</div>';
    } else if (form.passo === 2) {
      b.innerHTML = '<button type="button" class="og-back" data-back>‹ Voltar</button><p class="og-q">Qual é o sonho?</p><div class="og-pick">' + CATS.map(([k, e, n]) => `<button type="button" data-cat="${k}"><span>${e}</span>${n}</button>`).join('') + '</div>';
    } else {
      const c = cat(form.categoria), p = pes(form.pessoa);
      const prazoSel = form.prazo && !form.meses ? 'data' : form.meses;
      b.innerHTML = `${form.id ? '' : '<button type="button" class="og-back" data-back>‹ Voltar</button>'}
        <p class="og-q">${c[1]} ${form.id ? 'Editar objetivo' : c[2]} <small>${p[1]} ${p[2]}</small></p>
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

  async function onSheet(e) {
    const t = e.target;
    if (t.classList.contains('og-scrim')) return fechar();
    const bt = t.closest('button'); if (!bt) return;
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
      show: () => { document.body.classList.remove('cs-on'); document.body.classList.add('og-on'); const t = document.getElementById('tab-objetivos'); document.querySelectorAll('.fv-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t))); carregar(); scrollTo(0, 0); document.dispatchEvent(new Event('oikos:tab')); },
      hide: () => { if (document.body.classList.contains('og-on')) { document.body.classList.remove('og-on'); document.dispatchEvent(new Event('oikos:tab')); } },
    };
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 20));
})();
