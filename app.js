// Denário — login (Supabase Auth), carga dos dados da família e a camada `dash`
// que as telas usam para ler dados, cálculos e filtros.
(function () {
  const DATASETS = ['mensal', 'contas', 'lancamentos', 'fixos', 'balanco', 'indicadores', 'plano', 'mercado', 'mercado_itens',
    'metas', 'lista_compras', 'comparativo', 'alavancas', 'bens'];

  // ---------- camada de dados (mesma interface usada pelas telas) ----------
  const store = new Map();      // id -> {status, data}
  const calcs = new Map();      // id -> {inputs, fn}
  const memo = new Map();       // id -> {ver, res}
  const listeners = [];
  let ver = 0;
  const defaults = { mes: 'total' };
  let params = { ...defaults };
  DATASETS.forEach((id) => store.set(id, { status: 'loading', data: [] }));

  function emit() {
    ver += 1;
    for (const fn of listeners) { try { fn(); } catch (e) { console.error('[Denário] erro ao desenhar:', e); } }
  }
  const dash = {
    data(id) {
      if (store.has(id)) { const s = store.get(id); return { status: s.status, data: s.data, columns: s.data && s.data[0] ? Object.keys(s.data[0]) : [], meta: [], refreshing: false }; }
      if (calcs.has(id)) {
        const c = calcs.get(id);
        const ins = c.inputs.map((i) => dash.data(i));
        const bad = ins.find((x) => x.status !== 'ok');
        if (bad) return { status: bad.status === 'error' ? 'error' : 'loading', data: [], columns: [] };
        const m = memo.get(id);
        if (m && m.ver === dataVer) return m.res;
        let res;
        try { const data = c.fn(...ins.map((x) => x.data)); res = { status: 'ok', data, columns: Array.isArray(data) && data[0] ? Object.keys(data[0]) : [] }; }
        catch (e) { console.error('[Denário] cálculo', id, e); res = { status: 'error', data: [], message: String(e) }; }
        memo.set(id, { ver: dataVer, res });
        return res;
      }
      return { status: 'missing', data: [], columns: [] };
    },
    onData(fn) { listeners.push(fn); try { fn(); } catch (e) { console.error(e); } },
    calc(id, def) { calcs.set(id, def); },
    loader() {},
    params() { return { ...params }; },
    setParams(p) { params = { ...params, ...p }; emit(); },
    resetParams() { params = { ...defaults }; emit(); },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignora */ } },
    refresh() { carregar(); },
    colors: ['#007941', '#eb6834', '#2f7fb8', '#c99a1e', '#7a5cb8', '#2fa39b', '#b8506a', '#6b7d2a'],
  };
  let dataVer = 0;
  window.dash = dash;
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(emit, 150); });

  let limites = [];
  function aplicarLimites(rows) {
    const m = rows.find((r) => r && r.id === 'metas'); if (!m || !limites.length) return rows;
    const data = m.data.map((x) => { const l = limites.find((y) => y.nivel === x.nivel && y.chave === x.chave); return l ? { ...x, valor_meta: +l.valor_meta } : x; });
    for (const l of limites) if (!data.some((x) => x.nivel === l.nivel && x.chave === l.chave)) data.push({ id: l.nivel + ':' + l.chave, nivel: l.nivel, chave: l.chave, valor_meta: +l.valor_meta, tipo: 'teto', mae_pai: null, nota: 'ajustado no app' });
    return rows.map((r) => (r === m ? { ...m, data } : r));
  }
  // ---------- bens cadastrados no app: mesma conta da planilha (linear, 10% residual, reposição +4,5% a.a.) ----------
  let bensApp = [];
  function calcBem(b, hoje) {
    hoje = hoje || new Date();
    const pago = b.valor_compra != null ? Number(b.valor_compra) * (b.qtd || 1) : null;
    const dt = b.data_aquisicao ? new Date(b.data_aquisicao + 'T12:00:00') : hoje;
    const vida = Number(b.vida_util) || 8;
    const idade = Math.max(0, (hoje - dt) / (365.25 * 864e5));
    const r2 = (x) => Math.round(x * 100) / 100;
    const atual = pago == null ? null : r2(pago - pago * 0.9 * Math.min(1, idade / vida));
    const ren = new Date(dt); ren.setFullYear(ren.getFullYear() + vida);
    const prov = pago == null ? null : r2(pago * Math.pow(1.045, Math.max(vida, idade)) / (vida * 12));
    return { item: b.item, grupo: b.grupo || 'Cadastrado no app', qtd: b.qtd || 1, valor_compra: pago, data_aquisicao: b.data_aquisicao || null, vida_util: vida, valor_atual: atual,
      renovar_em: ren.getFullYear() + '-' + String(ren.getMonth() + 1).padStart(2, '0'), provisao_mes: prov, obs: b.obs || '', app_id: b.id, foto_path: b.foto_path || null };
  }
  function mesclarBens(rows) {
    if (!bensApp.length) return rows;
    const extra = bensApp.map((b) => calcBem(b));
    const soma = extra.reduce((a, b) => a + (b.valor_atual || 0), 0);
    return rows.map((r) => {
      if (r.id === 'bens') return { ...r, data: [...r.data, ...extra] };
      if (r.id === 'balanco' && r.data.length) {
        const sobe = (x) => /^Bens da casa|^Imobilizado$|^ATIVO NÃO CIRCULANTE$|^TOTAL DO ATIVO$|^PATRIMÔNIO LÍQUIDO$|^TOTAL PASSIVO \+ PL$/.test(x.item);
        return { ...r, data: r.data.map((x) => (sobe(x) && x.valor != null ? { ...x, valor: Math.round((x.valor + soma) * 100) / 100 } : x)) };
      }
      return r;
    });
  }
  async function carregarBens() {
    try { bensApp = await window.APP.bens.listar(); } catch (e) { bensApp = []; }
  }
  function setDados(rows) {
    rows = mesclarBens(aplicarLimites(rows));
    for (const id of DATASETS) store.set(id, { status: 'missing', data: [] });
    for (const r of rows) store.set(r.id, { status: 'ok', data: r.data });
    dataVer += 1; memo.clear();
    emit();
  }

  // Família nova (sem planilha importada): começa com dados vazios e envelopes sem limite.
  const ENV_PADRAO = [['conta', 'MERCADO'], ['conta', 'AÇOUGUE'], ['conta', 'ALIMENTAÇÃO FORA'], ['mae', 'VEÍCULO E TRANSPORTE'], ['mae', 'SAÚDE E BEM-ESTAR'], ['mae', 'ABNER'], ['mae', 'CASA'], ['mae', 'LAZER, PRESENTES E ASSINATURAS']];
  function inicial() {
    const d = new Date(); const mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const vazio = { entradas: 0, saidas: 0, saldo: 0 };
    const metas = [{ id: 'total:SAÍDAS', nivel: 'total', chave: 'SAÍDAS', valor_meta: 0, tipo: 'teto' }, ...ENV_PADRAO.map(([n, c]) => ({ id: n + ':' + c, nivel: n, chave: c, valor_meta: 0, tipo: 'teto' }))];
    return DATASETS.map((id) => ({ id, data: id === 'mensal' ? [{ mes, ...vazio }, { mes: 'total', ...vazio }] : id === 'metas' ? metas : [] }));
  }
  async function rotuloFilhos() {
    try { const ps = await window.APP.pessoas.listar(); const k = ps.filter((p) => p.avatar && p.avatar.crianca).map((p) => p.nome); window.OIKOS_FILHOS = k.length ? k.join(' e ') : 'Filhos'; } catch (e) { window.OIKOS_FILHOS = 'Filhos'; }
  }

  // ---------- autenticação e carga ----------
  const cfg = window.SV_CONFIG || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const demo = !cfg.SUPABASE_URL && local;
  const $ = (id) => document.getElementById(id);
  const demoNovo = demo && /[?&]novo=1/.test(location.search);
  let sb = null, household = null, minhaPessoa = null;
  function titulo(nome) { const h = document.querySelector('.fv-title'); if (h) h.textContent = 'Finanças da ' + nome; }

  function mostrar(logado) {
    $('sv-login').hidden = logado;
    $('sv-app').hidden = !logado;
    if (logado) emit();
  }

  async function carregar() {
    $('sv-upd').textContent = 'Carregando…';
    try {
      if (demoNovo) {
        let fam = null; try { fam = JSON.parse(localStorage.getItem('oikos-fam') || 'null'); } catch (e) { /* vazio */ }
        if (!fam) { $('sv-upd').textContent = ''; if (window.OIKOS_ONBOARD) window.OIKOS_ONBOARD.abrir(); return; }
        try { limites = JSON.parse(localStorage.getItem('oikos-lim') || '[]'); } catch (e) { limites = []; }
        document.body.classList.add('oikos-simples'); await rotuloFilhos(); await carregarBens(); setDados(inicial());
        $('sv-upd').textContent = 'Demonstração (família nova)'; $('sv-who').textContent = fam.nome; titulo(fam.nome);
        return;
      }
      if (demo) {
        const rows = await Promise.all(DATASETS.map(async (id) => {
          const r = await fetch('seed/' + id + '.json'); if (!r.ok) return null;
          return { id, data: await r.json() };
        }));
        try { limites = JSON.parse(localStorage.getItem('oikos-lim') || '[]'); } catch (e) { limites = []; }
        await carregarBens(); setDados(rows.filter(Boolean));
        $('sv-upd').textContent = 'Modo demonstração (dados locais)';
        $('sv-who').textContent = 'Família Sanches Vital';
        return;
      }
      const { data: hh, error: e1 } = await sb.from('households').select('*').limit(1);
      if (e1) throw e1;
      if (!hh || !hh.length) { $('sv-upd').textContent = ''; if (window.OIKOS_ONBOARD) { window.OIKOS_ONBOARD.abrir(); return; } throw new Error('Seu usuário ainda não está ligado a nenhuma família.'); }
      household = hh[0];
      $('sv-who').textContent = household.nome; titulo(household.nome);
      try { const { data: u } = await sb.auth.getUser(); const { data: mb } = await sb.from('members').select('pessoa').eq('household_id', household.id).eq('user_id', u.user.id).maybeSingle(); minhaPessoa = mb && mb.pessoa; } catch (e) { /* ok */ }
      await rotuloFilhos();
      const { data, error } = await sb.from('datasets').select('id, data, updated_at').eq('household_id', household.id);
      if (error) throw error;
      try { const lr = await sb.from('limites').select('nivel, chave, valor_meta').eq('household_id', household.id); limites = lr.data || []; } catch (e) { limites = []; }
      const simples = !data.some((d) => d.id === 'mensal');
      document.body.classList.toggle('oikos-simples', simples);
      await carregarBens(); setDados(simples ? inicial() : data);
      const ult = data.map((d) => d.updated_at).sort().pop();
      $('sv-upd').textContent = simples ? '' : ult ? 'Dados atualizados em ' + new Date(ult).toLocaleDateString('pt-BR') : '';
    } catch (e) {
      console.error(e);
      for (const id of DATASETS) store.set(id, { status: 'error', data: [] });
      emit();
      $('sv-upd').textContent = 'Não foi possível carregar os dados: ' + (e.message || e);
    }
  }

  window.APP = {
    async enviarNota(blob, qr, extra) {
      extra = extra || {};
      const chave = qr ? ((qr.match(/\d{44}/) || [])[0] || null) : null;
      if (demo) { await new Promise((r) => setTimeout(r, 600)); return { ok: true, chave, id: 'demo-' + Date.now() }; }
      const nome = household.id + '/' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
      const up = await sb.storage.from('notas').upload(nome, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      let { data, error } = await sb.from('notas').insert({ household_id: household.id, foto_path: nome, qr_texto: qr || null, chave, envelope: extra.envelope || null, forma: extra.forma || null, obs: extra.obs || null, conta: extra.conta || null }).select('id').single();
      if (error && /column/.test(error.message || '')) ({ data, error } = await sb.from('notas').insert({ household_id: household.id, foto_path: nome, qr_texto: qr || null, chave, obs: [extra.envelope, extra.forma, extra.conta, extra.obs].filter(Boolean).join(' | ') || null }).select('id').single());
      if (error) throw error;
      return { ok: true, chave, id: data && data.id };
    },
    // lê a notinha na hora (função "ler-nota" no Supabase) e já lança o gasto no envelope
    async lerNota(id) {
      if (demo) { await new Promise((r) => setTimeout(r, 900)); return { ok: true, nota: { loja: 'Supermercado Exemplo', total: 87.4, itens: [{ descricao: 'Arroz 5kg', total: 27.9 }, { descricao: 'Feijão 1kg', total: 8.5 }, { descricao: 'Café 500g', total: 21 }] }, gasto: { valor: 87.4 } }; }
      try {
        const { data, error } = await sb.functions.invoke('ler-nota', { body: { id } });
        if (error) { let b = null; try { b = await error.context.json(); } catch (e) { /* sem corpo */ } return b || { erro: error.message }; }
        return data;
      } catch (e) { return { erro: String(e) }; }
    },
    async salvarLimites(lista) {
      if (demo) {
        let l = []; try { l = JSON.parse(localStorage.getItem('oikos-lim') || '[]'); } catch (e) { /* vazio */ }
        for (const x of lista) { const i = l.findIndex((y) => y.nivel === x.nivel && y.chave === x.chave); if (i >= 0) l[i] = x; else l.push(x); }
        try { localStorage.setItem('oikos-lim', JSON.stringify(l)); } catch (e) { /* ignora */ }
      } else {
        const { error } = await sb.from('limites').upsert(lista.map((x) => ({ household_id: household.id, nivel: x.nivel, chave: x.chave, valor_meta: x.valor_meta, atualizado_em: new Date().toISOString() })));
        if (error) throw error;
      }
      await carregar();
    },
    gastos: {
      _ls() { try { return JSON.parse(localStorage.getItem('oikos-gas') || '[]'); } catch (e) { return []; } },
      _sv(l) { try { localStorage.setItem('oikos-gas', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      async listar() {
        if (demo) return this._ls();
        const { data, error } = await sb.from('gastos_app').select('*').eq('household_id', household.id).eq('conciliado', false).order('data', { ascending: false }).order('criado_em', { ascending: false }).limit(200);
        if (error) throw error; return data;
      },
      async salvar(g) {
        if (demo) { const l = this._ls(); l.unshift({ ...g, id: 'g' + Date.now(), criado_em: new Date().toISOString() }); this._sv(l); return; }
        const { data: u } = await sb.auth.getUser();
        const { error } = await sb.from('gastos_app').insert({ ...g, household_id: household.id, pessoa: g.pessoa || minhaPessoa || (u && u.user && u.user.email.startsWith('jheniffer') ? 'jheniffer' : u && u.user ? u.user.email.split('@')[0] : null) });
        if (error) throw error;
      },
      async apagar(id) {
        if (demo) { this._sv(this._ls().filter((x) => x.id !== id)); return; }
        const { error } = await sb.from('gastos_app').delete().eq('id', id); if (error) throw error;
      },
      async revendas() {
        if (demo) return this._ls().filter((g) => g.envelope === 'revenda');
        const { data, error } = await sb.from('gastos_app').select('*').eq('household_id', household.id).eq('envelope', 'revenda').order('data', { ascending: false }).limit(500);
        if (error) throw error; return data;
      },
      async atualizar(id, campos) {
        if (demo) { this._sv(this._ls().map((x) => (x.id === id ? { ...x, ...campos } : x))); return; }
        const { error } = await sb.from('gastos_app').update(campos).eq('id', id); if (error) throw error;
      },
    },
    familia: {
      async criar(nome) {
        if (demo) { try { localStorage.setItem('oikos-fam', JSON.stringify({ nome, codigo: 'DEMO42' })); } catch (e) { /* ignora */ } household = { id: 'demo', nome }; return household; }
        const { data, error } = await sb.rpc('criar_familia', { p_nome: nome }); if (error) throw error;
        household = { id: data, nome }; return household;
      },
      async entrar(codigo) {
        if (demo) throw new Error('Na demonstração não dá para entrar com código.');
        const { data, error } = await sb.rpc('entrar_familia', { p_codigo: codigo.trim().toUpperCase() }); if (error) throw error;
        const { data: hh } = await sb.from('households').select('id, nome').eq('id', data).single(); household = hh; return hh;
      },
      async definirPessoa(chave) { minhaPessoa = chave; if (demo) return; const { error } = await sb.rpc('definir_minha_pessoa', { p_chave: chave }); if (error) throw error; },
      async codigo() {
        if (demo) { try { return (JSON.parse(localStorage.getItem('oikos-fam') || '{}').codigo) || 'DEMO42'; } catch (e) { return 'DEMO42'; } }
        const { data } = await sb.from('households').select('codigo').eq('id', household.id).single(); return data && data.codigo;
      },
      nome() { return household ? household.nome : ''; },
      negocio() { return household && household.negocio ? household.negocio : ''; },
      negocioInfo() {
        if (demo && !household) { let n = null; try { n = JSON.parse(localStorage.getItem('oikos-neg') || 'null'); } catch (e) { /* vazio */ } return n || { nome: '', meta: 0, logo: '', cor: '' }; }
        const h = household || {}; return { nome: h.negocio || '', meta: Number(h.negocio_meta || 0), logo: h.negocio_logo || '', cor: h.negocio_cor || '' };
      },
      async definirNegocio(nome, meta) {
        if (demo && (!household || household.id === 'demo')) { const n = { ...this.negocioInfo(), nome, meta }; try { localStorage.setItem('oikos-neg', JSON.stringify(n)); } catch (e) { /* ignora */ } if (household) Object.assign(household, { negocio: nome, negocio_meta: meta }); return; }
        const { error } = await sb.rpc('definir_negocio', { p_nome: nome, p_meta: meta }); if (error) throw error;
        Object.assign(household, { negocio: nome, negocio_meta: meta });
      },
      async trocarSenha(nova) { if (demo) return; const { error } = await sb.auth.updateUser({ password: nova }); if (error) throw error; },
      recarregar() { return carregar(); },
    },
    projetos: {
      _ls() { try { return JSON.parse(localStorage.getItem('oikos-proj') || '[]'); } catch (e) { return []; } },
      _sv(l) { try { localStorage.setItem('oikos-proj', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      _local: demo,
      async listar() {
        if (!this._local) {
          const { data, error } = await sb.from('projetos').select('*').eq('household_id', household.id).eq('ativo', true).order('ordem').order('criado_em');
          if (!error) return data; this._local = true;
        }
        return this._ls().filter((p) => p.ativo !== false);
      },
      async salvar(p) {
        const row = { nome: p.nome, tipo: p.tipo || 'revenda', logo_url: p.logo_url || null, icone: p.icone || '🏷️', cor: p.cor || '#1a2753', meta: p.meta || null, donos: p.donos || [], ativo: p.ativo !== false };
        if (!this._local) {
          const r = p.id ? await sb.from('projetos').update(row).eq('id', p.id).select().single() : await sb.from('projetos').insert({ ...row, household_id: household.id }).select().single();
          if (r.error) throw r.error; return r.data;
        }
        const l = this._ls(); let out;
        if (p.id) { const i = l.findIndex((x) => x.id === p.id); l[i] = { ...l[i], ...row }; out = l[i]; } else { out = { ...row, id: 'p' + Date.now(), ordem: l.length + 1 }; l.push(out); }
        this._sv(l); return out;
      },
      async subirLogo(blob) {
        if (this._local) return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
        const nome = household.id + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6) + '.jpg';
        const up = await sb.storage.from('logos').upload(nome, blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        return sb.storage.from('logos').getPublicUrl(nome).data.publicUrl;
      },
    },
    bens: {
      _ls() { try { return JSON.parse(localStorage.getItem('oikos-bens') || '[]'); } catch (e) { return []; } },
      _sv(l) { try { localStorage.setItem('oikos-bens', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      _local: demo,
      calc: (b) => calcBem(b),
      async listar() {
        if (!this._local) {
          const { data, error } = await sb.from('bens_app').select('*').eq('household_id', household.id).order('criado_em');
          if (!error) return data; this._local = true;
        }
        return this._ls();
      },
      async salvar(b, foto) {
        let foto_path = b.foto_path || null;
        if (foto && !this._local) {
          const nome = household.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
          const up = await sb.storage.from('bens').upload(nome, foto, { contentType: 'image/jpeg', upsert: false });
          if (!up.error) foto_path = nome;
        } else if (foto) {
          foto_path = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(foto); });
        }
        const row = { item: b.item, grupo: b.grupo || null, qtd: b.qtd || 1, valor_compra: b.valor_compra, data_aquisicao: b.data_aquisicao || null, vida_util: b.vida_util || 8, foto_path, obs: b.obs || null, dono: b.dono || null, atualizado_em: new Date().toISOString() };
        if (!this._local) {
          const r = b.id ? await sb.from('bens_app').update(row).eq('id', b.id) : await sb.from('bens_app').insert({ ...row, household_id: household.id });
          if (r.error) throw r.error;
        } else {
          const l = this._ls(); if (b.id) { const i = l.findIndex((x) => x.id === b.id); if (i >= 0) l[i] = { ...l[i], ...row }; } else l.push({ ...row, id: 'b' + Date.now() }); this._sv(l);
        }
        await carregar();
      },
      async remover(id) {
        if (!this._local) { const r = await sb.from('bens_app').delete().eq('id', id); if (r.error) throw r.error; }
        else this._sv(this._ls().filter((x) => x.id !== id));
        await carregar();
      },
      async fotoUrl(path) {
        if (!path) return null; if (/^data:|^https?:/.test(path)) return path;
        if (this._local) return null;
        const { data } = await sb.storage.from('bens').createSignedUrl(path, 3600); return data && data.signedUrl;
      },
      lista: () => bensApp,
    },
    vales: {
      _ls() { try { return JSON.parse(localStorage.getItem('oikos-val') || '[]'); } catch (e) { return []; } },
      _sv(l) { try { localStorage.setItem('oikos-val', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      _local: demo,
      async listar() {
        if (!this._local) {
          const { data, error } = await sb.from('vales').select('*').eq('household_id', household.id).eq('encerrado', false).order('vence_em');
          if (!error) return data; this._local = true;
        }
        return this._ls().filter((v) => !v.encerrado).sort((a, b) => String(a.vence_em).localeCompare(String(b.vence_em)));
      },
      async salvar(v) {
        const row = { loja: v.loja, tipo: v.tipo || 'cashback', valor: v.valor, saldo: v.saldo != null ? v.saldo : v.valor, libera_em: v.libera_em || null, vence_em: v.vence_em || null,
          limite_pct: v.limite_pct || null, regra: v.regra || null, para: v.para || null, encerrado: !!v.encerrado, atualizado_em: new Date().toISOString() };
        if (!this._local) {
          const r = v.id ? await sb.from('vales').update(row).eq('id', v.id) : await sb.from('vales').insert({ ...row, household_id: household.id });
          if (!r.error) return; if (v.id) throw r.error; this._local = true;
        }
        const l = this._ls(); if (v.id) { const i = l.findIndex((x) => x.id === v.id); if (i >= 0) l[i] = { ...l[i], ...row }; } else l.push({ ...row, id: 'v' + Date.now() }); this._sv(l);
      },
    },
    bancos: {
      PADRAO: [
        { nome: 'Bradesco', dono: 'george', cor: '#cc092f', ordem: 1 }, { nome: 'Bradesco', dono: 'jheniffer', cor: '#cc092f', ordem: 2 },
        { nome: 'Nubank', dono: 'jheniffer', cor: '#820ad1', ordem: 3 }, { nome: 'Cartão Carrefour', dono: 'george', cor: '#1e5bc6', ordem: 4 },
        { nome: 'XP', dono: 'george', cor: '#1d1d1b', ordem: 5 },
      ],
      _ls() { try { const l = JSON.parse(localStorage.getItem('oikos-ban') || 'null'); return l && l.length ? l : null; } catch (e) { return null; } },
      _sv(l) { try { localStorage.setItem('oikos-ban', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      _local: demo,
      async listar() {
        if (!this._local) {
          const { data, error } = await sb.from('bancos').select('id, nome, dono, cor, ordem').eq('household_id', household.id).order('ordem').order('criado_em');
          if (!error && data) return data;
          this._local = true;
        }
        return this._ls() || (demo && !demoNovo ? this.PADRAO.map((b, i) => ({ ...b, id: 'b' + i })) : []);
      },
      async salvar(b) {
        const row = { nome: b.nome.trim(), dono: b.dono, cor: b.cor || '#61665e', ordem: b.ordem || 99 };
        if (!this._local) {
          const { data, error } = await sb.from('bancos').insert({ ...row, household_id: household.id }).select().single();
          if (!error) return data; this._local = true;
        }
        const l = await this.listar(); const n = { ...row, id: 'b' + Date.now() }; l.push(n); this._sv(l); return n;
      },
    },
    pessoas: {
      PADRAO: [
        { chave: 'george', nome: 'George', ordem: 1, avatar: { pele: 1, cabelo: 'careca', cor: 'castanho', barba: 'cheia', crianca: false, fundo: '#cfe3d4' } },
        { chave: 'jheniffer', nome: 'Jheniffer', ordem: 2, avatar: { pele: 3, cabelo: 'longo', cor: 'preto', barba: 'nao', crianca: false, fundo: '#f3d9cf' } },
        { chave: 'abner', nome: 'Abner', ordem: 3, avatar: { pele: 3, cabelo: 'curto', cor: 'preto', barba: 'nao', crianca: true, fundo: '#d6e4f2' } },
      ],
      _ls() { try { const l = JSON.parse(localStorage.getItem('oikos-pes') || 'null'); return l && l.length ? l : null; } catch (e) { return null; } },
      _sv(l) { try { localStorage.setItem('oikos-pes', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      _local: demo,
      async listar() {
        if (!this._local) {
          const { data, error } = await sb.from('pessoas').select('id, chave, nome, avatar, ordem').eq('household_id', household.id).order('ordem');
          if (!error && data) return data;
          this._local = true; // tabela ainda não criada: guarda no aparelho
        }
        return this._ls() || (demo && !demoNovo ? this.PADRAO.map((p) => ({ ...p, avatar: { ...p.avatar } })) : []);
      },
      async salvar(p) {
        if (!p.chave) p.chave = (p.nome || 'pessoa').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 20) + '-' + Date.now().toString(36).slice(-4);
        if (!this._local) {
          const row = { household_id: household.id, chave: p.chave, nome: p.nome, avatar: p.avatar, ordem: p.ordem || 99 };
          const { error } = await sb.from('pessoas').upsert(row, { onConflict: 'household_id,chave' });
          if (!error) return; this._local = true;
        }
        const l = await this.listar(); const i = l.findIndex((x) => x.chave === p.chave);
        if (i >= 0) l[i] = { ...l[i], ...p }; else l.push({ ...p, ordem: l.length + 1 }); this._sv(l);
      },
      async apagar(chave) {
        if (!this._local) { const { error } = await sb.from('pessoas').delete().eq('household_id', household.id).eq('chave', chave); if (!error) return; this._local = true; }
        this._sv((await this.listar()).filter((x) => x.chave !== chave));
      },
    },
    objetivos: {
      _ls() { try { return JSON.parse(localStorage.getItem('oikos-obj') || '[]'); } catch (e) { return []; } },
      _sv(l) { try { localStorage.setItem('oikos-obj', JSON.stringify(l)); } catch (e) { /* ignora */ } },
      async listar() {
        if (demo) { let l = this._ls(); if (!l.length && !demoNovo) { l = [{ id: 'd1', pessoa: 'familia', categoria: 'reserva', titulo: 'Reserva de emergência (3 meses)', valor_alvo: 15000, valor_guardado: 1303.67, prazo: '2027-12-01' }]; this._sv(l); } return l; }
        const { data, error } = await sb.from('objetivos').select('*').eq('household_id', household.id).order('criado_em');
        if (error) throw error; return data;
      },
      async salvar(o) {
        if (demo) { const l = this._ls(); if (o.id) { const i = l.findIndex((x) => x.id === o.id); l[i] = { ...l[i], ...o }; } else l.push({ ...o, id: 'd' + Date.now() }); this._sv(l); return; }
        const row = { pessoa: o.pessoa, categoria: o.categoria, titulo: o.titulo, valor_alvo: o.valor_alvo, valor_guardado: o.valor_guardado || 0, prazo: o.prazo || null, atualizado_em: new Date().toISOString() };
        const r = o.id ? await sb.from('objetivos').update(row).eq('id', o.id) : await sb.from('objetivos').insert({ ...row, household_id: household.id });
        if (r.error) throw r.error;
      },
      async apagar(id) {
        if (demo) { this._sv(this._ls().filter((x) => x.id !== id)); return; }
        const { error } = await sb.from('objetivos').delete().eq('id', id); if (error) throw error;
      },
    },
    async listarNotas() {
      if (demo) return [];
      const { data, error } = await sb.from('notas').select('*').eq('household_id', household.id).order('criado_em', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    async salvarCorrecoes(lista) {
      if (demo) { console.info('[demo] correções', lista); return; }
      const { data: u } = await sb.auth.getUser();
      const rows = lista.map(({ l, para }) => ({ household_id: household.id, lancamento_id: l.id, data: l.data, descricao: l.descricao, valor: l.valor, de_conta: l.conta, para_conta: para, criado_por: u.user.id }));
      const { error } = await sb.from('correcoes').insert(rows);
      if (error) throw error;
    },
  };

  async function iniciar() {
    $('sv-sair').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); location.reload(); });
    if (demo) { $('sv-sair').hidden = true; mostrar(true); carregar(); return; }
    if (!cfg.SUPABASE_URL || !window.supabase) {
      $('sv-err').textContent = 'O app ainda não foi configurado (config.js).'; mostrar(false); return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await sb.auth.getSession();
    if (session) { mostrar(true); carregar(); } else mostrar(false);
    $('sv-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = $('sv-entrar'); btn.disabled = true; $('sv-err').textContent = '';
      const { error } = await sb.auth.signInWithPassword({ email: $('sv-email').value.trim(), password: $('sv-senha').value });
      btn.disabled = false;
      if (error) { $('sv-err').textContent = error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message; return; }
      $('sv-senha').value = '';
      mostrar(true); carregar();
    });
    $('sv-esqueci').addEventListener('click', async () => {
      const email = $('sv-email').value.trim();
      if (!email) { $('sv-err').textContent = 'Digite seu e-mail acima e toque de novo.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      $('sv-err').textContent = error ? error.message : 'Enviamos um link para redefinir a senha.';
    });
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') mostrar(false); if (ev === 'PASSWORD_RECOVERY') { $('sv-nova').hidden = false; } });
    $('sv-nova-btn').addEventListener('click', async () => {
      const p = $('sv-nova-senha').value; if (p.length < 8) { $('sv-nova-msg').textContent = 'Use pelo menos 8 caracteres.'; return; }
      const { error } = await sb.auth.updateUser({ password: p });
      $('sv-nova-msg').textContent = error ? error.message : 'Senha alterada.'; if (!error) setTimeout(() => { $('sv-nova').hidden = true; }, 1200);
    });
  }
  document.addEventListener('DOMContentLoaded', iniciar);
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
