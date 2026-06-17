# 追番日历 · 国外部署指南

## 当前进度（本机已就绪）

- Git、Node.js 已安装
- 项目已 `git init`
- 双击 **`准备部署包.bat`** 可生成 `anime-season-calendar-deploy.zip`

---

## Cursor 能托管网站吗？

**不能。** Cursor 是写代码的 AI 编辑器，不是主机商。  
部署需要把项目上传到 **Cloudflare Pages** 或 **Vercel** 等平台。

本项目已配置 **Cloudflare Pages（推荐，免费）**。

---

## 费用大概多少

| 项目 | 费用 |
|------|------|
| Cloudflare Pages | **免费** |
| Cloudflare Workers（API 代理） | 免费额度通常够用 |
| 域名 `.com` | 约 **$10～15/年**（Cloudflare 注册即可） |

---

## 部署步骤（Cloudflare Pages）

### 1. 上传到 GitHub

**方式 A（推荐，有 Git）：** 在项目文件夹打开终端，依次执行：

```bash
git add .
git commit -m "Initial deploy setup for Cloudflare Pages"
git branch -M main
git remote add origin https://github.com/你的用户名/anime-season-calendar.git
git push -u origin main
```

先在 https://github.com/new 创建空仓库 `anime-season-calendar`（不要勾选 README）。

**方式 B（不用命令行）：**

1. GitHub 新建仓库
2. 点 **uploading an existing file**
3. 把 `standalone`、`functions`、`wrangler.toml`、`.gitignore`、`README.md`、`DEPLOY.md` 拖进去上传

### 2. 注册 Cloudflare

打开 https://dash.cloudflare.com 注册账号。

### 3. 创建 Pages 项目

1. 左侧 **Workers 和 Pages** → **创建** → **Pages** → **连接到 Git**
2. 选择你的 GitHub 仓库
3. 构建设置：
   - **框架预设**：无
   - **构建命令**：留空
   - **构建输出目录**：`standalone`
4. 点击 **保存并部署**

### 4. （可选）作者统计 KV

若要 **作者统计** 在海外也能用：

1. Cloudflare 控制台 → **Workers KV** → 创建命名空间，名称如 `anime-stats`
2. 复制 **Namespace ID**，填入项目根目录 `wrangler.toml` 里 KV 的 `id`
3. Pages 项目 → **设置** → **Functions** → 绑定 KV，变量名 `STATS`
4. **环境变量** 添加 `AUTHOR_PASSWORD`（作者页密码）

### 5. 绑定域名

Pages 项目 → **自定义域** → 添加你买的域名 → 按提示改 DNS。

---

## 本地命令行部署（可选）

安装 Node.js 后，在项目目录执行：

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy standalone --project-name=anime-season-calendar
```

---

## 海外版与本地版区别

| | 本地 `启动网站.bat` | 海外部署后 |
|--|---------------------|------------|
| 观看链接 | B站 + Bangumi | **Crunchyroll + Netflix + MAL** |
| 数据 API | Python `server.py` | Cloudflare Functions 代理 |
| 备案 | 不需要 | **不需要** |

---

## Vercel 可以吗？

可以部署 **静态页面**，但本项目的 **API 代理和作者统计** 是为 Cloudflare Functions 写的。  
若用 Vercel，需要另写 Serverless API，**建议直接用 Cloudflare**。

---

## 部署后检查

1. 打开 `https://你的域名/` 能看到番剧列表  
2. 卡片上有 **Crunchyroll / Netflix / MAL** 按钮（不是 B站）  
3. 底部 **作者入口** 能打开统计页  

有问题把浏览器报错截图发给我。
