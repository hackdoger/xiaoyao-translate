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

`OPENAI_API_KEY` 只通过 secret 配置，不要写入文件、网页或 GitHub。若使用兼容 OpenAI API 的供应商，可在 `wrangler.toml` 添加 `OPENAI_BASE_URL` 和对应模型名。

## 2. 配置网页 API 地址

部署 Worker 后，把 `web/app.js` 顶部的 `apiBase` 改成 Worker 的 HTTPS 地址，例如：

```js
const apiBase = 'https://xiaoyao-translate-api.example.workers.dev';
```

同时将 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS` 改成实际 GitHub Pages 来源。

## 3. 发布 GitHub Pages

将 `web/` 目录内容放到仓库根目录或 Pages 发布目录，在 GitHub 的 Settings → Pages 选择从分支发布。首次发布后，用 iPhone Safari 打开 HTTPS 页面。

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
