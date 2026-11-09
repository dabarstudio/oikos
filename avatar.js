// Oikos — avatares desenhados (pele, cabelo, cor, barba, criança). Usado em Objetivos e onde houver pessoas.
(function () {
  const PELE = ['#f6dcc4', '#ecc29b', '#d6a274', '#b07a4f', '#87573a', '#5e3b26'];
  const COR = { preto: '#1f1b18', castanho: '#5a3a22', loiro: '#d9b25a', ruivo: '#b2522a', grisalho: '#a8a8a3' };
  const FUNDOS = ['#cfe3d4', '#f3d9cf', '#d6e4f2', '#efe3bf', '#e2d6f0', '#d9ecec'];
  function svg(a, size) {
    a = Object.assign({ pele: 1, cabelo: 'curto', cor: 'castanho', barba: 'nao', crianca: false, fundo: '#cfe3d4' }, a || {});
    const s = PELE[Math.min(PELE.length - 1, Math.max(0, (a.pele | 0) - 1))] || PELE[0];
    const h = COR[a.cor] || COR.castanho;
    const k = !!a.crianca;
    const fr = k ? 19 : 18, fy = k ? 54 : 50;            // rosto
    const sh = `<path d="M20 100 Q22 76 50 74 Q78 76 80 100 Z" fill="${a.roupa || '#007941'}"/>`; // ombros
    const neck = `<rect x="44" y="${fy + fr - 6}" width="12" height="12" rx="4" fill="${s}"/>`;
    const face = `<ellipse cx="50" cy="${fy}" rx="${fr}" ry="${fr + 2}" fill="${s}"/>`;
    const ears = `<ellipse cx="${50 - fr}" cy="${fy + 2}" rx="3.5" ry="5" fill="${s}"/><ellipse cx="${50 + fr}" cy="${fy + 2}" rx="3.5" ry="5" fill="${s}"/>`;
    const ey = fy - 1, er = k ? 2.6 : 2.1;
    const eyes = `<circle cx="${50 - 7}" cy="${ey}" r="${er}" fill="#2b2f29"/><circle cx="${50 + 7}" cy="${ey}" r="${er}" fill="#2b2f29"/>`;
    const brows = a.cabelo === 'careca' && !k ? `<path d="M39 ${ey - 6} q4 -2 8 0 M53 ${ey - 6} q4 -2 8 0" stroke="${h}" stroke-width="2" fill="none" stroke-linecap="round"/>` : '';
    const smile = `<path d="M${50 - 6} ${fy + 8} Q50 ${fy + 13} ${50 + 6} ${fy + 8}" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    const cheeks = k ? `<circle cx="38" cy="${fy + 6}" r="3.2" fill="#e88" opacity=".35"/><circle cx="62" cy="${fy + 6}" r="3.2" fill="#e88" opacity=".35"/>` : '';
    let hairBack = '', hairTop = '';
    const top = fy - fr - 2;
    switch (a.cabelo) {
      case 'careca': hairTop = `<path d="M${50 - fr + 3} ${fy - 8} Q50 ${top - 2} ${50 + fr - 3} ${fy - 8}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`; break;
      case 'curto': hairTop = `<path d="M${50 - fr - 1} ${fy - 2} Q${50 - fr} ${top - 4} 50 ${top - 3} Q${50 + fr} ${top - 4} ${50 + fr + 1} ${fy - 2} Q${50 + fr - 3} ${fy - 13} 50 ${fy - 14} Q${50 - fr + 3} ${fy - 13} ${50 - fr - 1} ${fy - 2} Z" fill="${h}"/>`; break;
      case 'medio': hairBack = `<path d="M${50 - fr - 3} ${fy + 12} Q${50 - fr - 4} ${top - 4} 50 ${top - 4} Q${50 + fr + 4} ${top - 4} ${50 + fr + 3} ${fy + 12} Z" fill="${h}"/>`;
        hairTop = `<path d="M${50 - fr} ${fy - 3} Q${50 - fr} ${top - 3} 50 ${top - 3} Q${50 + fr} ${top - 3} ${50 + fr} ${fy - 3} Q${50 + 6} ${fy - 14} ${50 - 4} ${fy - 12} Q${50 - fr + 4} ${fy - 9} ${50 - fr} ${fy - 3} Z" fill="${h}"/>`; break;
      case 'longo': hairBack = `<path d="M${50 - fr - 5} ${fy + 30} Q${50 - fr - 6} ${top - 5} 50 ${top - 5} Q${50 + fr + 6} ${top - 5} ${50 + fr + 5} ${fy + 30} Q50 ${fy + 34} ${50 - fr - 5} ${fy + 30} Z" fill="${h}"/>`;
        hairTop = `<path d="M${50 - fr} ${fy + 2} Q${50 - fr} ${top - 3} 50 ${top - 3} Q${50 + fr} ${top - 3} ${50 + fr} ${fy + 2} Q${50 + 10} ${fy - 15} 50 ${fy - 16} Q${50 - 12} ${fy - 14} ${50 - fr} ${fy + 2} Z" fill="${h}"/>`; break;
      case 'cacheado': { let c = ''; for (let i = 0; i < 9; i++) { const ang = Math.PI * (0.95 + i * 0.1375); c += `<circle cx="${50 + Math.cos(ang) * (fr + 2)}" cy="${fy - 4 + Math.sin(ang) * (fr + 3)}" r="7" fill="${h}"/>`; }
        hairTop = c; break; }
      case 'coque': hairBack = `<circle cx="50" cy="${top - 6}" r="8" fill="${h}"/>`;
        hairTop = `<path d="M${50 - fr} ${fy - 2} Q${50 - fr} ${top - 3} 50 ${top - 3} Q${50 + fr} ${top - 3} ${50 + fr} ${fy - 2} Q50 ${fy - 16} ${50 - fr} ${fy - 2} Z" fill="${h}"/>`; break;
      default: break;
    }
    let beard = '';
    if (!k && a.barba === 'curta') beard = `<path d="M${50 - fr + 2} ${fy + 2} Q${50 - fr + 4} ${fy + fr + 4} 50 ${fy + fr + 4} Q${50 + fr - 4} ${fy + fr + 4} ${50 + fr - 2} ${fy + 2} Q${50 + 8} ${fy + 14} 50 ${fy + 14} Q${50 - 8} ${fy + 14} ${50 - fr + 2} ${fy + 2} Z" fill="${h}" opacity=".55"/>`;
    if (!k && a.barba === 'cheia') beard = `<path d="M${50 - fr} ${fy - 2} Q${50 - fr + 1} ${fy + fr + 10} 50 ${fy + fr + 10} Q${50 + fr - 1} ${fy + fr + 10} ${50 + fr} ${fy - 2} Q${50 + fr - 3} ${fy + 6} ${50 + 9} ${fy + 7} Q50 ${fy + 4} ${50 - 9} ${fy + 7} Q${50 - fr + 3} ${fy + 6} ${50 - fr} ${fy - 2} Z" fill="${h}"/><path d="M${50 - 6} ${fy + 10} Q50 ${fy + 14} ${50 + 6} ${fy + 10}" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    const id = 'av' + Math.random().toString(36).slice(2, 8);
    return `<svg class="oav" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
      <g clip-path="url(#${id})"><rect width="100" height="100" fill="${a.fundo || '#cfe3d4'}"/>${hairBack}${sh}${neck}${ears}${face}${cheeks}${eyes}${brows}${a.barba === 'cheia' && !k ? '' : smile}${beard}${hairTop}</g></svg>`;
  }
  function familia(pessoas, size) {
    const l = (pessoas || []).slice(0, 3); if (!l.length) return '👨‍👩‍👦';
    const w = size * (1 + (l.length - 1) * 0.55);
    return `<span class="oav-fam" style="width:${w}px;height:${size}px">${l.map((p, i) => `<span style="left:${i * size * 0.55}px;z-index:${10 - i}">${svg(p.avatar, size)}</span>`).join('')}</span>`;
  }
  window.OIKOS_AVATAR = { svg, familia, PELE, COR, FUNDOS };
})();
