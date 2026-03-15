/**
 * 羽线追踪 - 羽毛球球线消耗记录应用
 * 使用 GitHub Gist 实现免费云端同步
 */

// ==================== 数据存储 ====================

const STORAGE_KEY = 'badmintonStringTracker_data';
const SETTINGS_KEY = 'badmintonStringTracker_settings';

let appData = {
    rackets: [],
    lastSync: null
};

let settings = {
    githubToken: '',
    gistId: ''
};

let currentRacketId = null;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSettings();
    updateUI();
    setupEventListeners();
    
    // 如果有 token，尝试同步
    if (settings.githubToken) {
        syncData();
    }
});

function setupEventListeners() {
    // 添加球拍表单
    document.getElementById('addRacketForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addRacket();
    });

    // 添加记录表单
    document.getElementById('addRecordForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addRecord();
    });

    // 设置默认日期为今天
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI();
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        settings = JSON.parse(saved);
    }
}

function saveSettingsLocal() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
    
    // 自动同步
    if (settings.githubToken) {
        syncData();
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
        
        if (settings.githubToken) {
            syncData();
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
        
        if (settings.githubToken) {
            syncData();
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
    document.getElementById('addRecordForm').reset();
    document.getElementById('recordDate').valueAsDate = new Date();
    
    if (settings.githubToken) {
        syncData();
    }
}

function deleteRecord(racketId, recordId) {
    if (confirm('确定要删除这条记录吗？')) {
        const racket = appData.rackets.find(r => r.id === racketId);
        if (racket) {
            racket.records = racket.records.filter(r => r.id !== recordId);
            saveData();
            
            if (settings.githubToken) {
                syncData();
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
    updateSyncStatus();
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

    // 按创建时间倒序
    const sortedRackets = [...appData.rackets].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    container.innerHTML = sortedRackets.map(racket => {
        const totalSessions = calculateTotalSessions(racket);
        const isActive = racket.id === currentRacketId;
        const isBroken = racket.isBroken;
        
        // 预估寿命进度（假设平均 30 场断线）
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

    // 按日期倒序
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

    // 如果已断线，显示断线信息
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

function updateSyncStatus() {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    
    if (settings.githubToken && settings.gistId) {
        dot.classList.remove('offline');
        text.textContent = '已同步';
    } else {
        dot.classList.add('offline');
        text.textContent = '本地模式';
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
    document.getElementById('githubToken').value = settings.githubToken || '';
    document.getElementById('gistId').value = settings.gistId || '';
    document.getElementById('settingsModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 点击模态框背景关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};

// ==================== GitHub Gist 同步 ====================

async function saveSettings() {
    const token = document.getElementById('githubToken').value.trim();
    const gistId = document.getElementById('gistId').value.trim();
    
    if (!token) {
        alert('请输入 GitHub Token');
        return;
    }

    settings.githubToken = token;
    settings.gistId = gistId;
    saveSettingsLocal();
    
    closeModal('settingsModal');
    
    // 尝试同步
    await syncData();
}

async function syncData() {
    if (!settings.githubToken) return;

    const syncStatus = document.getElementById('syncStatus');
    const syncText = document.getElementById('syncText');
    
    syncStatus.classList.add('syncing');
    syncText.textContent = '同步中...';

    try {
        if (settings.gistId) {
            // 更新现有 Gist
            await updateGist();
        } else {
            // 创建新 Gist
            await createGist();
        }
        
        appData.lastSync = new Date().toISOString();
        saveData();
        
        syncText.textContent = '已同步';
        document.getElementById('syncDot').classList.remove('offline');
    } catch (error) {
        console.error('Sync error:', error);
        syncText.textContent = '同步失败';
        document.getElementById('syncDot').classList.add('offline');
        alert('同步失败：' + error.message);
    } finally {
        syncStatus.classList.remove('syncing');
    }
}

async function createGist() {
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            description: '羽线追踪 - 羽毛球球线消耗记录',
            public: false,
            files: {
                'badminton-string-tracker.json': {
                    content: JSON.stringify(appData, null, 2)
                }
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建 Gist 失败');
    }

    const data = await response.json();
    settings.gistId = data.id;
    saveSettingsLocal();
}

async function updateGist() {
    const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${settings.githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            files: {
                'badminton-string-tracker.json': {
                    content: JSON.stringify(appData, null, 2)
                }
            }
        })
    });

    if (!response.ok) {
        if (response.status === 404) {
            // Gist 不存在，创建新的
            settings.gistId = '';
            return createGist();
        }
        const error = await response.json();
        throw new Error(error.message || '更新 Gist 失败');
    }
}

async function loadFromGist() {
    if (!settings.githubToken || !settings.gistId) return;

    try {
        const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
            headers: {
                'Authorization': `Bearer ${settings.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('获取 Gist 失败');
        }

        const data = await response.json();
        const file = data.files['badminton-string-tracker.json'];
        
        if (file && file.content) {
            const remoteData = JSON.parse(file.content);
            
            // 合并数据（简单的本地优先策略）
            if (remoteData.rackets) {
                // 如果远程数据更新，使用远程数据
                const remoteTime = new Date(remoteData.lastSync || 0);
                const localTime = new Date(appData.lastSync || 0);
                
                if (remoteTime > localTime) {
                    appData = remoteData;
                    saveData();
                    updateUI();
                }
            }
        }
    } catch (error) {
        console.error('Load from gist error:', error);
    }
}

// ==================== 数据导出 ====================

function exportData() {
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
