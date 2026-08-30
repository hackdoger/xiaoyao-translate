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
      return json({ ok: true, channels: { nvidia: Boolean(env.OPENAI_API_KEY), pxwnu: Boolean(env.PXWNU_API_KEY) } }, 200, headers);
    }
    if (url.pathname !== '/api/translate' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (!originAllowed) return json({ error: 'origin not allowed' }, 403, headers);
    try {
      const body = await request.json();
      if (typeof body.text !== 'string' || body.text.trim().length === 0 || body.text.length > 2000) return json({ error: 'invalid text' }, 400, headers);
      const provider = body.provider === 'pxwnu' ? 'pxwnu' : 'nvidia';
      const baseUrl = provider === 'pxwnu' ? (env.PXWNU_BASE_URL || 'https://api.pxwnu.sbs/v1') : (env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1');
      const apiKey = provider === 'pxwnu' ? env.PXWNU_API_KEY : env.OPENAI_API_KEY;
      const modelKey = body.model === 'fallback' ? 'FALLBACK' : 'PRIMARY';
      const model = provider === 'pxwnu' ? (env[`PXWNU_MODEL_${modelKey}`] || (modelKey === 'PRIMARY' ? 'gpt-4o-mini' : 'gpt-4o-mini')) : (env[`OPENAI_MODEL_${modelKey}`] || (modelKey === 'PRIMARY' ? 'meta/llama-3.1-8b-instruct' : 'meta/llama-3.1-8b-instruct'));
      if (!apiKey) return json({ error: `${provider} channel is not configured` }, 503, headers);
      const models = [model];
      const fallback = provider === 'pxwnu' ? env.PXWNU_MODEL_FALLBACK : env.OPENAI_MODEL_FALLBACK;
      if (fallback && fallback !== model) models.push(fallback);
      for (const candidate of models) {
        const result = await fetch(`${baseUrl}/chat/completions`, { method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({ model: candidate, temperature: 0, max_tokens: 500, messages:[{role:'system',content:'你是旅行现场翻译器。只输出简体中文译文，不解释，不总结，不添加原文没有的信息。'},{role:'user',content:body.text}] }) });
        if (!result.ok) continue;
        const data = await result.json();
        const translation = data.choices?.[0]?.message?.content?.trim() || '';
        if (translation) return json({ translation, model: candidate }, 200, headers);
      }
      return json({ error: 'all models failed' }, 502, headers);
    } catch { return json({ error: 'translation request could not be completed' }, 502, headers); }
  }
};
function json(value, status, headers) { return new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type':'application/json' } }); }
