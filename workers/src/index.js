/**
 * 羽线追踪 - Cloudflare Workers API
 * 用于跨设备数据同步
 */

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://woung.net',
  'https://badminton-string-tracker.pages.dev',
  // 添加你的其他域名
];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.some(
      (allowed) => origin === allowed || origin.startsWith(allowed.replace(/\/$/, ''))
    );

    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 解析 URL
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 路由处理
      if (path === '/api/data' && request.method === 'GET') {
        return handleGetData(request, env, corsHeaders);
      }

      if (path === '/api/data' && (request.method === 'POST' || request.method === 'PUT')) {
        return handleSaveData(request, env, corsHeaders);
      }

      if (path === '/api/sync' && request.method === 'POST') {
        return handleSync(request, env, corsHeaders);
      }

      // 健康检查
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// 获取数据
async function handleGetData(request, env, corsHeaders) {
  // 简单的设备认证（基于 Header）
  const deviceId = request.headers.get('X-Device-ID');
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing X-Device-ID header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = await env.DB.prepare('SELECT data, updated_at FROM tracker_data WHERE device_id = ? ORDER BY updated_at DESC LIMIT 1').bind(deviceId);
  const result = await stmt.first();

  if (!result) {
    return new Response(JSON.stringify({ data: null, isEmpty: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      data: JSON.parse(result.data),
      updatedAt: result.updated_at,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// 保存数据（完整覆盖）
async function handleSaveData(request, env, corsHeaders) {
  const deviceId = request.headers.get('X-Device-ID');
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing X-Device-ID header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { data } = body;

  if (!data) {
    return new Response(JSON.stringify({ error: 'Missing data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();
  const jsonData = JSON.stringify(data);

  // 尝试更新，如果不存在则插入
  const updateStmt = await env.DB.prepare(
    'UPDATE tracker_data SET data = ?, updated_at = ? WHERE device_id = ?'
  ).bind(jsonData, now, deviceId).run();

  if (updateStmt.changes === 0) {
    // 不存在，插入新记录
    await env.DB.prepare(
      'INSERT INTO tracker_data (device_id, data, created_at, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(deviceId, jsonData, now, now).run();
  }

  return new Response(JSON.stringify({ success: true, updatedAt: now }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 同步（带冲突检测）
async function handleSync(request, env, corsHeaders) {
  const deviceId = request.headers.get('X-Device-ID');
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing X-Device-ID header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { data, lastModified } = body;

  // 获取远程数据
  const stmt = await env.DB.prepare('SELECT data, updated_at FROM tracker_data WHERE device_id = ?').bind(deviceId);
  const remote = await stmt.first();

  const remoteTime = remote ? new Date(remote.updated_at).getTime() : 0;
  const localTime = lastModified ? new Date(lastModified).getTime() : 0;

  // 如果远程没有数据，直接保存
  if (!remote) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO tracker_data (device_id, data, created_at, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(deviceId, JSON.stringify(data), now, now).run();

    return new Response(
      JSON.stringify({
        action: 'uploaded',
        data,
        updatedAt: now,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 比较时间戳
  const timeDiff = Math.abs(remoteTime - localTime);

  if (timeDiff < 2000) {
    // 时间差小于2秒，视为相同
    return new Response(
      JSON.stringify({
        action: 'already_synced',
        data: JSON.parse(remote.data),
        updatedAt: remote.updated_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (localTime > remoteTime) {
    // 本地较新，上传
    const now = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE tracker_data SET data = ?, updated_at = ? WHERE device_id = ?'
    ).bind(JSON.stringify(data), now, deviceId).run();

    return new Response(
      JSON.stringify({
        action: 'uploaded',
        data,
        updatedAt: now,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } else {
    // 远程较新，返回远程数据
    return new Response(
      JSON.stringify({
        action: 'downloaded',
        data: JSON.parse(remote.data),
        updatedAt: remote.updated_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
