const ALLOWED_ORIGINS = (env) => (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS(env);
    const headers = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || 'null'), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    const url = new URL(request.url);
    if (url.pathname !== '/api/translate' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    try {
      const body = await request.json();
      if (typeof body.text !== 'string' || body.text.trim().length === 0 || body.text.length > 2000) return json({ error: 'invalid text' }, 400, headers);
      const result = await fetch(`${env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, { method:'POST', headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, messages:[{role:'system',content:'你是旅行现场翻译器。只输出简体中文译文，不解释，不总结，不添加原文没有的信息。'},{role:'user',content:body.text}] }) });
      if (!result.ok) return json({ error: 'upstream translation failed' }, 502, headers);
      const data = await result.json();
      return json({ translation: data.choices?.[0]?.message?.content?.trim() || '' }, 200, headers);
    } catch { return json({ error: 'bad request' }, 400, headers); }
  }
};
function json(value, status, headers) { return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type':'application/json' } }); }
