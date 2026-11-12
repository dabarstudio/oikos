// Denário — Plano de ação de cada talento.
// Questionário que muda conforme o tipo de negócio → funil (contatos → propostas → fechamentos) →
// ações do dia e da semana com checklist e contadores (ex.: visitas 3/8), lembretes e incentivos.
(function () {
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const semanaDe = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return 'S' + d.toISOString().slice(0, 10); };
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };

  const SEG = [['varejo', '🏪', 'Comércio e varejo'], ['alimentacao', '🍔', 'Bares, restaurantes e lanchonetes'], ['beleza', '💇', 'Beleza e estética'], ['saude', '🩺', 'Saúde (clínicas, farmácias)'],
    ['servicos', '🧰', 'Serviços e autônomos'], ['auto', '🔧', 'Oficinas e autopeças'], ['agro', '🌾', 'Agro e produtor rural'], ['outros', '➕', 'Outros']];
  const CAN_B2B = [['visita', '🚶', 'Visita presencial (porta a porta)'], ['whats', '📞', 'Ligação e WhatsApp'], ['indicacao', '🗣️', 'Indicação de clientes'], ['redes', '📱', 'Instagram / LinkedIn'], ['parceria', '🤝', 'Parceiros (contador, associação)']];

  // ---------- perguntas (mudam conforme o tipo) ----------
  // tipos: 'um' (escolhe 1), 'varios' (marca vários), 'campos' (digita)
  function perguntas(r) {
    const L = [['modelo', 'um', 'Como esse talento ganha dinheiro?', [['revenda', '📦', 'Compro e revendo produtos'], ['producao', '🧁', 'Eu faço e vendo (comida, artesanato…)'], ['servico', '🛠️', 'Presto um serviço'],
      ['representacao', '💼', 'Represento uma empresa / vendo para empresas (comissão)'], ['online', '💻', 'Online (conteúdo, curso, afiliado)']]]];
    if (r.modelo === 'representacao') {
      L.push(['oque', 'campos', 'O que você vende e de qual empresa?', [['oque', 'Produto ou serviço', 'Ex.: maquininha e taxas DSPAY para lojistas', 'text']]]);
      L.push(['recebe', 'um', 'Como você é pago?', [['por_cliente', '💵', 'Um valor por cliente fechado'], ['recorrente', '🔁', 'Um % do que o cliente movimenta, todo mês'], ['ambos', '➕', 'Os dois: valor na adesão + recorrente']]]);
      const cs = [];
      if (r.recebe !== 'recorrente') cs.push(['ganhoCliente', 'Quanto ganha por cliente fechado (R$)', 'Ex.: 150', 'num']);
      if (r.recebe !== 'por_cliente') cs.push(['ganhoRec', 'Quanto ganha por cliente ativo, por mês (R$)', 'Ex.: 40 (calcule pelo volume médio × sua %)', 'num']);
      L.push(['ganhos', 'campos', 'Quanto rende cada cliente?', cs]);
      L.push(['segmentos', 'varios', 'Qual o perfil dos clientes ideais? (marque todos)', SEG]);
      L.push(['porte', 'varios', 'Tamanho dos clientes', [['mei', '🧑', 'MEI e autônomos'], ['pequeno', '🏬', 'Pequenas empresas'], ['medio', '🏢', 'Médias empresas']]]);
      L.push(['regiao', 'campos', 'Onde vai prospectar?', [['regiao', 'Cidades ou bairros', 'Ex.: Alexânia, Abadiânia, centro de Anápolis', 'text']]]);
      L.push(['canais', 'varios', 'Como vai prospectar? (marque todos)', CAN_B2B]);
      L.push(['convProp', 'um', 'De cada 10 conversas, quantas viram proposta ou simulação?', [['2', '🙂', '2 de 10'], ['3', '😀', '3 de 10'], ['5', '🤩', '5 de 10'], ['', '🤷', 'Não sei (uso 3)']]]);
      L.push(['convFech', 'um', 'De cada 10 propostas, quantas fecham?', [['1', '🙂', '1 de 10'], ['2', '😀', '2 de 10'], ['3', '🤩', '3 de 10'], ['', '🤷', 'Não sei (uso 2)']]]);
    } else {
      L.push(['canal', 'um', 'Onde vende mais?', [['insta', '📱', 'Instagram e WhatsApp'], ['marketplace', '🛒', 'Marketplace (Shopee, Mercado Livre…)'], ['presencial', '🤝', 'Pessoalmente / feira / loja'], ['indicacao', '🗣️', 'Indicação de clientes']]]);
      L.push(['convFech', 'um', 'De cada 10 pessoas que você oferece, quantas compram?', [['1', '🙂', '1 de 10'], ['2', '😀', '2 de 10'], ['3', '🤩', '3 de 10'], ['', '🤷', 'Não sei (uso 1)']]]);
    }
    L.push(['dias', 'um', 'Quantos dias por semana vai trabalhar nisso?', [['2', '📅', '2 dias'], ['3', '📅', '3 dias'], ['5', '📅', '5 dias (seg a sex)'], ['6', '📅', '6 dias']]]);
    L.push(['horas', 'um', 'Quanto tempo por dia?', [['30', '⏱️', 'Uns 30 minutos'], ['60', '🕐', 'Cerca de 1 hora'], ['120', '🕑', '2 horas'], ['240', '🕓', 'Meio período ou mais']]]);
    L.push(['meta', 'campos', 'Qual a meta?', [['meta', 'Quanto quer ganhar por mês com ele (R$)', 'Ex.: 1.000', 'num']].concat(r.modelo === 'representacao' ? [] : [['ticket', 'Lucro médio por venda (R$)', 'Ex.: 40 (se não sabe, chute)', 'num']])]);
    return L;
  }

  // ---------- funil e números ----------
  function funil(p, c) {
    const pf = p.perfil || {}; const dt = new Date(hoje() + 'T12:00:00');
    const diasMes = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(); const restamDias = diasMes - dt.getDate() + 1;
    const diasSem = Number(pf.dias || 5); const diasUteisRest = Math.max(1, Math.round(restamDias * diasSem / 7)); const diasUteisMes = Math.max(1, Math.round(diasMes * diasSem / 7));
    const meta = Number(p.meta || 0); const lucro = c ? c.lucro : 0; const falta = Math.max(0, meta - lucro);
    const fech = (Number(pf.convFech) || (pf.modelo === 'representacao' ? 2 : 1)) / 10;
    const prop = pf.modelo === 'representacao' ? (Number(pf.convProp) || 3) / 10 : 1;
    let porVenda; let base = null; let novosMes;
    if (pf.modelo === 'representacao') {
      const gc = Number(pf.ganhoCliente || 0), gr = Number(pf.ganhoRec || 0);
      if (gc) porVenda = gc + (gr || 0); else porVenda = gr || 50;
      if (!gc && gr) { base = Math.ceil(meta / gr); novosMes = Math.max(1, Math.ceil(base / 6)); } else novosMes = Math.max(1, Math.ceil(meta / porVenda));
    } else { porVenda = c && c.lucMedio > 0 ? c.lucMedio : Number(pf.ticket || 0) || 40; novosMes = Math.max(1, Math.ceil(meta / porVenda)); }
    const faltaVendas = base ? Math.max(0, novosMes - (c ? c.doMes.length : 0)) : Math.max(0, Math.ceil(falta / porVenda));
    const propostasMes = Math.ceil(novosMes / fech); const contatosMes = Math.ceil(propostasMes / prop);
    const dia = (v) => Math.max(1, Math.ceil(v / diasUteisMes));
    const contatosDia = dia(contatosMes), propostasDia = pf.modelo === 'representacao' ? dia(propostasMes) : 0;
    const canais = pf.canais || [];
    const visitasDia = canais.includes('visita') ? Math.max(1, Math.round(contatosDia * (canais.includes('whats') ? 0.6 : 1))) : 0;
    const remotoDia = Math.max(0, contatosDia - visitasDia);
    return { meta, falta, porVenda, base, novosMes, faltaVendas, propostasMes, contatosMes, contatosDia, propostasDia, visitasDia, remotoDia, diasUteisRest, diasUteisMes };
  }

  // ---------- ações (bool = marcar; n = contador com alvo) ----------
  function acoes(p, c) {
    const pf = p.perfil || {}; const f = funil(p, c); const d = [], s = [];
    const B = (arr, id, t, dica) => arr.push({ id, t, dica });
    const N = (arr, id, t, alvo, dica) => arr.push({ id, t, alvo: Math.max(1, Math.round(alvo)), dica });
    const segs = (pf.segmentos || []).map((k) => (SEG.find((x) => x[0] === k) || [])[2]).filter(Boolean);
    const segTxt = segs.length ? segs.slice(0, 2).join(' e ').toLowerCase() + (segs.length > 2 ? '…' : '') : 'do perfil';
    const reg = pf.regiao ? ' em ' + pf.regiao : '';
    const novosSem = Math.max(1, Math.ceil(f.novosMes / 4.3));
    if (pf.modelo === 'representacao') {
      if (f.visitasDia) N(d, 'vis', `Visitar ${segTxt}${reg}`, f.visitasDia, 'Leve material e a simulação de taxas no celular');
      if (f.remotoDia) N(d, 'cont', 'Contatos por WhatsApp ou ligação', f.remotoDia, 'Use a lista de leads mapeados');
      N(d, 'prop', 'Propostas ou simulações apresentadas', f.propostasDia, 'Mostre quanto o cliente economiza por mês');
      B(d, 'fup', 'Follow-up com propostas abertas e leads de ontem', 'Quem não responde em 2 dias, chame de novo');
      B(d, 'reg', 'Registrar leads, propostas e fechamentos do dia', 'Cliente fechado = "Registrar venda" no talento');
      N(s, 'leads', `Mapear novos leads ${segTxt}${reg}`, Math.max(10, Math.ceil(f.contatosMes / 4.3)), 'Nome, contato, segmento, maquininha atual');
      N(s, 'fecha', 'Clientes fechados na semana', novosSem, '');
      if ((pf.canais || []).includes('indicacao') || true) N(s, 'ind', 'Pedir indicação a clientes ativos', 3, 'Ofereça uma vantagem por indicação');
      B(s, 'pos', 'Visitar 2 clientes ativos (pós-venda e aumentar volume)', 'Cliente bem atendido movimenta mais e indica');
      if ((pf.canais || []).includes('parceria')) B(s, 'parc', 'Conversar com 1 parceiro (contador, associação comercial)', '');
      if ((pf.canais || []).includes('redes')) B(s, 'post', 'Publicar 2 conteúdos sobre taxas e economia para lojistas', '');
      B(s, 'rev', 'Sexta: revisar o funil (contatos → propostas → fechados)', 'Onde está travando?');
    } else {
      const ofertas = Math.max(2, Math.ceil(f.contatosDia));
      if (pf.canal === 'insta') { N(d, 'story', 'Stories mostrando produto e preço', Number(pf.horas || 60) <= 30 ? 1 : 2, 'Foto boa + preço + "chama no direct"'); N(d, 'msg', 'Pessoas chamadas no WhatsApp com oferta', ofertas, 'Lista de transmissão ou mensagem pessoal'); B(d, 'resp', 'Responder todas as mensagens até as 20h', 'Resposta rápida vende mais'); }
      else if (pf.canal === 'marketplace') { B(d, 'perg', 'Responder as perguntas dos anúncios', 'Em até 1 hora, se der'); N(d, 'anun', 'Anúncios melhorados (foto, título ou preço)', 1, ''); N(d, 'msg', 'Contatos que receberam o link', Math.ceil(ofertas / 2), ''); }
      else if (pf.canal === 'presencial') { N(d, 'ofer', 'Pessoas para quem ofereceu', ofertas, 'Leve mostruário ou cartão'); N(d, 'msg', 'Mensagens para clientes antigos', 3, ''); }
      else { B(d, 'indic', 'Pedir 1 indicação a um cliente satisfeito', 'Ofereça um mimo para quem indicar'); N(d, 'msg', 'Mensagens para clientes antigos', Math.ceil(ofertas / 2), ''); }
      if (pf.modelo === 'producao') B(d, 'prod', 'Produzir ou separar o lote do dia', '');
      if (pf.modelo === 'servico') B(d, 'agenda', 'Confirmar a agenda de amanhã', '');
      if (pf.modelo === 'online') B(d, 'cont', 'Publicar 1 conteúdo de valor', '');
      B(d, 'reg', 'Registrar no Denário as vendas e compras do dia', 'Assim a jornada mostra o placar certo');
      N(s, 'vendas', 'Vendas na semana', novosSem, '');
      if (pf.modelo === 'revenda') B(s, 'rep', 'Repor o estoque do produto que mais vende', '');
      B(s, 'dep', 'Postar ou mandar 1 depoimento de cliente', 'Prova social');
      B(s, 'novo', `Testar 1 ${pf.modelo === 'servico' ? 'serviço' : 'produto'} ou oferta nova`, '');
      B(s, 'rev', 'Domingo: olhar o lucro da semana no app', '');
    }
    B(s, 'diz', 'Separar o dízimo e a oferta do que entrou', '“Honra ao Senhor com as primícias” (Pv 3:9)');
    return { d, s, f };
  }

  const extra = (p) => (window.APP.projetos.extraLocal ? window.APP.projetos.extraLocal(p.id) : {});
  const checksDe = (p) => p.checks || extra(p).checks || {};
  const perfilDe = (p) => p.perfil || extra(p).perfil || null;
  const feito = (o, ck, k) => (o.alvo ? ((ck['n' + k] || {})[o.id] || 0) >= o.alvo : (ck[k] || []).includes(o.id));
  function status(p, c) {
    const pf = perfilDe(p); if (!pf) return null;
    const pp = { ...p, perfil: pf }; const a = acoes(pp, c); const ck = checksDe(p); const kd = hoje(), ks = semanaDe(kd);
    const fD = a.d.filter((o) => feito(o, ck, kd)).length, fS = a.s.filter((o) => feito(o, ck, ks)).length;
    let seq = 0; const x = new Date(kd + 'T12:00:00'); if (fD < a.d.length) x.setDate(x.getDate() - 1);
    for (let i = 0; i < 60; i++) { const k = x.toISOString().slice(0, 10); if (a.d.every((o) => feito(o, ck, k))) { seq++; x.setDate(x.getDate() - 1); } else break; }
    return { a, ck, fD, fS, seq, pf, kd, ks };
  }

  function card(p, c) {
    const st = status(p, c);
    if (!st) return `<div class="ng-card pl-card pl-novo"><h3>📋 Plano de ação</h3><p>Responda algumas <b>perguntas rápidas</b> sobre este talento (tipo de negócio, perfil dos clientes, como prospecta) e o Denário monta o funil e as ações de cada dia e semana para bater a meta.</p><button type="button" class="pl-btn" data-plq="${p.id}">Responder agora (2 minutos)</button></div>`;
    const { a, ck, fD, fS, seq, pf, kd, ks } = st; const f = a.f;
    const item = (o, per, k) => {
      if (o.alvo) {
        const n = (ck['n' + k] || {})[o.id] || 0; const ok = n >= o.alvo;
        return `<div class="pl-it pl-n ${ok ? 'ok' : ''}"><span><b>${esc(o.t)}</b>${o.dica ? `<small>${esc(o.dica)}</small>` : ''}<i class="pl-nb"><em style="width:${Math.min(100, n / o.alvo * 100)}%"></em></i></span>
          <span class="pl-cnt"><button type="button" data-plmenos="${p.id}" data-per="${per}" data-id="${o.id}" aria-label="Menos">−</button><b>${n}<small>/${o.alvo}</small></b><button type="button" data-plmais="${p.id}" data-per="${per}" data-id="${o.id}" aria-label="Mais">+</button></span></div>`;
      }
      const ok = (ck[k] || []).includes(o.id);
      return `<label class="pl-it ${ok ? 'ok' : ''}"><input type="checkbox" data-plck="${p.id}" data-per="${per}" value="${o.id}" ${ok ? 'checked' : ''}><span><b>${esc(o.t)}</b>${o.dica ? `<small>${esc(o.dica)}</small>` : ''}</span></label>`;
    };
    const tudo = fD >= a.d.length; const h = new Date().getHours();
    const msg = tudo ? `🎉 Dia completo! ${seq > 1 ? `${seq} dias seguidos. ` : ''}“Muito bem, servo bom e fiel.”` : h >= 18 && fD === 0 ? '⏰ O dia está acabando. Que tal fazer só a primeira ação agora?' : fD ? `Faltam ${a.d.length - fD} de ${a.d.length}. ${seq ? `Não quebre a sequência de ${seq} dia${seq > 1 ? 's' : ''}! 🔥` : 'Continue!'}` : 'Comece pela primeira: passos pequenos fazem a meta acontecer.';
    const rep = pf.modelo === 'representacao';
    const fn = `<div class="pl-funil"><p class="pl-ft">🎯 O caminho até ${BRL0.format(f.meta)}/mês</p>
      <div class="pl-fs">
        <span style="--w:100%"><b>${f.contatosMes}</b>${rep ? 'conversas com leads' : 'pessoas abordadas'}</span>
        ${rep ? `<span style="--w:78%"><b>${f.propostasMes}</b>propostas</span>` : ''}
        <span style="--w:56%"><b>${f.novosMes}</b>${rep ? (f.base ? 'clientes novos/mês' : 'clientes fechados') : 'vendas'}</span></div>
      <p class="pl-fd">Por dia de trabalho: <b>${f.contatosDia} ${rep ? 'contatos' : 'ofertas'}</b>${f.visitasDia ? ` (${f.visitasDia} visitas)` : ''}${rep ? ` · <b>${f.propostasDia} proposta${f.propostasDia > 1 ? 's' : ''}</b>` : ''}${f.base ? ` · base de ${f.base} clientes ativos em ~6 meses` : ''}</p></div>`;
    return `<div class="ng-card pl-card">${fn}
      <div class="pl-top"><h3>📋 Ações de hoje</h3><span class="pl-cont ${tudo ? 'ok' : ''}">${fD}/${a.d.length}</span></div>
      <div class="pl-bar"><i style="width:${a.d.length ? fD / a.d.length * 100 : 0}%"></i></div>
      <p class="pl-msg ${tudo ? 'ok' : ''}">${msg}</p>
      ${a.d.map((o) => item(o, 'd', kd)).join('')}
      <div class="pl-top pl-sem"><h3>🗓️ Ações da semana</h3><span class="pl-cont ${fS >= a.s.length ? 'ok' : ''}">${fS}/${a.s.length}</span></div>
      ${a.s.map((o) => item(o, 's', ks)).join('')}
      <div class="pl-pe"><button type="button" class="pl-link" data-plics="${p.id}">⏰ Lembrete diário no celular</button><button type="button" class="pl-link" data-plq="${p.id}">✏️ Ajustar respostas</button></div>
    </div>`;
  }

  // ---------- questionário ----------
  let sh, qp, resp;
  function perguntar(id) {
    qp = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === String(id)); if (!qp) return;
    resp = { ...(perfilDe(qp) || {}), meta: qp.meta || '' }; resp.passo = 0;
    if (!sh) { sh = document.createElement('div'); sh.className = 'vc-sheet pl-sheet'; sh.innerHTML = '<div class="vc-scrim" data-plfechar></div><div class="vc-panel" role="dialog" aria-modal="true"><div class="vc-body"></div></div>'; document.body.appendChild(sh); }
    desenharQ(); document.body.classList.add('pl-open');
  }
  function desenharQ() {
    const L = perguntas(resp); const b = sh.querySelector('.vc-body');
    if (resp.passo >= L.length) return salvarQ();
    const [k, tipo, t, ops] = L[resp.passo];
    const cab = `<p class="pl-pp">Pergunta ${resp.passo + 1} de ${L.length} · ${esc(qp.nome)}</p><div class="pl-pbar"><i style="width:${(resp.passo + 1) / L.length * 100}%"></i></div><p class="vc-t">${t}</p>`;
    const volta = resp.passo ? '<button type="button" class="nt-btn sec" data-plvolta>‹ Voltar</button>' : '<button type="button" class="nt-btn sec" data-plfechar>Agora não</button>';
    if (tipo === 'um') b.innerHTML = cab + `<div class="pl-ops">${ops.map(([v, e, n]) => `<button type="button" data-plr="${k}" data-v="${v}" class="${String(resp[k] ?? '') === v && resp[k] !== undefined ? 'on' : ''}"><span>${e}</span>${n}</button>`).join('')}</div>` + volta;
    else if (tipo === 'varios') { const sel = new Set(resp[k] || []); b.innerHTML = cab + `<div class="pl-ops pl-multi">${ops.map(([v, e, n]) => `<button type="button" data-plm="${k}" data-v="${v}" class="${sel.has(v) ? 'on' : ''}"><span>${e}</span>${n}<i>${sel.has(v) ? '✓' : ''}</i></button>`).join('')}</div><button type="button" class="nt-btn" data-plseg ${sel.size ? '' : 'disabled'}>Continuar</button>` + volta; }
    else b.innerHTML = cab + ops.map(([ck, lab, ph, tp]) => `<label class="vc-l">${lab}<input class="sv-in" data-plc="${ck}" ${tp === 'num' ? 'inputmode="decimal"' : ''} placeholder="${esc(ph)}" value="${esc(resp[ck] || '')}"></label>`).join('') + `<p class="vc-erro" id="pl-erro"></p><button type="button" class="nt-btn" data-plseg>${resp.passo === L.length - 1 ? 'Montar meu plano' : 'Continuar'}</button>` + volta;
  }
  function lerCampos() { sh.querySelectorAll('[data-plc]').forEach((i) => { resp[i.dataset.plc] = i.inputMode === 'decimal' ? (num(i.value) || '') : i.value.trim(); }); }
  async function salvarQ() {
    const { passo, meta, ...perfil } = resp; qp.perfil = perfil;
    try { if (num(meta) && num(meta) !== Number(qp.meta || 0)) { qp.meta = num(meta); await window.APP.projetos.salvar(qp); } await window.APP.projetos.guardarExtra(qp.id, { perfil }); } catch (e) { console.error(e); }
    document.body.classList.remove('pl-open'); if (window.OIKOS_PROJ.render) window.OIKOS_PROJ.render();
  }

  // ---------- marcar e contar ----------
  async function gravar(p, ck) {
    const ks = Object.keys(ck).sort(); while (ks.length > 120) delete ck[ks.shift()];
    p.checks = ck; try { await window.APP.projetos.guardarExtra(p.id, { checks: ck }); } catch (e) { console.error(e); }
    if (window.OIKOS_PROJ.render) window.OIKOS_PROJ.render();
  }
  function marcar(inp) {
    const p = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === inp.dataset.plck); if (!p) return;
    const k = inp.dataset.per === 's' ? semanaDe(hoje()) : hoje(); const ck = { ...checksDe(p) };
    const l = new Set(ck[k] || []); if (inp.checked) l.add(inp.value); else l.delete(inp.value); ck[k] = [...l];
    if (navigator.vibrate && inp.checked) try { navigator.vibrate(15); } catch (e) { /* ok */ }
    gravar(p, ck);
  }
  function contar(bt, d) {
    const id = bt.dataset.plmais || bt.dataset.plmenos; const p = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === id); if (!p) return;
    const k = 'n' + (bt.dataset.per === 's' ? semanaDe(hoje()) : hoje()); const ck = { ...checksDe(p) }; const m = { ...(ck[k] || {}) };
    m[bt.dataset.id] = Math.max(0, (m[bt.dataset.id] || 0) + d); ck[k] = m;
    if (navigator.vibrate && d > 0) try { navigator.vibrate(10); } catch (e) { /* ok */ }
    gravar(p, ck);
  }

  // ---------- lembrete no calendário do celular (.ics) ----------
  function ics(id) {
    const p = (window.OIKOS_PROJ.lista() || []).find((x) => String(x.id) === String(id)); if (!p) return;
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, ''); const url = location.origin + location.pathname;
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
    const html = `<button type="button" class="pl-lembra" data-plir="${x.p.id}"><span>⏰</span><span><b>${esc(x.p.nome)}: ${resto} ${resto > 1 ? 'ações' : 'ação'} de hoje por fazer</b><small>${txt}</small></span><span aria-hidden="true">›</span></button>`;
    if (!el) { el = document.createElement('div'); el.id = 'pl-lembra'; }
    if (el.innerHTML !== html) el.innerHTML = html;
    const ref = document.querySelector('#casa .sb-card') || hero; if (ref.nextElementSibling !== el) ref.after(el);
  }

  document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-plck]'); if (i) marcar(i); });
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-plq]'); if (q) return perguntar(q.dataset.plq);
    const mais = e.target.closest('[data-plmais]'); if (mais) return contar(mais, 1);
    const menos = e.target.closest('[data-plmenos]'); if (menos) return contar(menos, -1);
    const r = e.target.closest('[data-plr]'); if (r) { resp[r.dataset.plr] = r.dataset.v; resp.passo++; return desenharQ(); }
    const m = e.target.closest('[data-plm]'); if (m) { const s = new Set(resp[m.dataset.plm] || []); if (s.has(m.dataset.v)) s.delete(m.dataset.v); else s.add(m.dataset.v); resp[m.dataset.plm] = [...s]; return desenharQ(); }
    if (e.target.closest('[data-plseg]')) { lerCampos(); const L = perguntas(resp); const [k, tipo] = L[resp.passo]; if (tipo === 'campos' && k === 'meta' && !num(resp.meta)) { document.getElementById('pl-erro').textContent = 'Diga a meta do mês.'; return; } resp.passo++; return desenharQ(); }
    if (e.target.closest('[data-plvolta]')) { if (sh.querySelector('[data-plc]')) lerCampos(); resp.passo = Math.max(0, resp.passo - 1); return desenharQ(); }
    if (e.target.closest('[data-plfechar]')) return document.body.classList.remove('pl-open');
    const ic = e.target.closest('[data-plics]'); if (ic) return ics(ic.dataset.plics);
    const ir = e.target.closest('[data-plir]'); if (ir) { if (window.OIKOS_IR) window.OIKOS_IR('negocio'); setTimeout(() => { const b = document.querySelector(`[data-ngabre="${ir.dataset.plir}"]`); if (b) b.click(); }, 150); }
  });
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(lembrar, 120); }).observe(document.documentElement, { childList: true, subtree: true });
  window.OIKOS_PLANO = { card, perguntar, status, funil };
})();
