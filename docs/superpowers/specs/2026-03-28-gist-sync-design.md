# GitHub Gist 多端同步功能设计

## 概述

为羽毛球穿线追踪器添加基于 GitHub Gist 的手动云端同步功能，支持多设备间数据同步。

## 需求总结

- **同步模式：** 手动同步（用户点击按钮触发）
- **冲突策略：** 时间戳覆盖（比较本地和远程的更新时间，自动选择较新的）
- **Token 配置：** 应用内设置，输入 Token 后自动创建 Gist 并关联
- **现有功能：** 保留导入/导出功能，与 Gist 同步并存

## 方案选择

**方案 A：单文件 Gist + 完整覆盖**

将整个 `rackets` 数据作为一个 JSON 文件写入一个私有 Gist。同步时比较时间戳，较新的一方覆盖较旧的。

选择理由：实现简单、可靠、数据量小（个人工具），不需要复杂的合并逻辑。

## 数据模型变更

### localStorage 主数据

在现有 `badmintonStringTracker_data` 中添加 `lastModified` 字段：

```json
{
  "rackets": [...],
  "lastModified": "2026-03-28T10:30:00.000Z"
}
```

- 每次数据变更（添加/删除球拍、记录使用、标记断线等）时自动更新为当前 ISO 时间
- `saveData()` 函数中统一设置此字段

### localStorage 设置

沿用现有 `badmintonStringTracker_settings` 结构：

```json
{
  "githubToken": "ghp_xxxx",
  "gistId": "abc123..."
}
```

## Gist API 交互

### 创建 Gist

```
POST https://api.github.com/gists
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Badminton String Tracker Data",
  "public": false,
  "files": {
    "badminton-string-tracker.json": {
      "content": "{ JSON 数据 }"
    }
  }
}
```

### 更新 Gist

```
PATCH https://api.github.com/gists/{gist_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Badminton String Tracker Data",
  "files": {
    "badminton-string-tracker.json": {
      "content": "{ JSON 数据 }"
    }
  }
}
```

### 读取 Gist

```
GET https://api.github.com/gists/{gist_id}
Authorization: Bearer {token}
```

返回中包含 `updated_at` 时间戳和 `files["badminton-string-tracker.json"].content`。

## 同步流程

```
用户点击"同步数据"按钮
  1. 检查 Token 和 Gist ID 是否已配置
  2. GET /gists/{gist_id} — 读取远程数据
  3. 比较：
     - local.lastModified > gist.updated_at → 本地较新，PATCH 上传覆盖
     - local.lastModified < gist.updated_at → 远程较新，用远程数据覆盖本地
     - local.lastModified ≈ gist.updated_at → 提示"数据已是最新"
  4. 显示同步结果（成功/失败/无变更）
```

## UI 设计

### 设置区域

在现有数据管理模态框中添加"云端同步"折叠区域：

1. **GitHub Token 输入框** — 密码样式隐藏，带显示/隐藏切换
2. **"连接"按钮** — 输入 Token 后点击，自动创建 Gist 并关联
3. **同步状态** — 显示已连接/未连接状态、Gist ID
4. **"同步数据"按钮** — 手动触发同步
5. **"断开连接"按钮** — 清除 Token 和 Gist ID（不删除 Gist）

### 现有功能

导入/导出区域（复制 JSON、下载文件、导入文本、导入文件）保持不变，放在同步区域下方。

### 同步反馈

| 状态 | 表现 |
|------|------|
| 同步中 | 按钮显示 loading 状态（旋转图标 + "同步中..."） |
| 成功 - 上传 | 绿色 toast："数据已上传到云端" |
| 成功 - 下载 | 绿色 toast："已从云端同步最新数据" |
| 无变更 | 灰色 toast："数据已是最新" |
| 失败 | 红色 toast：具体错误信息 |

## 错误处理

| 场景 | HTTP 状态 | 处理方式 |
|------|-----------|----------|
| 网络错误 | N/A | toast："网络连接失败，请检查网络" |
| Token 无效/过期 | 401 | toast："Token 无效，请重新配置" |
| Gist 不存在 | 404 | toast："远程 Gist 不存在"，清除 gistId，引导重新创建 |
| API 速率限制 | 403 | toast："请求过于频繁，请稍后再试" |
| 其他错误 | 其他 | toast："同步失败：{错误信息}" |

## 首次连接流程

1. 用户在设置中输入 GitHub Personal Access Token（只需 `gist` 权限）
2. 点击"连接"
3. 应用调用 `POST /gists` 创建私有 Gist
4. 将 Gist ID 保存到 localStorage settings
5. 上传当前本地数据到 Gist
6. 显示"连接成功"，UI 切换为已连接状态

## 安全性

- Token 存储在 localStorage（仅限当前设备浏览器）
- Token 只需 `gist` 权限范围（最小权限原则）
- Gist 创建为私有（secret），不对外公开
- 断开连接时清除本地存储的 Token 和 Gist ID

## 代码改动范围

### app.js

1. **清理残留死代码：** 移除已失效的 `syncData()` 调用（5 处）
2. **修改 `saveData()`：** 每次保存时更新 `lastModified`
3. **新增函数：**
   - `connectGist(token)` — 创建 Gist 并保存设置
   - `disconnectGist()` — 清除 Token 和 Gist ID
   - `syncWithGist()` — 手动同步主逻辑
   - `uploadToGist()` — 上传数据到 Gist
   - `downloadFromGist()` — 从 Gist 下载并覆盖本地数据
   - `showToast(message, type)` — 统一 toast 提示
4. **修改 UI 渲染：** 在数据管理弹窗中添加同步设置区域

### index.html

1. 在数据管理模态框中添加同步相关的 HTML 结构
2. 添加 toast 提示的 HTML 容器

## 不做的事情

- 不实现自动同步（用户明确选择手动模式）
- 不实现数据合并（使用时间戳覆盖策略）
- 不添加离线队列或重试机制
- 不引入任何第三方库
