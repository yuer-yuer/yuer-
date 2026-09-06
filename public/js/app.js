/**
 * 减脂健康助手 - 核心应用逻辑
 * SPA 路由、API 调用、Tab 切换、数据管理
 */

// ─── 全局状态 ──────────────────────────────────────
const AppState = {
  user: null,
  profile: null,
  customFoods: [],
  todayFood: [],
  todayExercise: [],
  todayWater: [],
  weightRecords: [],
  checkinCalendar: {
    month: null,
    checkinDates: [],
    streak: 0,
  },
  planPreview: null,
  frequentFoods: [],
  currentTab: 'dashboard',
  mealPicker: {
    meal: null,
    category: 'all',
  },
  aiFood: {
    foods: [],
    summary: '',
  },
  canIEat: {
    loading: false,
    result: null,
    sourceFoods: [],
    photoMode: false,
    estimateMode: false,
  },
  aiCoach: {
    messages: [],
    quickPrompts: [],
    loading: false,
    dragged: false,
    nudgeTimer: null,
    nudgeInterval: null,
    lastNudgeAt: 0,
    selectedAgent: null,  // null = 自动路由, 'nutrition_agent', 'fitness_agent'
    sessionId: null,      // 会话ID
    lastAgent: null,      // 最后使用的Agent
    lastKnowledge: 0,     // 最后使用的知识条数
  },
  dailyPlan: {
    tasks: [],
    expireTimer: null,
    lastDeleted: null,
    pendingAiTasks: [],
  },
  aiCameraStream: null,
  frequentExercises: [],
  onboarding: {
    step: 1,
    data: {},
    errors: {},
    submitting: false,
  },
  exercisePicker: {
    category: 'all',
    selected: null,
    duration: 30,
  },
  exerciseTimer: {
    active: false,
    paused: false,
    mode: 'countdown',
    exercise: null,
    targetSeconds: 0,
    elapsedSeconds: 0,
    preStartRemaining: 0,
    intervalId: null,
    startedAt: null,
    lastVoiceAt: 0,
    lastMinuteSpoken: 0,
    nextMotivationAt: 0,
    summary: null,
  },
  voiceEnabled: true,
  exerciseVoices: [],
  selectedVoiceURI: '',
  exerciseStats: null,
  registerAvatarUrl: '',
};

// ─── Tab 配置 ──────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: '概览', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>' },
  { id: 'food', label: '饮食', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>' },
  { id: 'exercise', label: '运动', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' },
  { id: 'me', label: '我的', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A8.966 8.966 0 0112 15c2.21 0 4.236.8 5.879 2.129M15 11a3 3 0 10-6 0 3 3 0 006 0z"/></svg>' },
];

// ─── API 工具 ──────────────────────────────────────
async function api(url, options = {}) {
  try {
    const { suppressError, ...fetchOptions } = options;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...fetchOptions,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    if (res.status === 401) {
      showAuthPage();
      return null;
    }
    if (data.code !== 0 && data.code !== undefined) {
      showToast(data.message || '操作失败', 'error');
      return null;
    }
    return data;
  } catch (e) {
    if (!options.suppressError) showToast('网络错误，请重试', 'error');
    return null;
  }
}

// ─── Toast 提示 ────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-primary-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  toast.className = `${colors[type] || colors.info} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transform transition-all duration-300 translate-x-full opacity-0`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ─── 模态框 ────────────────────────────────────────
function openModal(id) {
  hapticTap();
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderAvatarElement(id, avatarUrl, fallback = '我') {
  const el = document.getElementById(id);
  if (!el) return;
  if (avatarUrl) {
    el.innerHTML = `<img src="${escapeAttr(avatarUrl)}" alt="头像">`;
    el.classList.add('has-avatar-img');
  } else {
    el.textContent = fallback;
    el.classList.remove('has-avatar-img');
  }
}
function closeModal(id) {
  hapticTap(8);
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

function hapticTap(duration = 12) {
  if (navigator.vibrate) navigator.vibrate(duration);
}

function updateStatusbarTime() {
  const el = document.getElementById('statusbar-time');
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function showFunBubble(message) {
  const layer = document.getElementById('app-bubble-layer');
  if (!layer) return;
  const bubble = document.createElement('div');
  bubble.className = 'fun-bubble';
  bubble.textContent = message;
  layer.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1900);
}

function openBrutalPanel(type = 'quick') {
  hapticTap(18);
  const modal = document.getElementById('brutal-modal');
  const title = document.getElementById('brutal-panel-title');
  const kicker = document.getElementById('brutal-panel-kicker');
  const body = document.getElementById('brutal-panel-body');
  if (!modal || !title || !body) return;

  modal.className = 'brutal-modal';
  if (type === 'side') modal.classList.add('side');

  const renderers = {
    quick: renderQuickPanel,
    stack: renderStackPanel,
    plan: renderDailyPlanPanel,
    side: renderSidePanel,
  };
  const content = (renderers[type] || renderQuickPanel)();
  title.textContent = content.title;
  kicker.textContent = content.kicker;
  body.innerHTML = content.html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (type === 'plan') initDailyPlanPanel();
  if (type === 'quick') initUnlockSlider();
}

function closeBrutalPanel() {
  hapticTap(8);
  document.getElementById('brutal-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
  clearInterval(AppState.dailyPlan.expireTimer);
  AppState.dailyPlan.expireTimer = null;
}

function renderQuickPanel() {
  return {
    kicker: 'ACTION HUB',
    title: '操作中心',
    html: `
      <div class="glass-float mb-4">
        <strong>今日作战台</strong>
        <p class="text-sm mt-1">高频操作集中在这里，页面本体只保留核心内容。</p>
      </div>
      <div class="brutal-grid mb-4">
        <button class="brutal-action" onclick="closeBrutalPanel();switchTab('food');showFunBubble('打开饮食记录')"><strong>饮食</strong><span>搜索 / 选食 / 常吃</span></button>
        <button class="brutal-action" onclick="closeBrutalPanel();switchTab('exercise');showFunBubble('打开运动记录')"><strong>运动</strong><span>记录消耗目标</span></button>
        <button class="brutal-action" onclick="closeBrutalPanel();openWaterSheet();addWater(250);showFunBubble('已快速加水 250ml')"><strong>+250ml</strong><span>快速喝水</span></button>
        <button class="brutal-action" onclick="closeBrutalPanel();switchTab('me');openMyPlanSheet()"><strong>目标</strong><span>设置体重计划</span></button>
      </div>
      <div class="brutal-grid mb-4">
        <button class="brutal-action" onclick="openBrutalPanel('stack')"><strong>数据卡堆</strong><span>查看今日概览</span></button>
        <button class="brutal-action" onclick="openBrutalPanel('plan')"><strong>今日计划清单</strong><span>添加 / 完成 / 过期</span></button>
        <button class="brutal-action" onclick="installPwaApp()"><strong>安装 App</strong><span>添加到手机桌面</span></button>
      </div>
      <div class="unlock-track" data-unlock-track>
        <div class="unlock-thumb" data-unlock-thumb>→</div>
        <p class="absolute inset-0 flex items-center justify-center text-sm font-black pointer-events-none">滑动完成今日打卡</p>
      </div>
    `,
  };
}

function renderStackPanel() {
  return {
    kicker: 'STACK CAROUSEL',
    title: '卡片堆叠',
    html: `
      <div class="stack-carousel">
        <div class="stack-card"><p class="text-xs font-black">CALORIES</p><h4 class="text-3xl font-black mt-2">${Math.round(AppState.todayFood.reduce((s,f)=>s+Number(f.total_calories||0),0))}</h4><p class="mt-2">今日摄入 kcal</p></div>
        <div class="stack-card"><p class="text-xs font-black">EXERCISE</p><h4 class="text-3xl font-black mt-2">${Math.round(AppState.todayExercise.reduce((s,e)=>s+Number(e.calories_burned||0),0))}</h4><p class="mt-2">今日运动消耗</p></div>
        <div class="stack-card"><p class="text-xs font-black">WATER</p><h4 class="text-3xl font-black mt-2">${AppState.todayWater.reduce((s,w)=>s+Number(w.amount_ml||0),0)}</h4><p class="mt-2">今日饮水 ml</p></div>
      </div>
    `,
  };
}

function renderDailyPlanPanel() {
  loadDailyPlan();
  refreshDailyPlanExpiry();
  const progress = dailyPlanProgress();
  return {
    kicker: "TODAY'S PLAN",
    title: '今日计划清单',
    html: `
      <button type="button" class="daily-plan-ai-btn" onclick="startXiaoshouPlanGeneration()">🤖 让小瘦制定计划</button>
      <div id="daily-plan-list" class="daily-plan-list"></div>
      <div id="daily-plan-undo-slot"></div>
      <div id="daily-plan-presets" class="daily-plan-presets"></div>
      <form class="daily-plan-add" onsubmit="addDailyPlanFromInput(); return false;">
        <input id="daily-plan-input" type="text" placeholder="添加任务...">
        <input id="daily-plan-deadline" type="time" aria-label="截止时间">
        <button type="submit">添加</button>
      </form>
      <div class="daily-plan-progress">
        <div><i id="daily-plan-progress-bar" style="width:${progress.pct}%"></i></div>
        <span id="daily-plan-progress-text">${progress.label}</span>
      </div>
    `,
  };
}

function renderSidePanel() {
  return {
    kicker: 'SIDE DRAWER',
    title: '侧边控制台',
    html: `
      <details class="glass-float mb-3" open>
        <summary class="font-black cursor-pointer">页面跳转</summary>
        <div class="brutal-grid mt-3">
          ${TABS.map(tab => `<button class="brutal-action" onclick="closeBrutalPanel();switchTab('${tab.id}')"><strong>${tab.label}</strong><span>进入模块</span></button>`).join('')}
        </div>
      </details>
      <details class="glass-float">
        <summary class="font-black cursor-pointer">状态徽标</summary>
        <p class="mt-3 text-sm">连续打卡 <strong>${AppState.checkinCalendar?.streak || 0}</strong> 天，今天继续保持节奏。</p>
      </details>
    `,
  };
}

function dailyPlanDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dailyPlanStorageKey() {
  return `daily_plan_${dailyPlanDateKey()}`;
}

function loadDailyPlan() {
  try {
    const raw = localStorage.getItem(dailyPlanStorageKey());
    AppState.dailyPlan.tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    AppState.dailyPlan.tasks = [];
  }
  refreshDailyPlanExpiry(false);
}

function saveDailyPlan() {
  localStorage.setItem(dailyPlanStorageKey(), JSON.stringify(AppState.dailyPlan.tasks));
}

function refreshDailyPlanExpiry(shouldRender = true) {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  let changed = false;
  AppState.dailyPlan.tasks = AppState.dailyPlan.tasks.map(task => {
    if (task.done || !task.deadline) return task;
    const [h, m] = task.deadline.split(':').map(Number);
    const expired = Number.isFinite(h) && Number.isFinite(m) && nowMinutes > h * 60 + m;
    if (expired !== !!task.expired) changed = true;
    return { ...task, expired };
  });
  if (changed) saveDailyPlan();
  if (shouldRender) renderDailyPlan();
}

function dailyPlanProgress() {
  const total = AppState.dailyPlan.tasks.length;
  const done = AppState.dailyPlan.tasks.filter(task => task.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return {
    done,
    total,
    pct,
    label: total && pct === 100 ? '🎉 全部完成！' : `完成 ${done}/${total} (${pct}%)`,
  };
}

function initDailyPlanPanel() {
  renderDailyPlan();
  clearInterval(AppState.dailyPlan.expireTimer);
  AppState.dailyPlan.expireTimer = setInterval(() => refreshDailyPlanExpiry(true), 60000);
}

function renderDailyPlan() {
  const list = document.getElementById('daily-plan-list');
  const undoSlot = document.getElementById('daily-plan-undo-slot');
  const presets = document.getElementById('daily-plan-presets');
  if (!list || !presets) return;
  refreshDailyPlanExpiry(false);
  const tasks = AppState.dailyPlan.tasks;
  if (!tasks.length) {
    list.innerHTML = '<div class="daily-plan-empty">今天还没有计划，先加一项小目标。</div>';
    presets.innerHTML = `
      <p>💡 常用计划（点击添加）：</p>
      <div>
        <button onclick="addDailyPlanTask('记录三餐', '')">记录三餐</button>
        <button onclick="addDailyPlanTask('喝水2000ml', '20:00')">喝水2000ml</button>
        <button onclick="addDailyPlanTask('运动30分钟', '18:00')">运动30分钟</button>
        <button onclick="addDailyPlanTask('称重记录', '22:00')">称重记录</button>
      </div>
    `;
  } else {
    list.innerHTML = tasks.map(renderDailyPlanTask).join('');
    presets.innerHTML = '';
  }
  if (undoSlot) {
    undoSlot.innerHTML = AppState.dailyPlan.lastDeleted
      ? `<button type="button" class="daily-plan-undo" onclick="undoDeleteDailyPlanTask()">撤销删除：${escapeHtml(AppState.dailyPlan.lastDeleted.text)}</button>`
      : '';
  }
  const progress = dailyPlanProgress();
  const bar = document.getElementById('daily-plan-progress-bar');
  const text = document.getElementById('daily-plan-progress-text');
  if (bar) bar.style.width = `${progress.pct}%`;
  if (text) text.textContent = progress.label;
}

function renderDailyPlanTask(task) {
  const state = task.expired && !task.done ? 'expired' : task.done ? 'done' : 'todo';
  const marker = state === 'done' ? '☑' : state === 'expired' ? '☒' : '☐';
  const time = task.deadline
    ? state === 'expired' ? `已过期 ${task.deadline}` : `截止 ${task.deadline}`
    : '无截止';
  return `
    <div class="daily-plan-item ${state}">
      <button type="button" class="daily-plan-check" ${state === 'expired' ? 'disabled' : ''} onclick="toggleDailyPlanTask('${task.id}')">${marker}</button>
      <strong>${escapeHtml(task.text)}</strong>
      <span>${time}</span>
      <button type="button" class="daily-plan-delete" onclick="deleteDailyPlanTask('${task.id}')">×</button>
    </div>
  `;
}

function addDailyPlanFromInput() {
  const input = document.getElementById('daily-plan-input');
  const deadline = document.getElementById('daily-plan-deadline');
  const text = input?.value.trim();
  if (!text) return showToast('请输入任务内容', 'warning');
  addDailyPlanTask(text, deadline?.value || '');
  input.value = '';
  if (deadline) deadline.value = '';
}

function addDailyPlanTask(text, deadline = '') {
  loadDailyPlan();
  const normalized = String(text || '').trim();
  if (!normalized) return;
  if (AppState.dailyPlan.tasks.some(task => task.text === normalized)) {
    showToast('已有相同任务', 'warning');
    return;
  }
  AppState.dailyPlan.tasks.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: normalized,
    deadline,
    done: false,
    expired: false,
    createdAt: Date.now(),
  });
  saveDailyPlan();
  renderDailyPlan();
}

function addDailyPlanTasks(tasks) {
  loadDailyPlan();
  let added = 0;
  (tasks || []).forEach(task => {
    const text = String(task.text || task.name || '').trim();
    if (!text || AppState.dailyPlan.tasks.some(item => item.text === text)) return;
    AppState.dailyPlan.tasks.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      deadline: task.deadline || '',
      done: false,
      expired: false,
      createdAt: Date.now(),
    });
    added += 1;
  });
  saveDailyPlan();
  showToast(added ? `已添加${added}项计划！` : '没有新增任务', added ? 'success' : 'warning');
}

function toggleDailyPlanTask(id) {
  loadDailyPlan();
  AppState.dailyPlan.tasks = AppState.dailyPlan.tasks.map(task => (
    task.id === id && !task.expired ? { ...task, done: !task.done } : task
  ));
  saveDailyPlan();
  renderDailyPlan();
}

function deleteDailyPlanTask(id) {
  loadDailyPlan();
  const task = AppState.dailyPlan.tasks.find(item => item.id === id);
  AppState.dailyPlan.tasks = AppState.dailyPlan.tasks.filter(item => item.id !== id);
  AppState.dailyPlan.lastDeleted = task || null;
  saveDailyPlan();
  renderDailyPlan();
  showToast('已删除，3秒内可撤销');
  clearTimeout(window.__dailyPlanUndoTimer);
  window.__dailyPlanUndoTimer = setTimeout(() => {
    AppState.dailyPlan.lastDeleted = null;
    renderDailyPlan();
  }, 3000);
}

function undoDeleteDailyPlanTask() {
  if (!AppState.dailyPlan.lastDeleted) return showToast('没有可撤销的任务', 'warning');
  loadDailyPlan();
  AppState.dailyPlan.tasks.push(AppState.dailyPlan.lastDeleted);
  AppState.dailyPlan.lastDeleted = null;
  saveDailyPlan();
  renderDailyPlan();
}

function buildXiaoshouPlanTasks() {
  const hour = new Date().getHours();
  const tasks = [];
  const hasMeal = (meal) => AppState.todayFood.some(item => item.meal_type === meal);
  if (hour < 10 && !hasMeal('breakfast')) tasks.push({ text: '早餐记录', deadline: '09:00' });
  if (hour < 14 && !hasMeal('lunch')) tasks.push({ text: '午餐记录', deadline: '13:00' });
  if (hour < 21 && !hasMeal('dinner')) tasks.push({ text: '晚餐记录', deadline: '19:30' });
  const water = AppState.todayWater.reduce((sum, item) => sum + Number(item.amount_ml || 0), 0);
  if (water < 1000 && hour < 18) tasks.push({ text: '喝水1000ml', deadline: '12:00' });
  if (water < 2000) tasks.push({ text: '喝水2000ml', deadline: '20:00' });
  if (!AppState.todayExercise.length && hour < 22) tasks.push({ text: '运动30分钟', deadline: '18:00' });
  if (hour < 23) tasks.push({ text: '晚间称重', deadline: '22:00' });
  return tasks.slice(0, 5);
}

function startXiaoshouPlanGeneration() {
  const tasks = buildXiaoshouPlanTasks();
  AppState.dailyPlan.pendingAiTasks = tasks;
  closeBrutalPanel();
  openAiCoachPanel();
  AppState.aiCoach.messages.push({
    role: 'assistant',
    content: `好的！让我根据你的数据来制定今日计划~ 🤔\n\n📋 今日减脂计划：\n${tasks.map((task, index) => `${index + 1}. ☐ ${task.text}${task.deadline ? `（${task.deadline}前）` : ''}`).join('\n')}\n\n检查一下，没问题的话点下面添加 👇`,
    timestamp: Date.now(),
  });
  saveAiCoachMessages();
  renderAiCoachMessages();
  renderAiCoachPlanConfirm();
}

function renderAiCoachPlanConfirm() {
  const quick = document.getElementById('ai-coach-quick');
  if (!quick || !AppState.dailyPlan.pendingAiTasks.length) return;
  quick.innerHTML = `
    <button type="button" class="ai-plan-confirm" onclick="confirmXiaoshouPlanTasks()">✅ 添加到今日计划</button>
    <button type="button" onclick="sendAiCoachQuick('帮我调整今日计划')">让小瘦修改</button>
  `;
}

function confirmXiaoshouPlanTasks() {
  addDailyPlanTasks(AppState.dailyPlan.pendingAiTasks);
  AppState.dailyPlan.pendingAiTasks = [];
  closeAiCoachPanel();
  openBrutalPanel('plan');
}

function initUnlockSlider() {
  const track = document.querySelector('[data-unlock-track]');
  const thumb = document.querySelector('[data-unlock-thumb]');
  if (!track || !thumb) return;
  let dragging = false;
  const move = (clientX) => {
    const max = track.clientWidth - thumb.clientWidth - 12;
    const x = Math.max(0, Math.min(max, clientX - track.getBoundingClientRect().left - 28));
    thumb.style.transform = `translateX(${x}px)`;
    if (x >= max - 4) {
      dragging = false;
      showFunBubble('今日状态已确认');
      hapticTap(30);
      setTimeout(closeBrutalPanel, 400);
    }
  };
  thumb.addEventListener('pointerdown', (event) => {
    dragging = true;
    thumb.setPointerCapture(event.pointerId);
  });
  thumb.addEventListener('pointermove', (event) => {
    if (dragging) move(event.clientX);
  });
  thumb.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    thumb.style.transform = 'translateX(0)';
  });
}

// ─── 认证 ──────────────────────────────────────────
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('bg-white', 'shadow', 'text-primary-600');
    tabLogin.classList.remove('text-gray-500');
    tabRegister.classList.remove('bg-white', 'shadow', 'text-primary-600');
    tabRegister.classList.add('text-gray-500');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabRegister.classList.add('bg-white', 'shadow', 'text-primary-600');
    tabRegister.classList.remove('text-gray-500');
    tabLogin.classList.remove('bg-white', 'shadow', 'text-primary-600');
    tabLogin.classList.add('text-gray-500');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) return showToast('请填写用户名和密码', 'warning');

  const res = await api('/api/auth/login', { method: 'POST', body: { username, password } });
  if (res && res.code === 0) {
    showToast('登录成功');
    AppState.user = res.data;
    showMainApp();
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (!username || !password) return showToast('请填写完整信息', 'warning');
  if (password !== password2) return showToast('两次密码不一致', 'error');

  const res = await api('/api/auth/register', { method: 'POST', body: { username, password, avatar_url: AppState.registerAvatarUrl } });
  if (res && res.code === 0) {
    showToast('注册成功，已自动登录');
    AppState.user = res.data;
    showMainApp();
  }
}

async function handleRegisterAvatar(file) {
  if (!file) return;
  try {
    AppState.registerAvatarUrl = `data:image/jpeg;base64,${await fileToCompressedBase64(file, 360)}`;
    renderAvatarElement('reg-avatar-preview', AppState.registerAvatarUrl, '我');
  } catch (e) {
    showToast('头像处理失败，请换一张图片', 'error');
  }
}

async function handleLogout() {
  await api('/api/auth/logout', { method: 'POST' });
  AppState.user = null;
  AppState.profile = null;
  showAuthPage();
  showToast('已退出登录');
}

// ─── 页面切换 ──────────────────────────────────────
function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  loadExerciseVoices();
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadExerciseVoices;

  // 初始化导航
  initNavigation();
  initAppInteractions();
  initAiCoachWidget();

  // 加载数据
  loadAllData();

  // 默认显示仪表盘
  switchTab('dashboard');

  checkNotificationPermission();
}

// ─── 导航初始化 ────────────────────────────────────
function initNavigation() {
  // 底部导航（移动端）
  const bottomNav = document.getElementById('bottom-nav');
  bottomNav.innerHTML = TABS.map(tab => `
    <button onclick="switchTab('${tab.id}')" id="bnav-${tab.id}" class="nav-btn flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all text-gray-400">
      ${tab.icon}
      <span class="text-[10px]">${tab.label}</span>
    </button>
  `).join('');

  // 侧边栏导航（桌面端）
  const sidebarNav = document.getElementById('sidebar-nav');
  sidebarNav.innerHTML = TABS.map(tab => `
    <button onclick="switchTab('${tab.id}')" id="snav-${tab.id}" class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all text-gray-500 hover:bg-gray-50">
      ${tab.icon}
      <span>${tab.label}</span>
    </button>
  `).join('');

  // 显示用户名
  const usernameEl = document.getElementById('sidebar-username');
  if (usernameEl && AppState.user) {
    usernameEl.textContent = AppState.user.username;
  }
  const topInitial = document.getElementById('top-avatar-initial');
  if (topInitial && AppState.user?.username) renderAvatarElement('top-avatar-initial', AppState.profile?.avatar_url, AppState.user.username.slice(0, 1).toUpperCase());
}

function initAppInteractions() {
  if (window.__appInteractionsReady) return;
  window.__appInteractionsReady = true;
  updateStatusbarTime();
  setInterval(updateStatusbarTime, 30000);

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, .food-card, .meal-summary-card, .check-item, .portion-chip');
    if (target) hapticTap(8);
  });
}

function registerPwaServiceWorker() {
  if (window.__pwaSwRegistering) return;
  window.__pwaSwRegistering = true;
  if (!('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        if (document.getElementById('main-app') && !document.getElementById('main-app').classList.contains('hidden')) {
          showFunBubble('App 离线能力已准备');
        }
      })
      .catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

function initPwaInstallPrompt() {
  if (window.__pwaPromptReady) return;
  window.__pwaPromptReady = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.deferredPwaPrompt = event;
    showFunBubble('可以安装到桌面了');
  });
}

async function installPwaApp() {
  if (!window.deferredPwaPrompt) {
    showFunBubble('请用浏览器菜单添加到主屏幕');
    return;
  }
  window.deferredPwaPrompt.prompt();
  await window.deferredPwaPrompt.userChoice;
  window.deferredPwaPrompt = null;
}

function switchTab(tabId) {
  hapticTap();
  AppState.currentTab = tabId;

  // 隐藏所有 tab 内容
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  // 显示当前 tab
  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.classList.remove('hidden');

  // 更新导航高亮
  TABS.forEach(tab => {
    const bnav = document.getElementById(`bnav-${tab.id}`);
    const snav = document.getElementById(`snav-${tab.id}`);
    if (tab.id === tabId) {
      if (bnav) { bnav.classList.add('text-primary-600'); bnav.classList.remove('text-gray-400'); }
      if (snav) { snav.classList.add('bg-primary-50', 'text-primary-600', 'font-medium'); snav.classList.remove('text-gray-500'); }
    } else {
      if (bnav) { bnav.classList.remove('text-primary-600'); bnav.classList.add('text-gray-400'); }
      if (snav) { snav.classList.remove('bg-primary-50', 'text-primary-600', 'font-medium'); snav.classList.add('text-gray-500'); }
    }
  });

  // 更新 hash
  window.location.hash = tabId;

  // Tab 特定初始化
  if (tabId === 'weight') renderWeightData();
  if (tabId === 'food' || tabId === 'exercise') requestAnimationFrame(updateCalorieRings);
  if (tabId === 'exercise') {
    loadFrequentExercises();
    loadExerciseStats();
    renderExercisePicker();
    renderExerciseTimer();
  }
  if (tabId === 'me') renderMyPage();
  if (tabId === 'history') {
    initHistoryDate();
    loadStats();
  }
}

// ─── Hash 路由 ─────────────────────────────────────
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (TABS.some(t => t.id === hash) && hash !== AppState.currentTab) {
    switchTab(hash);
  }
});

// ─── 数据加载 ──────────────────────────────────────
async function loadAllData() {
  await Promise.all([
    loadProfile(),
    loadCustomFoods(),
    loadTodayFood(),
    loadTodayExercise(),
    loadTodayWater(),
    loadWeightRecords(),
    loadCheckinCalendar(),
    loadFrequentFoods(),
    loadFrequentExercises(),
  ]);
  await refreshSavedPlanPreview();
  initMealSummaryCards();
  updateDashboard();
  updateFoodRecommendation();
  updateExerciseRecommendation();
  renderExercisePicker();
  renderExerciseTimer();
  loadExerciseStats();
  renderMyPage();
  maybeShowOnboarding();
}

async function refreshSavedPlanPreview() {
  const currentWeight = AppState.weightRecords[0]?.weight || AppState.profile?.weight;
  if (!currentWeight || !AppState.profile?.target_weight || !AppState.profile?.target_date) return;
  const res = await api('/api/calc-plan', {
    method: 'POST',
    body: {
      current_weight: currentWeight,
      target_weight: AppState.profile.target_weight,
      target_date: AppState.profile.target_date,
    },
  });
  if (res?.data) AppState.planPreview = res.data;
}

async function loadProfile() {
  const res = await api('/api/profile');
  if (res && res.data) {
    AppState.profile = res.data;
    fillProfileForm();
    fillReminderForm();
    updateBMIDisplay();
  }
}

function tomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function initOnboardingData() {
  const p = AppState.profile || {};
  AppState.onboarding = {
    step: 1,
    errors: {},
    submitting: false,
    data: {
      gender: p.gender || 'male',
      age: p.age || 22,
      height: p.height || 175,
      weight: p.weight || 75,
      target_weight: p.target_weight || 65,
      target_date: p.target_date || tomorrowISO(),
      activity_level: p.activity_level || 'moderate',
    },
  };
}

function maybeShowOnboarding() {
  if (!AppState.profile || Number(AppState.profile.onboarded || 0) === 1) return;
  if (document.getElementById('onboarding-overlay')) return;
  initOnboardingData();
  renderOnboarding();
}

function setOnboardingValue(key, value) {
  AppState.onboarding.data[key] = value;
  AppState.onboarding.errors[key] = '';
  renderOnboarding();
}

function onboardingSuggestion() {
  const current = Number(AppState.onboarding.data.weight);
  const target = Number(AppState.onboarding.data.target_weight);
  const diff = current - target;
  if (!current || !target || diff <= 0) return '目标体重需要小于当前体重';
  if (diff <= 5) return '建议4-6周';
  if (diff <= 10) return '建议6-12周';
  if (diff <= 20) return '建议12-24周';
  return '建议24周以上，稳扎稳打';
}

function validateOnboardingStep(step = AppState.onboarding.step) {
  const data = AppState.onboarding.data;
  const errors = {};
  if (step === 1) {
    if (!data.gender) errors.gender = '请选择性别';
    if (!Number.isInteger(Number(data.age)) || Number(data.age) < 12 || Number(data.age) > 100) errors.age = '请输入有效年龄（12-100）';
    if (!Number(data.height) || Number(data.height) < 100 || Number(data.height) > 250) errors.height = '请输入有效身高（100-250cm）';
  }
  if (step === 2) {
    if (!Number(data.weight) || Number(data.weight) < 30 || Number(data.weight) > 300) errors.weight = '请输入有效体重（30-300kg）';
    if (!Number(data.target_weight) || Number(data.target_weight) >= Number(data.weight)) errors.target_weight = '目标体重应小于当前体重';
    if (!data.target_date || data.target_date < tomorrowISO()) errors.target_date = '目标日期至少是明天';
  }
  if (step === 3 && !data.activity_level) errors.activity_level = '请选择活动等级';
  AppState.onboarding.errors = errors;
  return Object.keys(errors).length === 0;
}

function nextOnboardingStep() {
  if (!validateOnboardingStep()) return renderOnboarding();
  AppState.onboarding.step = Math.min(3, AppState.onboarding.step + 1);
  AppState.onboarding.errors = {};
  renderOnboarding();
}

function prevOnboardingStep() {
  AppState.onboarding.step = Math.max(1, AppState.onboarding.step - 1);
  AppState.onboarding.errors = {};
  renderOnboarding();
}

function onboardingInputClass(key) {
  return AppState.onboarding.errors[key] ? 'onboarding-input is-error' : 'onboarding-input';
}

function onboardingError(key) {
  return AppState.onboarding.errors[key] ? `<p class="onboarding-error">${AppState.onboarding.errors[key]}</p>` : '';
}

function renderOnboarding() {
  let overlay = document.getElementById('onboarding-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    document.body.appendChild(overlay);
  }
  const { step, data, submitting } = AppState.onboarding;
  const progress = [1, 2, 3].map(n => `<span class="${n < step ? 'done' : n === step ? 'active' : ''}"></span>`).join('');
  const activityOptions = [
    ['sedentary', '久坐不动', '办公室工作，几乎不运动'],
    ['light', '轻度活动', '每周1-3天有运动'],
    ['moderate', '中度活动', '每周3-5天有运动'],
    ['active', '高强度运动', '每周6-7天有运动'],
    ['very_active', '极高强度', '体力劳动或每天高强度训练'],
  ];
  let body = '';
  if (step === 1) {
    body = `
      <h2>欢迎来到慢慢瘦！</h2>
      <p class="onboarding-lead">让我们了解你，才能更好地帮你</p>
      <label class="onboarding-label">你的性别</label>
      <div class="onboarding-choice-row">
        <button type="button" class="${data.gender === 'male' ? 'selected' : ''}" onclick="setOnboardingValue('gender','male')">男生</button>
        <button type="button" class="${data.gender === 'female' ? 'selected' : ''}" onclick="setOnboardingValue('gender','female')">女生</button>
      </div>
      ${onboardingError('gender')}
      <label class="onboarding-label">你的年龄</label>
      <input class="${onboardingInputClass('age')}" type="number" min="12" max="100" value="${data.age || ''}" oninput="AppState.onboarding.data.age=this.value">
      ${onboardingError('age')}
      <label class="onboarding-label">你的身高（cm）</label>
      <input class="${onboardingInputClass('height')}" type="number" min="100" max="250" value="${data.height || ''}" oninput="AppState.onboarding.data.height=this.value">
      ${onboardingError('height')}
      <button type="button" class="onboarding-primary" onclick="nextOnboardingStep()">下一步</button>
    `;
  } else if (step === 2) {
    body = `
      <h2>设定你的目标</h2>
      <label class="onboarding-label">当前体重（kg）</label>
      <input class="${onboardingInputClass('weight')}" type="number" min="30" max="300" step="0.1" value="${data.weight || ''}" oninput="AppState.onboarding.data.weight=this.value; document.getElementById('onboarding-suggestion').textContent=onboardingSuggestion()">
      ${onboardingError('weight')}
      <label class="onboarding-label">目标体重（kg）</label>
      <input class="${onboardingInputClass('target_weight')}" type="number" min="30" max="300" step="0.1" value="${data.target_weight || ''}" oninput="AppState.onboarding.data.target_weight=this.value; document.getElementById('onboarding-suggestion').textContent=onboardingSuggestion()">
      ${onboardingError('target_weight')}
      <label class="onboarding-label">目标日期</label>
      <input class="${onboardingInputClass('target_date')}" type="date" min="${tomorrowISO()}" value="${data.target_date || ''}" oninput="AppState.onboarding.data.target_date=this.value">
      ${onboardingError('target_date')}
      <p id="onboarding-suggestion" class="onboarding-tip">${onboardingSuggestion()}</p>
      <div class="onboarding-actions"><button type="button" onclick="prevOnboardingStep()">上一步</button><button type="button" onclick="nextOnboardingStep()">下一步</button></div>
    `;
  } else {
    body = `
      <h2>你平时的活动量</h2>
      <div class="onboarding-activity-list">
        ${activityOptions.map(([value, title, desc]) => `
          <button type="button" class="${data.activity_level === value ? 'selected' : ''}" onclick="setOnboardingValue('activity_level','${value}')">
            <strong>${data.activity_level === value ? '✓ ' : ''}${title}</strong><span>${desc}</span>
          </button>
        `).join('')}
      </div>
      ${onboardingError('activity_level')}
      <div class="onboarding-actions"><button type="button" onclick="prevOnboardingStep()">上一步</button><button type="button" onclick="submitOnboarding()" ${submitting ? 'disabled' : ''}>${submitting ? '提交中...' : '开始使用'}</button></div>
    `;
  }
  overlay.innerHTML = `<div class="onboarding-panel"><div class="onboarding-progress">${progress}</div>${body}</div>`;
  document.body.style.overflow = 'hidden';
}

async function submitOnboarding() {
  if (!validateOnboardingStep(3)) return renderOnboarding();
  AppState.onboarding.submitting = true;
  renderOnboarding();
  const data = AppState.onboarding.data;
  const payload = {
    ...AppState.profile,
    gender: data.gender,
    age: parseInt(data.age, 10),
    height: parseFloat(data.height),
    weight: parseFloat(data.weight),
    initial_weight: parseFloat(data.weight),
    target_weight: parseFloat(data.target_weight),
    target_date: data.target_date,
    activity_level: data.activity_level,
    onboarded: 1,
  };
  const res = await api('/api/profile', { method: 'PUT', body: payload });
  AppState.onboarding.submitting = false;
  if (!res) return renderOnboarding();
  AppState.profile = res.data?.profile || { ...payload, onboarded: 1 };
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
  await loadWeightRecords();
  await refreshSavedPlanPreview();
  updateDashboard();
  renderMyPage();
  showToast('设置完成，开始你的减脂之旅！');
}

async function loadCustomFoods() {
  const res = await api('/api/custom-foods');
  if (res && res.data) AppState.customFoods = res.data;
}

async function loadTodayFood() {
  const res = await api('/api/food/today');
  if (res && res.data) {
    AppState.todayFood = res.data;
    renderFoodList();
  }
}

async function loadTodayExercise() {
  const res = await api('/api/exercise/today');
  if (res && res.data) {
    AppState.todayExercise = res.data;
    renderExerciseList();
  }
}

async function loadFrequentExercises() {
  const res = await api('/api/frequent-exercises');
  if (res && res.data) {
    AppState.frequentExercises = res.data;
    renderFrequentExercises();
  }
}

async function loadTodayWater() {
  const res = await api('/api/water/today');
  if (res && res.data) {
    AppState.todayWater = res.data;
    renderWaterList();
  }
}

async function loadWeightRecords() {
  const res = await api('/api/weight?days=30');
  if (res && res.data) {
    AppState.weightRecords = res.data;
  }
}

async function loadCheckinCalendar() {
  if (!calendarMonth) {
    const now = new Date();
    calendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const res = await api(`/api/checkin-calendar?month=${calendarMonth}`);
  if (res && res.data) {
    AppState.checkinCalendar = res.data;
    renderCheckinCalendar();
    updateStreakDisplay(res.data.streak);
  }
}

function renderCheckinCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-month-label');
  if (!grid || !calendarMonth) return;

  const dates = AppState.checkinCalendar.checkinDates || [];
  const [year, month] = calendarMonth.split('-').map(Number);
  if (label) label.textContent = `${year}年${month}月`;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  let html = '';
  for (let i = 0; i < offset; i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const checked = dates.includes(dateStr);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;

    let bgClass = 'bg-gray-50';
    let textClass = 'text-gray-500';
    if (checked) {
      bgClass = 'bg-primary-400';
      textClass = 'text-white font-bold';
    } else if (isToday) {
      bgClass = 'bg-primary-100 ring-2 ring-primary-400';
      textClass = 'text-primary-700 font-medium';
    } else if (isFuture) {
      textClass = 'text-gray-200';
    }

    html += `<div class="aspect-square flex items-center justify-center text-[11px] rounded-lg ${bgClass} ${textClass}" title="${dateStr}">${d}</div>`;
  }
  grid.innerHTML = html;
}

function changeCalendarMonth(delta) {
  if (!calendarMonth) {
    const now = new Date();
    calendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = calendarMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  calendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  loadCheckinCalendar();
}

function updateStreakDisplay(streak) {
  const countEl = document.getElementById('streak-count');
  const msgEl = document.getElementById('streak-message');
  if (countEl) countEl.textContent = streak;

  let msg = '';
  if (streak === 0) msg = '今天开始记录吧';
  else if (streak === 1) msg = '好的开始，继续保持';
  else if (streak < 3) msg = '坚持就是胜利';
  else if (streak < 7) msg = `初露锋芒，连续${streak}天`;
  else if (streak < 14) msg = '一周达人';
  else if (streak < 30) msg = '习惯正在养成';
  else msg = '坚持已经成型';

  if (msgEl) msgEl.textContent = msg;
}

async function loadFrequentFoods() {
  const res = await api('/api/frequent-foods');
  if (res && res.data) {
    AppState.frequentFoods = res.data;
    renderFrequentFoods();
  }
}

function renderFrequentFoods() {
  const container = document.getElementById('frequent-foods-container');
  if (!container) return;

  if (!AppState.frequentFoods.length) {
    container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">记录更多食物后，常吃食物会出现在这里</p>';
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      ${AppState.frequentFoods.map(food => `
        <button type="button" onclick='quickAddFrequentFood(${JSON.stringify(food).replace(/"/g, '&quot;')})' class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-primary-50 transition-all border border-transparent hover:border-primary-200">
          <span class="text-2xl">🍽️</span>
          <span class="text-xs font-medium text-gray-700 truncate w-full text-center">${food.food_name}</span>
          <span class="text-[10px] text-gray-400">${food.calories_per_100g}kcal</span>
        </button>
      `).join('')}
    </div>
  `;
}

function quickAddFrequentFood(food) {
  selectedFood = { name: food.food_name, cal: food.calories_per_100g, isCustom: false };
  document.getElementById('food-name').value = food.food_name;
  document.getElementById('food-cal').value = food.calories_per_100g;
  document.getElementById('food-amount').value = food.avg_amount ? Math.round(food.avg_amount) : '';
  document.getElementById('food-meal').value = food.meal_type || 'lunch';
  applyFoodAmountHint(selectedFood);
  renderPortionQuickButtons(selectedFood);
  calcFoodCalories();
  document.getElementById('add-food-form').classList.remove('hidden');
  document.getElementById('food-amount').focus();
}

// ─── 个人信息 ──────────────────────────────────────
function fillProfileForm() {
  if (!AppState.profile) return;
  const p = AppState.profile;
  document.getElementById('profile-gender').value = p.gender || 'male';
  document.getElementById('profile-age').value = p.age || '';
  document.getElementById('profile-height').value = p.height || '';
  document.getElementById('profile-weight').value = p.weight || '';
  document.getElementById('profile-target-weight').value = p.target_weight || '';
  document.getElementById('profile-activity').value = p.activity_level || 'sedentary';
}

function fillReminderForm() {
  if (!AppState.profile) return;
  const p = AppState.profile;
  const weighTime = document.getElementById('reminder-weigh-time');
  const weighEnabled = document.getElementById('reminder-weigh-enabled');
  const waterInterval = document.getElementById('reminder-water-interval');
  const waterEnabled = document.getElementById('reminder-water-enabled');
  const exerciseTime = document.getElementById('reminder-exercise-time');
  const exerciseEnabled = document.getElementById('reminder-exercise-enabled');

  if (weighTime) weighTime.value = p.reminder_weigh || '08:00';
  if (weighEnabled) weighEnabled.checked = !!p.reminder_weigh_enabled;
  if (waterInterval) waterInterval.value = p.reminder_water_interval || '120';
  if (waterEnabled) waterEnabled.checked = !!p.reminder_water_enabled;
  if (exerciseTime) exerciseTime.value = p.reminder_exercise || '18:00';
  if (exerciseEnabled) exerciseEnabled.checked = !!p.reminder_exercise_enabled;

  startReminders();
}

async function saveProfile() {
  const data = {
    gender: document.getElementById('profile-gender').value,
    age: parseFloat(document.getElementById('profile-age').value) || 25,
    height: parseFloat(document.getElementById('profile-height').value) || 170,
    weight: parseFloat(document.getElementById('profile-weight').value) || 70,
    initial_weight: AppState.profile?.initial_weight || AppState.profile?.weight || null,
    target_weight: parseFloat(document.getElementById('profile-target-weight').value) || 60,
    target_date: AppState.profile?.target_date || null,
    avatar_url: AppState.profile?.avatar_url || null,
    activity_level: document.getElementById('profile-activity').value,
    reminder_weigh: document.getElementById('reminder-weigh-time')?.value || '08:00',
    reminder_weigh_enabled: document.getElementById('reminder-weigh-enabled')?.checked ? 1 : 0,
    reminder_water_interval: parseInt(document.getElementById('reminder-water-interval')?.value) || 120,
    reminder_water_enabled: document.getElementById('reminder-water-enabled')?.checked ? 1 : 0,
    reminder_exercise: document.getElementById('reminder-exercise-time')?.value || '18:00',
    reminder_exercise_enabled: document.getElementById('reminder-exercise-enabled')?.checked ? 1 : 0,
  };

  const res = await api('/api/profile', { method: 'PUT', body: data });
  if (res) {
    AppState.profile = { ...AppState.profile, ...data, user_id: AppState.profile?.user_id };
    updateBMIDisplay();
    updateDashboard();
    updateFoodRecommendation();
    updateExerciseRecommendation();
    startReminders();
  }
}

async function saveReminders() {
  await saveProfile();
  showToast('提醒设置已保存');
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('浏览器不支持通知功能', 'warning');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('通知权限已开启');
    document.getElementById('notification-permission')?.classList.add('hidden');
  } else {
    showToast('通知权限被拒绝', 'error');
  }
}

function checkNotificationPermission() {
  const permissionEl = document.getElementById('notification-permission');
  if (!permissionEl) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    permissionEl.classList.remove('hidden');
  } else {
    permissionEl.classList.add('hidden');
  }
}

function startReminders() {
  reminderTimers.forEach(timer => clearInterval(timer));
  reminderTimers = [];

  const p = AppState.profile;
  if (!p) return;

  const fixedTimer = setInterval(() => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (p.reminder_weigh_enabled && timeStr === p.reminder_weigh) {
      sendNotification('称重提醒', '该记录今天的体重啦！');
    }
    if (p.reminder_exercise_enabled && timeStr === p.reminder_exercise) {
      sendNotification('运动提醒', '该运动啦，动起来！');
    }
  }, 60000);
  reminderTimers.push(fixedTimer);

  if (p.reminder_water_enabled) {
    const intervalMs = (Number(p.reminder_water_interval) || 120) * 60 * 1000;
    const waterTimer = setInterval(() => {
      sendNotification('喝水提醒', '记得喝水，保持水分充足！');
    }, intervalMs);
    reminderTimers.push(waterTimer);
  }
}

function sendNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body });
}

// ─── BMR / TDEE / BMI 计算 ─────────────────────────
function calcBMR() {
  if (!AppState.profile) return 0;
  const { gender, weight, height, age } = AppState.profile;
  if (!weight || !height || !age) return 0;
  if (gender === 'female') {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calcTDEE() {
  const bmr = calcBMR();
  const levels = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725 };
  const factor = levels[AppState.profile?.activity_level] || 1.2;
  return Math.round(bmr * factor);
}

function calcTargetCal() {
  return AppState.planPreview?.dailyIntakeTarget || Math.max(calcTDEE() - 500, 1200); // 最低不低于1200
}

function calcExerciseTarget() {
  return AppState.planPreview?.exerciseBurnTarget || 300;
}

function calcBMI() {
  if (!AppState.profile?.weight || !AppState.profile?.height) return 0;
  const h = AppState.profile.height / 100;
  return (AppState.profile.weight / (h * h)).toFixed(1);
}

function getBMIStatus(bmi) {
  if (bmi < 18.5) return { text: '偏瘦', color: 'text-blue-500' };
  if (bmi < 24) return { text: '正常', color: 'text-primary-500' };
  if (bmi < 28) return { text: '超重', color: 'text-yellow-500' };
  return { text: '肥胖', color: 'text-red-500' };
}

function updateBMIDisplay() {
  const bmi = calcBMI();
  const bmr = calcBMR();
  const tdee = calcTDEE();
  const target = calcTargetCal();

  document.getElementById('bmi-value').textContent = bmi || '--';
  const status = getBMIStatus(bmi);
  const bmiEl = document.getElementById('bmi-status');
  bmiEl.textContent = status.text;
  bmiEl.className = `text-xs ${status.color}`;
  document.getElementById('bmr-value').textContent = bmr || '--';
  document.getElementById('tdee-value').textContent = tdee || '--';
  document.getElementById('target-cal-value').textContent = target || '--';
}

// ─── 仪表盘更新 ────────────────────────────────────
function updateDashboard() {
  const targetCal = calcTargetCal() || 2000;
  const totalIntake = AppState.todayFood.reduce((s, f) => s + f.total_calories, 0);
  const totalBurned = AppState.todayExercise.reduce((s, e) => s + e.calories_burned, 0);
  const netCal = totalIntake - totalBurned;
  const remaining = targetCal - netCal;

  document.getElementById('calorie-intake').textContent = Math.round(totalIntake);
  document.getElementById('calorie-burned').textContent = Math.round(totalBurned);
  document.getElementById('calorie-target').textContent = targetCal;
  document.getElementById('calorie-net').textContent = Math.round(netCal);
  document.getElementById('calorie-remaining').textContent = Math.round(Math.max(remaining, 0));

  // 打卡状态
  updateCheckStatus('check-food', AppState.todayFood.length > 0);
  updateCheckStatus('check-exercise', AppState.todayExercise.length > 0);
  updateCheckStatus('check-water', AppState.todayWater.length > 0);

  // 水分进度
  const totalWater = AppState.todayWater.reduce((s, w) => s + w.amount_ml, 0);
  const waterPct = Math.min((totalWater / 2000) * 100, 100);
  document.getElementById('water-progress-bar').style.width = waterPct + '%';
  document.getElementById('water-progress-text').textContent = `${totalWater}/2000ml`;

  // 体重进度
  updateWeightProgress();

  // 减脂预估
  updateGoalEstimate();

  // 更新图表
  updateCalorieChart(targetCal, totalIntake, totalBurned);
  updateCalorieRings();
  updateWaterChart(totalWater);

  if (AppState.checkinCalendar) {
    updateStreakDisplay(AppState.checkinCalendar.streak || 0);
  }
  updateDashboardWeightCards();
}

function updateCheckStatus(id, done) {
  const el = document.getElementById(id);
  if (done) {
    el.classList.add('check-done');
  } else {
    el.classList.remove('check-done');
  }
}

function updateWeightProgress() {
  const p = AppState.profile;
  const current = latestWeightValue();
  if (!current || !p?.target_weight) return;

  const target = p.target_weight;
  const initial = initialWeightValue();

  const totalToLose = Math.abs(initial - target);
  const progress = Math.abs(initial - current);
  const pct = totalToLose > 0
    ? Math.max(0, Math.min(Math.round((progress / totalToLose) * 100), 100))
    : (current === target ? 100 : 0);

  document.getElementById('weight-current-display').textContent = `当前: ${current}kg`;
  document.getElementById('weight-target-display').textContent = `目标: ${target}kg`;
  document.getElementById('weight-progress-bar').style.width = pct + '%';
  document.getElementById('weight-progress-text').textContent = `完成 ${pct}%`;
}

function updateGoalEstimate() {
  const p = AppState.profile;
  const current = latestWeightValue();
  if (!current || !p?.target_weight) return;

  const diff = current - p.target_weight;
  if (diff <= 0) {
    document.getElementById('days-to-goal').textContent = '0';
    document.getElementById('goal-date').textContent = '已达标！';
    return;
  }

  let daysNeeded = null;
  let goalDate = null;
  if (p.target_date) {
    goalDate = new Date(p.target_date);
    daysNeeded = Math.max(0, Math.ceil((goalDate - new Date()) / 86400000));
  } else {
    const dailyDeficit = AppState.planPreview?.dailyDeficit || 500;
    daysNeeded = Math.ceil((diff * 7700) / dailyDeficit);
    goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + daysNeeded);
  }

  document.getElementById('days-to-goal').textContent = daysNeeded;
  document.getElementById('goal-date').textContent = `目标日期: ${goalDate.toLocaleDateString('zh-CN')}`;
}

function openWeightGoalModal() {
  const currentWeight = AppState.weightRecords[0]?.weight || AppState.profile?.weight || 70;
  document.getElementById('modal-current-weight').value = currentWeight;
  document.getElementById('modal-target-weight').value = AppState.profile?.target_weight || '';
  document.getElementById('modal-target-date').value = AppState.profile?.target_date || '';
  openModal('weight-goal-modal');
  if (AppState.profile?.target_weight && AppState.profile?.target_date) calcPlanPreview();
}

function closeWeightGoalModal() {
  closeModal('weight-goal-modal');
}

async function calcPlanPreview() {
  const currentWeight = parseFloat(document.getElementById('modal-current-weight')?.value);
  const targetWeight = parseFloat(document.getElementById('modal-target-weight')?.value);
  const targetDate = document.getElementById('modal-target-date')?.value;
  if (!currentWeight || !targetWeight || !targetDate) {
    document.getElementById('plan-preview')?.classList.add('hidden');
    return;
  }

  const res = await api('/api/calc-plan', {
    method: 'POST',
    body: { current_weight: currentWeight, target_weight: targetWeight, target_date: targetDate },
  });
  if (!res?.data) return;

  AppState.planPreview = res.data;
  document.getElementById('preview-intake').textContent = res.data.dailyIntakeTarget;
  document.getElementById('preview-exercise').textContent = res.data.exerciseBurnTarget;
  document.getElementById('preview-days').textContent = `目标周期 ${res.data.daysToTarget} 天，需要减 ${res.data.weightToLose}kg`;
  const warningEl = document.getElementById('preview-warning');
  if (warningEl) {
    warningEl.textContent = res.data.warning || '';
    warningEl.classList.toggle('hidden', !res.data.warning);
  }
  document.getElementById('plan-preview')?.classList.remove('hidden');
  updateDashboard();
  updateFoodRecommendation();
  updateExerciseRecommendation();
}

async function saveWeightGoal() {
  const targetWeight = parseFloat(document.getElementById('modal-target-weight')?.value);
  const targetDate = document.getElementById('modal-target-date')?.value;
  if (!targetWeight || !targetDate) return showToast('请填写完整目标信息', 'warning');

  const data = {
    ...AppState.profile,
    initial_weight: AppState.profile?.initial_weight || latestWeightValue() || AppState.profile?.weight,
    target_weight: targetWeight,
    target_date: targetDate,
  };
  const res = await api('/api/profile', { method: 'PUT', body: data });
  if (!res) return;

  AppState.profile = { ...AppState.profile, ...data };
  await refreshSavedPlanPreview();
  fillProfileForm();
  updateBMIDisplay();
  updateDashboard();
  updateFoodRecommendation();
  updateExerciseRecommendation();
  closeWeightGoalModal();
  showToast('目标已保存');
}

function renderMyPage() {
  const username = AppState.user?.username || '用户';
  const initial = username.slice(0, 1).toUpperCase();
  const checkinDays = AppState.checkinCalendar?.checkinDates?.length || 0;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('me-username', username);
  setText('me-checkin-days', `累计记录${checkinDays}天`);
  setText('me-joined-days', '持续变好中');
  renderAvatarElement('me-avatar-large', AppState.profile?.avatar_url, initial);
  renderAvatarElement('top-avatar-initial', AppState.profile?.avatar_url, initial);
  updateDashboardWeightCards();
}

function latestWeightValue() {
  return AppState.weightRecords[0]?.weight || AppState.profile?.weight || null;
}

function initialWeightValue() {
  return AppState.profile?.initial_weight
    || (AppState.weightRecords.length ? AppState.weightRecords[AppState.weightRecords.length - 1].weight : null)
    || AppState.profile?.weight
    || latestWeightValue();
}

function weightProgressInfo() {
  const current = latestWeightValue();
  const target = AppState.profile?.target_weight || null;
  const first = initialWeightValue();
  const total = current && target && first ? Math.abs(first - target) : 0;
  const done = current && target && first ? Math.abs(first - current) : 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : (current === target ? 100 : 0);
  let daysLeft = '--';
  if (AppState.profile?.target_date) {
    daysLeft = Math.max(0, Math.ceil((new Date(AppState.profile.target_date) - new Date()) / 86400000));
  }
  return { current, target, pct, daysLeft };
}

function updateDashboardWeightCards() {
  const info = weightProgressInfo();
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('dashboard-weight-current', info.current ? Number(info.current).toFixed(1) : '--');
  setText('dashboard-weight-target', info.target ? `${Number(info.target).toFixed(1)}kg` : '--kg');
  setText('dashboard-weight-days', `${info.daysLeft}天`);
  setText('dashboard-weight-progress-text', `完成 ${info.pct}%`);
  const bar = document.getElementById('dashboard-weight-progress-bar');
  if (bar) bar.style.width = `${info.pct}%`;
  const time = AppState.profile?.reminder_weigh || '08:00';
  setText('dashboard-weigh-time', time);
  const enabled = document.getElementById('dashboard-weigh-enabled');
  if (enabled) enabled.checked = !!AppState.profile?.reminder_weigh_enabled;
}

function openUserSheet(title, body, kicker = 'MY MODULE') {
  document.getElementById('user-sheet-title').textContent = title;
  document.getElementById('user-sheet-kicker').textContent = kicker;
  document.getElementById('user-sheet-body').innerHTML = body;
  document.getElementById('user-bottom-sheet')?.classList.remove('hidden');
}

function closeUserSheet() {
  document.getElementById('user-bottom-sheet')?.classList.add('hidden');
}

function aiCoachStorageKey() {
  return `xiaoshou-chat:${AppState.user?.id || AppState.user?.username || 'guest'}`;
}

function initAiCoachWidget() {
  loadAiCoachMessages();
  updateAiCoachQuickPrompts();
  initAiCoachDrag();
  scheduleAiCoachNudges();
  const badge = document.getElementById('xiaoshou-badge');
  if (badge) badge.classList.toggle('hidden', AppState.aiCoach.messages.length > 1);
}

function loadAiCoachMessages() {
  try {
    const raw = localStorage.getItem(aiCoachStorageKey());
    AppState.aiCoach.messages = raw ? JSON.parse(raw).slice(-50) : [];
  } catch (e) {
    AppState.aiCoach.messages = [];
  }
  if (!AppState.aiCoach.messages.length) {
    AppState.aiCoach.messages = [{
      role: 'assistant',
      content: window.XIAOSHOU_RULES?.welcome?.(AppState.user?.username) || '我是小瘦，有我在，瘦不难~',
      timestamp: Date.now(),
    }];
    saveAiCoachMessages();
  }
}

function saveAiCoachMessages() {
  const clean = AppState.aiCoach.messages.slice(-50);
  AppState.aiCoach.messages = clean;
  localStorage.setItem(aiCoachStorageKey(), JSON.stringify(clean));
}

function updateAiCoachQuickPrompts(prompts) {
  AppState.aiCoach.quickPrompts = prompts || window.XIAOSHOU_RULES?.getQuickPrompts?.(AppState, AppState.aiCoach.messages) || [
    '查今日热量', '推荐一个运动', '看体重趋势', '随机鼓励'
  ];
  renderAiCoachQuickPrompts();
}

function openAiCoachSheet() {
  openAiCoachPanel();
}

function openAiCoachPanel() {
  hapticTap();
  loadAiCoachMessages();
  updateAiCoachQuickPrompts();
  hideAiCoachNudge();
  document.getElementById('ai-coach-sheet')?.classList.remove('hidden');
  document.getElementById('xiaoshou-badge')?.classList.add('hidden');
  renderAiCoachMessages();
  setTimeout(() => document.getElementById('ai-coach-input')?.focus(), 120);
}

function closeAiCoachPanel() {
  document.getElementById('ai-coach-sheet')?.classList.add('hidden');
  scheduleAiCoachNudges();
}

function scheduleAiCoachNudges() {
  if (window.__aiCoachNudgesReady) return;
  window.__aiCoachNudgesReady = true;
  clearTimeout(AppState.aiCoach.nudgeTimer);
  clearInterval(AppState.aiCoach.nudgeInterval);
  AppState.aiCoach.nudgeTimer = setTimeout(() => {
    showAiCoachNudge();
    AppState.aiCoach.nudgeInterval = setInterval(showAiCoachNudge, 60000);
  }, 30000);
}

function getAiCoachNudgeMessage() {
  const hour = new Date().getHours();
  const hasFood = AppState.todayFood.length > 0;
  const hasExercise = AppState.todayExercise.length > 0;
  const remaining = Math.max(0, Math.round(calcTargetCal() - AppState.todayFood.reduce((sum, item) => sum + Number(item.total_calories || 0), 0)));
  const messages = [];

  if (hour >= 6 && hour < 10 && !hasFood) {
    messages.push('早呀，今天早餐吃了什么呀？');
    messages.push('要不要我给你推荐个快手早餐？');
  } else if (hour >= 10 && hour < 14) {
    messages.push('午餐想吃什么？小瘦帮你控热量~');
    messages.push(`今天还剩约 ${remaining} kcal，可以安排得很从容。`);
  } else if (hour >= 18 && hour < 22) {
    messages.push('晚上吃什么不胖？要不要我给你出主意？');
    messages.push('晚餐别硬扛，小瘦帮你搭一份轻食？');
  } else if (hour >= 22) {
    messages.push('今天辛苦啦，要不要做个今日总结？');
    messages.push('睡前别焦虑，明天小瘦继续陪你。');
  } else {
    messages.push('今天吃了什么呀？');
    messages.push('要不要我给你做个减脂计划呀？');
  }

  if (!hasExercise) messages.push('今天要不要来个7分钟快速燃脂？');
  messages.push('你比昨天更强了，小瘦为你记着呢！');
  messages.push('有我在，瘦不难~');
  return messages[Math.floor(Math.random() * messages.length)];
}

function showAiCoachNudge(message) {
  const sheetOpen = !document.getElementById('ai-coach-sheet')?.classList.contains('hidden');
  const mainOpen = !document.getElementById('main-app')?.classList.contains('hidden');
  if (sheetOpen || !mainOpen) return;
  const now = Date.now();
  if (now - AppState.aiCoach.lastNudgeAt < 25000) return;
  AppState.aiCoach.lastNudgeAt = now;

  const btn = document.getElementById('xiaoshou-float');
  if (!btn) return;
  let bubble = document.getElementById('xiaoshou-nudge');
  if (!bubble) {
    bubble = document.createElement('span');
    bubble.id = 'xiaoshou-nudge';
    bubble.className = 'xiaoshou-nudge';
    btn.appendChild(bubble);
  }
  bubble.textContent = message || getAiCoachNudgeMessage();
  bubble.classList.remove('is-leaving');
  bubble.classList.add('is-visible');
  document.getElementById('xiaoshou-badge')?.classList.remove('hidden');
  clearTimeout(bubble.__hideTimer);
  bubble.__hideTimer = setTimeout(hideAiCoachNudge, 6500);
}

function hideAiCoachNudge() {
  const bubble = document.getElementById('xiaoshou-nudge');
  if (!bubble) return;
  bubble.classList.add('is-leaving');
  bubble.classList.remove('is-visible');
}

function renderAiCoachMessages() {
  const box = document.getElementById('ai-coach-messages');
  if (!box) return;
  const lastMessage = AppState.aiCoach.messages[AppState.aiCoach.messages.length - 1];
  const hasStreamingBubble = lastMessage?.role === 'assistant' && lastMessage.streaming;
  box.innerHTML = AppState.aiCoach.messages.map(renderAiCoachMessage).join('') + (
    AppState.aiCoach.loading && !hasStreamingBubble ? `
      <div class="ai-coach-row assistant">
        <span class="ai-coach-avatar">🤖</span>
        <div><div class="ai-coach-bubble typing"><i></i><i></i><i></i></div><time>小瘦思考中</time></div>
      </div>
    ` : ''
  );
  box.scrollTop = box.scrollHeight;
}

function renderAiCoachMessage(message) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const avatar = isUser ? (AppState.user?.username || '我').slice(0, 1).toUpperCase() : '🤖';
  const isTyping = !isUser && message.streaming && !message.content;

  // 系统提示（Agent切换）
  if (isSystem) {
    return `
      <div class="ai-coach-system-message">
        <div class="system-badge">⚡ 系统提示</div>
        <div class="system-content">${escapeHtml(message.content)}</div>
      </div>
    `;
  }

  return `
    <div class="ai-coach-row ${isUser ? 'user' : 'assistant'}">
      ${isUser ? '' : `<span class="ai-coach-avatar">${avatar}</span>`}
      <div>
        ${isTyping
          ? '<div class="ai-coach-bubble typing"><i></i><i></i><i></i></div>'
          : `<div class="ai-coach-bubble">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>`}
        <time>${message.streaming ? '小瘦输出中' : formatAiCoachTime(message.timestamp)}</time>
      </div>
      ${isUser ? `<span class="ai-coach-avatar">${avatar}</span>` : ''}
    </div>
  `;
}

function renderAiCoachQuickPrompts() {
  const box = document.getElementById('ai-coach-quick');
  if (!box) return;
  box.innerHTML = AppState.aiCoach.quickPrompts.map(text => `
    <button type="button" onclick="sendAiCoachQuick('${escapeAttr(text)}')">${escapeHtml(text)}</button>
  `).join('');
}

function formatAiCoachTime(timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function sendAiCoachQuick(text) {
  const input = document.getElementById('ai-coach-input');
  if (input) input.value = text;
  sendAiCoachMessage();
}

// Agent选择器功能
window.selectAgent = function(agent) {
  // 保存选择的Agent ('auto', 'nutrition_agent', 'fitness_agent')
  AppState.aiCoach.selectedAgent = agent === 'auto' ? null : agent;

  // 切换Agent时重置会话
  AppState.aiCoach.sessionId = null;

  // 更新按钮样式
  document.querySelectorAll('.agent-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const selectedBtn = document.querySelector(`.agent-btn[data-agent="${agent}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('active');
  }

  // 显示提示消息
  const agentNames = {
    'auto': '智能路由模式',
    'nutrition_agent': '营养专家模式',
    'fitness_agent': '健身教练模式'
  };

  const agentName = agentNames[agent] || '智能路由模式';

  // 在对话框中添加系统提示
  AppState.aiCoach.messages.push({
    role: 'system',
    content: `已切换到【${agentName}】`,
    timestamp: Date.now()
  });

  renderAiCoachMessages();
  saveAiCoachMessages();
};

// Multi-Agent API调用
async function streamAiCoachReply(message, history, onChunk) {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      message,
      userId: AppState.userId || 'anonymous',
      sessionId: AppState.aiCoach.sessionId || null,
      forceAgent: AppState.aiCoach.selectedAgent || null
    }),
  });
  if (res.status === 401) {
    showAuthPage();
    return '';
  }
  if (!res.ok) throw new Error('coach chat failed');

  const data = await res.json();

  // 保存会话ID
  AppState.aiCoach.sessionId = data.sessionId;

  // 保存Agent信息到消息
  if (data.agent) {
    AppState.aiCoach.lastAgent = data.agent;
    AppState.aiCoach.lastKnowledge = data.knowledgeUsed || 0;
  }

  // 模拟流式输出效果
  const reply = data.reply || '';
  const words = reply.split('');
  for (let i = 0; i < words.length; i++) {
    onChunk(words[i]);
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  return reply;
}

async function sendAiCoachMessage() {
  if (AppState.aiCoach.loading) return;
  hideAiCoachNudge();
  const input = document.getElementById('ai-coach-input');
  const message = input?.value.trim();
  if (!message) return;
  input.value = '';
  AppState.aiCoach.messages.push({ role: 'user', content: message, timestamp: Date.now() });
  const assistantMessage = {
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    provider: 'stream',
    streaming: true,
  };
  AppState.aiCoach.messages.push(assistantMessage);
  AppState.aiCoach.loading = true;
  saveAiCoachMessages();
  updateAiCoachQuickPrompts();
  renderAiCoachMessages();

  try {
    await streamAiCoachReply(
      message,
      AppState.aiCoach.messages
        .filter(item => item.content)
        .slice(-12)
        .map(item => ({ role: item.role, content: item.content })),
      chunk => {
        assistantMessage.content += chunk;
        renderAiCoachMessages();
      }
    );
  } catch (e) {
    if (!assistantMessage.content) {
      assistantMessage.content = '小瘦网络开小差了，稍后再试一下~';
    }
  } finally {
    assistantMessage.streaming = false;
    AppState.aiCoach.loading = false;
    updateAiCoachQuickPrompts();
    saveAiCoachMessages();
    renderAiCoachMessages();
  }
}

function initAiCoachDrag() {
  const btn = document.getElementById('xiaoshou-float');
  if (!btn || btn.dataset.dragReady === '1') return;
  btn.dataset.dragReady = '1';
  let startX = 0;
  let startY = 0;
  let baseLeft = 0;
  let baseBottom = 0;
  let dragging = false;

  btn.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    startY = event.clientY;
    const rect = btn.getBoundingClientRect();
    baseLeft = rect.left;
    baseBottom = window.innerHeight - rect.bottom;
    dragging = false;
    AppState.aiCoach.dragged = false;
    btn.setPointerCapture?.(event.pointerId);
  });

  btn.addEventListener('pointermove', (event) => {
    if (!btn.hasPointerCapture?.(event.pointerId)) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) < 8) return;
    dragging = true;
    AppState.aiCoach.dragged = true;
    const left = Math.max(12, Math.min(window.innerWidth - 72, baseLeft + dx));
    const bottom = Math.max(86, Math.min(window.innerHeight - 90, baseBottom - dy));
    btn.style.left = `${left}px`;
    btn.style.right = 'auto';
    btn.style.bottom = `${bottom}px`;
  });

  btn.addEventListener('pointerup', (event) => {
    btn.releasePointerCapture?.(event.pointerId);
    setTimeout(() => { AppState.aiCoach.dragged = false; }, 0);
    if (dragging) event.preventDefault();
  });

  btn.addEventListener('click', (event) => {
    if (AppState.aiCoach.dragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

function openTodayWeightSheet() {
  const today = new Date().toISOString().split('T')[0];
  const current = latestWeightValue() || '';
  openUserSheet('记录今日体重', `
    <div class="my-form-grid">
      <label><span>体重 kg</span><input id="today-weight-input" type="number" step="0.1" value="${current}"></label>
      <label><span>日期</span><input id="today-weight-date" type="date" value="${today}"></label>
    </div>
    <button type="button" onclick="saveTodayWeightFromSheet()" class="my-primary-btn">保存今日体重</button>
    <button type="button" onclick="openMyPlanSheet()" class="my-secondary-btn mt-3">设置目标</button>
  `, 'WEIGHT LOG');
}

async function saveTodayWeightFromSheet() {
  const weight = parseFloat(document.getElementById('today-weight-input')?.value);
  const date = document.getElementById('today-weight-date')?.value;
  if (!weight || weight <= 0) return showToast('请输入有效体重', 'warning');
  const res = await api('/api/weight', { method: 'POST', body: { weight, record_date: date } });
  if (!res) return;
  if (AppState.profile) {
    if (!AppState.profile.initial_weight) AppState.profile.initial_weight = latestWeightValue() || weight;
    AppState.profile.weight = weight;
    await api('/api/profile', { method: 'PUT', body: AppState.profile });
  }
  await loadWeightRecords();
  await loadCheckinCalendar();
  updateBMIDisplay();
  updateDashboard();
  renderMyPage();
  closeUserSheet();
  showToast('体重已记录');
}

function openWeighReminderSheet() {
  const time = AppState.profile?.reminder_weigh || '08:00';
  openUserSheet('称重提醒', `
    <div class="my-form-grid">
      <label><span>提醒时间</span><input id="my-weigh-reminder-time" type="time" value="${time}"></label>
    </div>
    <p class="my-muted">下次提醒：明天 ${time}</p>
    <button type="button" onclick="saveWeighReminderFromSheet()" class="my-primary-btn">保存提醒</button>
  `, 'REMINDER');
}

function openReminderSettingsSheet() {
  const p = AppState.profile || {};
  openUserSheet('提醒设置', `
    <div class="reminder-sheet-list">
      <label>
        <span>称重提醒</span>
        <input id="sheet-reminder-weigh-time" type="time" value="${p.reminder_weigh || '08:00'}">
        <input id="sheet-reminder-weigh-enabled" type="checkbox" ${p.reminder_weigh_enabled ? 'checked' : ''}>
      </label>
      <label>
        <span>喝水间隔</span>
        <select id="sheet-reminder-water-interval">
          ${[30, 60, 90, 120, 180].map(min => `<option value="${min}" ${Number(p.reminder_water_interval || 120) === min ? 'selected' : ''}>${min}分钟</option>`).join('')}
        </select>
        <input id="sheet-reminder-water-enabled" type="checkbox" ${p.reminder_water_enabled ? 'checked' : ''}>
      </label>
      <label>
        <span>运动提醒</span>
        <input id="sheet-reminder-exercise-time" type="time" value="${p.reminder_exercise || '18:00'}">
        <input id="sheet-reminder-exercise-enabled" type="checkbox" ${p.reminder_exercise_enabled ? 'checked' : ''}>
      </label>
    </div>
    <button type="button" onclick="saveReminderSettingsFromSheet()" class="my-primary-btn">保存提醒设置</button>
  `, 'REMINDER CENTER');
}

async function saveReminderSettingsFromSheet() {
  AppState.profile = {
    ...AppState.profile,
    reminder_weigh: document.getElementById('sheet-reminder-weigh-time')?.value || '08:00',
    reminder_weigh_enabled: document.getElementById('sheet-reminder-weigh-enabled')?.checked ? 1 : 0,
    reminder_water_interval: parseInt(document.getElementById('sheet-reminder-water-interval')?.value) || 120,
    reminder_water_enabled: document.getElementById('sheet-reminder-water-enabled')?.checked ? 1 : 0,
    reminder_exercise: document.getElementById('sheet-reminder-exercise-time')?.value || '18:00',
    reminder_exercise_enabled: document.getElementById('sheet-reminder-exercise-enabled')?.checked ? 1 : 0,
  };
  const res = await api('/api/profile', { method: 'PUT', body: AppState.profile });
  if (!res) return;
  fillReminderForm();
  startReminders();
  updateDashboardWeightCards();
  closeUserSheet();
  showToast('提醒设置已保存');
}

async function saveWeighReminderFromSheet() {
  const time = document.getElementById('my-weigh-reminder-time')?.value || '08:00';
  AppState.profile = { ...AppState.profile, reminder_weigh: time, reminder_weigh_enabled: 1 };
  const res = await api('/api/profile', { method: 'PUT', body: AppState.profile });
  if (!res) return;
  fillReminderForm();
  updateDashboardWeightCards();
  closeUserSheet();
  showToast('称重提醒已保存');
}

async function toggleDashboardWeighReminder(enabled) {
  if (enabled) await requestNotificationPermission();
  AppState.profile = { ...AppState.profile, reminder_weigh_enabled: enabled ? 1 : 0 };
  const res = await api('/api/profile', { method: 'PUT', body: AppState.profile });
  if (res) {
    fillReminderForm();
    startReminders();
    updateDashboardWeightCards();
  }
}

function openMyPlanSheet() {
  const current = latestWeightValue() || AppState.profile?.weight || 70;
  openUserSheet('我的计划', `
    <div class="my-form-grid">
      <label><span>当前体重</span><input id="my-plan-current" type="number" value="${current}" readonly></label>
      <label><span>目标体重</span><input id="my-plan-target" type="number" step="0.1" value="${AppState.profile?.target_weight || ''}" oninput="calcMyPlanPreview()"></label>
      <label><span>目标日期</span><input id="my-plan-date" type="date" value="${AppState.profile?.target_date || ''}" oninput="calcMyPlanPreview()"></label>
    </div>
    <div id="my-plan-preview" class="my-plan-preview hidden">
      <div><strong id="my-preview-intake">--</strong><span>每日摄入</span></div>
      <div><strong id="my-preview-exercise">--</strong><span>运动目标</span></div>
      <p id="my-preview-days"></p>
    </div>
    <button type="button" onclick="saveMyPlan()" class="my-primary-btn">保存计划</button>
  `, 'FAT LOSS PLAN');
  calcMyPlanPreview();
}

async function calcMyPlanPreview() {
  const current = parseFloat(document.getElementById('my-plan-current')?.value);
  const target = parseFloat(document.getElementById('my-plan-target')?.value);
  const date = document.getElementById('my-plan-date')?.value;
  const box = document.getElementById('my-plan-preview');
  if (!current || !target || !date || !box) return box?.classList.add('hidden');
  const res = await api('/api/calc-plan', { method: 'POST', body: { current_weight: current, target_weight: target, target_date: date } });
  if (!res?.data) return;
  document.getElementById('my-preview-intake').textContent = res.data.dailyIntakeTarget;
  document.getElementById('my-preview-exercise').textContent = res.data.exerciseBurnTarget;
  document.getElementById('my-preview-days').textContent = `目标周期 ${res.data.daysToTarget} 天，需要减 ${res.data.weightToLose}kg`;
  box.classList.remove('hidden');
}

async function saveMyPlan() {
  const target = parseFloat(document.getElementById('my-plan-target')?.value);
  const date = document.getElementById('my-plan-date')?.value;
  if (!target || !date) return showToast('请填写完整目标信息', 'warning');
  const data = { ...AppState.profile, initial_weight: AppState.profile?.initial_weight || latestWeightValue() || AppState.profile?.weight, target_weight: target, target_date: date };
  const res = await api('/api/profile', { method: 'PUT', body: data });
  if (!res) return;
  AppState.profile = data;
  await refreshSavedPlanPreview();
  updateDashboard();
  renderMyPage();
  closeUserSheet();
  showToast('计划已保存');
}

function activityLevelToEngineValue(level) {
  const map = { sedentary: 1, light: 2, moderate: 3, active: 4, heavy: 4, very_active: 5 };
  return map[level] || 1;
}

function getLocalCalcMetrics() {
  const currentWeight = latestWeightValue() || AppState.profile?.weight || 0;
  const targetWeight = Number(AppState.profile?.target_weight) || 0;
  const tdee = calcTDEE();
  const bmi = calcBMI();
  const status = getBMIStatus(bmi);
  const dailyDeficit = tdee ? Math.min(Math.round(tdee * 0.2), 500) : 0;
  const weeklyLoss = dailyDeficit ? dailyDeficit * 7 / 7700 : 0;
  const estimatedWeeks = currentWeight > targetWeight && weeklyLoss ? (currentWeight - targetWeight) / weeklyLoss : 0;
  return {
    bmr: calcBMR(),
    tdee,
    bmi,
    bmiCategory: status.text,
    currentWeight,
    targetWeight,
    dailyDeficit,
    dailyIntake: tdee && dailyDeficit ? tdee - dailyDeficit : 0,
    estimatedWeeks,
  };
}

function renderCalcCardsMarkup(metrics, engineReady) {
  return `
    <h4>精准计算${engineReady ? '（C++引擎）' : '（本地预览）'}</h4>
    <div class="cpp-metric-grid">
      <div><span>BMR</span><strong>${metrics.bmr ? Math.round(metrics.bmr) : '--'}</strong><em>kcal/天</em></div>
      <div><span>TDEE</span><strong>${metrics.tdee ? Math.round(metrics.tdee) : '--'}</strong><em>kcal/天</em></div>
      <div><span>BMI</span><strong>${metrics.bmi || '--'}</strong><em>${metrics.bmiCategory || '--'}</em></div>
    </div>
    <div class="cpp-plan-box">
      <h5>减脂计划</h5>
      <p>目标：${metrics.currentWeight || '--'}kg → ${metrics.targetWeight || '--'}kg</p>
      <p>预计需要：${metrics.estimatedWeeks ? metrics.estimatedWeeks.toFixed(1) : '--'} 周</p>
      <p>建议每日摄入：${metrics.dailyIntake ? Math.round(metrics.dailyIntake) : '--'} kcal</p>
      <p>每日缺口：${metrics.dailyDeficit ? Math.round(metrics.dailyDeficit) : '--'} kcal</p>
    </div>
  `;
}

async function refreshCppCalcCard() {
  const card = document.getElementById('cpp-calc-card');
  const p = AppState.profile || {};
  const currentWeight = latestWeightValue() || p.weight;
  if (!card || !p.height || !p.age || !currentWeight) return;
  try {
    const tdeeRes = await api('/api/calc', {
      method: 'POST',
      body: {
        action: 'tdee',
        weight: Number(currentWeight),
        height: Number(p.height),
        age: Number(p.age),
        gender: p.gender || 'male',
        activity_level: activityLevelToEngineValue(p.activity_level),
      },
    });
    const bmiRes = await api('/api/calc', {
      method: 'POST',
      body: { action: 'bmi', weight: Number(currentWeight), height: Number(p.height) },
    });
    const targetWeight = Number(p.target_weight);
    let planRes = null;
    if (tdeeRes?.success && targetWeight && targetWeight < Number(currentWeight)) {
      planRes = await api('/api/calc', {
        method: 'POST',
        body: {
          action: 'weight_plan',
          current_weight: Number(currentWeight),
          target_weight: targetWeight,
          tdee: Number(tdeeRes.result.tdee),
        },
      });
    }
    if (!tdeeRes?.success || !bmiRes?.success) return;
    const local = getLocalCalcMetrics();
    const metrics = {
      ...local,
      bmr: tdeeRes.result.bmr,
      tdee: tdeeRes.result.tdee,
      bmi: bmiRes.result.bmi,
      bmiCategory: bmiRes.result.category,
      dailyDeficit: planRes?.result?.daily_deficit || local.dailyDeficit,
      dailyIntake: planRes?.result?.daily_intake || local.dailyIntake,
      estimatedWeeks: planRes?.result?.estimated_weeks || local.estimatedWeeks,
    };
    card.innerHTML = renderCalcCardsMarkup(metrics, true);
  } catch (e) {
    // Keep the local preview when the native engine is not built.
  }
}

function openBodyProfileSheet() {
  const p = AppState.profile || {};
  const bmi = calcBMI();
  const status = getBMIStatus(bmi);
  openUserSheet('身体档案', `
    <div class="my-profile-cards">
      <div class="my-profile-card">
        <h4>基础信息</h4>
        <div class="profile-avatar-editor">
          <div id="my-profile-avatar-preview" class="me-avatar">${AppState.user?.username?.slice(0, 1).toUpperCase() || '我'}</div>
          <label for="my-profile-avatar-input" class="neo-mini-btn cursor-pointer select-none">更换头像</label>
          <input type="file" id="my-profile-avatar-input" accept="image/*" class="hidden" onchange="handleProfileAvatar(this.files?.[0])">
        </div>
        <div class="my-form-grid">
          <label><span>性别</span><select id="my-profile-gender"><option value="male" ${p.gender !== 'female' ? 'selected' : ''}>男</option><option value="female" ${p.gender === 'female' ? 'selected' : ''}>女</option></select></label>
          <label><span>年龄</span><input id="my-profile-age" type="number" value="${p.age || ''}"></label>
          <label><span>身高 cm</span><input id="my-profile-height" type="number" value="${p.height || ''}"></label>
          <label><span>初始体重 kg</span><input id="my-profile-initial-weight" type="number" step="0.1" value="${p.initial_weight || latestWeightValue() || p.weight || ''}"></label>
          <label><span>当前体重 kg</span><input id="my-profile-weight" type="number" step="0.1" value="${latestWeightValue() || p.weight || ''}"></label>
        </div>
        <button type="button" onclick="saveMyProfile()" class="my-primary-btn">保存档案</button>
      </div>
      <div class="my-profile-card">
        <h4>身体数据</h4>
        <div class="my-metric-grid">
          <div><strong>${bmi || '--'}</strong><span>身体质量指数 BMI</span><em class="${status.color}">${status.text}</em></div>
          <div><strong>${calcBMR() || '--'}</strong><span>基础代谢 BMR</span><em>kcal/天</em></div>
          <div><strong>${AppState.profile?.target_weight || '--'}</strong><span>目标体重</span><em>kg</em></div>
        </div>
      </div>
      <div id="cpp-calc-card" class="my-profile-card cpp-calc-card">
        ${renderCalcCardsMarkup(getLocalCalcMetrics(), false)}
      </div>
      <div class="my-profile-card my-weight-trend-card">
        <h4>近期体重趋势</h4>
        <div class="my-mini-chart-wrap"><canvas id="my-mini-weight-chart"></canvas></div>
      </div>
    </div>
  `, 'BODY FILE');
  renderAvatarElement('my-profile-avatar-preview', p.avatar_url, AppState.user?.username?.slice(0, 1).toUpperCase() || '我');
  setTimeout(() => updateMiniWeightChart(AppState.weightRecords, AppState.profile), 80);
  refreshCppCalcCard();
}

async function saveMyProfile() {
  const data = {
    ...AppState.profile,
    gender: document.getElementById('my-profile-gender')?.value || 'male',
    age: parseFloat(document.getElementById('my-profile-age')?.value) || 25,
    height: parseFloat(document.getElementById('my-profile-height')?.value) || 170,
    initial_weight: parseFloat(document.getElementById('my-profile-initial-weight')?.value) || AppState.profile?.initial_weight || latestWeightValue() || 70,
    weight: parseFloat(document.getElementById('my-profile-weight')?.value) || 70,
  };
  const res = await api('/api/profile', { method: 'PUT', body: data });
  if (!res) return;
  AppState.profile = data;
  fillProfileForm();
  updateBMIDisplay();
  updateDashboard();
  renderMyPage();
  openBodyProfileSheet();
  showToast('身体档案已保存');
}

async function handleProfileAvatar(file) {
  if (!file) return;
  try {
    AppState.profile = {
      ...AppState.profile,
      avatar_url: `data:image/jpeg;base64,${await fileToCompressedBase64(file, 360)}`,
    };
    renderAvatarElement('my-profile-avatar-preview', AppState.profile.avatar_url, '我');
    renderMyPage();
  } catch (e) {
    showToast('头像处理失败，请换一张图片', 'error');
  }
}

function openMyHistorySheet() {
  const today = new Date().toISOString().split('T')[0];
  openUserSheet('历史记录', `
    <div class="my-history-controls">
      <button type="button" onclick="changeMyHistoryDate(-1)">‹</button>
      <input id="my-history-date" type="date" value="${today}" onchange="loadMyHistory()">
      <button type="button" onclick="changeMyHistoryDate(1)">›</button>
    </div>
    <div id="my-history-calendar" class="my-mini-calendar"></div>
    <div id="my-history-content" class="my-history-content"></div>
  `, 'HISTORY');
  renderMyMiniCalendar(today);
  loadMyHistory();
}

function changeMyHistoryDate(offset) {
  const input = document.getElementById('my-history-date');
  if (!input?.value) return;
  const d = new Date(input.value);
  d.setDate(d.getDate() + offset);
  input.value = d.toISOString().split('T')[0];
  renderMyMiniCalendar(input.value);
  loadMyHistory();
}

function renderMyMiniCalendar(selectedDate) {
  const grid = document.getElementById('my-history-calendar');
  if (!grid) return;
  const base = new Date(selectedDate || new Date());
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const checked = new Set(AppState.checkinCalendar?.checkinDates || []);
  let html = ['一','二','三','四','五','六','日'].map(d => `<b>${d}</b>`).join('');
  for (let i = 0; i < offset; i++) html += '<span></span>';
  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    html += `<button type="button" onclick="selectMyHistoryDate('${date}')" class="${date === selectedDate ? 'active' : ''} ${checked.has(date) ? 'has-record' : ''}">${day}</button>`;
  }
  grid.innerHTML = html;
}

function selectMyHistoryDate(date) {
  const input = document.getElementById('my-history-date');
  if (input) input.value = date;
  renderMyMiniCalendar(date);
  loadMyHistory();
}

async function loadMyHistory() {
  const date = document.getElementById('my-history-date')?.value || new Date().toISOString().split('T')[0];
  const res = await api(`/api/history?date=${date}`);
  const box = document.getElementById('my-history-content');
  if (!res?.data || !box) return;
  const data = res.data;
  const mealNames = { breakfast: '早', lunch: '午', dinner: '晚', snack: '加餐' };
  const weight = data.weight?.length ? data.weight.map(w => `${w.weight}kg`).join('、') : '暂无记录';
  const food = data.food?.length ? data.food.map(f => `${mealNames[f.meal_type] || f.meal_type} ${f.food_name}(${f.amount_g}g/${Number(f.total_calories).toFixed(0)}kcal)`).join('<br>') : '暂无记录';
  const exercise = data.exercise?.length ? data.exercise.map(e => `${e.exercise_name} ${e.duration_min}分钟 -${Number(e.calories_burned).toFixed(0)}kcal`).join('<br>') : '暂无记录';
  const waterTotal = data.water?.reduce((sum, item) => sum + Number(item.amount_ml || 0), 0) || 0;
  const water = data.water?.length ? `💧 总计 ${waterTotal}ml (${data.water.length}次)` : '暂无记录';
  box.innerHTML = `
    ${renderMyHistoryBlock('体重', weight)}
    ${renderMyHistoryBlock('饮食', food)}
    ${renderMyHistoryBlock('运动', exercise)}
    ${renderMyHistoryBlock('饮水', water)}
  `;
}

function renderMyHistoryBlock(title, content) {
  return `<div class="my-history-block"><h4>${title}</h4><div>${content}</div></div>`;
}

async function openMyStatsSheet(period = 'week') {
  openUserSheet('打卡统计', `
    <div class="my-stats-tabs">
      <button onclick="openMyStatsSheet('week')" class="${period === 'week' ? 'active' : ''}">本周</button>
      <button onclick="openMyStatsSheet('month')" class="${period === 'month' ? 'active' : ''}">本月</button>
      <button onclick="openMyStatsSheet('all')" class="${period === 'all' ? 'active' : ''}">全部</button>
    </div>
    <div id="my-stats-body" class="my-stats-body"><p class="my-muted">加载中...</p></div>
  `, 'REPORT');
  const apiPeriod = period === 'all' ? 'month' : period;
  const res = await api(`/api/stats?period=${apiPeriod}`);
  if (!res?.data) return;
  renderMyStats(res.data);
}

function renderMyStats(data) {
  const body = document.getElementById('my-stats-body');
  if (!body) return;
  const totalExerciseKcal = (data.dailyExercise || []).reduce((sum, item) => sum + Number(item.daily_cal || 0), 0);
  const weightChange = data.weight?.change;
  body.innerHTML = `
    <div class="my-stats-summary">
      <div><strong>${data.checkinDays || 0}/${data.daysDiff || 0}</strong><span>打卡天数</span></div>
      <div><strong>${data.avgIntake || 0}</strong><span>日均摄入</span></div>
      <div><strong>${Math.round(totalExerciseKcal)}</strong><span>运动消耗</span></div>
      <div><strong>${weightChange ?? '--'}</strong><span>体重变化kg</span></div>
    </div>
    <div class="my-history-block my-chart-block"><h4>运动类型分布</h4><div class="my-stats-chart-wrap"><canvas id="my-stats-type-chart"></canvas></div></div>
    <div class="my-history-block my-chart-block"><h4>每日热量趋势</h4><div class="my-stats-chart-wrap"><canvas id="my-stats-daily-chart"></canvas></div></div>
  `;
  setTimeout(() => updateMyStatsCharts(data), 80);
}

// ─── 饮食功能 ──────────────────────────────────────
let selectedFood = null;
let calendarMonth = null;
let statsPeriod = 'week';
let reminderTimers = [];

function searchFood(keyword) {
  const resultsContainer = document.getElementById('food-search-results');
  const noResult = document.getElementById('food-no-result');

  if (!keyword.trim()) {
    resultsContainer.classList.add('hidden');
    noResult.classList.add('hidden');
    return;
  }

  const results = searchFoodDB(keyword, AppState.customFoods);

  if (results.length === 0) {
    resultsContainer.classList.add('hidden');
    noResult.classList.remove('hidden');
    return;
  }

  noResult.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  resultsContainer.innerHTML = results.slice(0, 20).map(food => `
    <button onclick="selectFood('${food.name.replace(/'/g, "\\'")}', ${food.cal}, ${food.isCustom})" class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-all text-left">
      <div>
        <span class="text-sm font-medium text-gray-700">${food.name}</span>
        <span class="text-xs text-gray-400 ml-2">${food.category}</span>
        <span class="block mt-1">${renderFoodScore(food.name, food.cal, 100, document.getElementById('food-meal')?.value || 'lunch')}</span>
      </div>
      <span class="text-sm text-primary-600 font-medium">${food.cal} kcal/100g</span>
    </button>
  `).join('');
}

function calcFoodScore(foodName, calPer100g, amountG, mealType) {
  const todayIntake = AppState.todayFood.reduce((s, f) => s + Number(f.total_calories || 0), 0);
  const target = calcTargetCal() || 1500;
  const remaining = target - todayIntake;
  const totalCal = calPer100g * (amountG || 100) / 100;
  let score = 45;

  score += calPer100g <= 50 ? 30 : calPer100g <= 100 ? 22 : calPer100g <= 180 ? 12 : calPer100g <= 250 ? 2 : -8;

  let timeScore = 15;
  if (mealType === 'dinner' && calPer100g > 150) timeScore = 5;
  if (mealType === 'breakfast' && calPer100g > 200) timeScore = 8;
  if (mealType === 'snack' && calPer100g > 100) timeScore = 3;
  if (new Date().getHours() >= 21 && calPer100g > 100) timeScore = 0;
  score += timeScore;

  if (remaining <= 0) score -= 20;
  else if (totalCal > remaining) score -= 10;
  else if (totalCal <= remaining * 0.3) score += 6;

  const leanProtein = ['鸡胸肉', '鱼肉', '虾', '豆腐', '蛋白', '瘦猪肉'];
  const normalProtein = ['鸡蛋', '牛肉', '牛奶', '鸡腿'];
  const friedOrDessert = ['炸鸡', '薯条', '油条', '蛋糕', '奶茶', '油炸', '炸'];
  const heavyMeal = ['烧烤', '火锅', '肥肉', '五花肉', '猪排骨', '披萨', '汉堡'];
  const sugaryDrink = ['可乐', '雪碧', '果汁', '含糖'];
  if (leanProtein.some(k => foodName.includes(k))) score += 15;
  else if (normalProtein.some(k => foodName.includes(k))) score += 6;
  if (friedOrDessert.some(k => foodName.includes(k))) score -= 22;
  if (heavyMeal.some(k => foodName.includes(k))) score -= 25;
  if (sugaryDrink.some(k => foodName.includes(k))) score -= 18;
  if (calPer100g >= 300) score -= 8;

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (score >= 75) return { score, label: '非常适合', color: 'text-green-600 bg-green-50 border-green-200' };
  if (score >= 55) return { score, label: '还行', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  return { score, label: '建议少吃', color: 'text-red-600 bg-red-50 border-red-200' };
}

function renderFoodScore(foodName, calPer100g, amountG, mealType) {
  const result = calcFoodScore(foodName, calPer100g, amountG, mealType);
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${result.color}">${result.label} (${result.score}分)</span>`;
}

function triggerAiFoodPhoto() {
  document.getElementById('ai-food-photo-input')?.click();
}

function openAiCameraModal() {
  const modal = document.getElementById('ai-camera-modal');
  const status = document.getElementById('ai-camera-status');
  if (!modal) return triggerAiFoodPhoto();
  modal.classList.remove('hidden');
  if (status) status.textContent = '准备扫描食物';
}

function closeAiCameraModal() {
  stopAiCamera();
  document.getElementById('ai-camera-modal')?.classList.add('hidden');
}

async function startAiCamera() {
  const video = document.getElementById('ai-camera-video');
  const placeholder = document.getElementById('ai-camera-placeholder');
  const status = document.getElementById('ai-camera-status');
  if (!navigator.mediaDevices?.getUserMedia || !video) {
    showToast('当前浏览器不支持相机，已切换到相册导入', 'warning');
    triggerAiFoodPhoto();
    return;
  }
  try {
    stopAiCamera();
    if (status) status.textContent = '正在开启摄像头...';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
    AppState.aiCameraStream = stream;
    video.srcObject = stream;
    await video.play();
    video.classList.add('is-active');
    placeholder?.classList.add('hidden');
    if (status) status.textContent = '对准餐食后点击拍照扫描';
  } catch (e) {
    if (status) status.textContent = '摄像头不可用';
    showToast('无法打开摄像头，请用相册导入', 'warning');
    triggerAiFoodPhoto();
  }
}

function stopAiCamera() {
  if (AppState.aiCameraStream) {
    AppState.aiCameraStream.getTracks().forEach(track => track.stop());
    AppState.aiCameraStream = null;
  }
  const video = document.getElementById('ai-camera-video');
  const placeholder = document.getElementById('ai-camera-placeholder');
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.remove('is-active');
  }
  placeholder?.classList.remove('hidden');
}

async function captureAiCameraPhoto() {
  const video = document.getElementById('ai-camera-video');
  const canvas = document.getElementById('ai-camera-canvas');
  const status = document.getElementById('ai-camera-status');
  if (!video?.srcObject || !canvas || !video.videoWidth) {
    showToast('请先开启相机', 'warning');
    return;
  }
  const size = Math.min(video.videoWidth, video.videoHeight);
  const sx = Math.max(0, (video.videoWidth - size) / 2);
  const sy = Math.max(0, (video.videoHeight - size) / 2);
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  if (status) status.textContent = 'AI正在扫描餐食...';
  const image = canvas.toDataURL('image/jpeg', 0.84).split(',')[1];
  const ok = await analyzeAiFoodImage(image);
  if (ok) closeAiCameraModal();
  else if (status) status.textContent = '没有识别到明确食物，请重新拍摄';
}

function fileToCompressedBase64(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('请选择图片'));
    if (!file.type.startsWith('image/')) return reject(new Error('请选择图片文件'));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = () => reject(new Error('图片读取失败'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function analyzeAiFoodImage(image) {
  const loading = document.getElementById('ai-food-loading');
  const result = document.getElementById('ai-food-result');
  try {
    loading?.classList.remove('hidden');
    result?.classList.add('hidden');
    AppState.aiFood = { foods: [], summary: '' };
    const res = await api('/api/ai/recognize-food', { method: 'POST', body: { image } });
    const foods = res?.data?.foods || [];
    if (!foods.length) {
      result?.classList.add('hidden');
      return false;
    }
    AppState.aiFood = { foods, summary: res.data.summary || '' };
    renderAiFoodResult();
    if (AppState.canIEat.estimateMode) {
      fillCanIEatFromAiEstimate(foods);
      return true;
    }
    if (AppState.canIEat.photoMode) {
      fillCanIEatFromAiEstimate(foods, { silent: true });
      await submitCanIEatFoods(foods);
    }
    return true;
  } finally {
    loading?.classList.add('hidden');
  }
}

async function handleAiFoodPhoto(file) {
  const input = document.getElementById('ai-food-photo-input');
  try {
    if (!file) return;
    const image = await fileToCompressedBase64(file);
    const ok = await analyzeAiFoodImage(image);
    if (ok) closeAiCameraModal();
  } catch (e) {
    showToast(e.message || 'AI识别失败', 'error');
  } finally {
    if (input) input.value = '';
  }
}

function renderAiFoodResult() {
  const container = document.getElementById('ai-food-result');
  if (!container) return;
  const foods = AppState.aiFood.foods || [];
  if (!foods.length) {
    container.classList.add('hidden');
    return;
  }
  const total = foods.reduce((sum, item) => sum + Math.round(Number(item.total_calories || 0)), 0);
  container.innerHTML = `
    <div class="ai-result-card">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 class="text-base font-black text-gray-800">📸 AI识别结果</h3>
          <p class="text-xs text-gray-500 mt-1">${AppState.aiFood.summary || '请确认识别结果和分量'}</p>
        </div>
        <span class="ai-total-badge">${total} kcal</span>
      </div>
      <div class="space-y-2">
        ${foods.map((food, index) => renderAiFoodRow(food, index)).join('')}
      </div>
      <div class="ai-result-total">
        <span>合计约</span>
        <strong id="ai-food-total">${total}</strong>
        <span>kcal</span>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-4">
        <button type="button" onclick="renderAiFoodResult()" class="neo-mini-btn">重新计算</button>
        <button type="button" onclick="confirmAiFoodAdd()" class="btn-primary">确认添加</button>
      </div>
    </div>
  `;
  const actionRow = container.querySelector('.grid');
  if (actionRow && !actionRow.querySelector('[data-can-eat-ai-action]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'neo-mini-btn';
    button.dataset.canEatAiAction = '1';
    button.textContent = '我能吃吗';
    button.onclick = submitAiFoodToCanIEat;
    actionRow.insertBefore(button, actionRow.lastElementChild);
  }
  container.classList.remove('hidden');
}

function renderAiFoodRow(food, index) {
  return `
    <div class="ai-food-row" data-ai-food-index="${index}">
      <div class="min-w-0">
        <input class="ai-food-name" value="${escapeHtml(food.name)}" onchange="updateAiFoodItem(${index}, 'name', this.value)">
        <p class="text-[11px] text-gray-400">${food.matched ? '已用本地食物库校准' : 'AI估算'} · 置信度 ${Math.round((food.confidence || 0) * 100)}%</p>
      </div>
      <div class="ai-food-inputs">
        <label><input type="number" value="${Math.round(food.estimated_amount_g)}" min="1" oninput="updateAiFoodItem(${index}, 'estimated_amount_g', this.value)">g</label>
        <label><input type="number" value="${Math.round(food.calories_per_100g)}" min="1" oninput="updateAiFoodItem(${index}, 'calories_per_100g', this.value)">kcal/100g</label>
      </div>
      <strong id="ai-food-cal-${index}" class="ai-food-cal">${Math.round(food.total_calories)} kcal</strong>
      <button type="button" onclick="removeAiFoodItem(${index})" class="ai-food-remove">×</button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function updateAiFoodItem(index, field, value) {
  const item = AppState.aiFood.foods[index];
  if (!item) return;
  if (field === 'estimated_amount_g' || field === 'calories_per_100g') {
    item[field] = Math.max(1, Number(value) || 1);
    item.total_calories = Math.round(item.estimated_amount_g * item.calories_per_100g / 100);
    const calEl = document.getElementById(`ai-food-cal-${index}`);
    if (calEl) calEl.textContent = `${item.total_calories} kcal`;
  } else {
    item[field] = value;
  }
  updateAiFoodTotal();
}

function updateAiFoodTotal() {
  const total = AppState.aiFood.foods.reduce((sum, item) => sum + Math.round(Number(item.total_calories || 0)), 0);
  const totalEl = document.getElementById('ai-food-total');
  if (totalEl) totalEl.textContent = total;
}

function openCanIEatPanel(seedFood) {
  const sheet = document.getElementById('can-i-eat-sheet');
  if (!sheet) return;
  sheet.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  AppState.canIEat.photoMode = false;
  AppState.canIEat.estimateMode = false;
  if (seedFood || selectedFood) {
    const food = seedFood || selectedFood;
    document.getElementById('can-eat-name').value = food.name || food.food_name || '';
    document.getElementById('can-eat-cal').value = Math.round(Number(food.cal || food.calories_per_100g || 0)) || '';
    document.getElementById('can-eat-amount').value = Math.round(Number(food.amount_g || food.estimated_amount_g || 100)) || '';
    document.getElementById('can-eat-meal').value = food.meal_type || document.getElementById('food-meal')?.value || 'snack';
    setCanIEatCalorieSource(food.cal || food.calories_per_100g ? 'manual' : 'idle', food.name || food.food_name || '');
  } else {
    updateCanIEatCalorieFromName();
  }
}

function closeCanIEatPanel() {
  document.getElementById('can-i-eat-sheet')?.classList.add('hidden');
  document.body.style.overflow = '';
  AppState.canIEat.photoMode = false;
  AppState.canIEat.estimateMode = false;
}

function openCanIEatCamera() {
  AppState.canIEat.photoMode = true;
  AppState.canIEat.estimateMode = false;
  closeCanIEatPanel();
  AppState.canIEat.photoMode = true;
  openAiCameraModal();
}

function getCanIEatCalorieSourceEl() {
  return document.getElementById('can-eat-cal-source');
}

function setCanIEatCalorieSource(status, foodName) {
  const sourceEl = getCanIEatCalorieSourceEl();
  if (!sourceEl) return;
  const labels = {
    manual: '热量来源：用户填写',
    local: `热量来源：本地食物库${foodName ? `（${foodName}）` : ''}`,
    ai: '热量来源：AI估算，可手动修改',
    estimating: 'AI正在估算热量，请稍等...',
    needs_estimate: '本地库没找到，可手填热量或点 AI估算热量',
    idle: '输入食物名后自动匹配热量',
  };
  sourceEl.textContent = labels[status] || labels.idle;
  sourceEl.dataset.source = status || 'idle';
}

function resolveCanIEatCurrentCalorie(manualOnly = false) {
  const resolver = window.resolveCanIEatCalorieSource;
  const name = document.getElementById('can-eat-name')?.value?.trim() || '';
  const calEl = document.getElementById('can-eat-cal');
  const source = getCanIEatCalorieSourceEl()?.dataset.source;
  const manualCalories = source === 'manual' || source === 'ai' || manualOnly ? calEl?.value : 0;
  if (typeof resolver !== 'function') {
    const calories = Number(calEl?.value || 0);
    return calories > 0
      ? { status: source || 'manual', caloriesPer100g: calories, matchedFood: null }
      : { status: 'needs_estimate', caloriesPer100g: 0, matchedFood: null };
  }
  return resolver({ name, manualCalories }, FOOD_DATABASE);
}

function updateCanIEatCalorieFromName() {
  const calEl = document.getElementById('can-eat-cal');
  if (!calEl) return;
  const source = getCanIEatCalorieSourceEl()?.dataset.source;
  if (source === 'manual' && Number(calEl.value) > 0) return;
  const resolved = resolveCanIEatCurrentCalorie(false);
  if (resolved.status === 'local' && resolved.caloriesPer100g > 0) {
    calEl.value = Math.round(resolved.caloriesPer100g);
    setCanIEatCalorieSource('local', resolved.matchedFood?.name);
    return;
  }
  if (source !== 'ai') calEl.value = '';
  setCanIEatCalorieSource(resolved.status);
}

function handleCanIEatNameInput() {
  const sourceEl = getCanIEatCalorieSourceEl();
  if (sourceEl?.dataset.source !== 'manual') updateCanIEatCalorieFromName();
}

function handleCanIEatCalorieInput() {
  const cal = Number(document.getElementById('can-eat-cal')?.value || 0);
  if (cal > 0) setCanIEatCalorieSource('manual');
  else updateCanIEatCalorieFromName();
}

function setCanIEatEstimateLoading(isLoading) {
  const button = document.getElementById('can-eat-estimate-btn');
  if (!button) return;
  button.disabled = !!isLoading;
  button.classList.toggle('is-loading', !!isLoading);
  button.textContent = isLoading ? 'AI正在估算...' : 'AI估算热量';
}

async function estimateCanIEatCalorie() {
  const name = document.getElementById('can-eat-name')?.value?.trim();
  const calEl = document.getElementById('can-eat-cal');
  if (!name) return showToast('请先输入食物名称', 'warning');
  setCanIEatEstimateLoading(true);
  setCanIEatCalorieSource('estimating');

  try {
    const local = resolveCanIEatCurrentCalorie(false);
    if (local.status === 'local' && local.caloriesPer100g > 0) {
      if (calEl) calEl.value = Math.round(local.caloriesPer100g);
      setCanIEatCalorieSource('local', local.matchedFood?.name);
      return;
    }

    const res = await api('/api/ai/estimate-food-calorie', {
      method: 'POST',
      body: { food_name: name },
    });
    if (!res?.data) {
      setCanIEatCalorieSource('needs_estimate');
      return;
    }
    if (calEl) calEl.value = Math.round(Number(res.data.calories_per_100g || 0)) || '';
    setCanIEatCalorieSource(res.data.source === 'local' ? 'local' : 'ai', res.data.food_name || name);
    showToast(`已填入 ${res.data.calories_per_100g} kcal/100g`);
  } finally {
    setCanIEatEstimateLoading(false);
  }
}

function fillCanIEatFromAiEstimate(foods, options = {}) {
  const first = normalizeCanIEatFoods(foods)[0];
  AppState.canIEat.estimateMode = false;
  if (!first) return showToast('没有识别到可估算热量的食物', 'warning');
  const sheet = document.getElementById('can-i-eat-sheet');
  sheet?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('can-eat-name').value = first.name || '';
  document.getElementById('can-eat-cal').value = Math.round(first.calories_per_100g) || '';
  document.getElementById('can-eat-amount').value = Math.round(first.amount_g) || '';
  document.getElementById('can-eat-meal').value = first.meal_type || document.getElementById('food-meal')?.value || 'snack';
  setCanIEatCalorieSource('ai');
  if (!options.silent) showToast('已填入 AI 估算热量，可修改后再判断');
}

function canIEatFoodsFromManualForm() {
  const name = document.getElementById('can-eat-name')?.value?.trim();
  const resolved = resolveCanIEatCurrentCalorie(false);
  const calories = Number(resolved.caloriesPer100g || 0);
  const amount = Number(document.getElementById('can-eat-amount')?.value || 0);
  const mealType = document.getElementById('can-eat-meal')?.value || 'snack';
  if (!name) {
    showToast('请输入食物名称', 'warning');
    return null;
  }
  if (calories <= 0) {
    setCanIEatCalorieSource('needs_estimate');
    showToast('请手动填写热量，或使用 AI 估算热量', 'warning');
    return null;
  }
  if (amount <= 0) {
    showToast('请输入有效的分量', 'warning');
    return null;
  }
  document.getElementById('can-eat-cal').value = Math.round(calories);
  if (resolved.status === 'local') setCanIEatCalorieSource('local', resolved.matchedFood?.name);
  return [{ name, calories_per_100g: calories, amount_g: amount, meal_type: mealType }];
}

function normalizeCanIEatFoods(foods) {
  return (foods || []).map(food => ({
    name: food.name || food.food_name,
    calories_per_100g: Number(food.calories_per_100g || food.cal || 0),
    amount_g: Number(food.amount_g || food.estimated_amount_g || 0),
    meal_type: food.meal_type || document.getElementById('can-eat-meal')?.value || document.getElementById('food-meal')?.value || 'snack',
  })).filter(food => food.name && food.calories_per_100g > 0 && food.amount_g > 0);
}

async function submitCanIEatManual() {
  const foods = canIEatFoodsFromManualForm();
  if (foods) await submitCanIEatFoods(foods);
}

async function submitAiFoodToCanIEat() {
  const foods = normalizeCanIEatFoods(AppState.aiFood.foods);
  if (!foods.length) return showToast('没有可判断的识别结果', 'warning');
  await submitCanIEatFoods(foods);
}

async function submitCanIEatFoods(foods) {
  const normalized = normalizeCanIEatFoods(foods);
  if (!normalized.length) return showToast('请先提供食物和分量', 'warning');
  const sheet = document.getElementById('can-i-eat-sheet');
  const loading = document.getElementById('can-eat-loading');
  const result = document.getElementById('can-eat-result');
  sheet?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  loading?.classList.remove('hidden');
  if (result) result.innerHTML = '';
  AppState.canIEat.loading = true;
  AppState.canIEat.sourceFoods = normalized;
  try {
    const res = await api('/api/ai/can-i-eat', { method: 'POST', body: { foods: normalized } });
    if (!res?.data) return;
    AppState.canIEat.result = res.data;
    renderCanIEatResult(res.data);
  } finally {
    AppState.canIEat.loading = false;
    loading?.classList.add('hidden');
    AppState.canIEat.photoMode = false;
  }
}

function renderCanIEatResult(data) {
  const container = document.getElementById('can-eat-result');
  if (!container) return;
  const analysis = data.analysis;
  const budget = analysis.budget;
  const rescue = analysis.rescuePlan.exercises || [];
  const reduce = analysis.swapPlan.reduceAmount;
  const alternatives = analysis.swapPlan.alternatives || [];
  const statusLabel = analysis.status === 'over' ? '会超标' : analysis.status === 'tight' ? '能吃但偏紧' : '可以吃';
  container.innerHTML = `
    <div class="can-eat-summary ${analysis.status}">
      <span>${statusLabel}</span>
      <strong>${analysis.proposed.totalCalories} kcal</strong>
      <small>吃完剩余 ${budget.afterRemaining} kcal</small>
    </div>
    <div class="can-eat-copy">${escapeHtml(data.coachCopy || analysis.eatPlan.summary).replace(/\n/g, '<br>')}</div>
    <div class="can-eat-grid">
      <article>
        <h4>${escapeHtml(analysis.eatPlan.title)}</h4>
        <p>${escapeHtml(analysis.eatPlan.summary)}</p>
      </article>
      <article>
        <h4>${escapeHtml(analysis.rescuePlan.title)}</h4>
        ${rescue.length ? `<div class="can-eat-tags">${rescue.map(item => `<span>${escapeHtml(item.name)} ${item.minutes}分钟</span>`).join('')}</div>` : `<p>${escapeHtml(analysis.rescuePlan.summary)}</p>`}
      </article>
      <article>
        <h4>${escapeHtml(analysis.swapPlan.title)}</h4>
        <p>${escapeHtml(reduce.foodName)} ${reduce.originalAmountG}g → ${reduce.suggestedAmountG}g，少约 ${reduce.savedCalories} kcal</p>
        <div class="can-eat-tags">${alternatives.map(item => `<span>${escapeHtml(item.name)}</span>`).join('')}</div>
      </article>
    </div>
  `;
}

function removeAiFoodItem(index) {
  AppState.aiFood.foods.splice(index, 1);
  renderAiFoodResult();
}

async function confirmAiFoodAdd() {
  const foods = AppState.aiFood.foods || [];
  if (!foods.length) return showToast('没有可添加的识别结果', 'warning');
  const mealType = document.getElementById('food-meal')?.value || AppState.mealPicker.meal || 'lunch';
  for (const food of foods) {
    const amount = Math.max(1, Number(food.estimated_amount_g) || 100);
    const cal = Math.max(1, Number(food.calories_per_100g) || 100);
    const totalCal = Math.round(cal * amount / 100);
    const res = await api('/api/food', {
      method: 'POST',
      body: {
        food_name: food.name,
        calories_per_100g: cal,
        amount_g: amount,
        total_calories: totalCal,
        meal_type: mealType,
      },
    });
    if (!res) return;
  }
  showToast('AI识别结果已添加');
  AppState.aiFood = { foods: [], summary: '' };
  document.getElementById('ai-food-result')?.classList.add('hidden');
  await loadTodayFood();
  await loadFrequentFoods();
  await loadCheckinCalendar();
  updateDashboard();
  updateFoodRecommendation();
}

function selectFood(name, cal, isCustom) {
  const dbFood = FOOD_DATABASE.find(food => food.name === name);
  selectedFood = { name, cal, isCustom, category: dbFood?.category };
  document.getElementById('food-name').value = name;
  document.getElementById('food-cal').value = cal;
  document.getElementById('food-amount').value = '';
  applyFoodAmountHint(selectedFood);
  renderPortionQuickButtons(selectedFood);
  document.getElementById('food-total-cal').textContent = '0 kcal';
  document.getElementById('add-food-form').classList.remove('hidden');
  document.getElementById('food-amount').focus();
}

function calcFoodCalories() {
  if (!selectedFood) return;
  const amount = parseFloat(document.getElementById('food-amount').value) || 0;
  const total = Math.round(selectedFood.cal * amount / 100);
  document.getElementById('food-total-cal').textContent = `${total} kcal`;
}

function cancelAddFood() {
  document.getElementById('add-food-form').classList.add('hidden');
  selectedFood = null;
  document.getElementById('food-search').value = '';
  document.getElementById('food-search-results').classList.add('hidden');
  const amountInput = document.getElementById('food-amount');
  if (amountInput) amountInput.placeholder = '如: 200';
  renderPortionQuickButtons(null);
}

async function confirmAddFood() {
  if (!selectedFood) return;
  const amount = parseFloat(document.getElementById('food-amount').value);
  const mealType = document.getElementById('food-meal').value;

  if (!amount || amount <= 0) return showToast('请输入食用量', 'warning');

  const totalCal = Math.round(selectedFood.cal * amount / 100);

  const res = await api('/api/food', {
    method: 'POST',
    body: {
      food_name: selectedFood.name,
      calories_per_100g: selectedFood.cal,
      amount_g: amount,
      total_calories: totalCal,
      meal_type: mealType,
    }
  });

  if (res) {
    showToast('饮食已记录');
    cancelAddFood();
    await loadTodayFood();
    await loadFrequentFoods();
    await loadCheckinCalendar();
    updateDashboard();
    updateFoodRecommendation();
  }
}

function renderFoodList() {
  const container = document.getElementById('food-list-today');
  if (AppState.todayFood.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">暂无记录</p>';
    return;
  }

  const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
  const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

  // 按餐次分组
  const grouped = {};
  AppState.todayFood.forEach(f => {
    if (!grouped[f.meal_type]) grouped[f.meal_type] = [];
    grouped[f.meal_type].push(f);
  });

  container.innerHTML = Object.entries(grouped).map(([meal, items]) => `
    <div class="mb-3">
      <div class="flex items-center gap-2 mb-2">
        <span>${mealEmojis[meal] || '🍽️'}</span>
        <span class="text-sm font-medium text-gray-600">${mealNames[meal] || meal}</span>
        <span class="text-xs text-gray-400">${items.reduce((s, i) => s + i.total_calories, 0).toFixed(0)} kcal</span>
      </div>
      ${items.map(item => `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl mb-1">
          <div>
            <span class="text-sm text-gray-700">${item.food_name}</span>
            <span class="text-xs text-gray-400 ml-1">${item.amount_g}g</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-600">${item.total_calories.toFixed(0)} kcal</span>
            <button onclick="deleteFood(${item.id})" class="text-gray-300 hover:text-red-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function deleteFood(id) {
  const res = await api(`/api/food/${id}`, { method: 'DELETE' });
  if (res) {
    showToast('已删除');
    await loadTodayFood();
    await loadFrequentFoods();
    await loadCheckinCalendar();
    updateDashboard();
  }
}

function updateFoodRecommendation() {
  const target = calcTargetCal();
  const mealTargets = {
    breakfast: Math.round(target * 0.3),
    lunch: Math.round(target * 0.4),
    dinner: Math.round(target * 0.3),
  };
  const mealIntake = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  };

  AppState.todayFood.forEach(item => {
    if (mealIntake[item.meal_type] !== undefined) {
      mealIntake[item.meal_type] += Number(item.total_calories) || 0;
    }
  });

  ['breakfast', 'lunch', 'dinner'].forEach(meal => {
    const targetEl = document.getElementById(`rec-${meal}`);
    const intakeEl = document.getElementById(`meal-intake-${meal}`);
    const remainingEl = document.getElementById(`meal-remaining-${meal}`);
    const intake = Math.round(mealIntake[meal]);
    const remaining = Math.max(mealTargets[meal] - intake, 0);
    if (targetEl) targetEl.textContent = mealTargets[meal];
    if (intakeEl) intakeEl.textContent = intake;
    if (remainingEl) remainingEl.textContent = remaining;
  });
}

function initMealSummaryCards() {
  const holder = document.getElementById('rec-breakfast')?.closest('.grid');
  if (!holder || holder.dataset.enhanced === '1') return;

  holder.dataset.enhanced = '1';
  holder.className = 'meal-summary-grid';
  holder.innerHTML = `
    <button onclick="openMealPicker('breakfast')" class="meal-summary-card meal-breakfast text-left">
      <div class="meal-summary-icon">🥣</div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">早餐</span>
        <span class="text-xs text-gray-400">30%</span>
      </div>
      <div class="mt-2">
        <p><span id="meal-intake-breakfast" class="meal-summary-number text-orange-500">0</span><span class="text-xs text-gray-400 ml-1">已摄入</span></p>
        <p class="text-xs text-gray-500 mt-1">还可吃 <span id="meal-remaining-breakfast" class="font-semibold text-gray-700">0</span> kcal</p>
        <p class="text-xs text-gray-400">推荐 <span id="rec-breakfast">0</span> kcal</p>
      </div>
    </button>
    <button onclick="openMealPicker('lunch')" class="meal-summary-card meal-lunch text-left">
      <div class="meal-summary-icon">🍱</div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">午餐</span>
        <span class="text-xs text-gray-400">40%</span>
      </div>
      <div class="mt-2">
        <p><span id="meal-intake-lunch" class="meal-summary-number text-yellow-600">0</span><span class="text-xs text-gray-400 ml-1">已摄入</span></p>
        <p class="text-xs text-gray-500 mt-1">还可吃 <span id="meal-remaining-lunch" class="font-semibold text-gray-700">0</span> kcal</p>
        <p class="text-xs text-gray-400">推荐 <span id="rec-lunch">0</span> kcal</p>
      </div>
    </button>
    <button onclick="openMealPicker('dinner')" class="meal-summary-card meal-dinner text-left">
      <div class="meal-summary-icon">🍲</div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">晚餐</span>
        <span class="text-xs text-gray-400">30%</span>
      </div>
      <div class="mt-2">
        <p><span id="meal-intake-dinner" class="meal-summary-number text-purple-500">0</span><span class="text-xs text-gray-400 ml-1">已摄入</span></p>
        <p class="text-xs text-gray-500 mt-1">还可吃 <span id="meal-remaining-dinner" class="font-semibold text-gray-700">0</span> kcal</p>
        <p class="text-xs text-gray-400">推荐 <span id="rec-dinner">0</span> kcal</p>
      </div>
    </button>
  `;
}

const FOOD_IMAGE_MAP = {
  '白米饭': '🍚',
  '糙米饭': '🌾',
  '馒头': '🥯',
  '花卷': '🥐',
  '鸡胸肉': '🍗',
  '鸡蛋': '🥚',
  '牛肉': '🥩',
  '西兰花': '🥦',
  '苹果': '🍎',
  '香蕉': '🍌',
  '酸奶': '🥛',
  '鸡蛋炒饭': '🍛',
  '沙拉': '🥗',
};

const FOOD_PORTION_HINTS = {
  '白米饭': '一碗白米饭大概是200g',
  '糙米饭': '一碗糙米饭大概是200g',
  '馒头': '一个馒头大概是80g',
  '花卷': '一个花卷大概是70g',
  '面条(煮)': '一碗面条大概是250g',
  '挂面(煮)': '一碗挂面大概是250g',
  '炒面': '一盘炒面大概是300g',
  '饺子': '一盘饺子大概是200g',
  '包子': '一个包子大概是100g',
  '烧饼': '一个烧饼大概是80g',
  '油条': '一根油条大概是50g',
  '粥(白粥)': '一碗白粥大概是250g',
  '小米粥': '一碗小米粥大概是250g',
  '红薯': '一个红薯大概是150g',
  '紫薯': '一个紫薯大概是150g',
  '玉米': '一根玉米大概是200g',
  '土豆': '一个土豆大概是150g',
  '燕麦片': '一小碗燕麦片大概是40g',
  '全麦面包': '两片全麦面包大概是60g',
  '白面包': '两片白面包大概是60g',
  '年糕': '一小块年糕大概是100g',
  '煎饼': '一个煎饼大概是100g',
  '凉皮': '一碗凉皮大概是250g',
  '米线': '一碗米线大概是300g',
  '鸡胸肉': '一块鸡胸肉大概是120g',
  '鸡腿肉': '一个鸡腿大概是100g',
  '鸡翅': '一个鸡翅大概是35g',
  '猪瘦肉': '一块猪瘦肉大概是100g',
  '猪五花肉': '一块五花肉大概是80g',
  '猪排骨': '几块排骨大概是150g',
  '牛肉(瘦)': '一块牛肉大概是100g',
  '牛腩': '一块牛腩大概是100g',
  '羊肉': '一块羊肉大概是100g',
  '鱼肉(草鱼)': '一块鱼肉大概是120g',
  '鱼肉(鲈鱼)': '一块鱼肉大概是120g',
  '三文鱼': '一块三文鱼大概是100g',
  '虾仁': '一小碗虾仁大概是80g',
  '大虾': '几只大虾大概是100g',
  '鸡蛋(煮)': '一个鸡蛋大概是50g',
  '鸡蛋(煎)': '一个煎蛋大概是50g',
  '鸡蛋炒饭': '一盘番茄炒蛋大概是150g',
  '番茄炒蛋': '一盘番茄炒蛋大概是150g',
  '西兰花': '一小朵西兰花大概是100g',
  '生菜': '一小碗生菜大概是50g',
  '白菜': '一小碗白菜大概是100g',
  '黄瓜': '一根黄瓜大概是200g',
  '番茄': '一个番茄大概是150g',
  '胡萝卜': '一根胡萝卜大概是100g',
  '豆角': '一小碗豆角大概是100g',
  '青椒': '一个青椒大概是50g',
  '茄子': '一根茄子大概是200g',
  '苹果': '一个苹果大概是150g',
  '香蕉': '一根香蕉大概是120g',
  '橙子': '一个橙子大概是150g',
  '葡萄': '一小串葡萄大概是100g',
  '西瓜': '一块西瓜大概是200g',
  '草莓': '一小盒草莓大概是100g',
  '桃子': '一个桃子大概是150g',
  '芒果': '一个芒果大概是200g',
  '菠萝': '一块菠萝大概是150g',
  '樱桃': '一小把樱桃大概是50g',
  '牛油果': '一个牛油果大概是170g',
  '豆浆(无糖)': '一杯豆浆大概是250g',
  '纯牛奶': '一杯牛奶大概是250g',
  '脱脂牛奶': '一杯牛奶大概是250g',
  '酸奶(原味)': '一杯酸奶大概是200g',
  '可乐': '一瓶可乐大概是330g',
  '雪碧': '一瓶雪碧大概是330g',
  '橙汁': '一杯橙汁大概是250g',
  '柠檬汁': '一杯柠檬水大概是250g',
  '沙拉': '一盘沙拉大概是200g',
};

const FOOD_PORTION_PRESETS = {
  '白米饭': { unit: '碗', grams: 200, sizes: [['半碗', 100], ['1碗', 200], ['1.5碗', 300]] },
  '糙米饭': { unit: '碗', grams: 200, sizes: [['半碗', 100], ['1碗', 200], ['1.5碗', 300]] },
  '馒头': { unit: '个', grams: 80, sizes: [['半个', 40], ['1个', 80], ['2个', 160]] },
  '花卷': { unit: '个', grams: 70, sizes: [['半个', 35], ['1个', 70], ['2个', 140]] },
  '面条(煮)': { unit: '碗', grams: 250, sizes: [['半碗', 125], ['1碗', 250], ['1.5碗', 375]] },
  '挂面(煮)': { unit: '碗', grams: 250, sizes: [['半碗', 125], ['1碗', 250], ['1.5碗', 375]] },
  '炒面': { unit: '盘', grams: 300, sizes: [['半盘', 150], ['1盘', 300], ['1.5盘', 450]] },
  '饺子': { unit: '盘', grams: 200, sizes: [['6个', 120], ['10个', 200], ['15个', 300]] },
  '包子': { unit: '个', grams: 100, sizes: [['半个', 50], ['1个', 100], ['2个', 200]] },
  '油条': { unit: '根', grams: 50, sizes: [['半根', 25], ['1根', 50], ['2根', 100]] },
  '粥(白粥)': { unit: '碗', grams: 250, sizes: [['半碗', 125], ['1碗', 250], ['1.5碗', 375]] },
  '小米粥': { unit: '碗', grams: 250, sizes: [['半碗', 125], ['1碗', 250], ['1.5碗', 375]] },
  '红薯': { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] },
  '紫薯': { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] },
  '玉米': { unit: '根', grams: 200, sizes: [['半根', 100], ['1根', 200], ['2根', 400]] },
  '土豆': { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] },
  '全麦面包': { unit: '片', grams: 30, sizes: [['1片', 30], ['2片', 60], ['3片', 90]] },
  '白面包': { unit: '片', grams: 30, sizes: [['1片', 30], ['2片', 60], ['3片', 90]] },
  '鸡胸肉': { unit: '块', grams: 120, sizes: [['半块', 60], ['1块', 120], ['2块', 240]] },
  '鸡腿肉': { unit: '个', grams: 100, sizes: [['半个', 50], ['1个', 100], ['2个', 200]] },
  '鸡翅': { unit: '个', grams: 35, sizes: [['1个', 35], ['2个', 70], ['4个', 140]] },
  '大虾': { unit: '只', grams: 25, sizes: [['4只', 100], ['6只', 150], ['8只', 200]] },
  '鸡蛋(煮)': { unit: '个', grams: 50, sizes: [['半个', 25], ['1个', 50], ['2个', 100]] },
  '鸡蛋(煎)': { unit: '个', grams: 50, sizes: [['半个', 25], ['1个', 50], ['2个', 100]] },
  '番茄炒蛋': { unit: '盘', grams: 150, sizes: [['半盘', 75], ['1盘', 150], ['1.5盘', 225]] },
  '苹果': { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] },
  '香蕉': { unit: '根', grams: 120, sizes: [['半根', 60], ['1根', 120], ['2根', 240]] },
  '橙子': { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] },
  '纯牛奶': { unit: '杯', grams: 250, sizes: [['半杯', 125], ['1杯', 250], ['2杯', 500]] },
  '脱脂牛奶': { unit: '杯', grams: 250, sizes: [['半杯', 125], ['1杯', 250], ['2杯', 500]] },
  '豆浆(无糖)': { unit: '杯', grams: 250, sizes: [['半杯', 125], ['1杯', 250], ['2杯', 500]] },
  '酸奶(原味)': { unit: '杯', grams: 200, sizes: [['半杯', 100], ['1杯', 200], ['2杯', 400]] },
  '沙拉': { unit: '盘', grams: 200, sizes: [['半盘', 100], ['1盘', 200], ['1.5盘', 300]] },
};

function getFoodPortionHint(food) {
  const name = food?.name || food?.food_name || '';
  if (FOOD_PORTION_HINTS[name]) return FOOD_PORTION_HINTS[name];

  const text = name.toLowerCase();
  if (text.includes('蛋')) return `一个${name}大概是50g`;
  if (text.includes('饭') || text.includes('粥') || text.includes('面') || text.includes('粉') || text.includes('线')) return `一碗${name}大概是200g`;
  if (text.includes('包') || text.includes('馒头') || text.includes('花卷') || text.includes('饼')) return `一个${name}大概是80g`;
  if (text.includes('肉') || text.includes('鸡胸') || text.includes('牛') || text.includes('羊') || text.includes('鱼') || text.includes('虾')) return `一块${name}大概是100g`;
  if (text.includes('菜') || text.includes('花') || text.includes('西兰花') || text.includes('生菜') || text.includes('白菜')) return `一盘${name}大概是150g`;
  if (text.includes('果') || text.includes('苹果') || text.includes('香蕉') || text.includes('橙') || text.includes('葡萄')) return `一个${name}大概是150g`;
  if (text.includes('奶') || text.includes('汁') || text.includes('饮') || text.includes('茶')) return `一杯${name}大概是250g`;
  if (text.includes('沙拉')) return `一盘${name}大概是200g`;
  return `一份${name}大概是100g`;
}

function applyFoodAmountHint(food) {
  const input = document.getElementById('food-amount');
  if (!input) return;
  input.placeholder = getFoodPortionHint(food);
}

function getFoodPortionPreset(food) {
  const name = food?.name || food?.food_name || '';
  if (FOOD_PORTION_PRESETS[name]) return FOOD_PORTION_PRESETS[name];

  const category = food?.category || '';
  const text = name.toLowerCase();
  if (text.includes('蛋')) return { unit: '个', grams: 50, sizes: [['半个', 25], ['1个', 50], ['2个', 100]] };
  if (text.includes('饭') || text.includes('粥') || text.includes('面') || text.includes('粉') || text.includes('线')) return { unit: '碗', grams: 200, sizes: [['半碗', 100], ['1碗', 200], ['1.5碗', 300]] };
  if (text.includes('包') || text.includes('馒头') || text.includes('花卷') || text.includes('饼')) return { unit: '个', grams: 80, sizes: [['半个', 40], ['1个', 80], ['2个', 160]] };
  if (text.includes('奶') || text.includes('汁') || text.includes('饮') || text.includes('茶')) return { unit: '杯', grams: 250, sizes: [['半杯', 125], ['1杯', 250], ['2杯', 500]] };
  if (category.includes('水果')) return { unit: '个', grams: 150, sizes: [['半个', 75], ['1个', 150], ['2个', 300]] };
  if (category.includes('蔬菜') || category.includes('菜品')) return { unit: '盘', grams: 150, sizes: [['半盘', 75], ['1盘', 150], ['1.5盘', 225]] };
  if (category.includes('肉') || category.includes('蛋')) return { unit: '份', grams: 100, sizes: [['半份', 50], ['1份', 100], ['1.5份', 150]] };
  if (category.includes('坚果')) return { unit: '小把', grams: 25, sizes: [['半小把', 12], ['1小把', 25], ['2小把', 50]] };
  if (category.includes('饮品')) return { unit: '杯', grams: 250, sizes: [['半杯', 125], ['1杯', 250], ['2杯', 500]] };
  if (category.includes('零食')) return { unit: '份', grams: 50, sizes: [['半份', 25], ['1份', 50], ['2份', 100]] };
  return { unit: '份', grams: 100, sizes: [['半份', 50], ['1份', 100], ['1.5份', 150]] };
}

function ensurePortionQuickContainer() {
  let container = document.getElementById('food-portion-quick');
  if (container) return container;

  const amountInput = document.getElementById('food-amount');
  if (!amountInput) return null;

  container = document.createElement('div');
  container.id = 'food-portion-quick';
  container.className = 'portion-quick hidden';
  amountInput.insertAdjacentElement('afterend', container);
  return container;
}

function renderPortionQuickButtons(food) {
  const container = ensurePortionQuickContainer();
  if (!container) return;
  if (!food) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const preset = getFoodPortionPreset(food);
  container.innerHTML = preset.sizes.map(([label, grams]) => `
    <button type="button" onclick="setFoodAmount(${grams})" class="portion-chip">
      <span>${label}</span>
      <strong>${grams}g</strong>
    </button>
  `).join('');
  container.classList.remove('hidden');
}

function setFoodAmount(grams) {
  const input = document.getElementById('food-amount');
  if (!input) return;
  input.value = grams;
  calcFoodCalories();
}

const FOOD_CATEGORY_ORDER = ['主食', '肉蛋类', '蔬菜类', '水果类', '豆制品', '坚果', '饮品', '零食', '调味', '菜品'];

function getFoodImage(food) {
  const photoMap = window.FOOD_PHOTO_MAP || {};
  return photoMap[food.name] || photoMap[food.food_name] || FOOD_IMAGE_MAP[food.name] || FOOD_IMAGE_MAP[food.food_name] || '🍽️';
}

function renderFoodImage(image, name) {
  if (typeof image === 'string' && image.startsWith('/')) {
    return `<img src="${image}" alt="${escapeHtml(name)}" loading="lazy" class="food-card-photo" onerror="this.closest('.food-card-image').textContent='🍽️'">`;
  }
  return image || '🍽️';
}

function buildFoodCatalog() {
  const catalog = {};
  FOOD_DATABASE.forEach(food => {
    if (!catalog[food.category]) catalog[food.category] = [];
    catalog[food.category].push({
      name: food.name,
      cal: food.cal,
      category: food.category,
      isCustom: false,
      image: getFoodImage(food),
    });
  });

  AppState.customFoods.forEach(food => {
    if (!catalog['我的食物']) catalog['我的食物'] = [];
    catalog['我的食物'].push({
      name: food.food_name,
      cal: food.calories_per_100g,
      category: '我的食物',
      isCustom: true,
      id: food.id,
      image: '⭐',
    });
  });

  return catalog;
}

function openMealPicker(meal) {
  AppState.mealPicker.meal = meal;
  AppState.mealPicker.category = 'all';
  document.getElementById('meal-food-picker')?.classList.remove('hidden');
  renderMealPicker();
  const labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
  const titleEl = document.getElementById('meal-picker-title');
  const subEl = document.getElementById('meal-picker-subtitle');
  if (titleEl) titleEl.textContent = `${labels[meal] || '餐次'}选食`;
  if (subEl) subEl.textContent = '按分类浏览食物，点开图片后填写食用量';
  document.getElementById('meal-food-picker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeMealPicker() {
  AppState.mealPicker.meal = null;
  AppState.mealPicker.category = 'all';
  const picker = document.getElementById('meal-food-picker');
  if (picker) picker.classList.add('hidden');
}

function renderMealPicker() {
  const tabsEl = document.getElementById('food-category-tabs');
  const gridEl = document.getElementById('food-category-grid');
  if (!tabsEl || !gridEl || !AppState.mealPicker.meal) return;

  const catalog = buildFoodCatalog();
  const categories = [ 'all', ...FOOD_CATEGORY_ORDER.filter(c => catalog[c]), ...Object.keys(catalog).filter(c => !FOOD_CATEGORY_ORDER.includes(c) && c !== '我的食物').sort(), ...(catalog['我的食物'] ? ['我的食物'] : []) ];
  const uniqueCategories = [...new Set(categories)];

  tabsEl.innerHTML = uniqueCategories.map(cat => `
    <button onclick="setMealPickerCategory('${cat}')" class="meal-category-tab ${AppState.mealPicker.category === cat ? 'active' : ''}">
      ${cat === 'all' ? '全部' : cat}
    </button>
  `).join('');

  const list = uniqueCategories.includes(AppState.mealPicker.category) && AppState.mealPicker.category !== 'all'
    ? (catalog[AppState.mealPicker.category] || [])
    : Object.values(catalog).flat();

  const filtered = AppState.mealPicker.category === 'all'
    ? Object.values(catalog).flat()
    : (catalog[AppState.mealPicker.category] || []);

  gridEl.innerHTML = filtered.map(food => `
    <button onclick="chooseFoodForMeal(${JSON.stringify(food).replace(/"/g, '&quot;')})" class="food-card">
      <div class="food-card-image">${renderFoodImage(food.image, food.name)}</div>
      <div class="food-card-body">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="food-card-name">${food.name}</p>
            <p class="food-card-meta">${food.category}</p>
            <div class="mt-2">${renderFoodScore(food.name, food.cal, 100, AppState.mealPicker.meal || 'lunch')}</div>
          </div>
          <span class="food-card-cal">${food.cal} kcal/100g</span>
        </div>
      </div>
    </button>
  `).join('');
}

function setMealPickerCategory(category) {
  AppState.mealPicker.category = category;
  renderMealPicker();
}

function chooseFoodForMeal(food) {
  selectedFood = { name: food.name, cal: food.cal, isCustom: !!food.isCustom };
  selectedFood.category = food.category;
  document.getElementById('food-name').value = food.name;
  document.getElementById('food-cal').value = food.cal;
  document.getElementById('food-meal').value = AppState.mealPicker.meal || 'breakfast';
  document.getElementById('food-amount').value = '';
  applyFoodAmountHint(selectedFood);
  renderPortionQuickButtons(selectedFood);
  document.getElementById('food-total-cal').textContent = '0 kcal';
  document.getElementById('add-food-form').classList.remove('hidden');
  document.getElementById('food-amount').focus();
}

// ─── 自定义食物 ────────────────────────────────────
async function addCustomFood() {
  const name = document.getElementById('custom-food-name').value.trim();
  const cal = parseFloat(document.getElementById('custom-food-cal').value);
  const amount = parseFloat(document.getElementById('custom-food-amount').value);
  const meal = document.getElementById('custom-food-meal').value;
  const save = document.getElementById('custom-food-save').checked;

  if (!name || !cal) return showToast('请填写食物名称和热量', 'warning');
  if (!amount || amount <= 0) return showToast('请填写食用量', 'warning');

  // 如果勾选收藏，先保存
  if (save) {
    const saveRes = await api('/api/custom-foods', {
      method: 'POST',
      body: { food_name: name, calories_per_100g: cal }
    });
    if (saveRes) await loadCustomFoods();
  }

  // 添加饮食记录
  const totalCal = Math.round(cal * amount / 100);
  const res = await api('/api/food', {
    method: 'POST',
    body: {
      food_name: name,
      calories_per_100g: cal,
      amount_g: amount,
      total_calories: totalCal,
      meal_type: meal,
    }
  });

  if (res) {
    showToast('自定义食物已添加');
    closeModal('custom-food-modal');
    // 清空表单
    document.getElementById('custom-food-name').value = '';
    document.getElementById('custom-food-cal').value = '';
    document.getElementById('custom-food-amount').value = '';
    await loadTodayFood();
    await loadFrequentFoods();
    await loadCheckinCalendar();
    updateDashboard();
  }
}

// ─── 运动功能 ──────────────────────────────────────
const EXERCISE_CATEGORY_TABS = [
  { id: 'all', label: '全部', icon: '✨' },
  { id: '有氧', label: '有氧', icon: '🏃' },
  { id: '力量', label: '力量', icon: '🏋️' },
  { id: '柔韧', label: '柔韧', icon: '🧘' },
  { id: '高强度', label: '高强度', icon: '⚡' },
  { id: '球类', label: '球类', icon: '🏸' },
  { id: '户外', label: '户外', icon: '⛰️' },
  { id: '日常', label: '日常', icon: '🧹' },
];

const EXERCISE_MOTIVATIONS = [
  '你很棒！坚持住！',
  '燃烧脂肪，离目标更近了！',
  '流汗就是胜利！',
  '每一步都在变强！',
  '加油，你能做到！',
  '坚持就是改变！',
  '汗水是最好的勋章！',
  '再坚持一下！',
  '你比昨天更强了！',
  '动起来，瘦下去！',
  '相信自己，继续！',
];

function findExercise(name) {
  return EXERCISE_DATABASE.find(item => item.name === name) || null;
}

function getExerciseIcon(name) {
  return findExercise(name)?.icon || '🏃';
}

function getExerciseMeta(name) {
  return findExercise(name) || { name, met: 4, icon: '🏃', category: '自定义' };
}

function scrollExercisePickerIntoView() {
  document.getElementById('exercise-card-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderFrequentExercises() {
  const container = document.getElementById('frequent-exercises-container');
  if (!container) return;
  const rows = AppState.frequentExercises || [];
  if (!rows.length) {
    container.innerHTML = '<p class="exercise-empty-text">记录更多运动后，常做运动会出现在这里</p>';
    return;
  }
  container.innerHTML = rows.map(item => `
    <button type="button" class="exercise-frequent-card" onclick="selectFrequentExercise('${escapeHtml(item.exercise_name).replace(/'/g, "\\'")}', ${Math.max(1, Math.round(item.avg_duration || 30))})">
      <strong>${item.icon || getExerciseIcon(item.exercise_name)}</strong>
      <span>${escapeHtml(item.exercise_name)}</span>
      <small>${Math.round(item.avg_duration || 30)}分钟</small>
    </button>
  `).join('');
}

function selectFrequentExercise(name, duration) {
  const exercise = getExerciseMeta(name);
  AppState.exercisePicker.category = exercise.category || 'all';
  AppState.exercisePicker.selected = exercise;
  AppState.exercisePicker.duration = Math.max(1, Math.round(duration || 30));
  renderExercisePicker();
  renderExerciseDurationPanel();
  scrollExercisePickerIntoView();
}

function renderExercisePicker() {
  const tabs = document.getElementById('exercise-category-tabs');
  const grid = document.getElementById('exercise-card-grid');
  if (!tabs || !grid) return;

  tabs.innerHTML = EXERCISE_CATEGORY_TABS.map(tab => `
    <button type="button" onclick="setExerciseCategory('${tab.id}')" class="exercise-category-tab ${AppState.exercisePicker.category === tab.id ? 'active' : ''}">
      <span>${tab.icon}</span>${tab.label}
    </button>
  `).join('');

  const list = AppState.exercisePicker.category === 'all'
    ? EXERCISE_DATABASE
    : EXERCISE_DATABASE.filter(item => item.category === AppState.exercisePicker.category);

  grid.innerHTML = [
    ...list.map(item => `
      <button type="button" onclick="selectExerciseCard('${escapeHtml(item.name).replace(/'/g, "\\'")}')" class="exercise-card ${AppState.exercisePicker.selected?.name === item.name ? 'active' : ''}">
        <span class="exercise-card-icon">${item.icon}</span>
        <strong>${item.name}</strong>
        <small>MET ${Number(item.met).toFixed(1)}</small>
      </button>
    `),
    `<button type="button" onclick="openModal('custom-exercise-modal')" class="exercise-card exercise-card-custom">
      <span class="exercise-card-icon">＋</span>
      <strong>自定义运动</strong>
      <small>手动记录</small>
    </button>`
  ].join('');

  renderExerciseDurationPanel();
}

function setExerciseCategory(category) {
  AppState.exercisePicker.category = category;
  renderExercisePicker();
}

function selectExerciseCard(name) {
  const exercise = findExercise(name);
  if (!exercise) return;
  AppState.exercisePicker.selected = exercise;
  AppState.exercisePicker.duration = AppState.exercisePicker.duration || 30;
  renderExercisePicker();
  renderExerciseDurationPanel();
}

function renderExerciseDurationPanel() {
  const panel = document.getElementById('exercise-duration-panel');
  const selected = AppState.exercisePicker.selected;
  if (!panel) return;
  if (!selected) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }
  const duration = Math.max(0, Number(AppState.exercisePicker.duration || 0));
  const calories = duration ? calcExerciseCal(selected.met, AppState.profile?.weight || 70, duration) : 0;
  panel.innerHTML = `
    <div class="exercise-duration-head">
      <div><span>${selected.icon}</span><strong>${selected.name}</strong></div>
      <button type="button" onclick="cancelExerciseSelection()" class="exercise-close-btn">×</button>
    </div>
    <label class="exercise-duration-input">
      <span>运动时长</span>
      <input id="exercise-picker-duration" type="number" min="1" value="${duration || ''}" placeholder="分钟" oninput="setExerciseDuration(this.value)">
      <small>${calories ? `约消耗 ${calories} kcal` : '可直接开始秒表'}</small>
    </label>
    <div class="exercise-duration-buttons">
      ${[15, 30, 45, 60].map(min => `<button type="button" onclick="setExerciseDuration(${min})" class="${duration === min ? 'active' : ''}">${min}分钟</button>`).join('')}
    </div>
    <div class="grid grid-cols-2 gap-2 mt-3">
      <button type="button" onclick="startExerciseTimer()" class="exercise-start-btn">⏱️ 开始计时</button>
      <button type="button" onclick="directAddSelectedExercise()" class="btn-primary">✅ 直接添加</button>
    </div>
  `;
  panel.classList.remove('hidden');
}

function setExerciseDuration(value) {
  AppState.exercisePicker.duration = Math.max(0, Math.round(Number(value) || 0));
  renderExerciseDurationPanel();
}

function cancelExerciseSelection() {
  AppState.exercisePicker.selected = null;
  renderExercisePicker();
}

async function saveExerciseRecord(exercise, duration, calories) {
  const res = await api('/api/exercise', {
    method: 'POST',
    body: {
      exercise_name: exercise.name,
      duration_min: Math.max(1, Math.round(duration)),
      calories_burned: Math.max(1, Math.round(calories)),
    },
  });
  if (!res) return false;
  showToast('运动已记录');
  await loadTodayExercise();
  await loadFrequentExercises();
  await loadCheckinCalendar();
  await loadExerciseStats();
  updateDashboard();
  updateExerciseRecommendation();
  requestAnimationFrame(updateCalorieRings);
  return true;
}

async function directAddSelectedExercise() {
  const exercise = AppState.exercisePicker.selected;
  const duration = Math.max(1, Number(AppState.exercisePicker.duration || 0));
  if (!exercise) return showToast('请先选择运动', 'warning');
  if (!duration) return showToast('请填写运动时长', 'warning');
  const calories = calcExerciseCal(exercise.met, AppState.profile?.weight || 70, duration);
  if (await saveExerciseRecord(exercise, duration, calories)) {
    AppState.exercisePicker.selected = null;
    renderExercisePicker();
  }
}

function speakExercise(text, force = false) {
  if (!AppState.voiceEnabled || !window.speechSynthesis || !text) return;
  const now = Date.now();
  if (!force && now - AppState.exerciseTimer.lastVoiceAt < 1200) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  const voice = AppState.exerciseVoices.find(item => item.voiceURI === AppState.selectedVoiceURI)
    || AppState.exerciseVoices.find(item => item.lang?.toLowerCase().startsWith('zh'))
    || AppState.exerciseVoices[0];
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1.08;
  AppState.exerciseTimer.lastVoiceAt = now;
  window.speechSynthesis.speak(utterance);
}

function loadExerciseVoices() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  AppState.exerciseVoices = voices
    .filter(voice => voice.lang?.toLowerCase().startsWith('zh') || /chinese|mandarin|xiaoxiao|xiaoyi|huihui|tingting/i.test(voice.name))
    .concat(voices.filter(voice => !voice.lang?.toLowerCase().startsWith('zh')).slice(0, 3));
  if (!AppState.selectedVoiceURI && AppState.exerciseVoices.length) {
    const preferred = AppState.exerciseVoices.find(voice => /xiaoxiao|xiaoyi|tingting|female|huihui/i.test(voice.name))
      || AppState.exerciseVoices[0];
    AppState.selectedVoiceURI = preferred.voiceURI;
  }
  renderExerciseTimer();
}

function setExerciseVoice(voiceURI) {
  AppState.selectedVoiceURI = voiceURI;
  speakExercise('音色已切换', true);
  renderExerciseTimer();
}

function startExerciseTimer() {
  const exercise = AppState.exercisePicker.selected;
  if (!exercise) return showToast('请先选择运动', 'warning');
  stopExerciseInterval();
  const targetSeconds = Math.max(0, Math.round(Number(AppState.exercisePicker.duration || 0) * 60));
  AppState.exerciseTimer = {
    active: true,
    paused: false,
    mode: targetSeconds > 0 ? 'countdown' : 'stopwatch',
    exercise,
    targetSeconds,
    elapsedSeconds: 0,
    preStartRemaining: 3,
    intervalId: null,
    startedAt: Date.now(),
    lastVoiceAt: 0,
    lastMinuteSpoken: 0,
    nextMotivationAt: 120 + Math.floor(Math.random() * 120),
    summary: null,
  };
  speakExercise('3', true);
  AppState.exerciseTimer.intervalId = setInterval(tickExerciseTimer, 1000);
  renderExerciseTimer();
  document.getElementById('exercise-timer-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function stopExerciseInterval() {
  if (AppState.exerciseTimer.intervalId) clearInterval(AppState.exerciseTimer.intervalId);
  AppState.exerciseTimer.intervalId = null;
}

function tickExerciseTimer() {
  const timer = AppState.exerciseTimer;
  if (!timer.active || timer.paused) return;
  if (timer.preStartRemaining > 0) {
    timer.preStartRemaining -= 1;
    if (timer.preStartRemaining > 0) {
      speakExercise(String(timer.preStartRemaining), true);
    } else {
      speakExercise('开始运动！', true);
    }
    renderExerciseTimer();
    return;
  }
  timer.elapsedSeconds += 1;
  handleExerciseVoicePrompts();
  renderExerciseTimer();
  if (timer.mode === 'countdown' && timer.elapsedSeconds >= timer.targetSeconds) {
    finishExerciseTimer();
  }
}

function handleExerciseVoicePrompts() {
  const timer = AppState.exerciseTimer;
  const elapsed = timer.elapsedSeconds;
  const remaining = Math.max(0, timer.targetSeconds - elapsed);
  if (timer.mode === 'countdown' && remaining === 30) speakExercise('还有30秒，冲刺！');
  if (timer.mode === 'countdown' && remaining <= 10 && remaining >= 1) speakExercise(String(remaining), true);
  const minute = Math.floor(elapsed / 60);
  if (minute > 0 && minute % 5 === 0 && minute !== timer.lastMinuteSpoken) {
    timer.lastMinuteSpoken = minute;
    speakExercise(`已运动${minute}分钟，继续加油！`);
    return;
  }
  if (elapsed >= timer.nextMotivationAt) {
    timer.nextMotivationAt = elapsed + 120 + Math.floor(Math.random() * 120);
    speakExercise(EXERCISE_MOTIVATIONS[Math.floor(Math.random() * EXERCISE_MOTIVATIONS.length)]);
  }
}

function formatTimerSeconds(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function currentTimerCalories() {
  const timer = AppState.exerciseTimer;
  const exercise = timer.exercise;
  if (!exercise) return 0;
  return calcExerciseCal(exercise.met, AppState.profile?.weight || 70, timer.elapsedSeconds / 60);
}

function renderExerciseTimer() {
  const card = document.getElementById('exercise-timer-card');
  if (!card) return;
  const timer = AppState.exerciseTimer;
  if (!timer.active || !timer.exercise) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }
  const displaySeconds = timer.mode === 'countdown'
    ? Math.max(0, timer.targetSeconds - timer.elapsedSeconds)
    : timer.elapsedSeconds;
  const isPreparing = timer.preStartRemaining > 0;
  const calories = currentTimerCalories();
  const voiceOptions = AppState.exerciseVoices.map(voice => `
    <option value="${escapeHtml(voice.voiceURI)}" ${voice.voiceURI === AppState.selectedVoiceURI ? 'selected' : ''}>${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>
  `).join('');
  card.innerHTML = `
    <div class="exercise-timer-top">
      <div><span>${timer.exercise.icon}</span><strong>${timer.exercise.name}</strong></div>
      <div class="exercise-voice-tools">
        <button type="button" onclick="toggleExerciseVoice()" class="exercise-voice-btn ${AppState.voiceEnabled ? 'active' : ''}">🔊</button>
        <select onchange="setExerciseVoice(this.value)" class="exercise-voice-select" ${AppState.exerciseVoices.length ? '' : 'disabled'}>
          ${voiceOptions || '<option>系统默认</option>'}
        </select>
      </div>
    </div>
    <div class="exercise-timer-number ${timer.paused ? 'is-paused' : ''}">${isPreparing ? timer.preStartRemaining : formatTimerSeconds(displaySeconds)}</div>
    <p class="exercise-timer-cal">${isPreparing ? '预备倒计时，不计入运动时间' : `已消耗 <strong>${Math.round(calories)}</strong> kcal`}</p>
    <div class="exercise-timer-actions">
      <button type="button" onclick="toggleExerciseTimerPause()">${timer.paused ? '▶️ 继续' : '⏸️ 暂停'}</button>
      <button type="button" onclick="finishExerciseTimer()" class="danger" ${isPreparing ? 'disabled' : ''}>⏹️ 结束记录</button>
      <button type="button" onclick="cancelExerciseTimer()">❌ 取消</button>
    </div>
  `;
  card.classList.remove('hidden');
}

function toggleExerciseVoice() {
  AppState.voiceEnabled = !AppState.voiceEnabled;
  if (!AppState.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
  renderExerciseTimer();
}

function toggleExerciseTimerPause() {
  AppState.exerciseTimer.paused = !AppState.exerciseTimer.paused;
  if (AppState.exerciseTimer.paused && window.speechSynthesis) window.speechSynthesis.cancel();
  renderExerciseTimer();
}

function cancelExerciseTimer() {
  stopExerciseInterval();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  AppState.exerciseTimer.active = false;
  AppState.exerciseTimer.summary = null;
  renderExerciseTimer();
}

function finishExerciseTimer() {
  const timer = AppState.exerciseTimer;
  if (!timer.active || !timer.exercise) return;
  stopExerciseInterval();
  const duration = Math.max(1, Math.round(timer.elapsedSeconds / 60));
  const calories = Math.max(1, currentTimerCalories());
  timer.active = false;
  timer.summary = { exercise: timer.exercise, duration, calories };
  speakExercise(`太棒了！运动完成，消耗了${Math.round(calories)}千卡！`, true);
  renderExerciseTimer();
  renderExerciseSummary();
}

function renderExerciseSummary() {
  const card = document.getElementById('exercise-summary-card');
  const summary = AppState.exerciseTimer.summary;
  if (!card) return;
  if (!summary) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }
  card.innerHTML = `
    <div>
      <p class="brutal-kicker">WORKOUT DONE</p>
      <h3>${summary.exercise.icon} ${summary.exercise.name}</h3>
    </div>
    <div class="exercise-summary-grid">
      <div><strong>${summary.duration}</strong><span>分钟</span></div>
      <div><strong>${Math.round(summary.calories)}</strong><span>kcal</span></div>
    </div>
    <div class="grid grid-cols-2 gap-2 mt-3">
      <button type="button" onclick="discardExerciseSummary()" class="neo-mini-btn">取消</button>
      <button type="button" onclick="confirmExerciseSummary()" class="btn-primary">确认记录</button>
    </div>
  `;
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function discardExerciseSummary() {
  AppState.exerciseTimer.summary = null;
  renderExerciseSummary();
}

async function confirmExerciseSummary() {
  const summary = AppState.exerciseTimer.summary;
  if (!summary) return;
  if (await saveExerciseRecord(summary.exercise, summary.duration, summary.calories)) {
    AppState.exerciseTimer.summary = null;
    renderExerciseSummary();
  }
}

async function addCustomExercise() {
  const name = document.getElementById('custom-exercise-name').value.trim();
  const duration = parseFloat(document.getElementById('custom-exercise-duration').value);
  const calories = parseFloat(document.getElementById('custom-exercise-cal').value);

  if (!name || !duration || !calories) return showToast('请填写完整信息', 'warning');

  const res = await api('/api/exercise', {
    method: 'POST',
    body: { exercise_name: name, duration_min: duration, calories_burned: calories }
  });

  if (res) {
    showToast('运动已记录');
    closeModal('custom-exercise-modal');
    document.getElementById('custom-exercise-name').value = '';
    document.getElementById('custom-exercise-duration').value = '';
    document.getElementById('custom-exercise-cal').value = '';
    await loadTodayExercise();
    await loadFrequentExercises();
    await loadCheckinCalendar();
    await loadExerciseStats();
    updateDashboard();
  }
}

function renderExerciseList() {
  const container = document.getElementById('exercise-list-today');
  if (AppState.todayExercise.length === 0) {
    container.innerHTML = `
      <div class="exercise-empty-state">
        <strong>今天还没有运动，动起来吧 💪</strong>
        <button type="button" onclick="scrollExercisePickerIntoView()" class="btn-primary text-xs px-4 py-2">去选择运动</button>
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.todayExercise.map(item => `
    <div class="exercise-record-card">
      <div class="exercise-record-icon">${getExerciseIcon(item.exercise_name)}</div>
      <div class="exercise-record-main">
        <div class="flex items-center justify-between gap-2">
          <strong>${escapeHtml(item.exercise_name)}</strong>
          <span>-${Number(item.calories_burned || 0).toFixed(0)} kcal</span>
        </div>
        <p>${Number(item.duration_min || 0).toFixed(0)}分钟</p>
        <div class="exercise-record-bar"><i style="width:${Math.min(100, (Number(item.duration_min || 0) / 30) * 100)}%"></i></div>
      </div>
      <button onclick="deleteExercise(${item.id})" class="exercise-delete-btn">×</button>
    </div>
  `).join('');
}

async function deleteExercise(id) {
  const res = await api(`/api/exercise/${id}`, { method: 'DELETE' });
  if (res) {
    showToast('已删除');
    await loadTodayExercise();
    await loadFrequentExercises();
    await loadCheckinCalendar();
    await loadExerciseStats();
    updateDashboard();
  }
}

function updateExerciseRecommendation() {
  const container = document.getElementById('exercise-recommendation');
  if (!container) return;
  const targetCal = calcTargetCal();
  const intake = AppState.todayFood.reduce((s, f) => s + f.total_calories, 0);
  const burned = AppState.todayExercise.reduce((s, e) => s + e.calories_burned, 0);
  const deficit = intake - targetCal - burned; // 还需消耗的热量

  if (deficit <= 0) {
    container.innerHTML = '<p class="text-primary-500">✅ 今日热量控制良好，保持住！</p>';
    return;
  }

  const weight = AppState.profile?.weight || 70;
  const recs = recommendExercise(deficit, weight);
  if (recs.length === 0) {
    container.innerHTML = '<p class="text-gray-400">暂无推荐</p>';
    return;
  }

  container.innerHTML = `
    <p class="text-sm text-gray-500 mb-3">还需消耗 <span class="font-bold text-accent-500">${Math.round(deficit)} kcal</span></p>
    <div class="space-y-2">
      ${recs.map(r => `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
          <span class="text-sm">${r.icon} ${r.name}</span>
          <div class="text-right">
            <span class="text-sm font-medium text-gray-600">${r.durationMin}分钟</span>
            <span class="text-xs text-gray-400 ml-1">${r.calories}kcal</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── 体重功能 ──────────────────────────────────────
async function addWeight() {
  const weight = parseFloat(document.getElementById('weight-input').value);
  if (!weight || weight <= 0) return showToast('请输入有效体重', 'warning');

  const res = await api('/api/weight', { method: 'POST', body: { weight } });
  if (res) {
    showToast('体重已记录');
    document.getElementById('weight-input').value = '';
    await loadWeightRecords();
    await loadCheckinCalendar();
    // 同步更新 profile 中的体重
    if (AppState.profile) {
      AppState.profile.weight = weight;
      fillProfileForm();
      saveProfile();
    }
    updateBMIDisplay();
    updateDashboard();
    renderWeightData();
  }
}

function renderWeightData() {
  if (AppState.weightRecords.length > 0) {
    updateWeightChart(AppState.weightRecords);
  }
}

async function loadExerciseStats() {
  const res = await api('/api/stats?period=week');
  if (!res || !res.data) return;
  AppState.exerciseStats = res.data;
  renderExerciseStats(res.data);
  if (typeof updateExerciseCharts === 'function') updateExerciseCharts(res.data);
}

function renderExerciseStats(stats) {
  const totalKcal = Math.round((stats.dailyExercise || []).reduce((sum, item) => sum + Number(item.daily_cal || 0), 0));
  const totalMin = Math.round(Number(stats.totalExerciseMin || 0));
  const totalCount = Math.round(Number(stats.totalExerciseCount || 0));
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('exercise-week-kcal', totalKcal);
  setText('exercise-week-min', totalMin);
  setText('exercise-week-count', totalCount);
  setText('exercise-weekly-badge', `${totalKcal} kcal`);
  const empty = document.getElementById('exercise-weekly-empty');
  const layout = document.querySelector('.exercise-chart-layout');
  if (empty && layout) {
    empty.classList.toggle('hidden', totalCount > 0);
    layout.classList.toggle('is-empty', totalCount === 0);
  }
}

function switchStatsPeriod(period) {
  statsPeriod = period;
  ['week', 'month'].forEach(p => {
    const btn = document.getElementById(`stats-btn-${p}`);
    if (!btn) return;
    if (p === period) {
      btn.classList.add('bg-white', 'shadow', 'text-primary-600');
      btn.classList.remove('text-gray-500');
    } else {
      btn.classList.remove('bg-white', 'shadow', 'text-primary-600');
      btn.classList.add('text-gray-500');
    }
  });
  loadStats();
}

async function loadStats() {
  const res = await api(`/api/stats?period=${statsPeriod}`);
  if (!res || !res.data) return;
  const d = res.data;

  const weightEl = document.getElementById('stats-weight-change');
  if (weightEl) {
    if (d.weight && d.weight.change !== null) {
      const change = d.weight.change;
      weightEl.textContent = `${change > 0 ? '+' : ''}${change}kg`;
      weightEl.className = `text-lg font-bold ${change <= 0 ? 'text-primary-600' : 'text-red-500'}`;
    } else {
      weightEl.textContent = '--';
      weightEl.className = 'text-lg font-bold text-primary-600';
    }
  }

  const avgIntakeEl = document.getElementById('stats-avg-intake');
  const avgBurnedEl = document.getElementById('stats-avg-burned');
  const avgWaterEl = document.getElementById('stats-avg-water');
  const countEl = document.getElementById('stats-exercise-count');
  const minEl = document.getElementById('stats-exercise-min');
  if (avgIntakeEl) avgIntakeEl.textContent = d.avgIntake || '--';
  if (avgBurnedEl) avgBurnedEl.textContent = d.avgBurned || '--';
  if (avgWaterEl) avgWaterEl.textContent = d.avgWater || '--';
  if (countEl) countEl.textContent = d.totalExerciseCount || 0;
  if (minEl) minEl.textContent = d.totalExerciseMin || 0;

  if (d.daysDiff > 0) {
    const pct = Math.round((d.checkinDays / d.daysDiff) * 100);
    document.getElementById('stats-checkin-days').textContent = d.checkinDays || 0;
    document.getElementById('stats-total-days').textContent = d.daysDiff || 0;
    document.getElementById('stats-checkin-pct').textContent = `${pct}%`;
    document.getElementById('stats-checkin-bar').style.width = `${pct}%`;
  }

  updateStatsDailyChart(d);
  updateStatsWeightChart(d);
}

// ─── 饮水功能 ──────────────────────────────────────
function openWaterSheet() {
  const totalWater = AppState.todayWater.reduce((s, w) => s + Number(w.amount_ml || 0), 0);
  const pct = Math.min(Math.round((totalWater / 2000) * 100), 100);
  openUserSheet('今日饮水', `
    <div class="water-sheet-card">
      <div>
        <span>今日已喝</span>
        <strong id="sheet-water-total">${totalWater}</strong>
        <em>ml / 2000ml</em>
      </div>
      <div class="sheet-water-progress"><i id="sheet-water-progress-bar" style="width:${pct}%"></i></div>
    </div>
    <div class="sheet-water-actions">
      <button type="button" onclick="addWater(250)">+250ml</button>
      <button type="button" onclick="addWater(350)">+350ml</button>
      <button type="button" onclick="addWater(500)">+500ml</button>
    </div>
    <div id="sheet-water-list" class="sheet-water-list"></div>
  `, 'WATER CHECK');
  renderWaterSheet();
}

function renderWaterSheet() {
  const list = document.getElementById('sheet-water-list');
  if (!list) return;
  const totalWater = AppState.todayWater.reduce((s, w) => s + Number(w.amount_ml || 0), 0);
  const pct = Math.min(Math.round((totalWater / 2000) * 100), 100);
  const totalEl = document.getElementById('sheet-water-total');
  const bar = document.getElementById('sheet-water-progress-bar');
  if (totalEl) totalEl.textContent = totalWater;
  if (bar) bar.style.width = `${pct}%`;

  if (!AppState.todayWater.length) {
    list.innerHTML = '<p class="my-muted">今天还没记录饮水，先来一杯吧。</p>';
    return;
  }

  list.innerHTML = AppState.todayWater.map(item => `
    <div class="sheet-water-row">
      <span>💧 ${item.amount_ml}ml</span>
      <time>${new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time>
      <button type="button" onclick="deleteWater(${item.id})">×</button>
    </div>
  `).join('');
}

async function addWater(ml) {
  const res = await api('/api/water', { method: 'POST', body: { amount_ml: ml } });
  if (res) {
    showToast(`+${ml}ml 💧`);
    await loadTodayWater();
    await loadCheckinCalendar();
    updateDashboard();
    renderWaterSheet();
  }
}

function renderWaterList() {
  const container = document.getElementById('water-list-today');
  if (!container) return;

  if (AppState.todayWater.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">暂无记录</p>';
    return;
  }

  container.innerHTML = AppState.todayWater.map(item => `
    <div class="flex items-center justify-between py-2.5 px-3 bg-blue-50 rounded-xl mb-1">
      <div>
        <span class="text-sm font-medium text-blue-700">💧 ${item.amount_ml}ml</span>
        <span class="text-xs text-blue-400 ml-1">${new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <button onclick="deleteWater(${item.id})" class="text-blue-300 hover:text-red-400 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');

  // 更新水量显示
  const totalWater = AppState.todayWater.reduce((s, w) => s + w.amount_ml, 0);
  const amountEl = document.getElementById('water-amount-display');
  if (amountEl) amountEl.textContent = totalWater;
  renderWaterSheet();
}

async function deleteWater(id) {
  const res = await api(`/api/water/${id}`, { method: 'DELETE' });
  if (res) {
    showToast('已删除');
    await loadTodayWater();
    await loadCheckinCalendar();
    updateDashboard();
    renderWaterSheet();
  }
}

// ─── 历史记录 ──────────────────────────────────────
function initHistoryDate() {
  const dateInput = document.getElementById('history-date');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  loadHistory();
}

function changeHistoryDate(offset) {
  const dateInput = document.getElementById('history-date');
  const current = new Date(dateInput.value);
  current.setDate(current.getDate() + offset);
  dateInput.value = current.toISOString().split('T')[0];
  loadHistory();
}

async function loadHistory() {
  const date = document.getElementById('history-date').value;
  if (!date) return;

  const res = await api(`/api/history?date=${date}`);
  if (!res || !res.data) return;

  const data = res.data;

  // 体重
  const weightEl = document.getElementById('history-weight');
  if (data.weight && data.weight.length > 0) {
    weightEl.innerHTML = data.weight.map(w => `<span class="text-primary-600 font-bold">${w.weight}kg</span>`).join('、');
  } else {
    weightEl.textContent = '暂无数据';
  }

  // 饮食
  const foodEl = document.getElementById('history-food');
  if (data.food && data.food.length > 0) {
    const mealNames = { breakfast: '早', lunch: '午', dinner: '晚', snack: '加餐' };
    const grouped = {};
    data.food.forEach(f => {
      if (!grouped[f.meal_type]) grouped[f.meal_type] = [];
      grouped[f.meal_type].push(f);
    });
    foodEl.innerHTML = Object.entries(grouped).map(([meal, items]) => `
      <div class="mb-2">
        <span class="text-xs font-medium text-gray-500">${mealNames[meal] || meal}</span>
        <div class="text-sm text-gray-700">${items.map(i => `${i.food_name}(${i.amount_g}g/${i.total_calories.toFixed(0)}kcal)`).join('、')}</div>
      </div>
    `).join('');
  } else {
    foodEl.textContent = '暂无数据';
  }

  // 运动
  const exerciseEl = document.getElementById('history-exercise');
  if (data.exercise && data.exercise.length > 0) {
    exerciseEl.innerHTML = data.exercise.map(e => `<div class="text-sm text-gray-700">${e.exercise_name} ${e.duration_min}分钟 -${e.calories_burned.toFixed(0)}kcal</div>`).join('');
  } else {
    exerciseEl.textContent = '暂无数据';
  }

  // 饮水
  const waterEl = document.getElementById('history-water');
  if (data.water && data.water.length > 0) {
    const total = data.water.reduce((s, w) => s + w.amount_ml, 0);
    waterEl.innerHTML = `<div class="text-sm text-gray-700">💧 总计 ${total}ml（${data.water.length}次）</div>`;
  } else {
    waterEl.textContent = '暂无数据';
  }
}

// ─── 初始化 ────────────────────────────────────────
async function init() {
  registerPwaServiceWorker();
  initPwaInstallPrompt();
  // 检查登录状态
  const res = await api('/api/auth/me', { suppressError: true });
  if (res && res.data) {
    AppState.user = res.data;
    showMainApp();
  } else {
    showAuthPage();
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
