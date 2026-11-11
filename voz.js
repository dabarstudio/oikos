// Denário — anotar gasto falando: "gastei 6 reais de ônibus em dinheiro, a reembolsar pela Vital".
// Usa o reconhecimento de voz do navegador quando existe; senão, o microfone do teclado. Também abre por
// link (?falar=...) para funcionar com um Atalho da Siri.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hoje = (d = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };

  // ---------- números por extenso ----------
  const UN = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15,
    dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
    cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
  function extenso(t) { // "vinte e cinco reais e noventa centavos" → 25.9
    const w = sem(t).replace(/[^a-z ]/g, ' ').split(/\s+/);
    let tot = 0, cur = 0, achou = false, reais = null;
    for (const p of w) {
      if (p in UN) { cur += UN[p]; achou = true; }
      else if (p === 'mil') { tot += (cur || 1) * 1000; cur = 0; achou = true; }
      else if (p === 'e') continue;
      else if (/^rea(l|is)$/.test(p)) { reais = tot + cur; tot = 0; cur = 0; }
      else if (/^centavos?$/.test(p)) { return (reais || 0) + (tot + cur) / 100; }
      else if (achou && reais == null) { reais = tot + cur; tot = 0; cur = 0; achou = false; }
    }
    if (reais != null) return reais || null;
    return achou ? tot + cur : null;
  }
  function valorDe(t) {
    const s = String(t);
    let m = s.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i) || s.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2})\s*(?:reais|real|conto|pila)?/i);
    if (m) {
      let v = m[1].includes(',') ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : /\.\d{3}$/.test(m[1]) ? parseFloat(m[1].replace(/\./g, '')) : parseFloat(m[1]);
      const c = s.slice(m.index + m[0].length).match(/^\s*e\s*(\d{1,2})\s*centavos?/i); if (c) v += parseInt(c[1], 10) / 100;
      return { v, trecho: m[0] + (c ? c[0] : '') };
    }
    const e = extenso(s); return e ? { v: e, trecho: '' } : { v: 0, trecho: '' };
  }

  // ---------- categorias, forma, conta ----------
  const CAT = [
    ['revenda', /revend|quickbox|para o projeto|do projeto/],
    ['acougue', /acougue|carne|frango|linguica|picanha/],
    ['combustivel', /gasolina|combustivel|etanol|alcool no carro|abasteci|posto|diesel/],
    ['transporte', /onibus|uber|\b99\b|passagem|taxi|metro|estacionamento|pedagio|corrida/],
    ['comerfora', /lanche|restaurante|pizza|hamburg|sorvete|cafe|almoco|jantar|ifood|lanchonete|padaria|acai|pastel|rodizio|churrascaria/],
    ['mercado', /mercado|supermercado|atacad|feira|hortifruti|sacolao|compras do mes/],
    ['saude', /farmacia|remedio|medico|consulta|exame|dentista|hospital|drogaria|vacina/],
    ['casa', /\bcasa\b|pet\b|petshop|banho e tosa|racao|veterinari|luz|energia|agua|\bgas\b|internet|aluguel|limpeza|material de construcao|conserto|eletricista|encanador/],
    ['lazer', /presente|cinema|passeio|lazer|netflix|show|aniversario|parque|viagem|ingresso/],
  ];
  function categoria(t) {
    const s = sem(t);
    const filhos = sem(window.OIKOS_FILHOS || 'abner').split(/\s+e\s+/).filter(Boolean);
    if (filhos.some((n) => n && s.includes(n)) || /escola|fralda|creche|bebe|filho|filha/.test(s)) return 'abner';
    for (const [k, re] of CAT) if (re.test(s)) return k;
    return null;
  }
  function forma(t) {
    const s = sem(t);
    if (/\bpix\b|pics|piks/.test(s)) return 'pix';
    if (/debito/.test(s)) return 'debito';
    if (/credito|cartao/.test(s)) return 'credito';
    if (/dinheiro|especie|vivo|em maos|nota de/.test(s)) return 'dinheiro';
    return null;
  }
  let bancos = [], pessoas = [];
  async function carregarListas() {
    try { bancos = await window.APP.bancos.listar(); } catch (e) { bancos = []; }
    try { pessoas = await window.APP.pessoas.listar(); } catch (e) { pessoas = []; }
  }
  function conta(t) {
    const s = sem(t); const nomeP = (k) => { const p = pessoas.find((x) => x.chave === k); return p ? p.nome : k || ''; };
    const achados = bancos.filter((b) => s.includes(sem(b.nome).split(' ')[0]));
    if (!achados.length) return null;
    const b = achados.find((x) => x.dono && s.includes(sem(nomeP(x.dono)).slice(0, 4))) || achados[0];
    return b.nome + (b.dono ? ' (' + nomeP(b.dono) + ')' : '');
  }
  function entender(texto) {
    const t = String(texto || '').trim(); const s = sem(t);
    const { v, trecho } = valorDe(t);
    const r = { valor: v ? Math.round(v * 100) / 100 : '', envelope: categoria(t), forma: forma(t), conta: conta(t), data: hoje(), reembolsar: false, reembolso_de: 'Vital' };
    if (/anteontem/.test(s)) r.data = hoje(-2); else if (/ontem/.test(s)) r.data = hoje(-1);
    if (/reembols|vai me devolver|me devolve|a receber d/.test(s)) {
      r.reembolsar = true;
      const q = t.match(/(?:reembols\w*|devolver|receber)\s+(?:pel[ao]|d[ao]|de)\s+([A-Za-zÀ-ú][\wÀ-ú ]{1,25}?)(?=[,.;)]|$| em | no | na | com )/i);
      if (q) r.reembolso_de = q[1].trim().replace(/^a\s+/i, '');
    }
    let base = trecho ? t.replace(trecho, ' ') : t;
    if (!trecho && v) { // tira o valor falado por extenso
      const tk = base.split(/(\s+)/); const ehNum = (w) => { const x = sem(w).replace(/[^a-z]/g, ''); return x in UN || x === 'mil' || /^rea(l|is)$|^centavos?$/.test(x); };
      for (let i = 0; i < tk.length; i++) if (ehNum(tk[i]) || (sem(tk[i]) === 'e' && i > 1 && ehNum(tk[i - 2] || '') && ehNum(tk[i + 2] || ''))) tk[i] = '';
      base = tk.join('').replace(/(^|\s)(e\s+)+(?=\S)/gi, ' ').replace(/\s+e\s*$/i, '');
    }
    for (const b of bancos) base = base.replace(new RegExp('\\b(n[oa]|d[oa]|pel[oa])\\s+(conta\\s+(d[oa]\\s+)?)?' + b.nome.split(' ')[0] + '(\\s+d[ao]\\s+[A-Za-zÀ-ú]+)?', 'gi'), ' ');
    let d = base
      .replace(/^(eu\s+)?(gastei|paguei|comprei|anota(r)?( a[ií])?|anote)\s*/i, '')
      .replace(/\b(no|pelo|via|com|em)\s+(pix|d[ée]bito|cr[ée]dito|cart[aã]o( de cr[ée]dito| de d[ée]bito)?|dinheiro|esp[ée]cie)\b/gi, ' ')
      .replace(/\b(hoje|ontem|anteontem)\b/gi, ' ')
      .replace(/\(?\s*(a\s+)?reembols\w*(\s+(pel[ao]|d[ao])\s+[\wÀ-ú]+)?\s*\)?/gi, ' ')
      .replace(/^\s*(de|com|no|na|em)\s+/i, '').replace(/\s+(por|de|com|no|na|em|do|da)\s*$/i, '').replace(/\s{2,}/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '');
    r.descricao = d ? d[0].toUpperCase() + d.slice(1) : '';
    if (!r.forma) r.forma = r.conta ? 'pix' : 'dinheiro';
    if (r.forma === 'dinheiro') r.conta = null;
    return r;
  }

  // ---------- tela ----------
  const NOMES = { mercado: '🛒 Mercado', acougue: '🥩 Açougue', comerfora: '🍔 Comer fora', combustivel: '⛽ Combustível', transporte: '🚌 Ônibus / Uber', saude: '💊 Saúde', abner: '👶 Filhos', casa: '🏠 Casa', lazer: '🎁 Lazer', revenda: '🚀 Projeto', outros: '📦 Outros' };
  const FORMAS = { pix: '⚡ PIX', debito: '🏦 Débito', credito: '💳 Crédito', dinheiro: '💵 Dinheiro' };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let sh, rec = null, ouvindo = false, srFalhou = false;
  function previa() {
    const ta = document.getElementById('vz-txt'); const box = document.getElementById('vz-prev'); if (!ta || !box) return;
    const r = entender(ta.value);
    if (!ta.value.trim()) { box.innerHTML = ''; return; }
    const env = r.envelope ? (r.envelope === 'abner' ? '👶 ' + (window.OIKOS_FILHOS || 'Filhos') : NOMES[r.envelope]) : '❓ categoria';
    box.innerHTML = `<span class="${r.valor ? '' : 'falta'}">${r.valor ? BRL.format(r.valor) : '❓ valor'}</span><span class="${r.envelope ? '' : 'falta'}">${env}</span><span>${FORMAS[r.forma]}</span>${r.conta ? `<span>🏦 ${esc(r.conta)}</span>` : ''}${r.reembolsar ? `<span>↩️ reembolso: ${esc(r.reembolso_de)}</span>` : ''}${r.data !== hoje() ? `<span>📅 ${r.data.split('-').reverse().slice(0, 2).join('/')}</span>` : ''}`;
  }
  function abrir(texto) {
    carregarListas().then(previa);
    sh.querySelector('.vc-body').innerHTML = `<p class="vc-t">🎤 Fale o gasto</p>
      <p class="vc-s">Diga o valor, com o que gastou e como pagou.<br><i>Ex.: “gastei 6 reais de ônibus em dinheiro, a reembolsar pela Vital”.</i></p>
      ${SR && !srFalhou ? '<button type="button" class="vz-mic" data-vzmic aria-label="Falar"><span>🎤</span><small>Toque e fale</small></button>' : '<p class="vz-dica">Toque na caixa abaixo e depois no <b>🎤 do teclado</b> para falar.</p>'}
      <textarea id="vz-txt" class="sv-in vz-txt" rows="3" placeholder="Ou escreva aqui…">${esc(texto || '')}</textarea>
      <div class="vz-prev" id="vz-prev"></div>
      <button type="button" class="nt-btn" data-vzok>Conferir e salvar</button><button type="button" class="nt-btn sec" data-vzfechar>Cancelar</button>`;
    document.body.classList.add('vz-open');
    const ta = document.getElementById('vz-txt'); ta.addEventListener('input', previa); previa();
    if (!SR || srFalhou) setTimeout(() => ta.focus(), 300);
  }
  function parar() { ouvindo = false; try { rec && rec.stop(); } catch (e) { /* ok */ } const m = sh.querySelector('[data-vzmic]'); if (m) { m.classList.remove('on'); m.querySelector('small').textContent = 'Toque e fale'; } }
  function ouvir() {
    if (ouvindo) return parar();
    const ta = document.getElementById('vz-txt'); const base = ta.value ? ta.value.trim() + ' ' : '';
    rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (ev) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; ta.value = base + t; previa(); };
    rec.onerror = (ev) => { parar(); if (/not-allowed|service-not-allowed|audio-capture/.test(ev.error)) { srFalhou = true; const v = ta.value; abrir(v); } };
    rec.onend = parar;
    try { rec.start(); ouvindo = true; const m = sh.querySelector('[data-vzmic]'); m.classList.add('on'); m.querySelector('small').textContent = 'Ouvindo… toque para parar'; }
    catch (e) { srFalhou = true; abrir(ta.value); }
  }
  function concluir(texto) {
    const r = entender(texto);
    document.body.classList.remove('vz-open');
    if (window.OIKOS_ANOTAR) window.OIKOS_ANOTAR({ prefill: r });
  }
  function montar() {
    sh = document.createElement('div'); sh.className = 'vc-sheet vz-sheet'; sh.innerHTML = '<div class="vc-scrim"></div><div class="vc-panel"><div class="vc-body"></div></div>'; document.body.append(sh);
    sh.addEventListener('click', (e) => {
      if (e.target.classList.contains('vc-scrim') || e.target.closest('[data-vzfechar]')) { parar(); return document.body.classList.remove('vz-open'); }
      if (e.target.closest('[data-vzmic]')) return ouvir();
      if (e.target.closest('[data-vzok]')) { parar(); const t = document.getElementById('vz-txt').value; if (!t.trim()) return document.getElementById('vz-txt').focus(); return concluir(t); }
    });
    window.OIKOS_VOZ = { abrir, entender, concluir };
    const siri = () => {
      const url = location.origin + location.pathname + '?falar=';
      sh.querySelector('.vc-body').innerHTML = `<p class="vc-t">🎙️ Anotar com a Siri</p><p class="vc-s">Faça uma vez (2 minutos) e depois é só dizer <b>“E aí Siri, anotar gasto”</b>.</p>
        <ol class="vz-passos"><li>Abra o app <b>Atalhos</b> do iPhone e toque em <b>＋</b>.</li>
        <li>Adicione a ação <b>Ditar Texto</b> (idioma: Português).</li>
        <li>Adicione <b>Codificar URL</b> (ela usa o “Texto Ditado”).</li>
        <li>Adicione <b>Abrir URLs</b> e escreva:<br><code>${esc(url)}</code> e, logo depois, toque e escolha <b>URL Codificada</b>.</li>
        <li>Dê o nome <b>Anotar gasto</b> ao atalho. Pronto!</li></ol>
        <button type="button" class="nt-btn" data-vzcopiar>📋 Copiar o endereço</button><button type="button" class="nt-btn sec" data-vzfechar>Fechar</button>`;
      document.body.classList.add('vz-open');
      sh.querySelector('[data-vzcopiar]').onclick = async (e) => { try { await navigator.clipboard.writeText(url); e.target.textContent = '✅ Copiado'; } catch (err) { e.target.textContent = url; } };
    };
    const maisItem = () => {
      const sheet = document.querySelector('.ob-sheet'); if (!sheet || sheet.querySelector('[data-vzsiri]')) return;
      const b = document.createElement('button'); b.type = 'button'; b.dataset.vzsiri = '1';
      b.innerHTML = '<span class="fx-ic">🎙️</span><span>Anotar com a Siri<small>Fale o gasto sem nem abrir o app</small></span>';
      b.addEventListener('click', () => { document.body.classList.remove('ob-open'); siri(); });
      sheet.insertBefore(b, sheet.querySelector('.ob-sair'));
    };
    new MutationObserver(maisItem).observe(document.body, { childList: true }); maisItem();
    // Atalho da Siri: abre o app com ?falar=texto
    const q = new URLSearchParams(location.search).get('falar');
    if (q) {
      history.replaceState(null, '', location.pathname);
      const ir = () => carregarListas().then(() => abrir(q));
      if (window.dash) { let ok = false; dash.onData(() => { if (!ok && dash.data('mensal').status === 'ok') { ok = true; ir(); } }); } else ir();
    }
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(montar, 60));
})();
