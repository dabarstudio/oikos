// Denário — Plano de ação de cada talento: questionário rápido → ações do dia e da semana com checklist,
// lembretes quando ficam sem marcar e incentivos quando completa.
(function () {
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const semanaDe = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return 'S' + d.toISOString().slice(0, 10); };

  const Q = [
    ['modelo', 'Como esse talento ganha dinheiro?', [['revenda', '📦', 'Compro e revendo produtos'], ['producao', '🧁', 'Eu faço e vendo (comida, artesanato…)'], ['servico', '🛠️', 'Presto um serviço'], ['online', '💻', 'Online (conteúdo, curso, afiliado)']]],
    ['canal', 'Onde vende mais?', [['insta', '📱', 'Instagram e WhatsApp'], ['marketplace', '🛒', 'Marketplace (Shopee, Mercado Livre…)'], ['presencial', '🤝', 'Pessoalmente / feira / loja'], ['indicacao', '🗣️', 'Indicação de clientes']]],
    ['horas', 'Quanto tempo por dia dá para dedicar?', [['30', '⏱️', 'Uns 30 minutos'], ['60', '🕐', 'Cerca de 1 hora'], ['120', '🕑', '2 horas ou mais']]],
  ];

  // quantas vendas por dia a meta pede
  function numeros(p, c) {
    const dt = new Date(hoje() + 'T12:00:00'); const diasMes = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    const restam = diasMes - dt.getDate() + 1;
    const lucMed = c && c.lucMedio > 0 ? c.lucMedio : Number((p.perfil || {}).ticket || 0) || 40;
    const falta = Math.max(0, Number(p.meta || 0) - (c ? c.lucro : 0));
    const vendasDia = p.meta ? falta / restam / lucMed : 0.5;
    const conversas = Math.max(3, Math.min(30, Math.ceil(Math.max(vendasDia, 0.3) * 8)));
    return { vendasDia, conversas, falta, restam };
  }
  function acoes(p, c) {
    const pf = p.perfil || {}; const n = numeros(p, c); const curto = Number(pf.horas || 60) <= 30;
    const d = [], s = [];
    const add = (arr, id, t, dica) => arr.push({ id, t, dica });
    if (pf.canal === 'insta') { add(d, 'story', `Postar ${curto ? 1 : 2} stories mostrando produto e preço`, 'Foto boa + preço + "chama no direct"'); add(d, 'msg', `Chamar ${n.conversas} pessoas no WhatsApp com uma oferta`, 'Lista de transmissão ou mensagem pessoal'); add(d, 'resp', 'Responder todas as mensagens até as 20h', 'Resposta rápida vende mais'); }
    else if (pf.canal === 'marketplace') { add(d, 'perg', 'Responder todas as perguntas dos anúncios', 'Em até 1 hora, se der'); add(d, 'anun', `Melhorar ${curto ? 1 : 2} anúncio${curto ? '' : 's'} (foto, título ou preço)`, ''); add(d, 'msg', `Divulgar o link para ${Math.ceil(n.conversas / 2)} contatos`, ''); }
    else if (pf.canal === 'presencial') { add(d, 'ofer', `Oferecer para ${n.conversas} pessoas`, 'Leve mostruário ou cartão'); add(d, 'msg', 'Mandar mensagem para 3 clientes antigos', ''); }
    else { add(d, 'indic', 'Pedir 1 indicação para um cliente satisfeito', 'Ofereça um mimo para quem indicar'); add(d, 'msg', `Mandar mensagem para ${Math.ceil(n.conversas / 2)} clientes antigos`, ''); }
    if (pf.modelo === 'producao') add(d, 'prod', 'Produzir ou separar o lote do dia', '');
    if (pf.modelo === 'servico') add(d, 'agenda', 'Confirmar a agenda de amanhã', '');
    if (pf.modelo === 'online') add(d, 'cont', 'Publicar 1 conteúdo de valor', '');
    add(d, 'reg', 'Registrar no Denário as vendas e compras do dia', 'Assim a jornada mostra o placar certo');
    if (pf.modelo === 'revenda') add(s, 'rep', 'Repor o estoque do produto que mais vende', '');
    add(s, 'dep', 'Postar ou mandar 1 depoimento de cliente', 'Prova social');
    add(s, 'novo', `Testar 1 ${pf.modelo === 'servico' ? 'serviço' : 'produto'} ou oferta nova`, '');
    add(s, 'rev', 'Domingo: olhar o lucro da semana no app', '');
    add(s, 'diz', 'Separar o dízimo e a oferta do lucro', '“Honra ao Senhor com as primícias” (Pv 3:9)');
    return { d, s, n };
  }
  const checksDe = (p) => p.checks || (window.APP.projetos.extraLocal(p.id).checks) || {};
  const perfilDe = (p) => p.perfil || (window.APP.projetos.extraLocal(p.id).perfil) || null;
  function status(p, c) {
    const pf = perfilDe(p); if (!pf) return null;
    const a = acoes({ ...p, perfil: pf }, c); const ck = checksDe(p);
    const fD = (ck[hoje()] || []).filter((x) => a.d.some((y) => y.id === x)).length;
    const fS = (ck[semanaDe(hoje())] || []).filter((x) => a.s.some((y) => y.id === x)).length;
    // dias seguidos com o plano do dia completo
    let seq = 0; const x = new Date(hoje() + 'T12:00:00'); if (fD < a.d.length) x.setDate(x.getDate() - 1);
    for (;;) { const k = x.toISOString().slice(0, 10); if ((ck[k] || []).length >= a.d.length) { seq++; x.setDate(x.getDate() - 1); } else break; }
    return { a, ck, fD, fS, seq, pf };
  }

  function card(p, c) {
    const st = status(p, c);
    if (!st) return `<div class="ng-card pl-card pl-novo"><h3>📋 Plano de ação</h3><p>Responda <b>3 perguntas rápidas</b> sobre este talento e o Denário monta as ações de cada dia e de cada semana para bater a meta, com checklist.</p><button type="button" class="pl-btn" data-plq="${p.id}">Responder agora (1 minuto)</button></div>`;
    const { a, ck, fD, fS, seq } = st; const cD = ck[hoje()] || [], cS = ck[semanaDe(hoje())] || [];
    const item = (o, marc, per) => `<label class="pl-it ${marc ? 'ok' : ''}"><input type="checkbox" data-plck="${p.id}" data-per="${per}" value="${o.id}" ${marc ? 'checked' : ''}><span><b>${esc(o.t)}</b>${o.dica ? `<small>${esc(o.dica)}</small>` : ''}</span></label>`;
    const tudo = fD >= a.d.length;
    const h = new Date().getHours();
    const msg = tudo ? `🎉 Plano de hoje completo! ${seq > 1 ? `${seq} dias seguidos. ` : ''}“Muito bem, servo bom e fiel.”` : h >= 18 && fD === 0 ? '⏰ O dia está acabando e nenhuma ação foi marcada. Que tal fazer só a primeira agora?' : fD ? `Faltam ${a.d.length - fD} de ${a.d.length}. ${seq ? `Não quebre a sequência de ${seq} dia${seq > 1 ? 's' : ''}! 🔥` : 'Continue!'}` : 'Comece pela primeira: são passos pequenos que fazem a meta acontecer.';
    return `<div class="ng-card pl-card">
      <div class="pl-top"><h3>📋 Ações de hoje</h3><span class="pl-cont ${tudo ? 'ok' : ''}">${fD}/${a.d.length}</span></div>
      <div class="pl-bar"><i style="width:${a.d.length ? fD / a.d.length * 100 : 0}%"></i></div>
      <p class="pl-msg ${tudo ? 'ok' : ''}">${msg}</p>
      ${a.d.map((o) => item(o, cD.includes(o.id), 'd')).join('')}
      <div class="pl-top pl-sem"><h3>🗓️ Ações da semana</h3><span class="pl-cont ${fS >= a.s.length ? 'ok' : ''}">${fS}/${a.s.length}</span></div>
      ${a.s.map((o) => item(o, cS.includes(o.id), 's')).join('')}
      <div class="pl-pe"><button type="button" class="pl-link" data-plics="${p.id}">⏰ Lembrete diário no celular</button><button type="button" class="pl-link" data-plq="${p.id}">✏️ Refazer perguntas</button></div>
    </div>`;
  }

  // ---------- questionário ----------
  let sh, qp, resp;
  function perguntar(id) {
    qp = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === String(id)); if (!qp) return;
    resp = { ...(perfilDe(qp) || {}) }; resp.passo = 0;
    if (!sh) { sh = document.createElement('div'); sh.className = 'vc-sheet pl-sheet'; sh.innerHTML = '<div class="vc-scrim" data-plfechar></div><div class="vc-panel" role="dialog" aria-modal="true"><div class="vc-body"></div></div>'; document.body.appendChild(sh); }
    desenharQ(); document.body.classList.add('pl-open');
  }
  function desenharQ() {
    const b = sh.querySelector('.vc-body');
    if (resp.passo < Q.length) {
      const [k, t, ops] = Q[resp.passo];
      b.innerHTML = `<p class="pl-pp">Pergunta ${resp.passo + 1} de ${Q.length + 1} · ${esc(qp.nome)}</p><p class="vc-t">${t}</p>
        <div class="pl-ops">${ops.map(([v, e, n]) => `<button type="button" data-plr="${k}" data-v="${v}" class="${resp[k] === v ? 'on' : ''}"><span>${e}</span>${n}</button>`).join('')}</div>
        ${resp.passo ? '<button type="button" class="nt-btn sec" data-plvolta>‹ Voltar</button>' : '<button type="button" class="nt-btn sec" data-plfechar>Agora não</button>'}`;
    } else {
      b.innerHTML = `<p class="pl-pp">Pergunta ${Q.length + 1} de ${Q.length + 1} · ${esc(qp.nome)}</p><p class="vc-t">Quanto quer de lucro por mês com ele?</p>
        <label class="vc-l">Meta de lucro do mês (R$)<input id="pl-meta" class="sv-in" inputmode="decimal" placeholder="Ex.: 1.000" value="${qp.meta || ''}"></label>
        <label class="vc-l">Lucro médio por venda (R$) <small>(se não sabe, chute)</small><input id="pl-tk" class="sv-in" inputmode="decimal" placeholder="Ex.: 40" value="${resp.ticket || ''}"></label>
        <button type="button" class="nt-btn" data-plfim>Montar meu plano</button><button type="button" class="nt-btn sec" data-plvolta>‹ Voltar</button>`;
    }
  }
  const num = (v) => { const n = parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  async function salvarQ() {
    const meta = num(document.getElementById('pl-meta').value), tk = num(document.getElementById('pl-tk').value);
    const perfil = { modelo: resp.modelo, canal: resp.canal, horas: resp.horas, ticket: tk || null };
    qp.perfil = perfil;
    try { if (meta && meta !== Number(qp.meta || 0)) { qp.meta = meta; await window.APP.projetos.salvar(qp); } await window.APP.projetos.guardarExtra(qp.id, { perfil }); } catch (e) { console.error(e); }
    document.body.classList.remove('pl-open'); if (window.OIKOS_PROJ.render) window.OIKOS_PROJ.render();
  }

  // ---------- marcar ações ----------
  async function marcar(inp) {
    const p = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === inp.dataset.plck); if (!p) return;
    const k = inp.dataset.per === 's' ? semanaDe(hoje()) : hoje();
    const ck = { ...checksDe(p) }; const l = new Set(ck[k] || []); if (inp.checked) l.add(inp.value); else l.delete(inp.value); ck[k] = [...l];
    // guarda só os últimos 60 registros
    const ks = Object.keys(ck).sort(); while (ks.length > 60) delete ck[ks.shift()];
    p.checks = ck;
    try { await window.APP.projetos.guardarExtra(p.id, { checks: ck }); } catch (e) { console.error(e); }
    if (window.OIKOS_PROJ.render) window.OIKOS_PROJ.render();
    if (navigator.vibrate && inp.checked) try { navigator.vibrate(15); } catch (e) { /* ok */ }
  }

  // ---------- lembrete no calendário do celular (.ics) ----------
  function ics(id) {
    const p = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === String(id)); if (!p) return;
    const d = new Date(); const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const url = location.origin + location.pathname;
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Denario//PT-BR', 'BEGIN:VEVENT', 'UID:denario-' + p.id + '@dabarstudio', 'DTSTAMP:' + ymd + 'T120000Z',
      'DTSTART:' + ymd + 'T190000', 'DURATION:PT15M', 'RRULE:FREQ=DAILY', 'SUMMARY:🪙 ' + p.nome + ': marcar as ações de hoje', 'DESCRIPTION:Abra o Denário e marque o checklist de hoje. ' + url, 'URL:' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Ações de hoje do ' + p.nome, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'lembrete-' + p.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
  }

  // ---------- lembrete no Início e na barra ----------
  function lembrar() {
    const ps = (window.OIKOS_PROJ && window.OIKOS_PROJ.lista()) || []; const h = new Date().getHours();
    const pend = ps.map((p) => ({ p, st: status(p, null) })).filter((x) => x.st && x.st.fD < x.st.a.d.length);
    const nav = document.querySelector('.ob-nav [data-ng]'); if (nav) nav.classList.toggle('pl-dot', pend.length > 0 && h >= 10);
    const hero = document.querySelector('#casa .cs-hero'); if (!hero) return;
    let el = document.getElementById('pl-lembra');
    if (!pend.length || h < 10) { if (el) el.remove(); return; }
    const x = pend[0]; const resto = x.st.a.d.length - x.st.fD;
    const txt = h >= 18 ? (x.st.seq ? `Não perca a sequência de <b>${x.st.seq} dia${x.st.seq > 1 ? 's' : ''}</b>!` : 'Ainda dá tempo de fazer pelo menos uma.') : 'Cada ação marcada é um passo para a meta do mês.';
    const html = `<button type="button" class="pl-lembra" data-plir="${x.p.id}"><span>⏰</span><span><b>${esc(x.p.nome)}: ${resto} ${resto > 1 ? 'ações' : 'ação'} de hoje sem marcar</b><small>${txt}</small></span><span aria-hidden="true">›</span></button>`;
    if (!el) { el = document.createElement('div'); el.id = 'pl-lembra'; }
    if (el.innerHTML !== html) el.innerHTML = html;
    const pil = document.querySelector('#casa .sb-card'); const ref = pil || hero;
    if (ref.nextElementSibling !== el) ref.after(el);
  }

  document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-plck]'); if (i) marcar(i); });
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-plq]'); if (q) return perguntar(q.dataset.plq);
    const r = e.target.closest('[data-plr]'); if (r) { resp[r.dataset.plr] = r.dataset.v; resp.passo++; return desenharQ(); }
    if (e.target.closest('[data-plvolta]')) { resp.passo = Math.max(0, resp.passo - 1); return desenharQ(); }
    if (e.target.closest('[data-plfim]')) return salvarQ();
    if (e.target.closest('[data-plfechar]')) return document.body.classList.remove('pl-open');
    const ic = e.target.closest('[data-plics]'); if (ic) return ics(ic.dataset.plics);
    const ir = e.target.closest('[data-plir]'); if (ir) { if (window.OIKOS_IR) window.OIKOS_IR('negocio'); setTimeout(() => { const b = document.querySelector(`[data-ngabre="${ir.dataset.plir}"]`); if (b) b.click(); }, 150); }
  });
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(lembrar, 120); }).observe(document.documentElement, { childList: true, subtree: true });
  window.OIKOS_PLANO = { card, perguntar, status };
})();
