/**
 * 羽线追踪 - 羽毛球球线消耗记录应用
 */

// ==================== 数据存储 ====================

const STORAGE_KEY = 'badmintonStringTracker_data';
const SETTINGS_KEY = 'badmintonStringTracker_settings';

let appData = {
    rackets: [],
    lastModified: null
};

let settings = {
    supabaseUrl: 'https://ujakjpqqzjgcunfhecqv.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqYWtqcHFxempnY3VuZmhlY3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDcwNTUsImV4cCI6MjA5MTI4MzA1NX0.2UrUNA0MXGl6j5JLEqTD7sGmVtayg-IBbGWTKwPW_4A',
    deviceId: '',  // 用户自定义的设备ID
    userName: ''  // 用户名/团队名
};

let currentRacketId = null;

// ==================== Supabase 客户端 ====================

let supabase = null;

function initSupabase() {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
        return null;
    }
    return window.supabase.createClient(settings.supabaseUrl, settings.supabaseKey);
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSettings();
    updateUI();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addRacketForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addRacket();
    });

    document.getElementById('addRecordForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addRecord();
    });

    document.getElementById('startDate').valueAsDate = new Date();
    document.getElementById('recordDate').valueAsDate = new Date();
}

// ==================== 数据操作 ====================

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appData = JSON.parse(saved);
    }
}

function saveData() {
    appData.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI();
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        settings = JSON.parse(saved);
    }
    if (!settings.deviceId) {
        settings.deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        saveSettingsLocal();
    }
}

function saveSettingsLocal() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== Supabase 同步 ====================

// 连接 Supabase（使用预配置）
async function connectSupabase() {
    const userNameInput = document.getElementById('userNameInput');
    const userName = userNameInput.value.trim();

    if (!userName) {
        showToast('请输入用户名或团队名', 'error');
        return;
    }

    // 用用户名作为设备ID
    settings.userName = userName;
    settings.deviceId = 'user_' + userName;
    saveSettingsLocal();

    try {
        const client = initSupabase();

        // 创建表（如果不存在）
        await createSupabaseTable(client);

        updateSyncUI();
        showToast('连接成功！', 'success');

        // 下载远程数据
        await syncFromSupabase();

    } catch (error) {
        showToast(error.message || '连接失败', 'error');
    }
}

// 创建 Supabase 表（如果不存在）
async function createSupabaseTable(client) {
    // 尝试查询，如果表不存在会报错
    const { error } = await client
        .from('tracker_data')
        .select('id')
        .limit(1);

    if (error && error.code === 'PGRST116') {
        // 表不存在，提示用户创建
        showToast('请在 Supabase SQL Editor 执行建表语句', 'error');
        console.log('请执行以下 SQL 创建表：');
        console.log(`
CREATE TABLE tracker_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tracker_device ON tracker_data(device_id);
        `);
        throw new Error('表不存在，请先创建表');
    }
}

// 从 Supabase 同步数据
async function syncFromSupabase() {
    const client = initSupabase();
    if (!client) return;

    const { data, error } = await client
        .from('tracker_data')
        .select('data, updated_at')
        .eq('device_id', settings.deviceId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Sync error:', error);
        return;
    }

    if (data && data.data) {
        appData = data.data;
        saveData();
        updateUI();
    }
}

// 上传到 Supabase
async function uploadToSupabase() {
    const client = initSupabase();
    if (!client) return;

    const now = new Date().toISOString();

    // 使用 upsert，device_id 是唯一的
    await client
        .from('tracker_data')
        .upsert({
            device_id: settings.deviceId,
            data: appData,
            updated_at: now
        }, {
            onConflict: 'device_id'
        });
}

// 同步（带冲突检测）
async function syncWithSupabase() {
    const client = initSupabase();
    if (!client) {
        showToast('请先连接 Supabase', 'error');
        return;
    }

    const syncBtn = document.getElementById('syncBtn');
    const originalText = syncBtn.textContent;
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';

    try {
        // 获取远程数据
        const { data: remote, error } = await client
            .from('tracker_data')
            .select('data, updated_at')
            .eq('device_id', settings.deviceId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        const localTime = appData.lastModified ? new Date(appData.lastModified).getTime() : 0;
        const remoteTime = remote?.updated_at ? new Date(remote.updated_at).getTime() : 0;
        const timeDiff = Math.abs(remoteTime - localTime);

        if (!remote || timeDiff < 2000) {
            // 无远程数据或时间差小于2秒，视为相同
            showToast('数据已是最新', 'info');
        } else if (localTime > remoteTime) {
            // 本地较新，上传
            await uploadToSupabase();
            showToast('数据已上传到云端', 'success');
        } else {
            // 远程较新，下载
            appData = remote.data;
            saveData();
            updateUI();
            showToast('已从云端同步最新数据', 'success');
        }
    } catch (error) {
        showToast(error.message || '同步失败', 'error');
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = originalText;
    }
}

// 断开连接
function disconnectSupabase() {
    settings.userName = '';
    settings.deviceId = '';
    saveSettingsLocal();
    updateSyncUI();
    showToast('已断开云端连接', 'info');
}

// ==================== UI 更新 ====================

function toggleSupabaseKeyVisibility() {
    const input = document.getElementById('supabaseKeyInput');
    const btn = input.parentElement.querySelector('.token-toggle');
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '隐藏';
    } else {
        input.type = 'password';
        btn.textContent = '显示';
    }
}

function updateSyncUI() {
    const disconnected = document.getElementById('syncDisconnected');
    const connected = document.getElementById('syncConnected');
    const statusText = document.getElementById('syncStatusText');
    const userNameInput = document.getElementById('userNameInput');

    if (settings.userName) {
        disconnected.style.display = 'none';
        connected.style.display = 'block';
        statusText.textContent = settings.userName;
    } else {
        disconnected.style.display = 'block';
        connected.style.display = 'none';
        if (userNameInput) userNameInput.value = '';
    }
}

// ==================== 球拍管理 ====================

function addRacket() {
    const model = document.getElementById('racketModel').value.trim();
    const stringModel = document.getElementById('stringModel').value.trim();
    const startDate = document.getElementById('startDate').value;
    const note = document.getElementById('racketNote').value.trim();

    const racket = {
        id: Date.now().toString(),
        model,
        stringModel,
        startDate,
        note,
        isBroken: false,
        breakDate: null,
        records: [],
        createdAt: new Date().toISOString()
    };

    appData.rackets.push(racket);
    saveData();
    closeModal('addRacketModal');
    document.getElementById('addRacketForm').reset();
    document.getElementById('startDate').valueAsDate = new Date();

    // 自动同步到云端
    if (settings.supabaseUrl) {
        uploadToSupabase();
    }
}

function deleteRacket(id, event) {
    event.stopPropagation();
    if (confirm('确定要删除这个球拍吗？所有记录也将被删除。')) {
        appData.rackets = appData.rackets.filter(r => r.id !== id);
        if (currentRacketId === id) {
            currentRacketId = null;
        }
        saveData();
        if (settings.supabaseUrl) {
            uploadToSupabase();
        }
    }
}

function markAsBroken(id, event) {
    event.stopPropagation();
    const racket = appData.rackets.find(r => r.id === id);
    if (!racket) return;

    const totalSessions = calculateTotalSessions(racket);
    const note = prompt(`记录断线信息（可选）\n当前累计场次：${totalSessions}场`);

    if (note !== null) {
        racket.isBroken = true;
        racket.breakDate = new Date().toISOString();
        racket.breakNote = note.trim();
        saveData();
        if (settings.supabaseUrl) {
            uploadToSupabase();
        }
    }
}

function selectRacket(id) {
    currentRacketId = id;
    updateUI();
}

// ==================== 记录管理 ====================

function addRecord() {
    if (!currentRacketId) {
        alert('请先选择一个球拍');
        return;
    }

    const racket = appData.rackets.find(r => r.id === currentRacketId);
    if (!racket) return;

    if (racket.isBroken) {
        alert('该球拍已标记为断线，无法添加新记录');
        return;
    }

    const date = document.getElementById('recordDate').value;
    const count = parseInt(document.getElementById('sessionCount').value);
    const note = document.getElementById('recordNote').value.trim();

    const record = {
        id: Date.now().toString(),
        date,
        count,
        note,
        createdAt: new Date().toISOString()
    };

    racket.records.push(record);
    saveData();
    closeModal('addRecordModal');
    document.getElementById('addRacketForm').reset();
    document.getElementById('recordDate').valueAsDate = new Date();

    // 自动同步到云端
    if (settings.supabaseUrl) {
        uploadToSupabase();
    }
}

function deleteRecord(racketId, recordId) {
    if (confirm('确定要删除这条记录吗？')) {
        const racket = appData.rackets.find(r => r.id === racketId);
        if (racket) {
            racket.records = racket.records.filter(r => r.id !== recordId);
            saveData();
            if (settings.supabaseUrl) {
                uploadToSupabase();
            }
        }
    }
}

// ==================== 计算统计 ====================

function calculateTotalSessions(racket) {
    return racket.records.reduce((sum, r) => sum + r.count, 0);
}

function calculateStats() {
    const totalRackets = appData.rackets.length;
    let totalSessions = 0;
    let brokenCount = 0;
    let totalLife = 0;
    let lifeCount = 0;

    appData.rackets.forEach(racket => {
        const sessions = calculateTotalSessions(racket);
        totalSessions += sessions;

        if (racket.isBroken) {
            brokenCount++;
            totalLife += sessions;
            lifeCount++;
        }
    });

    const avgLife = lifeCount > 0 ? Math.round(totalLife / lifeCount) : 0;

    return { totalRackets, totalSessions, brokenCount, avgLife };
}

// ==================== UI 更新 ====================

function updateUI() {
    updateStats();
    updateRacketList();
    updateRecordList();
}

function updateStats() {
    const stats = calculateStats();
    document.getElementById('totalRackets').innerHTML = `${stats.totalRackets}<span class="stat-unit">支</span>`;
    document.getElementById('totalSessions').innerHTML = `${stats.totalSessions}<span class="stat-unit">场</span>`;
    document.getElementById('brokenCount').innerHTML = `${stats.brokenCount}<span class="stat-unit">次</span>`;
    document.getElementById('avgLife').innerHTML = `${stats.avgLife}<span class="stat-unit">场</span>`;
}

function updateRacketList() {
    const container = document.getElementById('racketList');

    if (appData.rackets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏸</div>
                <p>还没有添加球拍</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">点击"添加球拍"开始记录</p>
            </div>
        `;
        return;
    }

    const sortedRackets = [...appData.rackets].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    container.innerHTML = sortedRackets.map(racket => {
        const totalSessions = calculateTotalSessions(racket);
        const isActive = racket.id === currentRacketId;
        const isBroken = racket.isBroken;

        const lifePercent = Math.min((totalSessions / 30) * 100, 100);
        const isWarning = lifePercent > 80 && !isBroken;

        return `
            <div class="racket-card ${isActive ? 'active' : ''} ${isBroken ? 'broken' : ''}"
                 onclick="selectRacket('${racket.id}')">
                <div class="racket-name">${escapeHtml(racket.model)}</div>
                <div class="racket-string">${escapeHtml(racket.stringModel)}</div>
                <div class="racket-stats">
                    <div class="racket-stat">
                        <span>累计</span>
                        <strong>${totalSessions}</strong>
                        <span>场</span>
                    </div>
                    <div class="racket-stat">
                        <span>记录</span>
                        <strong>${racket.records.length}</strong>
                        <span>条</span>
                    </div>
                </div>
                ${!isBroken ? `
                    <div class="progress-bar">
                        <div class="progress-fill ${isWarning ? 'warning' : ''}" style="width: ${lifePercent}%"></div>
                    </div>
                ` : ''}
                ${isActive && !isBroken ? `
                    <div class="racket-actions">
                        <button class="btn btn-primary btn-small" onclick="openAddRecordModal(event)">
                            + 记录使用
                        </button>
                        <button class="btn btn-break btn-small" onclick="markAsBroken('${racket.id}', event)">
                            标记断线
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteRacket('${racket.id}', event)">
                            删除
                        </button>
                    </div>
                ` : ''}
                ${isActive && isBroken ? `
                    <div class="racket-actions">
                        <button class="btn btn-danger btn-small" onclick="deleteRacket('${racket.id}', event)">
                            删除
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateRecordList() {
    const container = document.getElementById('recordList');
    const titleEl = document.getElementById('selectedRacketName');

    if (!currentRacketId) {
        titleEl.textContent = '';
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>选择球拍查看记录</p>
            </div>
        `;
        return;
    }

    const racket = appData.rackets.find(r => r.id === currentRacketId);
    if (!racket) {
        currentRacketId = null;
        updateRecordList();
        return;
    }

    titleEl.textContent = racket.model;

    if (racket.records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>暂无使用记录</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">点击"记录使用"添加</p>
            </div>
        `;
        return;
    }

    const sortedRecords = [...racket.records].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    container.innerHTML = sortedRecords.map(record => `
        <div class="record-item">
            <div class="record-info">
                <div class="record-date">${formatDate(record.date)} ${record.note ? '- ' + escapeHtml(record.note) : ''}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="record-count">+${record.count}场</div>
                <button class="btn btn-danger btn-small" onclick="deleteRecord('${racket.id}', '${record.id}')"
                        style="padding: 0.3rem 0.5rem; font-size: 0.75rem;">删除</button>
            </div>
        </div>
    `).join('');

    if (racket.isBroken) {
        const totalSessions = calculateTotalSessions(racket);
        container.innerHTML += `
            <div class="record-item" style="border-left-color: var(--accent-orange); margin-top: 1rem;">
                <div class="record-info">
                    <div class="record-date" style="color: var(--accent-orange);">
                        💔 ${formatDate(racket.breakDate.split('T')[0])} 断线
                        ${racket.breakNote ? '- ' + escapeHtml(racket.breakNote) : ''}
                    </div>
                </div>
                <div class="record-count" style="color: var(--accent-orange);">共${totalSessions}场</div>
            </div>
        `;
    }
}

// ==================== 模态框 ====================

function openAddRacketModal() {
    document.getElementById('addRacketModal').classList.add('active');
}

function openAddRecordModal(event) {
    if (event) event.stopPropagation();
    document.getElementById('addRecordModal').classList.add('active');
}

function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    updateSyncUI();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};

// ==================== 数据导入导出 ====================

async function exportDataToClipboard() {
    const dataStr = JSON.stringify(appData, null, 2);

    try {
        await navigator.clipboard.writeText(dataStr);
        alert('数据已复制到剪贴板！');
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = dataStr;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('数据已复制到剪贴板！');
    }
}

function exportDataToFile() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `badminton-string-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importDataFromText() {
    const text = document.getElementById('importDataText').value.trim();

    if (!text) {
        alert('请先粘贴 JSON 数据');
        return;
    }

    try {
        const importedData = JSON.parse(text);

        if (!importedData.rackets || !Array.isArray(importedData.rackets)) {
            throw new Error('数据格式不正确：缺少 rackets 数组');
        }

        const racketCount = importedData.rackets.length;
        if (confirm(`确定要导入数据吗？\n\n包含 ${racketCount} 个球拍记录\n当前数据将被替换。`)) {
            appData = importedData;
            saveData();
            updateUI();
            document.getElementById('importDataText').value = '';
            closeModal('settingsModal');
            alert('数据导入成功！');
        }
    } catch (error) {
        alert('导入失败：' + error.message);
    }
}

function importDataFromFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.rackets || !Array.isArray(importedData.rackets)) {
                throw new Error('数据格式不正确：缺少 rackets 数组');
            }

            const racketCount = importedData.rackets.length;
            if (confirm(`确定要导入文件吗？\n\n文件名：${file.name}\n包含 ${racketCount} 个球拍记录\n当前数据将被替换。`)) {
                appData = importedData;
                saveData();
                updateUI();
                closeModal('settingsModal');
                alert('数据导入成功！');
            }
        } catch (error) {
            alert('导入失败：' + error.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('⚠️ 警告\n\n确定要清空所有数据吗？\n此操作不可恢复！\n\n建议先导出备份。')) {
        if (confirm('再次确认：真的要删除所有数据吗？')) {
            appData = {
                rackets: [],
                lastModified: null
            };
            currentRacketId = null;
            saveData();
            updateUI();
            closeModal('settingsModal');
            alert('所有数据已清空');
        }
    }
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')}`;
}

// ==================== Toast 提示 ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
