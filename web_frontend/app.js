const API_BASE_URL = 'http://127.0.0.1:8000';

let token = localStorage.getItem('planflow_token');
let totalCoins = 0;
let currentTask = null;
let currentTaskElementBtn = null;
let activeProjectId = null;

// DOM
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSwitchLink = document.getElementById('auth-switch-link');
const authSubmitBtn = document.getElementById('auth-submit-btn');

const projectListEl = document.getElementById('project-list');
const newProjectBtn = document.getElementById('new-project-btn');
const coinCountEl = document.getElementById('coin-count');

const setupSection = document.getElementById('setup-section');
const roadmapSection = document.getElementById('roadmap-section');
const roadmapForm = document.getElementById('roadmap-form');
const generateBtn = document.getElementById('generate-btn');
const currentTargetTitle = document.getElementById('current-target-title');
const roadmapContent = document.getElementById('roadmap-content');
const countdownTimer = document.getElementById('countdown-timer');
const countdownDisplay = document.getElementById('countdown-display');

let countdownInterval;
const modal = document.getElementById('progress-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const analysisResult = document.getElementById('analysis-result');
const userProgressText = document.getElementById('user-progress-text');
const authRemember = document.getElementById('auth-remember');
const rememberMeContainer = document.getElementById('remember-me-container');
const logoutBtn = document.getElementById('logout-btn');
const hamburgerMenu = document.getElementById('hamburger-menu');

let isLoginMode = true;

// Init: Always show login screen
authOverlay.classList.remove('hidden');
hamburgerMenu.classList.add('hidden');

// Pre-fill remembered credentials
const savedEmail = localStorage.getItem('planflow_saved_email');
const savedPassword = localStorage.getItem('planflow_saved_password');
if (savedEmail && savedPassword) {
    document.getElementById('auth-email').value = savedEmail;
    document.getElementById('auth-password').value = savedPassword;
    authRemember.checked = true;
}

// Auth Handlers
authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
    authSwitchLink.innerText = isLoginMode ? 'Kayıt Ol' : 'Giriş Yap';
    authSubmitBtn.querySelector('.btn-text').innerText = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
    
    if (isLoginMode) {
        rememberMeContainer.classList.remove('hidden');
    } else {
        rememberMeContainer.classList.add('hidden');
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    const endpoint = isLoginMode ? '/login' : '/register';
    setLoading(authSubmitBtn, true);

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.detail || 'Auth Error');
        
        // Remember Me Logic
        if (isLoginMode && authRemember.checked) {
            localStorage.setItem('planflow_saved_email', email);
            localStorage.setItem('planflow_saved_password', password);
        } else {
            localStorage.removeItem('planflow_saved_email');
            localStorage.removeItem('planflow_saved_password');
        }

        token = data.access_token;
        localStorage.setItem('planflow_token', token);
        authOverlay.classList.add('hidden');
        hamburgerMenu.classList.remove('hidden');
        loadUserAndProjects();
    } catch (err) {
        alert(err.message);
    } finally {
        setLoading(authSubmitBtn, false);
    }
});

async function authFetch(url, options = {}) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, options);
    if(res.status === 401) {
        token = null;
        localStorage.removeItem('planflow_token');
        authOverlay.classList.remove('hidden');
        hamburgerMenu.classList.add('hidden');
    }
    return res;
}

// Logout Handler
logoutBtn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('planflow_token');
    authOverlay.classList.remove('hidden');
    hamburgerMenu.classList.add('hidden');
    // Clear the active project UI
    setupSection.classList.add('hidden');
    roadmapSection.classList.add('hidden');
});

// Data Loaders
async function loadUserAndProjects() {
    try {
        const meRes = await authFetch(`${API_BASE_URL}/me`);
        const meData = await meRes.json();
        totalCoins = meData.total_coins;
        coinCountEl.innerText = totalCoins;

        const projRes = await authFetch(`${API_BASE_URL}/projects`);
        const projects = await projRes.json();
        
        projectListEl.innerHTML = '';
        projects.forEach(p => {
            const li = document.createElement('li');
            li.className = 'project-item';
            li.innerHTML = `
                ${p.title}
                <div class="project-tooltip">%${p.completion_percentage} Tamamlandı</div>
            `;
            li.onclick = () => loadProject(p.id);
            projectListEl.appendChild(li);
        });

        if(projects.length > 0 && !activeProjectId) {
            loadProject(projects[0].id);
        } else if (projects.length === 0) {
            setupSection.classList.remove('hidden');
            roadmapSection.classList.add('hidden');
        }
    } catch (e) { console.error(e); }
}

async function loadProject(id) {
    activeProjectId = id;
    setupSection.classList.add('hidden');
    roadmapSection.classList.remove('hidden');
    roadmapContent.innerHTML = '<div class="loader" style="margin: 2rem auto; border-top-color: var(--primary-color)"></div>';

    try {
        const res = await authFetch(`${API_BASE_URL}/projects/${id}`);
        const data = await res.json();
        renderRoadmap(data);
    } catch (e) { console.error(e); }
}

newProjectBtn.addEventListener('click', () => {
    setupSection.classList.remove('hidden');
    roadmapSection.classList.add('hidden');
});

// Roadmap Form
roadmapForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(generateBtn, true);

    const target = document.getElementById('target').value;
    const duration = document.getElementById('duration').value;
    const daily_time = document.getElementById('daily_time').value;
    const level = document.getElementById('level').value;

    try {
        const res = await authFetch(`${API_BASE_URL}/generate-roadmap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, duration: parseInt(duration), daily_time: parseInt(daily_time), level })
        });
        const data = await res.json();
        renderRoadmap(data);
        setupSection.classList.add('hidden');
        roadmapSection.classList.remove('hidden');
        loadUserAndProjects(); // reload sidebar
    } catch (error) {
        alert("Hata oluştu.");
    } finally {
        setLoading(generateBtn, false);
    }
});

// Render
function renderRoadmap(data) {
    currentTargetTitle.innerText = data.target;
    roadmapContent.innerHTML = '';

    // Effort Tracking
    if (data.total_minutes !== undefined) {
        document.getElementById('effort-display').classList.remove('hidden');
        const formatMins = (m) => {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            return `${h}s ${rm}dk`;
        };
        document.getElementById('effort-text').innerText = `${formatMins(data.completed_minutes)} / ${formatMins(data.total_minutes)}`;
    }

    // Timer Logic
    if (countdownInterval) clearInterval(countdownInterval);
    if (data.created_at && data.duration) {
        countdownTimer.classList.remove('hidden');
        const endDate = new Date(data.created_at).getTime() + (data.duration * 24 * 60 * 60 * 1000);
        
        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownDisplay.innerText = "Süre Doldu!";
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            countdownDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 300;">GÜN</span>
                    <span style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">${days}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 300;">SAAT</span>
                    <span style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">${hours}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 300;">DAKİKA</span>
                    <span style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">${minutes}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 300;">SANİYE</span>
                    <span style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">${seconds}</span>
                </div>
            `;
        }, 1000);
    }

    data.roadmap.forEach(phase => {
        const phaseEl = document.createElement('div');
        phaseEl.className = 'phase-card fade-in';
        phaseEl.innerHTML = `<h3 class="phase-title">${phase.phase_name}</h3>`;

        phase.tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            
            let btnHTML = task.completed 
                ? `<button class="task-action-btn completed">Tamamlandı ✅</button>`
                : `<button class="task-action-btn" onclick="openProgressModal(${task.id}, '${task.title}', '${task.actionable_step}')">İlerlemeyi Gir</button>`;

            let subtasksHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHTML = `<div class="subtasks-list">`;
                task.subtasks.forEach(st => {
                    subtasksHTML += `
                        <div class="subtask-item">
                            <div class="subtask-info">
                                <h5>${st.title}</h5>
                                <p>${st.actionable_step}</p>
                                <div style="margin-top: 4px;">
                                    <span style="font-size: 0.75rem; color: #818cf8; margin-right: 10px;">⏱️ ${st.estimated_minutes} Dk</span>
                                    <span style="font-size: 0.75rem; color: var(--accent-color)">🪙 ${st.coin_reward} Coin</span>
                                </div>
                            </div>
                            <button class="subtask-btn ${st.completed ? 'completed' : ''}" onclick="completeSubtask(${st.id}, this)">
                                ${st.completed ? 'Bitti' : 'Tamamla'}
                            </button>
                        </div>
                    `;
                });
                subtasksHTML += `</div>`;
            }

            taskEl.innerHTML = `
                <div class="task-header">
                    <div class="task-info">
                        <h4>${task.title} <span class="task-completion">%${task.completion_percentage}</span></h4>
                        <p>${task.actionable_step}</p>
                        <div style="margin-top: 0.5rem; display: flex; gap: 10px; align-items: center;">
                            <span style="font-size: 0.85rem; color: #818cf8; background: rgba(129, 140, 248, 0.1); padding: 0.2rem 0.6rem; border-radius: 12px;">⏱️ ${task.estimated_minutes} Dk Efor</span>
                            <div class="task-reward">🪙 ${task.coin_reward} Coin</div>
                        </div>
                    </div>
                    ${btnHTML}
                </div>
                ${subtasksHTML}
            `;
            phaseEl.appendChild(taskEl);
        });
        roadmapContent.appendChild(phaseEl);
    });
}

async function completeSubtask(id, btnElement) {
    if(btnElement.classList.contains('completed')) return;
    try {
        const res = await authFetch(`${API_BASE_URL}/complete-subtask?subtask_id=${id}`, { method: 'POST' });
        const data = await res.json();
        if(data.success) {
            btnElement.classList.add('completed');
            btnElement.innerText = 'Bitti';
            totalCoins += data.earned_coins;
            coinCountEl.innerText = totalCoins;
        }
    } catch (e) { console.error(e); }
}

function openProgressModal(taskId, title, actionStep) {
    currentTask = taskId;
    document.getElementById('modal-task-title').innerText = title;
    document.getElementById('modal-task-action').innerText = "Beklenen: " + actionStep;
    modal.classList.remove('hidden');
    userProgressText.value = '';
    analysisResult.classList.add('hidden');
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    loadProject(activeProjectId); // refresh roadmap to show new subtasks
});

analyzeBtn.addEventListener('click', async () => {
    const text = userProgressText.value.trim();
    if(!text) return;

    setLoading(analyzeBtn, true);
    analysisResult.classList.add('hidden');

    try {
        const res = await authFetch(`${API_BASE_URL}/analyze-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: currentTask, user_text: text })
        });
        const result = await res.json();
        
        document.getElementById('res-status').innerText = result.status === 'completed' ? 'Tamamlandı! 🎉' : 'Kısmen Tamamlandı 🚀';
        document.getElementById('res-status').style.color = result.status === 'completed' ? '#10b981' : '#f59e0b';
        setTimeout(() => { document.getElementById('res-progress-bar').style.width = `${result.completion_percentage}%`; }, 100);
        document.getElementById('res-completion').innerText = `%${result.completion_percentage} Tamamlandı`;
        document.getElementById('res-feedback').innerText = result.feedback;
        
        if(result.earned_coins > 0) {
            totalCoins += result.earned_coins;
            coinCountEl.innerText = totalCoins;
        }
        
        analysisResult.classList.remove('hidden');
    } catch (e) {
        alert("Analiz başarısız.");
    } finally {
        setLoading(analyzeBtn, false);
    }
});

function setLoading(btn, isLoading) {
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.loader');
    if(isLoading) {
        btn.disabled = true;
        textEl.classList.add('hidden');
        loaderEl.classList.remove('hidden');
    } else {
        btn.disabled = false;
        textEl.classList.remove('hidden');
        loaderEl.classList.add('hidden');
    }
}
