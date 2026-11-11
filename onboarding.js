// Denário — primeiro acesso: cria a família (ou entra com código), monta o bonequinho de cada pessoa e o limite do mês.
// Também coloca no "Mais": chamar alguém da família (código) e trocar a senha.
(function () {
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[^\d,]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const AV = () => window.OIKOS_AVATAR;
  const CAB = [['careca', 'Careca'], ['curto', 'Curto'], ['medio', 'Médio'], ['longo', 'Longo'], ['cacheado', 'Cacheado'], ['coque', 'Coque']];
  const BAR = [['nao', 'Sem barba'], ['curta', 'Curta'], ['cheia', 'Cheia']];
  const chaveDe = (nome) => (nome || 'pessoa').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 16) + '-' + Math.random().toString(36).slice(2, 6);
  let el, st;

  const novoAvatar = (i, crianca) => ({ pele: 2, cabelo: 'curto', cor: 'castanho', barba: 'nao', crianca: !!crianca, fundo: AV().FUNDOS[i % AV().FUNDOS.length] });

  function tela(html, voltar) {
    el.querySelector('.ob1-in').innerHTML = (voltar ? `<button type="button" class="ob1-back" data-volta="${voltar}">‹ Voltar</button>` : '') + html;
    el.scrollTop = 0;
  }
  function passos(n) { return `<div class="ob1-dots">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`; }

  function inicio() {
    tela(`<div class="ob1-logo">🏠</div><h1>Bem-vindo ao Denário!</h1><p class="ob1-s">O jeito simples de cuidar do dinheiro da casa. Vamos arrumar tudo em 1 minuto.</p>
      <button type="button" class="ob1-big" data-ir="nome"><span>🏡</span><b>Começar minha família</b><small>Sou a primeira pessoa da casa a usar</small></button>
      <button type="button" class="ob1-big sec" data-ir="codigo"><span>🔑</span><b>Entrar na família de alguém</b><small>Recebi um código de quem já usa</small></button>`);
  }
  function telaNome() {
    tela(`${passos(1)}<h2>Como se chama sua família?</h2><p class="ob1-s">É o nome que aparece no topo do app.</p>
      <div class="ob1-fam"><span>Família</span><input id="ob1-fam" class="sv-in" placeholder="Silva" value="${esc(st.familia)}" maxlength="40" autocomplete="off"></div>
      <p class="ob1-erro" id="ob1-erro"></p><button type="button" class="ob1-go" data-ok="nome">Continuar</button>`, 'inicio');
    setTimeout(() => { const i = document.getElementById('ob1-fam'); if (i) i.focus(); }, 200);
  }
  function telaCodigo() {
    tela(`<h2>Digite o código da família</h2><p class="ob1-s">Peça para quem já usa o Denário: fica em <b>Mais → Chamar alguém da família</b>.</p>
      <input id="ob1-cod" class="sv-in ob1-cod" placeholder="ABC123" maxlength="6" autocapitalize="characters" autocomplete="off">
      <p class="ob1-erro" id="ob1-erro"></p><button type="button" class="ob1-go" data-ok="codigo">Entrar</button>`, 'inicio');
  }
  function editor(titulo, sub, p, voltar, botao) {
    const a = p.avatar;
    const op = (campo, valor, conteudo, extra) => `<button type="button" class="og-op${a[campo] === valor ? ' on' : ''}" data-campo="${campo}" data-valor='${JSON.stringify(valor)}' ${extra || ''}>${conteudo}</button>`;
    tela(`${st.modo === 'novo' ? passos(st.etapa) : ''}<h2>${titulo}</h2><p class="ob1-s">${sub}</p>
      <div class="og-prev">${AV().svg(a, 120)}</div>
      <label class="og-f">Nome<input id="ob1-pnome" class="sv-in" value="${esc(p.nome)}" placeholder="Ex.: Maria" maxlength="24" autocomplete="off"></label>
      <p class="og-f">Adulto ou criança?</p><div class="og-ops">${op('crianca', false, '🧑 Adulto')}${op('crianca', true, '🧒 Criança')}</div>
      <p class="og-f">Cor da pele</p><div class="og-ops">${AV().PELE.map((c, i) => op('pele', i + 1, '', `style="background:${c}" aria-label="Tom ${i + 1}"`)).join('')}</div>
      <p class="og-f">Cabelo</p><div class="og-ops av">${CAB.map(([k, n]) => op('cabelo', k, AV().svg({ ...a, cabelo: k }, 44) + `<small>${n}</small>`)).join('')}</div>
      <p class="og-f">Cor do cabelo</p><div class="og-ops">${Object.entries(AV().COR).map(([k, c]) => op('cor', k, '', `style="background:${c}" aria-label="${k}"`)).join('')}</div>
      ${a.crianca ? '' : `<p class="og-f">Barba</p><div class="og-ops av">${BAR.map(([k, n]) => op('barba', k, AV().svg({ ...a, barba: k }, 44) + `<small>${n}</small>`)).join('')}</div>`}
      <p class="og-f">Cor do fundo</p><div class="og-ops">${AV().FUNDOS.map((c) => op('fundo', c, '', `style="background:${c}"`)).join('')}</div>
      <p class="ob1-erro" id="ob1-erro"></p><button type="button" class="ob1-go" data-ok="pessoa">${botao}</button>`, voltar);
  }
  function telaEu() { st.etapa = 2; st.edit = st.eu; editor('Agora monte o seu bonequinho', 'Escolha o jeitinho que mais parece com você. Dá para mudar depois.', st.eu, st.modo === 'novo' ? 'nome' : 'quem', 'Continuar'); }
  function telaOutros() {
    st.etapa = 3;
    tela(`${passos(3)}<h2>Quem mais mora com você?</h2><p class="ob1-s">Coloque quem divide as contas da casa e as crianças.</p>
      <div class="og-plist">${[st.eu, ...st.outros].map((p, i) => `<button type="button" data-edita="${i}">${AV().svg(p.avatar, 52)}<b>${esc(p.nome)}${i === 0 ? ' <small>(você)</small>' : ''}</b><span>✏️</span></button>`).join('')}
      <button type="button" data-edita="novo"><span class="og-plus">＋</span><b>Adicionar pessoa</b><span></span></button></div>
      <button type="button" class="ob1-go" data-ir="limite">${st.outros.length ? 'Continuar' : 'Moro sozinho(a) / continuar'}</button>`, 'eu');
  }
  function telaLimite() {
    st.etapa = 4;
    tela(`${passos(4)}<h2>Quanto a família pode gastar por mês?</h2><p class="ob1-s">Conte mercado, farmácia, combustível, lazer… Não precisa ser exato: dá para mudar quando quiser.</p>
      <div class="ag-money ob1-money"><span>R$</span><input id="ob1-lim" inputmode="numeric" placeholder="3.000" value="${st.limite || ''}" autocomplete="off"></div>
      <div class="ob1-sug">${[2000, 3000, 4000, 5000].map((v) => `<button type="button" data-sug="${v}">${BRL.format(v)}</button>`).join('')}</div>
      <p class="ob1-erro" id="ob1-erro"></p><button type="button" class="ob1-go" data-ok="limite">Terminar</button>
      <button type="button" class="ob1-link" data-ok="semlimite">Ainda não sei, pular</button>`, 'outros');
  }
  function telaQuem() {
    tela(`<h2>Quem é você?</h2><p class="ob1-s">Toque no seu bonequinho. Se não estiver aqui, crie o seu.</p>
      <div class="og-plist">${st.pessoasFam.filter((p) => !(p.avatar && p.avatar.crianca)).map((p) => `<button type="button" data-souess="${esc(p.chave)}">${AV().svg(p.avatar, 52)}<b>${esc(p.nome)}</b><span>›</span></button>`).join('')}
      <button type="button" data-ir="eu"><span class="og-plus">＋</span><b>Não estou aqui, criar o meu</b><span></span></button></div>`);
  }
  function fim(msg) {
    tela(`<div class="ob1-logo">🎉</div><h1>Tudo pronto!</h1><p class="ob1-s">${msg}</p>
      <div class="ob1-dicas"><p>✍️ <b>Anotar gasto</b>: toque no botão verde sempre que gastar.</p><p>📸 <b>Enviar notinha</b>: tire foto do cupom do mercado.</p><p>🎯 <b>Objetivos</b>: guarde dinheiro para os sonhos da família.</p></div>
      <button type="button" class="ob1-go" data-fim>Começar a usar</button>`);
  }

  function lerPessoa() { const n = document.getElementById('ob1-pnome'); if (n && st.edit) st.edit.nome = n.value.trim(); }
  const erro = (t) => { const e = document.getElementById('ob1-erro'); if (e) e.textContent = t; };

  async function concluir(limite) {
    tela('<div class="ob1-logo">⏳</div><h2 style="text-align:center">Arrumando a casa…</h2>');
    try {
      await window.APP.familia.criar('Família ' + st.familia.replace(/^fam[ií]lia\s+/i, ''));
      const todos = [st.eu, ...st.outros];
      for (let i = 0; i < todos.length; i++) await window.APP.pessoas.salvar({ ...todos[i], ordem: i + 1 });
      await window.APP.familia.definirPessoa(st.eu.chave);
      if (limite) await window.APP.salvarLimites([{ nivel: 'total', chave: 'SAÍDAS', valor_meta: limite }]);
      fim(limite ? `A ${esc('Família ' + st.familia)} pode gastar até <b>${BRL.format(limite)}</b> por mês. O Denário vai avisar quando estiver apertando.` : 'Quando souber quanto pode gastar por mês, toque em “Definir o limite do mês” no Início.');
    } catch (e) {
      console.error(e);
      tela(`<div class="ob1-logo">😕</div><h2 style="text-align:center">Não consegui criar agora</h2><p class="ob1-s" style="text-align:center">Confira a internet e tente de novo.</p><button type="button" class="ob1-go" data-ok="limite-retry">Tentar de novo</button>`);
      st.retry = limite;
    }
  }

  async function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.volta) { lerPessoa(); return ({ inicio, nome: telaNome, eu: telaEu, outros: telaOutros, quem: telaQuem })[b.dataset.volta](); }
    if (b.dataset.ir === 'nome') { st.modo = 'novo'; return telaNome(); }
    if (b.dataset.ir === 'codigo') { st.modo = 'codigo'; return telaCodigo(); }
    if (b.dataset.ir === 'limite') return telaLimite();
    if (b.dataset.ir === 'eu') return telaEu();
    if (b.dataset.campo) {
      lerPessoa(); const p = st.edit; p.avatar[b.dataset.campo] = JSON.parse(b.dataset.valor);
      if (b.dataset.campo === 'crianca' && p.avatar.crianca) p.avatar.barba = 'nao';
      const y = el.scrollTop; (p === st.eu ? telaEu() : editor(st.editNovo ? 'Nova pessoa' : 'Editar pessoa', 'Nome e jeitinho de quem mora com você.', p, 'outros', 'Salvar')); el.scrollTop = y; return;
    }
    if (b.dataset.edita) {
      if (b.dataset.edita === '0') { st.voltarOutros = true; return telaEu(); }
      st.editNovo = b.dataset.edita === 'novo';
      st.edit = st.editNovo ? { chave: null, nome: '', avatar: novoAvatar(st.outros.length + 1, false) } : st.outros[+b.dataset.edita - 1];
      return editor(st.editNovo ? 'Nova pessoa' : 'Editar pessoa', 'Nome e jeitinho de quem mora com você.', st.edit, 'outros', 'Salvar');
    }
    if (b.dataset.sug) { const i = document.getElementById('ob1-lim'); i.value = b.dataset.sug; return; }
    if (b.dataset.souess) {
      b.disabled = true;
      try { await window.APP.familia.definirPessoa(b.dataset.souess); fim('Você entrou na família. Tudo o que vocês anotarem aparece para os dois.'); } catch (err) { console.error(err); b.disabled = false; }
      return;
    }
    if (b.hasAttribute('data-fim')) { location.reload(); return; }
    const ok = b.dataset.ok; if (!ok) return;
    if (ok === 'nome') { st.familia = document.getElementById('ob1-fam').value.trim(); if (!st.familia) return erro('Escreva o nome da família.'); return telaEu(); }
    if (ok === 'codigo') {
      const c = document.getElementById('ob1-cod').value.trim(); if (c.length < 6) return erro('O código tem 6 letras ou números.');
      b.disabled = true; b.textContent = 'Entrando…';
      try { await window.APP.familia.entrar(c); st.pessoasFam = await window.APP.pessoas.listar(); return telaQuem(); }
      catch (err) { console.error(err); b.disabled = false; b.textContent = 'Entrar'; return erro('Não achei esse código. Confira com quem te mandou.'); }
    }
    if (ok === 'pessoa') {
      lerPessoa(); const p = st.edit; if (!p.nome) return erro('Escreva o nome.');
      if (!p.chave) p.chave = chaveDe(p.nome);
      if (p === st.eu) {
        if (st.modo === 'codigo') {
          b.disabled = true;
          try { await window.APP.pessoas.salvar({ ...p, ordem: 50 }); await window.APP.familia.definirPessoa(p.chave); fim('Você entrou na família. Tudo o que vocês anotarem aparece para todos.'); } catch (err) { console.error(err); b.disabled = false; erro('Não salvou. Tente de novo.'); }
          return;
        }
        return telaOutros();
      }
      if (st.editNovo) { st.outros.push(p); st.editNovo = false; }
      return telaOutros();
    }
    if (ok === 'limite') { st.limite = num(document.getElementById('ob1-lim').value); if (!st.limite) return erro('Escreva um valor ou toque em “pular”.'); return concluir(st.limite); }
    if (ok === 'semlimite') return concluir(0);
    if (ok === 'limite-retry') return concluir(st.retry);
  }

  function abrir() {
    if (!el) {
      el = document.createElement('div'); el.className = 'ob1'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Primeiro acesso');
      el.innerHTML = '<div class="ob1-in"></div>'; el.addEventListener('click', onClick);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); const g = el.querySelector('.ob1-go'); if (g) g.click(); } });
      document.body.append(el);
    }
    st = { modo: null, familia: '', eu: { chave: null, nome: '', avatar: novoAvatar(0, false) }, outros: [], limite: 0, etapa: 1 };
    document.body.classList.add('ob1-on'); inicio();
  }
  window.OIKOS_ONBOARD = { abrir };

  // ---------- "Mais": chamar alguém da família / trocar senha ----------
  let fs;
  function folha(html) { fs.querySelector('.vc-body').innerHTML = html; document.body.classList.add('fx-open'); }
  async function convidar() {
    folha('<p class="vc-t">Chamar alguém da família</p><p class="vc-s">Carregando o código…</p>');
    let cod = ''; try { cod = await window.APP.familia.codigo(); } catch (e) { console.error(e); }
    const txt = `Oi! Entra comigo no Denário para a gente cuidar do dinheiro da casa juntos 🏠\n1) Abra ${location.origin + location.pathname}\n2) Entre com o e-mail e a senha que te mandei\n3) Toque em “Entrar na família de alguém” e digite o código: ${cod}`;
    folha(`<p class="vc-t">Chamar alguém da família</p><p class="vc-s">A pessoa entra com o login dela e digita este código no primeiro acesso:</p>
      <div class="fx-cod">${esc(cod || '—')}</div>
      <a class="nt-btn fx-zap" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">📲 Mandar pelo WhatsApp</a>
      <button type="button" class="nt-btn sec" data-fxfechar>Fechar</button>`);
  }
  function senha() {
    folha(`<p class="vc-t">Trocar minha senha</p><p class="vc-s">Use pelo menos 8 letras ou números.</p>
      <label class="vc-l">Nova senha<input id="fx-s1" type="password" class="sv-in" autocomplete="new-password"></label>
      <label class="vc-l">Repita a nova senha<input id="fx-s2" type="password" class="sv-in" autocomplete="new-password"></label>
      <p class="vc-erro" id="fx-erro"></p><button type="button" class="nt-btn" data-fxsalvar>Salvar nova senha</button><button type="button" class="nt-btn sec" data-fxfechar>Cancelar</button>`);
  }
  function montarMais() {
    const sh = document.querySelector('.ob-sheet'); if (!sh || sh.querySelector('[data-fx]')) return;
    const sair = sh.querySelector('.ob-sair');
    const mk = (k, ic, t, d) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.fx = k; b.innerHTML = `<span class="fx-ic">${ic}</span><span>${t}<small>${d}</small></span>`; sh.insertBefore(b, sair); };
    mk('convidar', '👨‍👩‍👧', 'Chamar alguém da família', 'Código para a pessoa entrar junto');
    mk('senha', '🔑', 'Trocar minha senha', 'Crie uma senha só sua');
    sh.addEventListener('click', (e) => { const b = e.target.closest('[data-fx]'); if (!b) return; document.body.classList.remove('ob-open'); b.dataset.fx === 'convidar' ? convidar() : senha(); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    fs = document.createElement('div'); fs.className = 'vc-sheet fx-sheet'; fs.innerHTML = '<div class="vc-scrim"></div><div class="vc-panel"><div class="vc-body"></div></div>';
    document.body.append(fs);
    fs.addEventListener('click', async (e) => {
      if (e.target.classList.contains('vc-scrim') || e.target.closest('[data-fxfechar]')) return document.body.classList.remove('fx-open');
      const b = e.target.closest('[data-fxsalvar]'); if (!b) return;
      const s1 = document.getElementById('fx-s1').value, s2 = document.getElementById('fx-s2').value, er = document.getElementById('fx-erro');
      if (s1.length < 8) { er.textContent = 'Use pelo menos 8 caracteres.'; return; }
      if (s1 !== s2) { er.textContent = 'As duas senhas não estão iguais.'; return; }
      b.disabled = true; b.textContent = 'Salvando…';
      try { await window.APP.familia.trocarSenha(s1); folha('<div class="nt-big">🔒</div><p class="nt-t">Senha trocada!</p><p class="nt-s">Na próxima vez, entre com a senha nova.</p><button type="button" class="nt-btn" data-fxfechar>Pronto</button>'); }
      catch (err) { console.error(err); b.disabled = false; b.textContent = 'Salvar nova senha'; er.textContent = 'Não deu certo. Tente outra senha.'; }
    });
    new MutationObserver(montarMais).observe(document.body, { childList: true }); montarMais();
  });
})();
