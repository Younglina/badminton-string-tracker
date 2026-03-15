# 🏸 羽线追踪 | Badminton String Tracker

一个简洁优雅的羽毛球球线消耗记录工具，帮助你追踪不同球线的使用寿命。

## ✨ 特性

- 📊 **直观统计** - 实时显示球拍数量、累计场次、断线次数、平均寿命
- 📝 **详细记录** - 记录每次打球的场次，支持备注
- 💔 **断线标记** - 标记球拍断线，自动计算使用寿命
- 💾 **数据迁移** - JSON 导入导出，轻松备份和多设备同步
- 📱 **响应式设计** - 完美适配手机、平板、电脑
- 🎨 **精美界面** - 运动科技风格，暗色主题护眼
- 🔒 **隐私安全** - 纯本地存储，数据完全由你掌控
- 🚀 **零成本部署** - 纯前端实现，无需后端服务器

## 🚀 在线体验

直接访问：https://younglina.wang/badminton

备用地址：https://younglina.github.io/badminton-string-tracker

## 📖 使用指南

### 快速开始

1. **添加球拍**
   - 点击"添加球拍"按钮
   - 填写球拍型号、球线型号、初始日期
   - 保存后开始记录

2. **记录使用**
   - 选择要记录的球拍
   - 点击"记录使用"
   - 输入日期、场次数量、备注

3. **标记断线**
   - 球线断了点击"标记断线"
   - 自动计算该球线的使用寿命

4. **查看统计**
   - 首页实时显示各项统计数据
   - 进度条直观显示球线寿命预估

### 数据备份与迁移

**导出数据**：
1. 点击右上角"数据管理"
2. 选择"复制 JSON"或"下载文件"
3. 保存到安全位置

**导入数据**：
1. 在新设备打开网站
2. 点击"数据管理"
3. 粘贴 JSON 文本或上传备份文件
4. 点击导入，数据即刻恢复

### 多设备同步方法

1. **在设备 A 上**：
   - 进入"数据管理"
   - 点击"复制 JSON"
   - 发送到微信/邮件/备忘录

2. **在设备 B 上**：
   - 打开网站
   - 进入"数据管理"
   - 粘贴 JSON，点击导入

简单安全，数据完全在自己掌控中！

## 🛠️ 技术实现

### 技术栈

- **纯 HTML/CSS/JavaScript** - 无框架依赖，轻量高效
- **LocalStorage** - 浏览器本地存储，零配置
- **GitHub Pages** - 免费静态托管
- **响应式设计** - 移动端优先，适配各种屏幕

### 核心功能代码示例

**本地存储**：
```javascript
const STORAGE_KEY = 'badmintonStringTracker_data';

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}
```

**数据导出**：
```javascript
async function exportDataToClipboard() {
  const dataStr = JSON.stringify(appData, null, 2);
  await navigator.clipboard.writeText(dataStr);
}
```

**统计计算**：
```javascript
function calculateStats() {
  const totalRackets = appData.rackets.length;
  const totalSessions = appData.rackets.reduce((sum, r) => 
    sum + r.records.reduce((s, rec) => s + rec.count, 0), 0
  );
  const brokenCount = appData.rackets.filter(r => r.isBroken).length;
  const avgLife = brokenCount > 0 ? 
    Math.round(totalSessions / brokenCount) : 0;
  
  return { totalRackets, totalSessions, brokenCount, avgLife };
}
```

## 📁 项目结构

```
badminton-string-tracker/
├── index.html          # 主页面
├── app.js              # 应用逻辑
├── assets/             # 静态资源
│   └── preview.png     # 预览图
├── README.md           # 项目说明
└── LICENSE             # 许可证
```

## 🚀 部署方式

### GitHub Pages（推荐）

1. Fork 或克隆本仓库
2. 进入仓库 Settings → Pages
3. Source 选择 Deploy from a branch
4. Branch 选择 master，文件夹选择 / (root)
5. 保存后等待 1-2 分钟，即可访问

### 自有服务器

1. 将项目文件上传到服务器目录
2. 配置 Nginx/Apache 指向项目目录
3. 访问对应 URL 即可使用

示例 Nginx 配置：
```nginx
location /badminton {
    alias /usr/repo/badminton-string-tracker;
    index index.html;
    try_files $uri $uri/ =404;
}
```

## 📝 数据格式

```json
{
  "rackets": [
    {
      "id": "时间戳",
      "model": "YONEX 天斧100ZZ",
      "stringModel": "BG80 26磅",
      "startDate": "2024-01-01",
      "note": "主力拍",
      "isBroken": false,
      "breakDate": null,
      "breakNote": "",
      "records": [
        {
          "id": "时间戳",
          "date": "2024-01-15",
          "count": 3,
          "note": "双打"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "lastSync": "2024-01-20T10:00:00.000Z"
}
```

## 🎨 设计亮点

- **运动科技风**：霓虹绿 + 电光蓝配色，暗色主题
- **流畅动画**：卡片悬浮、进度条动画、脉冲光效
- **移动端优化**：触控友好的按钮尺寸，响应式布局
- **无干扰界面**：专注核心功能，无广告无弹窗

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如果你有好的想法或发现 bug，请通过 GitHub Issues 反馈。

## 🙏 致谢

- 感谢 [OpenClaw](https://openclaw.ai) 小龙虾 AI 助手协助开发
- 感谢所有羽毛球爱好者的反馈和建议

## 📄 许可证

MIT License

---

Made with ❤️ for badminton lovers
