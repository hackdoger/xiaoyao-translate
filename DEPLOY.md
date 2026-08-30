# 部署到 GitHub Pages + Cloudflare Worker

GitHub Pages 只能托管静态网页，不能安全保存 API Key。因此本项目分成两部分：`web/` 是网页，`worker/` 是不暴露密钥的翻译代理。

## 1. 部署 Worker

在安装 Wrangler 的环境执行。Windows PowerShell 请使用 `npx.cmd`，这样不需要修改 PowerShell 执行策略：

```bash
cd worker
npm install -D wrangler
npx.cmd wrangler login
npx.cmd wrangler secret put OPENAI_API_KEY
npx.cmd wrangler deploy
```

`OPENAI_API_KEY` 只通过 secret 配置，不要写入文件、网页或 GitHub。当前默认已配置 NVIDIA OpenAI 兼容接口；如果控制台显示的模型名不同，只修改 `OPENAI_MODEL`。

网页还提供“备用通道”，Base URL 为 `https://api.pxwnu.sbs/v1`。如需启用，请使用独立的 Worker Secret `PXWNU_API_KEY`，不要复用或暴露 NVIDIA Key。`PXWNU_MODEL` 必须改成该服务商实际支持的模型名。

网页会显示“翻译通道”和“模型”两个选项。Worker 使用 `*_MODEL_PRIMARY` 与 `*_MODEL_FALLBACK`；所选模型请求失败时，会再尝试该通道的备用模型。

配置备用通道：

```powershell
npx.cmd wrangler secret put PXWNU_API_KEY
npx.cmd wrangler deploy
```

部署后可先检查 Worker（不会调用翻译接口或消耗翻译额度）：

```powershell
curl.exe "https://xiaoyao-translate-api.hackdoger-xiaoyao-translate-20260830.workers.dev/health"
```

正常应返回 `ok:true` 和 `configured:true`。如果 `configured:false`，请重新执行 `npx.cmd wrangler secret put OPENAI_API_KEY` 后再次部署。

## 2. 配置网页 API 地址

Worker 已部署，当前网页端使用以下 HTTPS 地址：

```js
const apiBase = 'https://xiaoyao-translate-api.hackdoger-xiaoyao-translate-20260830.workers.dev';
```

`worker/wrangler.toml` 已填入 `https://hackdoger.github.io`；如果 Pages 使用自定义域名，需要改成实际域名。

## 3. 发布 GitHub Pages

仓库已包含 `.github/workflows/pages.yml`。推送到 `index` 后，Actions 会把 `web/` 发布到 GitHub Pages。首次使用前，在 Settings → Pages → Source 选择 GitHub Actions。发布完成后，用 iPhone Safari 打开 Pages 地址。

## 4. iPhone 使用

1. 连接 AirPods 或索尼耳机。
2. 用 Safari 打开 GitHub Pages 地址。
3. 选择对方语言。
4. 点击“开始听译”并允许麦克风。
5. 保持页面在前台；锁屏和切到后台可能中断浏览器语音识别。

## 安全与成本

- 不要把 API Key 发到聊天、前端代码或 GitHub。
- 当前 Worker 没有用户登录、限流和用量统计。公开网址可能被滥用并产生费用；部署前应至少增加访问令牌、Cloudflare Turnstile 或限流。
- 本实现使用浏览器 `SpeechRecognition`，iOS Safari 的连续识别能力和后台行为需真机验证；它不是专业真人同传，存在延迟和误译。
