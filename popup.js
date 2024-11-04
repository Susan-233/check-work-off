// 默认设置
const DEFAULT_SETTINGS = {
    monthlySalary: 0,
    workingDays: 22,
    workStart: '09:00',
    workEnd: '18:00',
    hasBreak: true,
    breakStart: '12:00',
    breakEnd: '13:00'
};

// 加载设置
async function loadSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || DEFAULT_SETTINGS;
}

// 更新时间显示
function updateTimeDisplay() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    timeElement.textContent = now.toLocaleTimeString('zh-CN');
    dateElement.textContent = now.toLocaleDateString('zh-CN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// 计算周末倒计时
function updateWeekendCountdown() {
    const now = new Date();
    const friday = new Date();
    friday.setDate(friday.getDate() + (5 - friday.getDay()));
    friday.setHours(18, 0, 0, 0);

    const diff = friday - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById('weekend-countdown').textContent = 
        `${days}天${hours}小时${minutes}分钟`;
}

// 计算工作进度和收入
async function updateWorkProgress() {
    const settings = await loadSettings();
    const now = new Date();
    const workStart = new Date(now);
    const workEnd = new Date(now);
    
    // 设置工作开始和结束时间
    const [startHour, startMin] = settings.workStart.split(':');
    const [endHour, endMin] = settings.workEnd.split(':');
    workStart.setHours(parseInt(startHour), parseInt(startMin), 0);
    workEnd.setHours(parseInt(endHour), parseInt(endMin), 0);

    // 计算工作时长（考虑午休）
    let totalWorkMinutes = (workEnd - workStart) / (1000 * 60);
    if (settings.hasBreak) {
        const [breakStartHour, breakStartMin] = settings.breakStart.split(':');
        const [breakEndHour, breakEndMin] = settings.breakEnd.split(':');
        const breakMinutes = (parseInt(breakEndHour) * 60 + parseInt(breakEndMin)) -
                           (parseInt(breakStartHour) * 60 + parseInt(breakStartMin));
        totalWorkMinutes -= breakMinutes;
    }

    // 计算时薪
    const dailySalary = settings.monthlySalary / settings.workingDays;
    const hourlyRate = dailySalary / (totalWorkMinutes / 60);

    // 计算当前进度和收入
    let progress = 0;
    let earned = 0;

    if (now < workStart) {
        // 未开始工作
        progress = 0;
        earned = 0;
    } else if (now > workEnd) {
        // 已结束工作
        progress = 100;
        earned = dailySalary;
    } else {
        // 工作中
        let elapsedMinutes = (now - workStart) / (1000 * 60);
        
        // 如果有午休且现在在午休时间，调整计算
        if (settings.hasBreak) {
            const breakStart = new Date(now);
            const breakEnd = new Date(now);
            const [breakStartHour, breakStartMin] = settings.breakStart.split(':');
            const [breakEndHour, breakEndMin] = settings.breakEnd.split(':');
            breakStart.setHours(parseInt(breakStartHour), parseInt(breakStartMin), 0);
            breakEnd.setHours(parseInt(breakEndHour), parseInt(breakEndMin), 0);
            
            if (now >= breakStart && now <= breakEnd) {
                // 在午休时间
                elapsedMinutes = (breakStart - workStart) / (1000 * 60);
            } else if (now > breakEnd) {
                // 午休后
                const breakDuration = (breakEnd - breakStart) / (1000 * 60);
                elapsedMinutes -= breakDuration;
            }
        }

        progress = (elapsedMinutes / totalWorkMinutes) * 100;
        earned = (elapsedMinutes / 60) * hourlyRate;
    }

    // 确保进度在0-100之间
    progress = Math.max(0, Math.min(100, progress));
    
    // 更新界面
    document.getElementById('progress-fill').style.width = `${progress.toFixed(1)}%`;
    document.getElementById('progress-text').textContent = `完成进度: ${progress.toFixed(1)}%`;
    document.getElementById('earned-money').textContent = `今日已赚: ¥${earned.toFixed(2)}`;
}

// 设置相关函数
function initializeSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const saveBtn = document.getElementById('save-settings');
    const hasBreakCheckbox = document.getElementById('has-break');

    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    hasBreakCheckbox.addEventListener('change', (e) => {
        document.getElementById('break-start').disabled = !e.target.checked;
        document.getElementById('break-end').disabled = !e.target.checked;
    });

    saveBtn.addEventListener('click', async () => {
        const settings = {
            monthlySalary: parseFloat(document.getElementById('monthly-salary').value),
            workingDays: parseInt(document.getElementById('working-days').value),
            workStart: document.getElementById('work-start').value,
            workEnd: document.getElementById('work-end').value,
            hasBreak: document.getElementById('has-break').checked,
            breakStart: document.getElementById('break-start').value,
            breakEnd: document.getElementById('break-end').value
        };

        await chrome.storage.local.set({ settings });
        settingsPanel.classList.add('hidden');
        updateWorkProgress();
    });

    // 加载已保存的设置
    loadSettings().then(settings => {
        document.getElementById('monthly-salary').value = settings.monthlySalary;
        document.getElementById('working-days').value = settings.workingDays;
        document.getElementById('work-start').value = settings.workStart;
        document.getElementById('work-end').value = settings.workEnd;
        document.getElementById('has-break').checked = settings.hasBreak;
        document.getElementById('break-start').value = settings.breakStart;
        document.getElementById('break-end').value = settings.breakEnd;
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    updateTimeDisplay();
    updateWeekendCountdown();
    updateWorkProgress();

    // 每分钟更新一次
    setInterval(() => {
        updateTimeDisplay();
        updateWeekendCountdown();
        updateWorkProgress();
    }, 60000);
}); 