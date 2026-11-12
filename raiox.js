// Denário — "Raio-X da família": análise patrimonial e financeira automática, em linguagem simples.
// Cada item vira um sinal (verde, amarelo ou vermelho) com o que fazer.
(function () {
  const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = (x) => Math.round(x * 100) + '%';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let sh;

  function d(id) { const r = window.dash && dash.data(id); return r && r.status === 'ok' ? r.data : []; }
  function val(bal, re) { const r = bal.find((x) => re.test(x.item)); return r && r.valor != null ? Number(r.valor) : 0; }

  function analisar() {
    const mensal = d('mensal').filter((m) => m.mes !== 'total');
    const bal = d('balanco'), plano = d('plano'), fixos = d('fixos'), bens = d('bens');
    if (!mensal.length || !mensal.some((m) => m.entradas || m.saidas)) return null;
    const meses = mensal.filter((m) => !/até/.test(m.rotulo || ''));
    const base = meses.length ? meses : mensal;
    const n = base.length;
    const soma = (k, l) => (l || base).reduce((s, m) => s + Number(m[k] || 0), 0);
    const ent = soma('entradas') / n, sai = soma('saidas') / n, res = soma('resultado') / n;
    const ult3 = base.slice(-3);
    const itens = [];

    // 1. sobra do mês
    const taxa = ent > 0 ? res / ent : 0;
    itens.push({ k: 'sobra', ic: '💰', t: 'Quanto sobra no fim do mês',
      nv: taxa >= 0.1 ? 'ok' : taxa > 0 ? 'atn' : 'mal',
      v: `${BRL0.format(res)}/mês`, s: `Em média sobram ${pct(Math.max(0, taxa))} do que entra. O ideal é guardar pelo menos 10%.`,
      f: taxa >= 0.1 ? 'Continue assim e mande a sobra direto para a reserva no dia em que o dinheiro cai.' : `Para chegar a 10%, precisaria sobrar ${BRL0.format(ent * 0.1)} por mês, ${BRL0.format(Math.max(0, ent * 0.1 - res))} a mais que hoje. Os tetos das Metas já mostram de onde tirar.` });

    // 2. cheque especial
    const juros = soma('juros', mensal), dias = soma('dias_negativo', mensal), dias3 = soma('dias_negativo', ult3), j3 = soma('juros', ult3);
    if (juros > 0 || dias > 0) {
      const ultimo = mensal[mensal.length - 1];
      const melhorando = ultimo && Number(ultimo.dias_negativo || 0) <= 3;
      itens.push({ k: 'cheque', ic: '🔥', t: 'Cheque especial', nv: juros > 300 ? (melhorando ? 'atn' : 'mal') : juros > 0 ? 'atn' : 'ok',
        v: `${BRL0.format(juros)} de juros no ano`, s: `Foram ${dias} dias no vermelho no ano (${dias3} nos últimos 3 meses, que custaram ${BRL0.format(j3)}).${melhorando ? ' Este mês está bem melhor! 👏' : ''}`,
        f: 'Juros de cheque especial é o dinheiro mais caro que existe. Prioridade: nunca mais ficar negativo. Antes de qualquer investimento, use a primeira sobra para deixar um "colchão" na conta.' });
    }

    // 3. reserva de emergência
    if (bal.length) {
      const liquido = val(bal, /^Disponível$/) + val(bal, /^Aplicações/) + val(bal, /^Criptoativos/);
      const custo = sai || 1, mesesRes = liquido / custo;
      const alvo = custo * 3;
      itens.push({ k: 'reserva', ic: '🛟', t: 'Reserva de emergência', nv: mesesRes >= 3 ? 'ok' : mesesRes >= 1 ? 'atn' : 'mal',
        v: `${mesesRes.toFixed(1).replace('.', ',')} ${mesesRes >= 1.95 ? 'meses' : 'mês'}`, s: `Vocês têm ${BRL0.format(liquido)} fácil de usar. Isso paga ${mesesRes.toFixed(1).replace('.', ',')} mês de gastos. A meta é de 3 a 6 meses.`,
        f: mesesRes >= 3 ? 'Reserva no lugar! Daqui pra frente, a sobra pode ir para objetivos e investimentos.' : `Faltam ${BRL0.format(Math.max(0, alvo - liquido))} para 3 meses. Guarde num lugar que rende e saca na hora (Tesouro Selic ou CDB com liquidez diária), separado da conta do dia a dia.` });
      // 4. dívidas
      const pc = val(bal, /^PASSIVO CIRCULANTE$/), pnc = val(bal, /^PASSIVO NÃO CIRCULANTE$/), at = val(bal, /^TOTAL DO ATIVO$/);
      const pend = bal.filter((x) => x.a_informar);
      const endiv = at ? (pc + pnc) / at : 0;
      itens.push({ k: 'dividas', ic: '📉', t: 'Dívidas', nv: pend.length ? 'atn' : endiv < 0.3 ? 'ok' : endiv < 0.5 ? 'atn' : 'mal',
        v: `${BRL0.format(pc + pnc)} (${pct(endiv)} do que têm)`, s: pend.length ? `Até 30% é saudável. Mas ainda faltam os valores de: ${pend.map((x) => esc(x.item.replace(/\s*\(a informar\)/, ''))).join('; ')}.` : 'Até 30% do que vocês têm é saudável.',
        f: pend.length ? 'Descobrir o valor dessas faturas é o primeiro passo: dívida escondida é a que mais cresce. Depois, quitar primeiro a de juros mais alto.' : 'Mantenha as parcelas abaixo de 30% da renda e evite parcelar o que não é bem durável.' });
      // 5. patrimônio parado
      const imob = val(bal, /^Imobilizado$/), pl = val(bal, /^PATRIMÔNIO LÍQUIDO$/);
      if (imob && pl) {
        const r = imob / pl;
        itens.push({ k: 'imob', ic: '🏡', t: 'Patrimônio parado', nv: r > 0.85 ? 'atn' : 'ok', v: `${pct(r)} em lotes, carro e bens`,
          s: 'Lote e carro não pagam conta no aperto. Quanto mais o patrimônio está "preso", mais importante é a reserva.',
          f: r > 0.85 ? 'Não precisa vender nada: o caminho é fazer a parte líquida (reserva e investimentos) crescer mês a mês.' : 'Bom equilíbrio entre bens e dinheiro disponível.' });
      }
    }

    // 6. gastos sem conta
    const ident = soma('a_identificar', mensal), saiT = soma('saidas', mensal);
    if (saiT) {
      const r = ident / saiT, r3 = soma('a_identificar', ult3) / (soma('saidas', ult3) || 1);
      itens.push({ k: 'ident', ic: '🔍', t: 'Gastos sem explicação', nv: r3 <= 0.03 ? 'ok' : r3 <= 0.1 ? 'atn' : 'mal', v: `${pct(r3)} nos últimos 3 meses`,
        s: `No ano, ${BRL0.format(ident)} saíram sem saber para onde (${pct(r)} das saídas).`, f: r3 <= 0.03 ? 'Ótimo controle! Anotar na hora (voz ou notinha) é o que mantém isso baixo.' : 'Anote na hora: fale o gasto no 🎤 ou tire foto da notinha. Gasto sem nome é o primeiro a fugir do controle.' });
    }

    // 7. onde estoura o plano
    const est = plano.filter((p) => p.mae && p.teto_fase1 > 0 && p.media_jan_set > p.teto_fase1 * 1.15).sort((a, b) => (b.media_jan_set - b.teto_fase1) - (a.media_jan_set - a.teto_fase1)).slice(0, 3);
    if (est.length) {
      const exc = est.reduce((s, p) => s + p.media_jan_set - p.teto_fase1, 0);
      itens.push({ k: 'plano', ic: '🎯', t: 'Onde o dinheiro escapa', nv: 'atn', v: `${BRL0.format(exc)}/mês acima do combinado`,
        s: est.map((p) => `${esc(p.conta_mae)}: média ${BRL0.format(p.media_jan_set)}, teto ${BRL0.format(p.teto_fase1)}`).join(' · '),
        f: `Só acertar ${est.length > 1 ? 'esses ' + est.length + ' itens' : 'esse item'} já libera ${BRL0.format(exc)} por mês para a reserva.` });
    }

    // 8. dízimo / generosidade
    const diz = fixos.find((x) => /dízimo/i.test(x.item));
    if (diz && diz.valor_mes) {
      const real = Number(diz.media_realizada || 0), r = real / diz.valor_mes;
      itens.push({ k: 'dizimo', ic: '🙏', t: 'Dízimo e generosidade', nv: r >= 0.95 ? 'ok' : 'atn', v: `${BRL0.format(real)} de ${BRL0.format(diz.valor_mes)}/mês`,
        s: 'Meta de vocês: 10% da renda, como prioridade nº 1 do plano.', f: r >= 0.95 ? 'Meta cumprida. 🙌' : 'Para não depender de sobrar: separe no dia que o salário cai, antes de qualquer outro gasto (PIX agendado).' });
    }

    // 9. bens: guardar para trocar
    const prov = bens.reduce((s, b) => s + Number(b.provisao_mes || 0), 0);
    const logo = bens.filter((b) => b.renovar_em && b.renovar_em <= new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 7));
    if (prov) itens.push({ k: 'bens', ic: '🛋️', t: 'Trocar os bens no tempo certo', nv: logo.length > 2 ? 'atn' : 'ok', v: `guardar ${BRL0.format(prov)}/mês`,
      s: logo.length ? `Nos próximos 12 meses vencem: ${logo.map((b) => esc(b.item)).join(', ')}.` : 'Nenhum bem para trocar nos próximos 12 meses.',
      f: 'Quando a geladeira ou o celular estragam, o dinheiro já está separado e não vira parcela nem cheque especial.' });

    const pts = { ok: 2, atn: 1, mal: 0 }, nota = Math.round((itens.reduce((s, i) => s + pts[i.nv], 0) / (itens.length * 2)) * 100);

    // projeção simples
    const fase2 = plano.find((p) => p.ordem === 99);
    const renda = fase2 && /R\$\s*([\d.]+)/.test(fase2.como || '') ? Number(fase2.como.match(/R\$\s*([\d.]+)/)[1].replace(/\./g, '')) : ent;
    let proj = '';
    if (fase2 && renda) {
      const s1 = renda - fase2.teto_fase1, s2 = renda - fase2.teto_fase2;
      const liquido = bal.length ? val(bal, /^Disponível$/) + val(bal, /^Aplicações/) + val(bal, /^Criptoativos/) : 0;
      const falta = Math.max(0, fase2.teto_fase2 * 3 - liquido);
      const m = s2 > 0 ? Math.ceil(falta / s2) : null;
      proj = `<div class="rx-proj"><b>🔭 Se seguirem o plano</b><p>Renda de referência: ${BRL0.format(renda)}. Até jan/27 (com as parcelas dos iPhones) sobra ${BRL0.format(Math.max(0, s1))}/mês. A partir de fev/27 passa a sobrar <b>${BRL0.format(s2)}/mês</b>.</p>${m ? `<p>Assim, a reserva de 3 meses (${BRL0.format(fase2.teto_fase2 * 3)}) fica completa em cerca de <b>${m} meses</b>. Todo dinheiro extra que chegar encurta esse prazo.</p>` : ''}</div>`;
    }
    return { itens, nota, proj, n };
  }

  const TEMA = { sobra: 'sobra', cheque: 'cheque', reserva: 'reserva', dividas: 'dividas', imob: 'patrimonio', ident: 'ident', plano: 'plano', dizimo: 'dizimo', bens: 'bens' };
  function verso(k) {
    const S = window.OIKOS_SAB; if (!S) return '';
    const p = S.escolher(TEMA[k]); return `<p class="rx-ver">“${esc(p.v)}” <b>${esc(p.r)}</b></p>`;
  }
  function html() {
    const a = analisar();
    if (!a) return '<p class="rx-vazio">O Raio-X aparece quando a família tiver pelo menos um mês de entradas e saídas registradas. Comece anotando os gastos e o salário. 🙂</p>';
    const cor = a.nota >= 75 ? 'ok' : a.nota >= 45 ? 'atn' : 'mal';
    const frase = a.nota >= 75 ? 'Finanças saudáveis. Agora é fazer o dinheiro trabalhar.' : a.nota >= 45 ? 'No caminho certo, com alguns pontos para acertar.' : 'Hora de arrumar a casa: comece pelos itens vermelhos.';
    const ordem = { mal: 0, atn: 1, ok: 2 };
    return `<div class="rx-top rx-${cor}"><span class="rx-nota">${a.nota}<small>/100</small></span><span><b>Saúde financeira da família</b><small>${frase}</small><small class="rx-base">Com base em ${a.n} meses de extrato.</small></span></div>
      ${[...a.itens].sort((x, y) => ordem[x.nv] - ordem[y.nv]).map((i) => `<details class="rx-it rx-${i.nv}"${i.nv === 'mal' ? ' open' : ''}><summary><span class="rx-ic">${i.ic}</span><span class="rx-tx"><b>${i.t}</b><small>${i.v}</small></span><span class="rx-sem" aria-label="${i.nv === 'ok' ? 'bom' : i.nv === 'atn' ? 'atenção' : 'cuidado'}"></span></summary>
        <p>${i.s}</p><p class="rx-f"><b>O que fazer:</b> ${i.f}</p>${verso(i.k)}</details>`).join('')}
      ${a.proj}
      ${window.OIKOS_SAB ? window.OIKOS_SAB.card('planejamento', { titulo: 'Para refletir em família' }) : ''}
      <p class="rx-disc">Análise automática para organizar as finanças da família. Não é recomendação de investimento.</p>`;
  }

  function abrir() { sh.querySelector('.rx-body').innerHTML = '<p class="vc-t">🩺 Raio-X da família</p>' + html() + '<button type="button" class="nt-btn sec" data-rxfechar>Fechar</button>'; document.body.classList.add('rx-open'); sh.querySelector('.vc-panel').scrollTop = 0; }
  function fechar() { document.body.classList.remove('rx-open'); }

  function montar() {
    sh = document.createElement('div'); sh.className = 'vc-sheet rx-sheet';
    sh.innerHTML = '<div class="vc-scrim" data-rxfechar></div><div class="vc-panel" role="dialog" aria-modal="true" aria-label="Raio-X da família"><div class="rx-body vc-body"></div></div>';
    document.body.appendChild(sh);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-rxfechar]')) return fechar();
      if (e.target.closest('[data-rxabrir]')) { document.body.classList.remove('ob-open'); abrir(); }
    });
    const pronto = () => {
      const sheet = document.querySelector('.ob-sheet');
      if (sheet && !sheet.querySelector('[data-rxabrir]') && sheet.querySelector('h3')) {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.rxabrir = '1';
        b.innerHTML = '<span class="fx-ic">🩺</span><span>Raio-X da família<small>Nota da saúde financeira e o que fazer</small></span>';
        sheet.insertBefore(b, sheet.querySelector('h3').nextSibling);
      }
      const topo = document.getElementById('bn-topo');
      if (topo && !topo.querySelector('[data-rxabrir]')) {
        const a = analisar(); if (!a) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'rx-teaser'; b.dataset.rxabrir = '1';
        b.innerHTML = `<span class="rx-nota rx-${a.nota >= 75 ? 'ok' : a.nota >= 45 ? 'atn' : 'mal'}">${a.nota}</span><span><b>Raio-X da família</b><small>Veja a nota e o que fazer para melhorar</small></span><span aria-hidden="true">›</span>`;
        topo.insertBefore(b, topo.querySelector('.bn-add'));
      }
    };
    if (window.dash && dash.onData) dash.onData(() => setTimeout(pronto, 0));
    window.OIKOS_RAIOX = { abrir, analisar };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
