# Cloudflare Workers 部署指南

## 准备工作

1. 已安装 Node.js
2. 已登录 Cloudflare 账号

## 步骤 1：安装 Wrangler CLI

```bash
npm install -g wrangler
```

## 步骤 2：登录 Cloudflare

```bash
npx wrangler login
```
这会在浏览器打开 Cloudflare 授权页面。

## 步骤 3：创建 D1 数据库

```bash
cd workers
npx wrangler d1 create badminton-string-tracker
```

会返回类似输出：
```
✅ Created D1 database named 'badminton-string-tracker'
database_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**复制这个 database_id**，稍后用到。

## 步骤 4：更新 wrangler.toml

编辑 `workers/wrangler.toml`，把 `YOUR_DATABASE_ID` 替换成上一步复制的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "badminton-string-tracker"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换这里
```

## 步骤 5：初始化数据库表

```bash
npx wrangler d1 execute badminton-string-tracker --file=schema.sql
```

## 步骤 6：部署 Workers

```bash
npx wrangler deploy
```

部署成功后会返回 Workers URL，类似：
```
https://badminton-string-tracker-api.your-name.workers.dev
```

## 步骤 7：配置前端

1. 打开应用 → 数据管理
2. 在 "Workers URL" 输入框填入上述地址
3. 点击 "连接 Cloudflare"

## 步骤 8：多设备同步

在其他设备上：
1. 打开应用 → 数据管理
2. 填入相同的 Workers URL
3. 点击连接

系统会自动生成设备ID并同步数据。

---

## 费用

- Workers：每天 10 万次请求免费
- D1：1GB 存储免费
- 流量：免费

个人使用基本不会超出免费额度。

## 故障排除

**Q: 部署报错 "Authentication error"**
A: 运行 `npx wrangler login` 重新授权

**Q: 数据库操作失败**
A: 确保已执行 `wrangler d1 execute` 初始化表结构

**Q: 同步失败**
A: 检查 Workers URL 是否正确，确保是 `https://` 开头
