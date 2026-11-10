// Oikos — "Vales e cashback": dinheiro que a família tem para usar em lojas, com contagem até vencer.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const dias = (iso) => iso ? Math.round((new Date(iso + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5) : null;
  const br = (iso) => iso ? iso.split('-').reverse().slice(0, 2).join('/') : '';
  const TIPOS = [['cashback', '💸', 'Cashback'], ['vale', '🎟️', 'Vale-compra'], ['credito', '🏷️', 'Crédito de troca'], ['giftcard', '🎁', 'Cartão-presente']];
  let lista = [], sh, f;

  function cartao(v) {
    const dv = dias(v.vence_em), dl = dias(v.libera_em);
    const t = TIPOS.find((x) => x[0] === v.tipo) || TIPOS[0];
    let quando = '', cls = '';
    if (dv != null) {
      if (dv < 0) { quando = 'Venceu em ' + br(v.vence_em); cls = 'vc-venceu'; }
      else if (dv === 0) { quando = '⚠️ Vence HOJE'; cls = 'vc-urg'; }
      else { quando = `Vence ${br(v.vence_em)} · faltam <b>${dv} dia${dv > 1 ? 's' : ''}</b>`; cls = dv <= 7 ? 'vc-urg' : dv <= 15 ? 'vc-atn' : ''; }
    }
    const libera = dl != null && dl > 0 ? `<span class="vc-lib">🔒 Libera em ${br(v.libera_em)}</span>` : '';
    const minimo = v.limite_pct ? `<p class="vc-dica">💡 Só cobre até ${v.limite_pct}% da compra. Para usar tudo de uma vez, a compra precisa ser de <b>${BRL.format(Number(v.saldo) / (v.limite_pct / 100))}</b> ou mais.</p>` : '';
    return `<div class="vc-it ${cls}"><div class="vc-top"><span class="vc-e">${t[1]}</span><span class="vc-n"><b>${esc(v.loja)}</b><small>${t[2]}${v.para ? ' · ' + esc(v.para) : ''}</small></span><span class="vc-v">${BRL.format(Number(v.saldo))}</span></div>
      <p class="vc-q">${quando} ${libera}</p>${v.regra ? `<p class="vc-r">${esc(v.regra)}</p>` : ''}${minimo}
      <div class="vc-acts"><button type="button" data-vusar="${v.id}">✅ Usei</button><button type="button" class="vc-sec" data-vfim="${v.id}">${dv != null && dv < 0 ? 'Tirar da lista' : 'Apagar'}</button></div></div>`;
  }
  function desenhar() {
    for (const box of document.querySelectorAll('.vc-wrap')) {
      const ativos = lista.filter((v) => dias(v.vence_em) == null || dias(v.vence_em) >= -7);
      const total = ativos.filter((v) => dias(v.vence_em) == null || dias(v.vence_em) >= 0).reduce((s, v) => s + Number(v.saldo || 0), 0);
      box.innerHTML = `<div class="vc-card"><div class="vc-h"><h3>🎟️ Vales e cashback</h3>${total ? `<span>${BRL.format(total)} para usar</span>` : ''}</div>
        ${ativos.length ? ativos.map(cartao).join('') : '<p class="vc-vazio">Ganhou cashback ou vale-compra? Guarde aqui para não perder o prazo.</p>'}
        <button type="button" class="vc-add" data-vnovo>＋ Guardar vale ou cashback</button></div>`;
    }
  }
  async function recarregar() { try { lista = await window.APP.vales.listar(); } catch (e) { console.error(e); lista = []; } desenhar(); }

  const abrirSh = (html) => { sh.querySelector('.vc-body').innerHTML = html; document.body.classList.add('vc-open'); };
  const fechar = () => document.body.classList.remove('vc-open');
  function form() {
    abrirSh(`<p class="vc-t">Guardar vale ou cashback</p>
      <p class="vc-l">O que é?</p><div class="vc-ops">${TIPOS.map(([k, e, n]) => `<button type="button" data-vtipo="${k}" class="${f.tipo === k ? 'on' : ''}">${e} ${n}</button>`).join('')}</div>
      <label class="vc-l">Onde dá para usar?<input id="vc-loja" class="sv-in" placeholder="Ex.: Riachuelo / Carter's" value="${esc(f.loja)}" maxlength="40"></label>
      <label class="vc-l">Quanto vale?<input id="vc-val" class="sv-in" inputmode="decimal" placeholder="0,00" value="${f.valor ? String(f.valor).replace('.', ',') : ''}"></label>
      <label class="vc-l">Vence quando?<input id="vc-vence" type="date" class="sv-in" value="${f.vence_em || ''}" min="${hojeISO()}"></label>
      <label class="vc-l">Só libera a partir de… <small>(se tiver)</small><input id="vc-libera" type="date" class="sv-in" value="${f.libera_em || ''}"></label>
      <p class="vc-l">Paga a compra inteira?</p><div class="vc-ops"><button type="button" data-vlim="0" class="${!f.limite_pct ? 'on' : ''}">Sim</button><button type="button" data-vlim="1" class="${f.limite_pct ? 'on' : ''}">Não, só uma parte</button></div>
      ${f.limite_pct ? `<label class="vc-l">Cobre até quantos % da compra?<input id="vc-pct" class="sv-in" inputmode="numeric" value="${f.limite_pct}"></label>` : ''}
      <label class="vc-l">Regras ou lembrete <small>(opcional)</small><input id="vc-regra" class="sv-in" placeholder="Ex.: só roupas, 1 vez por dia" value="${esc(f.regra)}" maxlength="120"></label>
      <p class="vc-erro" id="vc-erro"></p>
      <button type="button" class="nt-btn" data-vsalvar>Guardar</button><button type="button" class="nt-btn sec" data-vfechar>Cancelar</button>`);
  }
  function ler() {
    const g = (id) => document.getElementById(id);
    if (g('vc-loja')) f.loja = g('vc-loja').value.trim();
    if (g('vc-val')) f.valor = num(g('vc-val').value);
    if (g('vc-vence')) f.vence_em = g('vc-vence').value || null;
    if (g('vc-libera')) f.libera_em = g('vc-libera').value || null;
    if (g('vc-pct')) f.limite_pct = Math.max(1, Math.min(100, parseInt(g('vc-pct').value, 10) || 40));
    if (g('vc-regra')) f.regra = g('vc-regra').value.trim();
  }
  function usar(v) {
    f = { usar: v };
    abrirSh(`<p class="vc-t">Quanto usou de ${esc(v.loja)}?</p><p class="vc-s">Tem ${BRL.format(Number(v.saldo))} guardado.</p>
      <div class="vc-ops"><button type="button" data-vtudo>Usei tudo</button></div>
      <label class="vc-l">Ou digite quanto usou<input id="vc-uso" class="sv-in" inputmode="decimal" placeholder="0,00"></label>
      <button type="button" class="nt-btn" data-vbaixa>Confirmar</button><button type="button" class="nt-btn sec" data-vfechar>Cancelar</button>`);
  }
  async function baixar(v, quanto) {
    const saldo = Math.max(0, Math.round((Number(v.saldo) - quanto) * 100) / 100);
    await window.APP.vales.salvar({ ...v, saldo, encerrado: saldo < 0.01 });
    abrirSh(`<div class="nt-big">${saldo < 0.01 ? '🎉' : '👍'}</div><p class="nt-t">${saldo < 0.01 ? 'Aproveitou tudo!' : 'Anotado!'}</p><p class="nt-s">${saldo < 0.01 ? 'Esse vale saiu da lista.' : 'Ainda sobra ' + BRL.format(saldo) + '.'}</p><button type="button" class="nt-btn" data-vfechar>Pronto</button>`);
    recarregar();
  }

  async function onClick(e) {
    if (e.target.classList.contains('vc-scrim')) return fechar();
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-vnovo')) { f = { tipo: 'cashback', loja: '', valor: 0, vence_em: null, libera_em: null, limite_pct: null, regra: '' }; return form(); }
    if (b.dataset.vusar) { const v = lista.find((x) => String(x.id) === b.dataset.vusar); if (v) usar(v); return; }
    if (b.dataset.vfim) {
      if (!b.dataset.ok) { b.dataset.ok = '1'; b.textContent = 'Tem certeza?'; return; }
      const v = lista.find((x) => String(x.id) === b.dataset.vfim); if (v) { try { await window.APP.vales.salvar({ ...v, encerrado: true }); } catch (err) { console.error(err); } recarregar(); } return;
    }
    if (!sh.contains(b)) return;
    if (b.dataset.vtipo) { ler(); f.tipo = b.dataset.vtipo; return form(); }
    if (b.dataset.vlim) { ler(); f.limite_pct = b.dataset.vlim === '1' ? (f.limite_pct || 40) : null; return form(); }
    if (b.hasAttribute('data-vfechar')) return fechar();
    if (b.hasAttribute('data-vtudo')) return baixar(f.usar, Number(f.usar.saldo));
    if (b.hasAttribute('data-vbaixa')) { const q = num(document.getElementById('vc-uso').value); if (!q) return document.getElementById('vc-uso').focus(); return baixar(f.usar, Math.min(q, Number(f.usar.saldo))); }
    if (b.hasAttribute('data-vsalvar')) {
      ler(); const er = document.getElementById('vc-erro');
      if (!f.loja) { er.textContent = 'Escreva onde dá para usar.'; return; }
      if (!f.valor) { er.textContent = 'Escreva quanto vale.'; return; }
      b.disabled = true; b.textContent = 'Guardando…';
      try { await window.APP.vales.salvar({ ...f, saldo: f.valor }); fechar(); recarregar(); }
      catch (err) { console.error(err); b.disabled = false; b.textContent = 'Não guardou. Tentar de novo'; }
    }
  }

  function montar() {
    if (!window.APP || !window.APP.vales) return;
    sh = document.createElement('div'); sh.className = 'vc-sheet'; sh.setAttribute('role', 'dialog');
    sh.innerHTML = '<div class="vc-scrim"></div><div class="vc-panel"><div class="vc-body"></div></div>';
    document.body.append(sh);
    document.addEventListener('click', (e) => { if (e.target.closest('.vc-wrap, .vc-sheet')) onClick(e); });
    const tentar = () => {
      const ancora = document.querySelector('#casa .nt-wrap') || document.querySelector('#casa .cs-hero');
      if (ancora && !document.querySelector('#casa .vc-wrap')) { const w = document.createElement('div'); w.className = 'vc-wrap'; ancora.after(w); desenhar(); }
    };
    new MutationObserver(tentar).observe(document.getElementById('dash-root') || document.body, { childList: true, subtree: true });
    tentar();
    if (window.dash) { let ok = false; dash.onData(() => { if (!ok && dash.data('mensal').status === 'ok') { ok = true; recarregar(); } }); } else recarregar();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 80));
})();
