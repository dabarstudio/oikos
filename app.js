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

  function setDados(rows) {
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
        setDados(rows.filter(Boolean));
        $('sv-upd').textContent = 'Modo demonstração (dados locais)';
        $('sv-who').textContent = 'Família Vital';
        return;
      }
      const { data: hh, error: e1 } = await sb.from('households').select('id, nome').limit(1);
      if (e1) throw e1;
      if (!hh || !hh.length) throw new Error('Seu usuário ainda não está ligado a nenhuma família.');
      household = hh[0];
      $('sv-who').textContent = household.nome;
      const { data, error } = await sb.from('datasets').select('id, data, updated_at').eq('household_id', household.id);
      if (error) throw error;
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
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
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
