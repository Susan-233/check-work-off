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
    const dayOfWeek = now.getDay(); // 0是周日，1-6是周一到周六
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let targetDate = new Date();
    let countdownTitle = '';
    
    // 工作日（周一到周四）或周五未下班
    if ((dayOfWeek >= 1 && dayOfWeek <= 4) || 
        (dayOfWeek === 5 && (currentHour < 18 || (currentHour === 18 && currentMinute === 0)))) {
        countdownTitle = '距离周末还有';
        // 设置目标时间为本周五下班时间
        targetDate.setDate(targetDate.getDate() + (5 - dayOfWeek));
        targetDate.setHours(18, 0, 0, 0);
    } else {
        countdownTitle = '距离周一还有';
        // 如果是周五下班后、周六或周日，计算到下周一零点
        targetDate.setDate(targetDate.getDate() + ((8 - dayOfWeek) % 7));
        targetDate.setHours(0, 0, 0, 0);
    }

    const diff = targetDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // 更新标题和倒计时
    document.getElementById('countdown-title').textContent = countdownTitle;
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

    // 示显时薪
    document.getElementById('hourly-rate').textContent = 
        `时薪: ¥${hourlyRate.toFixed(2)}/小时`;

    // 计算当前进度和收入
    let progress = 0;
    let earned = 0;

    if (now >= workStart && now <= workEnd) {
        const elapsedMinutes = (now - workStart) / (1000 * 60);
        progress = (elapsedMinutes / totalWorkMinutes) * 100;
        earned = (elapsedMinutes / 60) * hourlyRate;
    } else if (now > workEnd) {
        progress = 100;
        earned = hourlyRate * (totalWorkMinutes / 60);
    }

    // 更新界面
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${progress.toFixed(1)}%`;
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

// 添加获取古诗的函数
async function fetchPoem() {
    try {
        const response = await fetch('https://v1.jinrishici.com/all.json');
        const data = await response.json();
        return {
            content: data.content,
            author: data.author || '佚名',  // 如果没有作者信息则显示"佚名"
            title: data.origin || ''        // 如果没有标题则留空
        };
    } catch (error) {
        console.error('获取诗词失败:', error);
        return {
            content: '人生天地间，忽如远行客。',
            author: '李白',
            title: '春夜宴从弟桃花园序'
        }; // 网络请求失败时返回默认诗句
    }
}

// 更新诗词显示
async function updatePoem() {
    const poemContainer = document.getElementById('poem-container');
    if (!poemContainer) return;  // 确保元素存在
    
    const poem = await fetchPoem();
    poemContainer.innerHTML = `
        <p class="poem-text">${poem.content}</p>
        <p class="poem-author">——${poem.author}${poem.title ? `《${poem.title}》` : ''}</p>
    `;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    initializeSettings();
    updateTimeDisplay();
    updateWeekendCountdown();
    updateWorkProgress();
    await updatePoem();  // 添加诗词更新

    // 每分钟更新一次
    setInterval(() => {
        updateTimeDisplay();
        updateWeekendCountdown();
        updateWorkProgress();
    }, 60000);
}); 