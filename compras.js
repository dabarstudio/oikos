// Denário — "Nossa lista de compras": checklist da família (vai marcando no mercado),
// puxa itens da lista sugerida, confere com a notinha e compara o planejado com o comprado de fato.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const fmtQ = (q) => String(Math.round(Number(q || 0) * 100) / 100).replace('.', ',');
  const api = () => window.APP && window.APP.compras;
  let todos = [], abertoCarrinho = false, carregado = false, ocupado = false;

  const atual = () => todos.filter((x) => !x.fechada_em);
  const falta = () => atual().filter((x) => !x.comprado);
  const carrinho = () => atual().filter((x) => x.comprado);
  const est = (x) => (x.preco_ref != null ? Number(x.preco_ref) * Number(x.qtd || 1) : null);

  // ---------- conferir com a notinha: casa os nomes da lista com os itens do cupom ----------
  const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'tipo', 'para', 'pct', 'und', 'uni', 'unid', 'cx', 'kg', 'gr', 'ml', 'lt', 'emb', 'pc', 'tp1', 'tp']);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ');
  const toks = (s) => norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w));
  function parecido(a, b) { if (a === b) return true; if (a.length < 4 || b.length < 4) return false; return a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4)); }
  function nota(itemNome, desc) {
    const ti = toks(itemNome), td = toks(desc); if (!ti.length || !td.length) return 0;
    const ok = ti.filter((t) => td.some((d) => parecido(t, d))).length / ti.length;
    // no cupom o produto vem primeiro ("LEITE INTEGRAL"); "CHOCOLATE AO LEITE" não é leite
    return parecido(ti[0], td[0]) ? ok + 0.5 : ok * 0.7;
  }
  function casar(lista, itensNota) {
    const pares = [];
    lista.forEach((l, i) => itensNota.forEach((n, j) => { const s = nota(l.item, n.descricao); if (s >= 0.5) pares.push({ i, j, s }); }));
    pares.sort((a, b) => b.s - a.s);
    const usL = new Set(), usN = new Set(), res = [];
    for (const p of pares) { if (usL.has(p.i) || usN.has(p.j)) continue; usL.add(p.i); usN.add(p.j); res.push(p); }
    return { pares: res, sobra: itensNota.filter((_, j) => !usN.has(j)) };
  }

  // ---------- comparação planejado × comprado ----------
  function comparar(rows) {
    const plan = rows.filter((x) => x.origem !== 'extra');
    const comp = plan.filter((x) => x.comprado), fora = plan.filter((x) => !x.comprado);
    const extras = rows.filter((x) => x.origem === 'extra');
    const sug = plan.filter((x) => x.origem === 'sugerida');
    const soma = (l, f) => l.reduce((s, x) => s + (f(x) || 0), 0);
    return {
      plan, comp, fora, extras,
      sugTot: sug.length, sugComp: sug.filter((x) => x.comprado).length,
      estPlan: soma(plan, est), estComp: soma(comp, est),
      pagoComp: soma(comp, (x) => (x.valor_pago != null ? Number(x.valor_pago) : null)),
      temPagoComp: comp.some((x) => x.valor_pago != null),
      pagoExtra: soma(extras, (x) => (x.valor_pago != null ? Number(x.valor_pago) : null)),
      pct: plan.length ? Math.round(comp.length / plan.length * 100) : 0,
      nota: rows.some((x) => x.nota_id),
    };
  }

  // ---------- desenho ----------
  function linha(x) {
    const e = est(x);
    const meta = [x.qtd ? fmtQ(x.qtd) + (x.unidade ? ' ' + esc(x.unidade) : '') : '', e != null ? '~' + BRL.format(e) : '', x.onde ? esc(x.onde) : ''].filter(Boolean).join(' · ');
    const tag = x.origem === 'sugerida' ? '<span class="cp-tag">sugerido</span>' : x.origem === 'extra' ? '<span class="cp-tag cp-tag-x">fora da lista</span>' : '';
    if (x.comprado) {
      return `<li class="cp-it ok" data-id="${x.id}"><button type="button" class="cp-chk" data-chk aria-label="Desmarcar ${esc(x.item)}" aria-pressed="true">✓</button>
        <span class="cp-n"><b>${esc(x.item)}</b>${tag}<small>${meta}</small></span>
        <label class="cp-pago"><span>paguei</span><input inputmode="decimal" data-pago placeholder="R$" value="${x.valor_pago != null ? String(x.valor_pago).replace('.', ',') : ''}" aria-label="Quanto pagou em ${esc(x.item)}"></label></li>`;
    }
    const preco = [e != null ? '~' + BRL.format(e) : ''].filter(Boolean).join('');
    return `<li class="cp-it" data-id="${x.id}"><button type="button" class="cp-chk" data-chk aria-label="Marcar ${esc(x.item)} como comprado" aria-pressed="false"></button>
      <span class="cp-n"><b>${esc(x.item)}</b>${tag}<span class="cp-ln"><span class="cp-q"><button type="button" data-q="-1" aria-label="Menos ${esc(x.item)}">−</button><em>${fmtQ(x.qtd || 1)}${x.unidade ? ' ' + esc(x.unidade) : ''}</em><button type="button" data-q="1" aria-label="Mais ${esc(x.item)}">＋</button></span>${preco ? `<small>${preco}</small>` : ''}</span></span>
      <button type="button" class="cp-del" data-del aria-label="Tirar ${esc(x.item)} da lista">✕</button></li>`;
  }

  function historico() {
    const fechadas = todos.filter((x) => x.fechada_em);
    const grupos = {}; fechadas.forEach((x) => { const k = String(x.fechada_em).slice(0, 16); (grupos[k] = grupos[k] || []).push(x); });
    const ks = Object.keys(grupos).sort().reverse().slice(0, 5);
    if (!ks.length) return '';
    return `<details class="cp-hist"><summary>🗂️ Compras anteriores (${ks.length})</summary><ul>${ks.map((k) => {
      const c = comparar(grupos[k]); const d = k.slice(8, 10) + '/' + k.slice(5, 7);
      const pago = c.pagoComp + c.pagoExtra;
      return `<li><b>${d}</b><span>seguiu <b class="${c.pct >= 80 ? 'bom' : c.pct >= 50 ? 'meio' : 'ruim'}">${c.pct}%</b> da lista · ${c.comp.length}/${c.plan.length} itens${pago ? ' · ' + BRL.format(pago) + ' pago' : ''}${c.extras.length ? ` · <em>${c.extras.length} fora da lista${c.pagoExtra ? ' (' + BRL.format(c.pagoExtra) + ')' : ''}</em>` : ''}</span></li>`;
    }).join('')}</ul></details>`;
  }

  function desenhar() {
    const pg = document.getElementById('mercado'); if (!pg) return;
    let box = document.getElementById('card-minha-lista');
    if (!box) { box = document.createElement('div'); box.id = 'card-minha-lista'; box.className = 'fv-card cp-card'; pg.prepend(box); }
    const f = falta(), c = carrinho(), tot = f.length + c.length;
    const pct = tot ? Math.round(c.length / tot * 100) : 0;
    const estF = f.reduce((s, x) => s + (est(x) || 0), 0);
    const temSug = window.dash && dash.data('lista_compras').status === 'ok';
    // agrupa o que falta pelo lugar
    const lugares = [...new Set(f.map((x) => x.onde || ''))];
    const faltaHtml = lugares.map((o) => `${lugares.length > 1 ? `<h4 class="cp-onde">${o ? esc(o) : 'Minha lista'}</h4>` : ''}<ul class="cp-ul">${f.filter((x) => (x.onde || '') === o).map(linha).join('')}</ul>`).join('');
    box.innerHTML = `<div class="cp-top"><h3>🛒 Nossa lista de compras</h3>${tot ? `<span class="cp-cont">${c.length} de ${tot} no carrinho</span>` : ''}</div>
      ${tot ? `<div class="cp-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Itens já comprados"><i style="width:${pct}%"></i></div>` : '<p class="fv-note">Anote o que precisa comprar e vá marcando no mercado. No fim, o Denário compara o que estava na lista com o que foi comprado de fato.</p>'}
      <form class="cp-add" data-add autocomplete="off"><input id="cp-novo" placeholder="Ex.: leite" aria-label="Item para comprar" enterkeyhint="done">
        <input id="cp-qtd" inputmode="decimal" placeholder="qtd" aria-label="Quantidade" value=""><button type="submit" aria-label="Adicionar">＋</button></form>
      <div class="cp-acts">${temSug ? '<button type="button" data-sug>✨ Puxar da lista sugerida</button>' : ''}${f.length ? '<button type="button" data-wpp>📋 Copiar p/ WhatsApp</button>' : ''}</div>
      ${f.length ? `<div class="cp-sec"><span>Falta comprar · ${f.length}</span>${estF ? `<small>~${BRL.format(estF)}</small>` : ''}</div>${faltaHtml}` : tot ? '<p class="cp-tudo">🎉 Tudo no carrinho!</p>' : ''}
      ${c.length ? `<button type="button" class="cp-sec cp-tog" data-car aria-expanded="${abertoCarrinho}"><span>✓ No carrinho · ${c.length}</span><small>${abertoCarrinho ? 'esconder' : 'ver'}</small></button>
        ${abertoCarrinho ? `<ul class="cp-ul">${c.map(linha).join('')}</ul>` : ''}` : ''}
      ${tot ? `<button type="button" class="cp-extra" data-extra>＋ Comprei algo fora da lista</button>
      <div class="cp-fim"><button type="button" class="cp-btn2" data-nota>🧾 Conferir com a notinha</button><button type="button" class="cp-btn" data-fim>✅ Finalizar compra</button></div>` : ''}
      ${historico()}
      <p class="cp-ok" id="cp-msg" role="status" hidden></p>`;
    atalhoInicio();
  }

  function aviso(t) { const m = document.getElementById('cp-msg'); if (!m) return; m.textContent = t; m.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { m.hidden = true; }, 3500); }

  // atalho no Início, logo abaixo do "Anotar gasto"
  function atalhoInicio() {
    const anot = document.querySelector('#casa .cs-anot'); if (!anot) return;
    let a = document.getElementById('cp-atalho');
    if (!a) { a = document.createElement('button'); a.type = 'button'; a.id = 'cp-atalho'; a.className = 'cp-atalho'; a.addEventListener('click', irLista); }
    if (a.previousElementSibling !== anot) anot.after(a);
    const n = falta().length;
    const h = `<span aria-hidden="true">🛒</span><span><b>Lista de compras</b><small>${n ? n + (n > 1 ? ' itens faltando' : ' item faltando') : carregado && carrinho().length ? 'tudo no carrinho' : 'monte a lista e marque no mercado'}</small></span><i aria-hidden="true">›</i>`;
    if (a.innerHTML !== h) a.innerHTML = h;
  }
  function irLista() {
    if (window.OIKOS_IR) window.OIKOS_IR('mercado');
    setTimeout(() => { const b = document.getElementById('card-minha-lista'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
  }

  // ---------- folha (sheet) para conferir notinha e finalizar ----------
  function sheet(html) {
    let s = document.getElementById('cp-sheet');
    if (!s) { s = document.createElement('div'); s.id = 'cp-sheet'; s.className = 'cp-scrim'; s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-fechar]')) s.remove(); }); document.body.appendChild(s); }
    s.innerHTML = `<div class="cp-sh" role="dialog" aria-modal="true"><div class="cp-grab"></div>${html}</div>`;
    return s;
  }

  function telaComparar() {
    const r = comparar(atual());
    const dif = r.temPagoComp && r.estComp ? r.pagoComp - r.estComp : null;
    const pagoTot = r.pagoComp + r.pagoExtra;
    const cor = r.pct >= 80 ? 'bom' : r.pct >= 50 ? 'meio' : 'ruim';
    const frase = r.pct >= 80 && !r.extras.length ? 'Compra disciplinada: seguiram a lista e nada de impulso. 👏'
      : r.extras.length > 2 ? 'Vários itens fora da lista. Da próxima vez, coloque na lista antes de sair de casa.'
      : r.pct < 50 ? 'Muita coisa da lista ficou para trás. Ela está realista? Tire o que não precisa.' : 'Boa! Ajuste a lista com o que aprendeu nesta compra.';
    const s = sheet(`<h3>Planejado × comprado</h3>
      <div class="cp-ring ${cor}" style="--p:${r.pct}"><b>${r.pct}%</b><small>da lista</small></div>
      <p class="cp-frase">${frase}</p>
      <ul class="cp-cmp">
        <li><span>📝 Estava na lista</span><b>${r.plan.length} itens${r.estPlan ? ' · ~' + BRL.format(r.estPlan) : ''}</b></li>
        <li><span>✅ Comprado da lista</span><b>${r.comp.length} itens${r.temPagoComp ? ' · ' + BRL.format(r.pagoComp) : r.estComp ? ' · ~' + BRL.format(r.estComp) : ''}</b></li>
        ${dif != null ? `<li class="${dif > 0 ? 'neg' : 'pos'}"><span>${dif > 0 ? '📈 Pagou acima do previsto' : '📉 Pagou abaixo do previsto'}</span><b>${BRL.format(Math.abs(dif))}</b></li>` : ''}
        ${r.sugTot ? `<li><span>✨ Da lista sugerida</span><b>${r.sugComp} de ${r.sugTot}</b></li>` : ''}
        <li class="${r.extras.length ? 'neg' : 'pos'}"><span>🛍️ Fora da lista</span><b>${r.extras.length} itens${r.pagoExtra ? ' · ' + BRL.format(r.pagoExtra) : ''}</b></li>
      </ul>
      ${r.fora.length ? `<p class="cp-sub">Ficou para a próxima (${r.fora.length})</p><p class="cp-chips">${r.fora.map((x) => `<span>${esc(x.item)}</span>`).join('')}</p>` : ''}
      ${r.extras.length ? `<p class="cp-sub">Comprado fora da lista</p><p class="cp-chips x">${r.extras.map((x) => `<span>${esc(x.item)}${x.valor_pago != null ? ' · ' + BRL.format(x.valor_pago) : ''}</span>`).join('')}</p>` : ''}
      <blockquote class="cp-vers">“Os pensamentos do diligente tendem só à abundância; porém os de todo apressado, tão somente à pobreza.” <cite>Provérbios 21:5</cite></blockquote>
      ${pagoTot && !r.nota ? `<button type="button" class="cp-btn2 cp-w" data-lancar="${pagoTot}">✍️ Lançar ${BRL.format(pagoTot)} no envelope Mercado</button>` : ''}
      ${r.nota ? '<p class="fv-note">O gasto já foi lançado pela notinha.</p>' : ''}
      ${r.fora.length ? '<label class="cp-manter"><input type="checkbox" id="cp-manter" checked> Levar o que faltou para a próxima lista</label>' : ''}
      <button type="button" class="cp-btn cp-w" data-guardar>Guardar comparação e começar lista nova</button>
      <button type="button" class="cp-link" data-fechar>Voltar para a lista</button>`);
    s.querySelector('[data-guardar]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      const manter = s.querySelector('#cp-manter') ? s.querySelector('#cp-manter').checked : false;
      const rows = atual();
      const ids = rows.filter((x) => !(manter && !x.comprado && x.origem !== 'extra')).map((x) => x.id);
      // o que faltou: fica numa cópia para a próxima lista; a comparação guarda o original como "não comprado"
      if (manter && r.fora.length) await api().inserir(r.fora.map((x, i) => ({ ...x, comprado: false, valor_pago: null, ordem: i })));
      if (manter) ids.push(...r.fora.map((x) => x.id));
      await api().fechar(ids); s.remove(); await recarregar(); aviso('Compra guardada. Lista nova pronta! 🛒');
    });
    const l = s.querySelector('[data-lancar]');
    if (l) l.addEventListener('click', () => { s.remove(); if (window.OIKOS_ANOTAR) window.OIKOS_ANOTAR({ prefill: { valor: Number(l.dataset.lancar), envelope: 'mercado', descricao: 'Compra da lista de compras', forma: 'debito' } }); });
  }

  async function telaNota() {
    const s = sheet('<h3>🧾 Conferir com a notinha</h3><p class="fv-note">Procurando notinhas lidas nos últimos 10 dias…</p>');
    let notas = []; try { notas = await api().notasLidas(); } catch (e) { notas = []; }
    if (!document.body.contains(s)) return;
    if (!notas.length) {
      s.querySelector('.cp-sh').innerHTML = `<div class="cp-grab"></div><h3>🧾 Conferir com a notinha</h3>
        <p class="cp-frase">Ainda não há notinha lida nos últimos dias. Fotografe o cupom em <b>Notinhas</b> e volte aqui: o Denário marca sozinho o que foi comprado e o preço de cada item.</p>
        <button type="button" class="cp-btn cp-w" data-fechar>Entendi</button>`; return;
    }
    s.querySelector('.cp-sh').innerHTML = `<div class="cp-grab"></div><h3>🧾 Qual notinha é desta compra?</h3>
      <div class="cp-notas">${notas.map((n, i) => `<button type="button" data-n="${i}"><b>${esc(n.loja || 'Compra')}</b><small>${n.data_compra ? n.data_compra.split('-').reverse().slice(0, 2).join('/') : ''} · ${(n.itens || []).length} itens${n.total ? ' · ' + BRL.format(n.total) : ''}</small></button>`).join('')}</div>
      <button type="button" class="cp-link" data-fechar>Cancelar</button>`;
    s.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', async () => {
      if (ocupado) return; ocupado = true; b.disabled = true;
      try {
        const n = notas[+b.dataset.n]; const lista = atual().filter((x) => x.origem !== 'extra' && !x.nota_id);
        const { pares, sobra } = casar(lista, n.itens || []);
        for (const p of pares) { const x = lista[p.i], it = n.itens[p.j]; await api().alterar(x.id, { comprado: true, valor_pago: it.total ?? null, nota_id: String(n.id).startsWith('dn') ? null : n.id, comprado_em: new Date().toISOString() }); }
        if (sobra.length) await api().inserir(sobra.map((it) => ({ item: it.descricao, qtd: it.qtd || 1, origem: 'extra', comprado: true, valor_pago: it.total ?? null, onde: n.loja || null })));
        s.remove(); abertoCarrinho = true; await recarregar();
        aviso(`Conferido: ${pares.length} ${pares.length === 1 ? 'item bateu' : 'itens bateram'} com a lista${sobra.length ? `, ${sobra.length} fora da lista` : ''}.`);
      } finally { ocupado = false; }
    }));
  }

  function telaExtra() {
    const s = sheet(`<h3>🛍️ Comprei algo fora da lista</h3>
      <p class="fv-note">Sem culpa: anotar ajuda a enxergar o que entra no carrinho por impulso.</p>
      <form class="cp-xf" autocomplete="off"><input id="cp-xn" placeholder="O que foi?" aria-label="Item fora da lista"><input id="cp-xv" inputmode="decimal" placeholder="R$ (opcional)" aria-label="Valor pago">
      <button type="submit" class="cp-btn cp-w">Adicionar ao carrinho</button></form>
      <button type="button" class="cp-link" data-fechar>Cancelar</button>`);
    setTimeout(() => s.querySelector('#cp-xn').focus(), 200);
    s.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const nome = s.querySelector('#cp-xn').value.trim(); if (!nome) return;
      await api().inserir([{ item: nome, origem: 'extra', comprado: true, valor_pago: num(s.querySelector('#cp-xv').value) }]);
      s.remove(); abertoCarrinho = true; await recarregar();
    });
  }

  // ---------- ações ----------
  async function puxarSugerida() {
    const d = dash.data('lista_compras'); if (d.status !== 'ok') return;
    const ja = new Set(atual().map((x) => x.sugerida_id).filter(Boolean));
    const novos = d.data.filter((r) => Number(r.qtd) > 0 && !ja.has(String(r.id))).map((r, i) => ({ item: r.item, qtd: r.qtd, unidade: r.unidade, preco_ref: r.preco_un, onde: r.onde, origem: 'sugerida', sugerida_id: String(r.id), ordem: 100 + i }));
    if (!novos.length) return aviso('Os itens sugeridos já estão na sua lista.');
    await api().inserir(novos); await recarregar(); aviso(`${novos.length} itens sugeridos entraram na lista. Tire o que não precisar com o ✕.`);
  }
  async function copiar() {
    const f = falta(); const lug = [...new Set(f.map((x) => x.onde || ''))]; const linhas = ['🛒 *Lista de compras*'];
    lug.forEach((o) => { if (lug.length > 1) linhas.push('', '*' + (o || 'Outros') + '*'); f.filter((x) => (x.onde || '') === o).forEach((x) => linhas.push('☐ ' + (x.qtd && Number(x.qtd) !== 1 ? fmtQ(x.qtd) + (x.unidade ? ' ' + x.unidade : '') + ' · ' : '') + x.item)); });
    const txt = linhas.join('\n');
    try { await navigator.clipboard.writeText(txt); aviso('Lista copiada. É só colar no WhatsApp.'); } catch (e) { location.href = 'https://wa.me/?text=' + encodeURIComponent(txt); }
  }

  document.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-add]')) return; e.preventDefault();
    const n = document.getElementById('cp-novo'), q = document.getElementById('cp-qtd');
    const nome = n.value.trim(); if (!nome || ocupado) return; ocupado = true;
    try { await api().inserir([{ item: nome, qtd: num(q.value) || 1, origem: 'minha', ordem: 0 }]); await recarregar(); } finally { ocupado = false; }
    const n2 = document.getElementById('cp-novo'); if (n2) n2.focus();
  });
  document.addEventListener('click', async (e) => {
    const box = e.target.closest('#card-minha-lista'); if (!box) return;
    const li = e.target.closest('.cp-it'); const x = li && todos.find((r) => String(r.id) === li.dataset.id);
    if (e.target.closest('[data-chk]') && x) {
      x.comprado = !x.comprado; x.comprado_em = x.comprado ? new Date().toISOString() : null; desenhar();
      return api().alterar(x.id, { comprado: x.comprado, comprado_em: x.comprado_em });
    }
    if (e.target.closest('[data-q]') && x) {
      x.qtd = Math.max(0.5, Number(x.qtd || 1) + Number(e.target.closest('[data-q]').dataset.q)); desenhar();
      return api().alterar(x.id, { qtd: x.qtd });
    }
    if (e.target.closest('[data-del]') && x) { todos = todos.filter((r) => r !== x); desenhar(); return api().apagar(x.id); }
    if (e.target.closest('[data-car]')) { abertoCarrinho = !abertoCarrinho; return desenhar(); }
    if (e.target.closest('[data-sug]')) return puxarSugerida();
    if (e.target.closest('[data-wpp]')) return copiar();
    if (e.target.closest('[data-extra]')) return telaExtra();
    if (e.target.closest('[data-nota]')) return telaNota();
    if (e.target.closest('[data-fim]')) return telaComparar();
  });
  document.addEventListener('change', (e) => {
    const inp = e.target.closest('#card-minha-lista [data-pago]'); if (!inp) return;
    const li = inp.closest('.cp-it'); const x = todos.find((r) => String(r.id) === li.dataset.id); if (!x) return;
    x.valor_pago = num(inp.value); api().alterar(x.id, { valor_pago: x.valor_pago });
  });

  async function recarregar() { try { todos = await api().listar(); } catch (e) { todos = []; } carregado = true; desenhar(); }

  function montar() {
    if (!window.APP || !window.APP.compras || !window.dash) return setTimeout(montar, 200);
    window.OIKOS_COMPRAS = { recarregar, ir: irLista, comparar, casar };
    dash.onData(() => { if (!carregado) recarregar(); else desenhar(); });
    // a lista é da família: quando o outro marca no celular dele, atualiza ao voltar para o app ou a cada 20 s na tela do Mercado
    document.addEventListener('visibilitychange', () => { if (!document.hidden && carregado) recarregar(); });
    setInterval(() => { const p = document.getElementById('mercado'); if (!document.hidden && p && !p.hidden && carregado && !document.querySelector('#card-minha-lista :focus')) recarregar(); }, 20000);
    // o Início é redesenhado de vez em quando: recoloca o atalho
    let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(atalhoInicio, 120); }).observe(document.getElementById('casa') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 60)); else setTimeout(montar, 60);
})();
