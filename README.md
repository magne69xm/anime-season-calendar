# 追番日历 / Anime Season Calendar

中文追番日历，数据来自 MyAnimeList + Bangumi。

- **本地运行**：双击 `启动网站.bat` → http://localhost:8080
- **海外部署**：见 [DEPLOY.md](./DEPLOY.md)

## 部署到 Cloudflare Pages

1. 双击 `准备部署包.bat`（可选，用于打包上传）
2. 把本项目推到 GitHub
3. Cloudflare Pages 连接仓库，输出目录填 `standalone`
4. 线上观看链接自动变为 Crunchyroll / Netflix / MAL
