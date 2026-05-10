const API_BASE_URL = 'http://127.0.0.1:8000';

let token = localStorage.getItem('planflow_token');
let totalCoins = 0;
let currentProjectCoins = 0;
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

// New DOM elements
const topStatusBar = document.getElementById('top-status-bar');
const topCountdown = document.getElementById('top-countdown');
const topEffort = document.getElementById('top-effort');
const topStages = document.getElementById('top-stages');

const groupFirstname = document.getElementById('group-firstname');
const groupLastname = document.getElementById('group-lastname');
const authFirstname = document.getElementById('auth-firstname');
const authLastname = document.getElementById('auth-lastname');

const sidebarCoinCount = document.getElementById('sidebar-coin-count');
const profileBtn = document.getElementById('profile-btn');
const profileSection = document.getElementById('profile-section');
const profileFirstname = document.getElementById('profile-firstname');
const profileLastname = document.getElementById('profile-lastname');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileProjectsList = document.getElementById('profile-projects-list');

let allUserProjects = [];

function updateCoinDisplay() {
    if(sidebarCoinCount) sidebarCoinCount.innerText = totalCoins;
    if(coinCountEl) {
        if(activeProjectId !== null) {
            coinCountEl.innerText = currentProjectCoins;
        } else {
            coinCountEl.innerText = totalCoins;
        }
    }
}

function updateCoinCount(val) {
    totalCoins = val;
    updateCoinDisplay();
}

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
        groupFirstname.classList.add('hidden');
        groupLastname.classList.add('hidden');
        authFirstname.removeAttribute('required');
        authLastname.removeAttribute('required');
    } else {
        rememberMeContainer.classList.add('hidden');
        groupFirstname.classList.remove('hidden');
        groupLastname.classList.remove('hidden');
        authFirstname.setAttribute('required', 'true');
        authLastname.setAttribute('required', 'true');
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    let bodyData = { email, password };
    if (!isLoginMode) {
        bodyData.first_name = authFirstname.value;
        bodyData.last_name = authLastname.value;
    }
    
    const endpoint = isLoginMode ? '/login' : '/register';
    setLoading(authSubmitBtn, true);

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
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
    topStatusBar.classList.add('hidden');
    // Clear the active project UI
    setupSection.classList.add('hidden');
    roadmapSection.classList.add('hidden');
    profileSection.classList.add('hidden');
});

// Data Loaders
async function loadUserAndProjects(skipShowProfile = false) {
    try {
        const meRes = await authFetch(`${API_BASE_URL}/me`);
        const meData = await meRes.json();
        updateCoinCount(meData.total_coins || 0);
        if (groupFirstname && meData.first_name) groupFirstname.innerText = meData.first_name;
        if (groupLastname && meData.last_name) groupLastname.innerText = meData.last_name;

        const projRes = await authFetch(`${API_BASE_URL}/projects`);
        const projects = await projRes.json();
        allUserProjects = projects;
        
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

        if (!skipShowProfile) {
            showProfileSection();
        }
    } catch (e) { console.error(e); }
}

async function loadProject(id) {
    activeProjectId = id;
    setupSection.classList.add('hidden');
    profileSection.classList.add('hidden');
    roadmapSection.classList.remove('hidden');
    topStatusBar.classList.remove('hidden');
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
    profileSection.classList.add('hidden');
    topStatusBar.classList.add('hidden');
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
        if (!res.ok) throw new Error(data.detail || 'API Hatası');
        renderRoadmap(data);
        setupSection.classList.add('hidden');
        profileSection.classList.add('hidden');
        roadmapSection.classList.remove('hidden');
        topStatusBar.classList.remove('hidden');
        loadUserAndProjects(true); // reload sidebar
    } catch (error) {
        console.error(error);
        alert("Hata oluştu: " + error.message);
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
        const formatMins = (m) => {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            return `${h}s ${rm}dk`;
        };
        topEffort.innerText = `${formatMins(data.completed_minutes)} / ${formatMins(data.total_minutes)}`;
    }

    // Timer Logic
    if (countdownInterval) clearInterval(countdownInterval);
    if (data.created_at && data.duration) {
        const endDate = new Date(data.created_at).getTime() + (data.duration * 24 * 60 * 60 * 1000);
        
        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endDate - now;
            
            if (distance < 0) {
                clearInterval(countdownInterval);
                topCountdown.innerText = "Süre Doldu!";
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            topCountdown.innerText = `${days}G ${hours}S ${minutes}D ${seconds}S`;
        }, 1000);
    }

    // Top Stages
    topStages.innerHTML = '';
    data.roadmap.forEach((phase, index) => {
        let totalPhaseTasks = phase.tasks.length;
        let completedPhaseTasks = phase.tasks.filter(t => t.completed).length;
        let phaseCompletion = totalPhaseTasks > 0 ? Math.round((completedPhaseTasks / totalPhaseTasks) * 100) : 0;
        
        const dot = document.createElement('div');
        dot.className = 'stage-dot';
        dot.innerText = index + 1;
        if(phaseCompletion === 100) {
            dot.style.background = 'var(--success-color)';
            dot.style.borderColor = 'var(--success-color)';
        }
        
        dot.innerHTML += `<div class="stage-tooltip">${phase.phase_name} - %${phaseCompletion} Tamamlandı</div>`;
        topStages.appendChild(dot);
    });

    currentProjectCoins = 0;

    data.roadmap.forEach((phase, phaseIndex) => {
        const phaseEl = document.createElement('div');
        phaseEl.className = 'phase-card fade-in';
        
        let totalPhaseTasks = phase.tasks.length;
        let completedPhaseTasks = phase.tasks.filter(t => t.completed).length;
        let phaseCompletion = totalPhaseTasks > 0 ? Math.round((completedPhaseTasks / totalPhaseTasks) * 100) : 0;
        let isCompleted = phaseCompletion === 100;
        let titleText = phase.phase_name + (isCompleted ? ' ✅' : '');

        phaseEl.innerHTML = `
            <div class="phase-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <h3 class="phase-title" style="border: none; margin: 0; padding: 0;">${titleText}</h3>
                <span class="phase-toggle-icon" style="font-size: 0.8rem; color: var(--text-muted);">${phaseIndex === 0 ? '▲' : '▼'}</span>
            </div>
            <div class="phase-tasks-container ${phaseIndex === 0 ? '' : 'hidden'}"></div>
        `;
        
        const tasksContainer = phaseEl.querySelector('.phase-tasks-container');
        const phaseHeader = phaseEl.querySelector('.phase-header');
        const toggleIcon = phaseEl.querySelector('.phase-toggle-icon');
        
        phaseHeader.addEventListener('click', () => {
            tasksContainer.classList.toggle('hidden');
            if(tasksContainer.classList.contains('hidden')) {
                toggleIcon.innerText = '▼';
            } else {
                toggleIcon.innerText = '▲';
            }
        });

        phase.tasks.forEach(task => {
            if(task.completed) currentProjectCoins += task.coin_reward;
            
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            
            let btnHTML = task.completed 
                ? `<button class="task-action-btn completed">Tamamlandı ✅</button>`
                : `<button class="task-action-btn" onclick="openProgressModal(${task.id}, '${task.title}', '${task.actionable_step}')">İlerlemeyi Gir</button>`;

            let subtasksHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHTML = `<div class="subtasks-list">`;
                task.subtasks.forEach(st => {
                    if(st.completed) currentProjectCoins += st.coin_reward;
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
            tasksContainer.appendChild(taskEl);
        });
        roadmapContent.appendChild(phaseEl);
    });
    updateCoinDisplay();
}

async function completeSubtask(id, btnElement) {
    if(btnElement.classList.contains('completed')) return;
    try {
        const res = await authFetch(`${API_BASE_URL}/complete-subtask?subtask_id=${id}`, { method: 'POST' });
        const data = await res.json();
        if(data.success) {
            btnElement.classList.add('completed');
            btnElement.innerText = 'Bitti';
            currentProjectCoins += data.earned_coins;
            updateCoinCount(totalCoins + data.earned_coins);
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
        if (!res.ok) throw new Error(result.detail || 'Analiz başarısız');
        
        document.getElementById('res-status').innerText = result.status === 'completed' ? 'Tamamlandı! 🎉' : 'Kısmen Tamamlandı 🚀';
        document.getElementById('res-status').style.color = result.status === 'completed' ? '#10b981' : '#f59e0b';
        setTimeout(() => { document.getElementById('res-progress-bar').style.width = `${result.completion_percentage}%`; }, 100);
        document.getElementById('res-completion').innerText = `%${result.completion_percentage} Tamamlandı`;
        document.getElementById('res-feedback').innerText = result.feedback;
        
        if(result.earned_coins > 0) {
            currentProjectCoins += result.earned_coins;
            updateCoinCount(totalCoins + result.earned_coins);
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

// Profile Actions
async function deleteProject(id) {
    try {
        const res = await authFetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
        if(res.ok) {
            activeProjectId = null;
            await loadUserAndProjects();
        } else {
            alert('Proje silinemedi.');
        }
    } catch(e) { console.error(e); }
}

async function showProfileSection() {
    activeProjectId = null;
    updateCoinDisplay();
    setupSection.classList.add('hidden');
    roadmapSection.classList.add('hidden');
    topStatusBar.classList.add('hidden');
    profileSection.classList.remove('hidden');

    try {
        const meRes = await authFetch(`${API_BASE_URL}/me`);
        if(meRes.ok) {
            const meData = await meRes.json();
            profileFirstname.value = meData.first_name || '';
            profileLastname.value = meData.last_name || '';
        }
    } catch(e) {}
    
    profileProjectsList.innerHTML = '';
    if(allUserProjects.length === 0) {
        profileProjectsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Henüz hiç proje oluşturmadınız.</p>';
    } else {
        allUserProjects.forEach(p => {
            const card = document.createElement('div');
            card.className = 'profile-project-card';
            card.style.cursor = 'pointer';
            card.onclick = () => loadProject(p.id);
            card.innerHTML = `
                <div class="profile-project-header">
                    <span class="profile-project-title">${p.title}</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="profile-project-progress-text">%${p.completion_percentage} Tamamlandı</span>
                        <button class="sm-btn logout-btn delete-btn" style="width: auto; padding: 0.3rem 0.8rem;" data-id="${p.id}">Sil</button>
                    </div>
                </div>
                <div class="profile-project-bar-container">
                    <div class="profile-project-bar" style="width: ${p.completion_percentage}%;"></div>
                </div>
            `;
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if(confirm('Projeyi silmek istediğinize emin misiniz?')) {
                    const btn = e.target;
                    btn.innerText = 'Siliniyor...';
                    await deleteProject(p.id);
                }
            };
            profileProjectsList.appendChild(card);
        });
    }
}

profileBtn.addEventListener('click', () => {
    showProfileSection();
    hamburgerMenu.classList.remove('open'); // close menu if any
});

saveProfileBtn.addEventListener('click', async () => {
    const btn = saveProfileBtn;
    const oldText = btn.innerText;
    btn.innerText = 'Kaydediliyor...';
    btn.disabled = true;
    
    try {
        const res = await authFetch(`${API_BASE_URL}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: profileFirstname.value,
                last_name: profileLastname.value
            })
        });
        if(res.ok) {
            btn.innerText = 'Başarılı!';
            if (groupFirstname) groupFirstname.innerText = profileFirstname.value;
            if (groupLastname) groupLastname.innerText = profileLastname.value;
        } else {
            btn.innerText = 'Hata!';
        }
    } catch(e) {
        btn.innerText = 'Hata!';
    }
    
    setTimeout(() => {
        btn.innerText = oldText;
        btn.disabled = false;
    }, 1500);
});

