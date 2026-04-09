/**
 * 羽线追踪 - 简单 API 服务
 * 使用 JSON 文件存储数据
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tracker.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ data: null, updated_at: null }));
}

// 中间件
app.use(express.json({ limit: '10mb' }));

// CORS 中间件
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://younglina.wang',
        'http://localhost:8080'
    ];

    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-ID');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 生成简单的设备签名
function getDeviceSignature(deviceId) {
    return crypto.createHash('md5').update(deviceId + 'badminton-tracker').digest('hex');
}

// 读取数据
function readData() {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return { data: null, updated_at: null };
    }
}

// 写入数据
function writeData(deviceId, data) {
    const now = new Date().toISOString();
    const content = JSON.stringify({
        device_id: deviceId,
        data: data,
        updated_at: now
    }, null, 2);
    fs.writeFileSync(DATA_FILE, content);
    return now;
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取数据
app.get('/api/data', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        return res.status(401).json({ error: 'Missing X-Device-ID header' });
    }

    const stored = readData();
    res.json({
        data: stored.data,
        updatedAt: stored.updated_at,
        isEmpty: !stored.data
    });
});

// 保存数据
app.post('/api/data', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        return res.status(401).json({ error: 'Missing X-Device-ID header' });
    }

    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: 'Missing data' });
    }

    const updatedAt = writeData(deviceId, data);
    res.json({ success: true, updatedAt });
});

// 同步（带冲突检测）
app.post('/api/sync', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        return res.status(401).json({ error: 'Missing X-Device-ID header' });
    }

    const { data, lastModified } = req.body;
    if (!data) {
        return res.status(400).json({ error: 'Missing data' });
    }

    const stored = readData();

    // 如果没有远程数据，直接保存
    if (!stored.data) {
        const updatedAt = writeData(deviceId, data);
        return res.json({
            action: 'uploaded',
            data,
            updatedAt
        });
    }

    const remoteTime = stored.updated_at ? new Date(stored.updated_at).getTime() : 0;
    const localTime = lastModified ? new Date(lastModified).getTime() : 0;
    const timeDiff = Math.abs(remoteTime - localTime);

    if (timeDiff < 2000) {
        // 时间差小于2秒，视为已同步
        return res.json({
            action: 'already_synced',
            data: stored.data,
            updatedAt: stored.updated_at
        });
    }

    if (localTime > remoteTime) {
        // 本地较新，上传
        const updatedAt = writeData(deviceId, data);
        return res.json({
            action: 'uploaded',
            data,
            updatedAt
        });
    } else {
        // 远程较新，返回远程数据
        return res.json({
            action: 'downloaded',
            data: stored.data,
            updatedAt: stored.updated_at
        });
    }
});

// 启动服务
app.listen(PORT, '127.0.0.1', () => {
    console.log(`API server running on http://127.0.0.1:${PORT}`);
});
