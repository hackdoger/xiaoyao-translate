# 部署到 GitHub Pages + Cloudflare Worker

GitHub Pages 只能托管静态网页，不能安全保存 API Key。因此本项目分成两部分：`web/` 是网页，`worker/` 是不暴露密钥的翻译代理。

## 1. 部署 Worker

在安装 Wrangler 的环境执行：

```bash
cd worker
npm install -D wrangler
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

`OPENAI_API_KEY` 只通过 secret 配置，不要写入文件、网页或 GitHub。当前默认已配置 NVIDIA OpenAI 兼容接口；如果控制台显示的模型名不同，只修改 `OPENAI_MODEL`。

## 2. 配置网页 API 地址

部署 Worker 后，把 `web/app.js` 顶部的 `apiBase` 改成 Worker 的 HTTPS 地址，例如：

```js
const apiBase = 'https://xiaoyao-translate-api.example.workers.dev';
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
