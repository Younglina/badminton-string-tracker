/**
 * 羽线追踪 - 羽毛球球线消耗记录应用
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
}

function deleteRacket(id, event) {
    event.stopPropagation();
    if (confirm('确定要删除这个球拍吗？所有记录也将被删除。')) {
        appData.rackets = appData.rackets.filter(r => r.id !== id);
        if (currentRacketId === id) {
            currentRacketId = null;
        }
        saveData();
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
}

function deleteRecord(racketId, recordId) {
    if (confirm('确定要删除这条记录吗？')) {
        const racket = appData.rackets.find(r => r.id === racketId);
        if (racket) {
            racket.records = racket.records.filter(r => r.id !== recordId);
            saveData();
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

// ==================== 数据导入导出 ====================

// 导出数据到剪贴板
async function exportDataToClipboard() {
    const dataStr = JSON.stringify(appData, null, 2);
    
    try {
        await navigator.clipboard.writeText(dataStr);
        alert('数据已复制到剪贴板！\n\n你可以：\n1. 粘贴到微信/QQ 发送给自己\n2. 粘贴到备忘录保存\n3. 粘贴到其他设备导入');
    } catch (err) {
        console.error('复制失败:', err);
        // 降级方案：显示文本框让用户手动复制
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

// 导出数据到文件
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

// 从文本导入数据
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
        
        // 确认导入
        const racketCount = importedData.rackets.length;
        if (confirm(`确定要导入数据吗？\n\n包含 ${racketCount} 个球拍记录\n当前数据将被替换。`)) {
            appData = importedData;
            appData.lastSync = new Date().toISOString();
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

// 从文件导入数据
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
                appData.lastSync = new Date().toISOString();
                saveData();
                updateUI();
                closeModal('settingsModal');
                alert('数据导入成功！');
            }
        } catch (error) {
            alert('导入失败：' + error.message);
        }
        input.value = ''; // 重置 input
    };
    reader.readAsText(file);
}

// 清空所有数据
function clearAllData() {
    if (confirm('⚠️ 警告\n\n确定要清空所有数据吗？\n此操作不可恢复！\n\n建议先导出备份。')) {
        if (confirm('再次确认：真的要删除所有数据吗？')) {
            appData = {
                rackets: [],
                lastSync: null
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
