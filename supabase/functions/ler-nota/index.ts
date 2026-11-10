// Oikos — lê a foto da notinha na hora (Claude, visão) e já lança o gasto no envelope.
// Segredo necessário (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
// categoria da notinha → envelope do "Anotar gasto"
const ENV: Record<string, string> = { mercado: 'mercado', acougue: 'acougue', comerfora: 'comerfora', farmacia: 'saude', presente: 'lazer', abner: 'abner', casa: 'casa', combustivel: 'combustivel', outros: 'outros' };

const PROMPT = `Você lê fotos de cupons fiscais e recibos brasileiros. Responda APENAS um JSON válido, sem texto antes ou depois, neste formato:
{"loja": string|null, "cnpj": string|null, "data": "AAAA-MM-DD"|null, "total": number|null, "forma_pagamento": string|null,
 "itens": [{"descricao": string, "qtd": number|null, "unitario": number|null, "total": number|null}],
 "observacao": string|null}
Regras: valores em reais como número (ex.: 72.0). "total" é o valor efetivamente pago. Se a foto não for um cupom de compra (ex.: comprovante de cashback), use total null e explique em "observacao". Não invente itens ilegíveis.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { id } = await req.json();
    if (!id) return json({ erro: 'faltou o id' }, 400);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = req.headers.get('Authorization') ?? '';
    // 1) confere se quem pediu enxerga essa nota (regras RLS da família)
    const usr = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: nota, error: e1 } = await usr.from('notas').select('*').eq('id', id).single();
    if (e1 || !nota) return json({ erro: 'nota não encontrada' }, 404);
    const adm = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (nota.status === 'lida') return json({ ok: true, nota });
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ erro: 'sem_chave' }, 503);
    // 2) baixa a foto e manda para leitura
    const { data: foto, error: e2 } = await adm.storage.from('notas').download(nota.foto_path);
    if (e2 || !foto) return json({ erro: 'foto não encontrada' }, 404);
    const bytes = new Uint8Array(await foto.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: Deno.env.get('OIKOS_MODELO') || 'claude-haiku-5-5', max_tokens: 2000,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: btoa(bin) } }, { type: 'text', text: PROMPT }] }] }),
    });
    const resp = await r.json();
    if (!r.ok) { await adm.from('notas').update({ status: 'erro', obs_leitura: String(resp?.error?.message ?? r.status).slice(0, 300) }).eq('id', id); return json({ erro: 'leitura', detalhe: resp?.error?.message }, 502); }
    const txt = (resp.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
    let d: Record<string, any> = {};
    try { d = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch { d = {}; }
    const total = typeof d.total === 'number' ? Math.round(d.total * 100) / 100 : null;
    const dataCompra = /^\d{4}-\d{2}-\d{2}$/.test(d.data ?? '') ? d.data : null;
    await adm.from('notas').update({ status: total || (d.itens ?? []).length ? 'lida' : 'erro', loja: d.loja ?? null, data_compra: dataCompra, total, itens: d.itens ?? [], forma_lida: d.forma_pagamento ?? null, obs_leitura: d.observacao ?? null, lida_em: new Date().toISOString() }).eq('id', id);
    // 3) lança o gasto no envelope (uma vez só por nota). Revenda já foi lançada com o custo no envio.
    let gasto = null;
    if (total && nota.envelope && nota.envelope !== 'revenda') {
      const { data: mb } = await adm.from('members').select('pessoa').eq('household_id', nota.household_id).eq('user_id', nota.criado_por).maybeSingle();
      const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
      const ins = await adm.from('gastos_app').upsert({ household_id: nota.household_id, nota_id: id, data: dataCompra && dataCompra <= hoje ? dataCompra : hoje, valor: total,
        envelope: ENV[nota.envelope] ?? 'outros', descricao: nota.obs || d.loja || 'Notinha', forma: nota.forma || 'pix', conta: nota.conta, pessoa: mb?.pessoa ?? null, reembolsar: false, criado_por: nota.criado_por },
        { onConflict: 'nota_id' }).select().single();
      gasto = ins.data;
    }
    const { data: final } = await adm.from('notas').select('*').eq('id', id).single();
    return json({ ok: true, nota: final, gasto });
  } catch (e) {
    return json({ erro: String(e) }, 500);
  }
});
