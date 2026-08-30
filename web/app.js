(() => {
  const $ = id => document.getElementById(id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sourceMap = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
  const state = { running: false, recognition: null, lastSent: '', restartTimer: null };
  // Set this to the deployed Worker URL before publishing Pages.
  const apiBase = window.XIAOYAO_API_BASE || 'https://xiaoyao-translate-api.hackdoger-xiaoyao-translate-20260830.workers.dev';
  const modelNames = { nvidia: { primary: 'NVIDIA 主模型', fallback: 'NVIDIA 备用模型' }, pxwnu: { primary: '备用通道主模型', fallback: '备用通道备用模型' } };
  $('secureBadge').textContent = location.protocol === 'https:' ? '安全连接' : '请使用 HTTPS';

  function refreshModels() {
    const provider = $('provider').value;
    $('modelChoice').options[0].textContent = modelNames[provider].primary;
    $('modelChoice').options[1].textContent = modelNames[provider].fallback;
  }

  function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; utterance.rate = .95;
    window.speechSynthesis.speak(utterance);
  }
  async function translate(text) {
    const response = await fetch(`${apiBase}/api/translate`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text, source: $('sourceLanguage').value, target: 'zh', provider: $('provider').value, model: $('modelChoice').value }) });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(`${response.status}:${detail.error || 'translation request failed'}`);
    }
    const data = await response.json();
    if (!data.translation) throw new Error('empty translation');
    $('translation').textContent = data.translation; speak(data.translation);
  }
  function phrase(text) {
    const clean = text.trim(); if (!clean || clean === state.lastSent) return;
    state.lastSent = clean; $('source').textContent = clean;
    translate(clean).catch(error => $('status').textContent = `翻译失败（${error.message}）`);
  }
  function startRecognition() {
    if (!Recognition) { $('status').textContent = '当前浏览器不支持连续语音识别，请使用 iPhone Safari 最新版测试'; state.running=false; $('startButton').disabled=false; $('stopButton').disabled=true; return; }
    const recognition = new Recognition(); state.recognition = recognition;
    recognition.lang = sourceMap[$('sourceLanguage').value]; recognition.continuous = true; recognition.interimResults = true;
    recognition.onstart = () => $('status').textContent = '正在连续听译，请保持页面前台运行';
    recognition.onresult = event => { let interim=''; for(let i=event.resultIndex;i<event.results.length;i++){const r=event.results[i]; if(r.isFinal) phrase(r[0].transcript); else interim+=r[0].transcript;} if(interim) $('source').textContent=interim; $('meterBar').style.width = `${Math.min(100,20+interim.length*3)}%`; };
    recognition.onerror = event => { if(event.error !== 'aborted') $('status').textContent = `语音识别提示：${event.error}`; };
    recognition.onend = () => { $('meterBar').style.width='0'; if(state.running){ clearTimeout(state.restartTimer); state.restartTimer=setTimeout(startRecognition,250); } };
    recognition.start();
  }
  $('startButton').onclick = () => { state.running=true; state.lastSent=''; $('startButton').disabled=true; $('stopButton').disabled=false; startRecognition(); };
  $('stopButton').onclick = () => { state.running=false; clearTimeout(state.restartTimer); state.recognition?.stop(); window.speechSynthesis.cancel(); $('startButton').disabled=false; $('stopButton').disabled=true; $('status').textContent='已停止'; };
  $('sourceLanguage').onchange = () => { if(state.running){ state.recognition?.stop(); } };
  $('provider').onchange = refreshModels;
  refreshModels();
})();
