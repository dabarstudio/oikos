// Denário — convidar pessoas pelo WhatsApp: abre o WhatsApp com uma mensagem pronta e o link da página do Denário.
(function () {
  const LINK = 'https://dabarstudio.github.io/oikos/conheca.html';
  const TEXTO = 'Oi! Estou usando o Denário, um app de finanças da família à luz da Bíblia. Ele mostra quanto ainda dá pra gastar no mês, anota gasto falando ou com foto da notinha e traz uma pílula de sabedoria por dia. Dá uma olhada: ' + LINK;
  function whats() { location.href = 'https://wa.me/?text=' + encodeURIComponent(TEXTO); }
  async function outros(btn) {
    try {
      if (navigator.share) { await navigator.share({ title: 'Denário', text: TEXTO.replace(' ' + LINK, ''), url: LINK }); return; }
      await navigator.clipboard.writeText(TEXTO); if (btn) { btn.textContent = 'Link copiado ✓'; }
    } catch (e) { /* cancelado */ }
  }
  let sh;
  function abrir() {
    if (!sh) {
      sh = document.createElement('div'); sh.className = 'vc-sheet cv-sheet';
      sh.innerHTML = '<div class="vc-scrim" data-cvfechar></div><div class="vc-panel" role="dialog" aria-modal="true" aria-label="Convidar"><div class="vc-body"></div></div>';
      document.body.appendChild(sh);
    }
    sh.querySelector('.vc-body').innerHTML = `<p class="vc-t">📲 Convidar para o Denário</p>
      <p class="cv-s">Mande o Denário para amigos e família. Eles recebem esta mensagem com o link:</p>
      <div class="cv-msg">${TEXTO.replace(LINK, '<b>' + LINK.replace('https://', '') + '</b>')}</div>
      <button type="button" class="cv-wa" data-cvwa><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z"/></svg>Enviar pelo WhatsApp</button>
      <button type="button" class="nt-btn sec" data-cvout>Outros apps ou copiar o link</button>
      <button type="button" class="nt-btn sec" data-cvfechar>Fechar</button>`;
    document.body.classList.add('cv-open');
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cvabrir]')) { document.body.classList.remove('ob-open'); return abrir(); }
    if (e.target.closest('[data-cvwa]')) return whats();
    const o = e.target.closest('[data-cvout]'); if (o) return outros(o);
    if (e.target.closest('[data-cvfechar]')) document.body.classList.remove('cv-open');
  });
  function noMais() {
    const sheet = document.querySelector('.ob-sheet');
    if (sheet && !sheet.querySelector('[data-cvabrir]') && sheet.querySelector('h3')) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.cvabrir = '1';
      b.innerHTML = '<span class="fx-ic">📲</span><span>Convidar pelo WhatsApp<small>Mande o link do Denário para amigos</small></span>';
      sheet.insertBefore(b, sheet.querySelector('h3').nextSibling);
    }
  }
  let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(noMais, 100); }).observe(document.documentElement, { childList: true, subtree: true });
  window.OIKOS_CONVITE = { abrir, LINK, TEXTO };
})();
