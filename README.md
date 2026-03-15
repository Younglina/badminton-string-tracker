# 🏸 羽线追踪 | Badminton String Tracker

一个简洁优雅的羽毛球球线消耗记录工具，帮助你追踪不同球线的使用寿命。

## ✨ 特性

- 📊 **直观统计** - 实时显示球拍数量、累计场次、断线次数、平均寿命
- 📝 **详细记录** - 记录每次打球的场次，支持备注
- 💔 **断线标记** - 标记球拍断线，自动计算使用寿命
- ☁️ **云端同步** - 使用 GitHub Gist 免费同步，多端数据共享
- 📱 **响应式设计** - 完美适配手机、平板、电脑
- 🎨 **精美界面** - 运动科技风格，暗色主题护眼
- 🔒 **隐私安全** - 数据存储在你的 GitHub 账户，完全掌控

## 🚀 使用方法

### 在线访问

直接访问：https://younglina.github.io/badminton-string-tracker

### 本地使用

1. 克隆仓库
```bash
git clone https://github.com/Younglina/badminton-string-tracker.git
cd badminton-string-tracker
```

2. 使用任意静态服务器打开 `index.html`，或直接双击打开

```bash
# 使用 Python 简单服务器
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

## ☁️ 配置云端同步

1. 打开网站，点击右上角的"本地模式"
2. 获取 GitHub Token：
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `gist` 权限
   - 生成并复制 Token
3. 在设置面板粘贴 Token，点击"保存并连接"
4. 数据将自动同步到你的 GitHub Gist

## 📱 多设备同步

在其他设备上：
1. 打开网站
2. 进入设置面板
3. 输入相同的 GitHub Token
4. 输入 Gist ID（从原设备的设置中复制）
5. 保存后即可同步数据

## 🛡️ 数据备份

- 云端：数据自动存储在 GitHub Gist
- 本地：定期使用"导出数据备份"功能下载 JSON 文件

## 🏗️ 技术栈

- 纯 HTML/CSS/JavaScript，无框架依赖
- LocalStorage 本地存储
- GitHub Gist API 云端同步
- GitHub Pages 托管

## 📝 数据格式

```json
{
  "rackets": [
    {
      "id": "string",
      "model": "YONEX 天斧100ZZ",
      "stringModel": "BG80 26磅",
      "startDate": "2024-01-01",
      "note": "主力拍",
      "isBroken": false,
      "records": [
        {
          "id": "string",
          "date": "2024-01-15",
          "count": 3,
          "note": "双打"
        }
      ]
    }
  ],
  "lastSync": "2024-01-20T10:00:00.000Z"
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

Made with ❤️ for badminton lovers
