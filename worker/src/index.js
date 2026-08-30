const ALLOWED_ORIGINS = (env) => (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS(env);
    const originAllowed = allowed.includes(origin);
    const headers = { 'Access-Control-Allow-Origin': originAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, configured: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL || 'unset' }, 200, headers);
    }
    if (url.pathname !== '/api/translate' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (!originAllowed) return json({ error: 'origin not allowed' }, 403, headers);
    if (!env.OPENAI_API_KEY) return json({ error: 'translation service is not configured' }, 503, headers);
    try {
      const body = await request.json();
      if (typeof body.text !== 'string' || body.text.trim().length === 0 || body.text.length > 2000) return json({ error: 'invalid text' }, 400, headers);
      const result = await fetch(`${env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1'}/chat/completions`, { method:'POST', headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({ model: env.OPENAI_MODEL || 'meta/llama-3.1-8b-instruct', temperature: 0, max_tokens: 500, messages:[{role:'system',content:'你是旅行现场翻译器。只输出简体中文译文，不解释，不总结，不添加原文没有的信息。'},{role:'user',content:body.text}] }) });
      if (!result.ok) return json({ error: 'upstream translation failed', upstreamStatus: result.status }, 502, headers);
      const data = await result.json();
      const translation = data.choices?.[0]?.message?.content?.trim() || '';
      if (!translation) return json({ error: 'empty upstream response' }, 502, headers);
      return json({ translation }, 200, headers);
    } catch { return json({ error: 'translation request could not be completed' }, 502, headers); }
  }
};
function json(value, status, headers) { return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type':'application/json' } }); }
