// Oikos — login (Supabase Auth), carga dos dados da família e a camada `dash`
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
    for (const fn of listeners) { try { fn(); } catch (e) { console.error('[Oikos] erro ao desenhar:', e); } }
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
        catch (e) { console.error('[Oikos] cálculo', id, e); res = { status: 'error', data: [], message: String(e) }; }
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
  function setDados(rows) {
    rows = aplicarLimites(rows);
    for (const id of DATASETS) store.set(id, { status: 'missing', data: [] });
    for (const r of rows) store.set(r.id, { status: 'ok', data: r.data });
    dataVer += 1; memo.clear();
    emit();
  }

  // ---------- autenticação e carga ----------
  const cfg = window.SV_CONFIG || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const demo = !cfg.SUPABASE_URL && local;
  const $ = (id) => document.getElementById(id);
  let sb = null, household = null;

  function mostrar(logado) {
    $('sv-login').hidden = logado;
    $('sv-app').hidden = !logado;
    if (logado) emit();
  }

  async function carregar() {
    $('sv-upd').textContent = 'Carregando…';
    try {
      if (demo) {
        const rows = await Promise.all(DATASETS.map(async (id) => {
          const r = await fetch('seed/' + id + '.json'); if (!r.ok) return null;
          return { id, data: await r.json() };
        }));
        try { limites = JSON.parse(localStorage.getItem('oikos-lim') || '[]'); } catch (e) { limites = []; }
        setDados(rows.filter(Boolean));
        $('sv-upd').textContent = 'Modo demonstração (dados locais)';
        $('sv-who').textContent = 'Família Sanches Vital';
        return;
      }
      const { data: hh, error: e1 } = await sb.from('households').select('id, nome').limit(1);
      if (e1) throw e1;
      if (!hh || !hh.length) throw new Error('Seu usuário ainda não está ligado a nenhuma família.');
      household = hh[0];
      $('sv-who').textContent = household.nome;
      const { data, error } = await sb.from('datasets').select('id, data, updated_at').eq('household_id', household.id);
      if (error) throw error;
      try { const lr = await sb.from('limites').select('nivel, chave, valor_meta').eq('household_id', household.id); limites = lr.data || []; } catch (e) { limites = []; }
      setDados(data);
      const ult = data.map((d) => d.updated_at).sort().pop();
      $('sv-upd').textContent = ult ? 'Dados atualizados em ' + new Date(ult).toLocaleDateString('pt-BR') : '';
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
      if (demo) { await new Promise((r) => setTimeout(r, 600)); return { ok: true, chave }; }
      const nome = household.id + '/' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
      const up = await sb.storage.from('notas').upload(nome, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      let { error } = await sb.from('notas').insert({ household_id: household.id, foto_path: nome, qr_texto: qr || null, chave, envelope: extra.envelope || null, forma: extra.forma || null, obs: extra.obs || null });
      if (error && /column/.test(error.message || '')) ({ error } = await sb.from('notas').insert({ household_id: household.id, foto_path: nome, qr_texto: qr || null, chave, obs: [extra.envelope, extra.forma, extra.obs].filter(Boolean).join(' | ') || null }));
      if (error) throw error;
      return { ok: true, chave };
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
        const { error } = await sb.from('gastos_app').insert({ ...g, household_id: household.id, pessoa: g.pessoa || (u && u.user && u.user.email.startsWith('jheniffer') ? 'jheniffer' : 'george') });
        if (error) throw error;
      },
      async apagar(id) {
        if (demo) { this._sv(this._ls().filter((x) => x.id !== id)); return; }
        const { error } = await sb.from('gastos_app').delete().eq('id', id); if (error) throw error;
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
          if (!error && data && data.length) return data;
          if (error) this._local = true; // tabela ainda não criada: guarda no aparelho
        }
        return this._ls() || this.PADRAO.map((p) => ({ ...p, avatar: { ...p.avatar } }));
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
        if (demo) { let l = this._ls(); if (!l.length) { l = [{ id: 'd1', pessoa: 'familia', categoria: 'reserva', titulo: 'Reserva de emergência (3 meses)', valor_alvo: 15000, valor_guardado: 1303.67, prazo: '2027-12-01' }]; this._sv(l); } return l; }
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
