// Denário — "De qual conta saiu?": escolher banco/conta (com titular) e cadastrar um novo na hora.
(function () {
  let bancos = null, pessoas = null;
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CORES = ['#cc092f', '#820ad1', '#ec7000', '#1e5bc6', '#0a8a4a', '#1d1d1b', '#f5a700'];

  async function carregar(forcar) {
    if (!bancos || forcar) { try { bancos = await window.APP.bancos.listar(); } catch (e) { console.error(e); bancos = []; } }
    if (!pessoas) { try { pessoas = (await window.APP.pessoas.listar()).filter((p) => !(p.avatar && p.avatar.crianca)); } catch (e) { pessoas = []; } }
  }
  const nomeP = (k) => { const p = (pessoas || []).find((x) => x.chave === k); return p ? p.nome : (k ? k[0].toUpperCase() + k.slice(1) : ''); };
  const rotulo = (b) => b.nome + (b.dono ? ' (' + nomeP(b.dono) + ')' : '');
  const av = (k, s) => { const p = (pessoas || []).find((x) => x.chave === k); return p && window.OIKOS_AVATAR ? window.OIKOS_AVATAR.svg(p.avatar, s) : ''; };

  // Monta o seletor dentro de "el". valor = rótulo atual; onPick(rotulo) é chamado ao escolher.
  async function montar(el, valor, onPick) {
    await carregar();
    const st = { novo: false, nome: '', dono: null, cor: CORES[0], erro: '' };
    function render() {
      if (!st.novo) {
        el.innerHTML = `<div class="bk-ops">${bancos.map((b) => { const r = rotulo(b); return `<button type="button" data-bk="${esc(r)}" class="${valor === r ? 'on' : ''}" style="--bk:${esc(b.cor || '#61665e')}"><i></i><span class="bk-n">${esc(b.nome)}</span>${b.dono ? `<span class="bk-d">${av(b.dono, 18)}${esc(nomeP(b.dono))}</span>` : ''}</button>`; }).join('')}
          <button type="button" class="bk-add" data-bknovo>＋ Outro banco</button></div>`;
      } else {
        el.innerHTML = `<div class="bk-novo"><p class="bk-t">Novo banco ou cartão</p>
          <input class="sv-in" id="bk-nome" placeholder="Ex.: Inter, Caixa, Nubank" maxlength="30" value="${esc(st.nome)}" autocomplete="off">
          <p class="bk-t">De quem é a conta?</p>
          <div class="bk-donos">${pessoas.map((p) => `<button type="button" data-bkdono="${esc(p.chave)}" class="${st.dono === p.chave ? 'on' : ''}">${av(p.chave, 28)}<span>${esc(p.nome)}</span></button>`).join('')}</div>
          <p class="bk-t">Cor <small>(opcional)</small></p>
          <div class="bk-cores">${CORES.map((c) => `<button type="button" data-bkcor="${c}" class="${st.cor === c ? 'on' : ''}" style="background:${c}" aria-label="cor"></button>`).join('')}</div>
          ${st.erro ? `<p class="bk-erro">${esc(st.erro)}</p>` : ''}
          <div class="bk-acoes"><button type="button" class="bk-ok" data-bksalvar>Salvar banco</button><button type="button" class="bk-cancel" data-bkcancel>Cancelar</button></div></div>`;
      }
    }
    el.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      e.stopPropagation();
      const ni = el.querySelector('#bk-nome'); if (ni) st.nome = ni.value;
      if (b.dataset.bk) { valor = b.dataset.bk; onPick(valor); return render(); }
      if (b.hasAttribute('data-bknovo')) { st.novo = true; render(); setTimeout(() => { const i = el.querySelector('#bk-nome'); if (i) i.focus(); }, 50); return; }
      if (b.dataset.bkdono) { st.dono = b.dataset.bkdono; st.erro = ''; return render(); }
      if (b.dataset.bkcor) { st.cor = b.dataset.bkcor; return render(); }
      if (b.hasAttribute('data-bkcancel')) { st.novo = false; st.erro = ''; return render(); }
      if (b.hasAttribute('data-bksalvar')) {
        if (!st.nome.trim()) { st.erro = 'Escreva o nome do banco.'; return render(); }
        if (!st.dono) { st.erro = 'Toque em quem é o dono da conta.'; return render(); }
        b.disabled = true; b.textContent = 'Salvando…';
        try {
          const n = await window.APP.bancos.salvar({ nome: st.nome, dono: st.dono, cor: st.cor });
          bancos.push(n); valor = rotulo(n); onPick(valor); st.novo = false; st.nome = ''; st.dono = null;
        } catch (err) { console.error(err); st.erro = 'Não salvou. Tente de novo.'; }
        return render();
      }
    };
    render();
  }
  window.OIKOS_BANCOS = { montar, carregar };
})();
