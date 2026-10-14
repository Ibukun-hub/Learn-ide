/**
 * NovaTask — Dynamic Task Management Engine
 * Vanilla JavaScript • LocalStorage Persistence • Web Audio Synth • Canvas Confetti
 */

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Storage Keys & Default Seed Data
  // ---------------------------------------------------------------------------
  const STORAGE_KEYS = {
    TASKS: 'novatask_tasks_v1',
    SETTINGS: 'novatask_settings_v1'
  };

  const DEFAULT_SAMPLE_TASKS = [
    {
      id: 'task-sample-1',
      title: 'Design high-converting landing page prototype',
      completed: false,
      priority: 'high',
      category: 'Work',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      createdAt: Date.now() - 3600000 * 2,
      completedAt: null
    },
    {
      id: 'task-sample-2',
      title: 'Review quarterly investment portfolio & budget',
      completed: false,
      priority: 'medium',
      category: 'Finance',
      dueDate: new Date().toISOString().split('T')[0], // Today
      createdAt: Date.now() - 3600000 * 5,
      completedAt: null
    },
    {
      id: 'task-sample-3',
      title: '45-minute evening run & stretch routine',
      completed: true,
      priority: 'low',
      category: 'Health',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000 * 10,
      completedAt: Date.now() - 1800000
    },
    {
      id: 'task-sample-4',
      title: 'Complete chapters 4-6 of Clean Code architecture',
      completed: false,
      priority: 'medium',
      category: 'Study',
      dueDate: '',
      createdAt: Date.now() - 3600000 * 12,
      completedAt: null
    }
  ];

  // ---------------------------------------------------------------------------
  // Application State
  // ---------------------------------------------------------------------------
  let state = {
    tasks: [],
    filter: 'all',          // 'all' | 'active' | 'completed' | 'high-priority'
    categoryFilter: 'all',  // 'all' | 'Work' | 'Personal' | 'Study' | 'Health' | 'Finance'
    searchQuery: '',
    sortBy: 'date-new',
    settings: {
      theme: 'dark',
      soundEnabled: true
    },
    recentlyDeletedTask: null,
    deleteTimeoutId: null
  };

  // ---------------------------------------------------------------------------
  // Sound Engine (Web Audio API Synthesizer - 0 External Files)
  // ---------------------------------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.08, rampDown = true) {
    if (!state.settings.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      if (rampDown) {
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      }

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio autoplay policy or browser limitation
    }
  }

  function playSound(action) {
    if (!state.settings.soundEnabled) return;
    switch (action) {
      case 'add':
        playTone(523.25, 'sine', 0.12, 0.08); // C5
        setTimeout(() => playTone(659.25, 'sine', 0.15, 0.08), 80); // E5
        break;
      case 'complete':
        playTone(587.33, 'triangle', 0.1, 0.09); // D5
        setTimeout(() => playTone(783.99, 'triangle', 0.12, 0.09), 80); // G5
        setTimeout(() => playTone(1046.50, 'sine', 0.22, 0.08), 160); // C6
        break;
      case 'uncomplete':
        playTone(440, 'sine', 0.1, 0.06); // A4
        setTimeout(() => playTone(349.23, 'sine', 0.12, 0.06), 70); // F4
        break;
      case 'delete':
        playTone(329.63, 'sawtooth', 0.15, 0.05); // E4
        break;
      case 'celebrate':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          setTimeout(() => playTone(freq, 'sine', 0.25, 0.1), idx * 110);
        });
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Canvas Confetti Burst Engine
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('confetti-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let animId = null;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    if (!ctx) return;
    resizeCanvas();
    playSound('celebrate');

    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'];
    particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() * 200 - 100),
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 14,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    if (animId) cancelAnimationFrame(animId);
    renderConfetti();
  }

  function renderConfetti() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.rotation += p.rotationSpeed;
      p.alpha -= 0.012;

      if (p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      ctx.restore();
    }

    particles = particles.filter(p => p.alpha > 0);

    if (particles.length > 0) {
      animId = requestAnimationFrame(renderConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Local Storage Management
  // ---------------------------------------------------------------------------
  function loadFromStorage() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) {
        state.tasks = JSON.parse(storedTasks);
      } else {
        state.tasks = [...DEFAULT_SAMPLE_TASKS];
        saveToStorage();
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        state.settings = { ...state.settings, ...JSON.parse(storedSettings) };
      }
    } catch (err) {
      console.warn('LocalStorage load error, using default state:', err);
      state.tasks = [...DEFAULT_SAMPLE_TASKS];
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    } catch (err) {
      console.error('LocalStorage save error:', err);
      showToast('Could not save to LocalStorage (storage full?)', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------------------------
  const elements = {
    // Header
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    moonIcon: document.querySelector('.moon-icon'),
    sunIcon: document.querySelector('.sun-icon'),
    soundToggleBtn: document.getElementById('toggle-sound-btn'),
    soundOnIcon: document.querySelector('.sound-on-icon'),
    soundOffIcon: document.querySelector('.sound-off-icon'),

    // Dashboard Stats
    dateDisplay: document.getElementById('date-display'),
    statsHeadline: document.getElementById('stats-headline'),
    statsSubtitle: document.getElementById('stats-subtitle'),
    progressCircle: document.getElementById('progress-circle'),
    progressPercent: document.getElementById('progress-percent'),
    totalCount: document.getElementById('total-tasks-count'),
    activeCount: document.getElementById('active-tasks-count'),
    completedCount: document.getElementById('completed-tasks-count'),
    overdueCount: document.getElementById('overdue-tasks-count'),

    // Task Input Form
    taskForm: document.getElementById('task-form'),
    taskTitleInput: document.getElementById('task-title-input'),
    taskPrioritySelect: document.getElementById('task-priority-select'),
    taskCategorySelect: document.getElementById('task-category-select'),
    taskDueDate: document.getElementById('task-due-date'),

    // Toolbar
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    sortSelect: document.getElementById('sort-select'),
    categoryPills: document.getElementById('category-pills'),

    // Task List
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    currentViewTitle: document.getElementById('current-view-title'),
    markAllDoneBtn: document.getElementById('mark-all-done-btn'),
    clearCompletedBtn: document.getElementById('clear-completed-btn'),

    // Modal
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    editTaskId: document.getElementById('edit-task-id'),
    editTaskTitle: document.getElementById('edit-task-title'),
    editTaskPriority: document.getElementById('edit-task-priority'),
    editTaskCategory: document.getElementById('edit-task-category'),
    editTaskDue: document.getElementById('edit-task-due'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),

    // Utilities
    exportBtn: document.getElementById('export-btn'),
    importFile: document.getElementById('import-file'),
    resetSampleBtn: document.getElementById('reset-sample-btn'),
    toastContainer: document.getElementById('toast-container')
  };

  // ---------------------------------------------------------------------------
  // Formatting & Date Helpers
  // ---------------------------------------------------------------------------
  function formatCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return today.toLocaleDateString(undefined, options);
  }

  function getDueDateMeta(dueDateStr) {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDateStr + 'T00:00:00');
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, status: 'overdue' };
    } else if (diffDays === 0) {
      return { label: 'Due Today', status: 'due-today' };
    } else if (diffDays === 1) {
      return { label: 'Tomorrow', status: 'upcoming' };
    } else {
      return {
        label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        status: 'normal'
      };
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------------------------
  function showToast(message, actionCallback = null, actionText = 'Undo') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${escapeHTML(message)}</span>`;

    if (actionCallback) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'toast-undo-btn';
      undoBtn.textContent = actionText;
      undoBtn.onclick = () => {
        actionCallback();
        toast.remove();
      };
      toast.appendChild(undoBtn);
    }

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 260);
    }, 4000);
  }

  // ---------------------------------------------------------------------------
  // Stats & Progress Ring Updates
  // ---------------------------------------------------------------------------
  function updateDashboard() {
    elements.dateDisplay.textContent = formatCurrentDate();

    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const active = total - completed;

    // Overdue count
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = state.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    elements.totalCount.textContent = total;
    elements.activeCount.textContent = active;
    elements.completedCount.textContent = completed;
    elements.overdueCount.textContent = overdue;

    // Progress percentage
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    elements.progressPercent.textContent = `${percent}%`;

    // SVG Circle Stroke Dashoffset (Circumference ~ 226.2)
    const circumference = 226.2;
    const offset = circumference - (percent / 100) * circumference;
    elements.progressCircle.style.strokeDashoffset = offset;

    // Headlines
    if (total === 0) {
      elements.statsHeadline.textContent = "Your workspace is ready";
      elements.statsSubtitle.textContent = "Add your first goal to get started.";
    } else if (completed === total) {
      elements.statsHeadline.textContent = "Spectacular! Everything is done 🎉";
      elements.statsSubtitle.textContent = `All ${total} tasks have been achieved. Take a well-earned break!`;
    } else if (percent >= 50) {
      elements.statsHeadline.textContent = "Great momentum! Over halfway there";
      elements.statsSubtitle.textContent = `${completed} completed, ${active} remaining. Keep it up!`;
    } else {
      elements.statsHeadline.textContent = "Let's make today productive!";
      elements.statsSubtitle.textContent = `${active} pending tasks on your agenda.`;
    }
  }

  // ---------------------------------------------------------------------------
  // Task Rendering
  // ---------------------------------------------------------------------------
  function getFilteredAndSortedTasks() {
    let list = [...state.tasks];

    // Filter by Tab
    if (state.filter === 'active') {
      list = list.filter(t => !t.completed);
    } else if (state.filter === 'completed') {
      list = list.filter(t => t.completed);
    } else if (state.filter === 'high-priority') {
      list = list.filter(t => t.priority === 'high');
    }

    // Filter by Category
    if (state.categoryFilter !== 'all') {
      list = list.filter(t => t.category === state.categoryFilter);
    }

    // Filter by Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Sorting
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    list.sort((a, b) => {
      switch (state.sortBy) {
        case 'date-new':
          return b.createdAt - a.createdAt;
        case 'date-old':
          return a.createdAt - b.createdAt;
        case 'priority-desc':
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        case 'due-soon':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return list;
  }

  function renderTasks() {
    const filteredTasks = getFilteredAndSortedTasks();
    elements.taskList.innerHTML = '';

    // Update view title label
    let titleText = 'All Tasks';
    if (state.filter === 'active') titleText = 'Active Tasks';
    if (state.filter === 'completed') titleText = 'Completed Tasks';
    if (state.filter === 'high-priority') titleText = 'High Priority Tasks';
    if (state.categoryFilter !== 'all') titleText += ` (${state.categoryFilter})`;
    elements.currentViewTitle.textContent = `${titleText} (${filteredTasks.length})`;

    // Empty state handling
    if (filteredTasks.length === 0) {
      elements.emptyState.classList.remove('hidden');
    } else {
      elements.emptyState.classList.add('hidden');
    }

    // Render items
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;
      li.dataset.priority = task.priority;

      // Category Icon Map
      const categoryIcons = {
        Work: '💼',
        Personal: '👤',
        Study: '📚',
        Health: '🧘',
        Finance: '💰'
      };

      const dueMeta = getDueDateMeta(task.dueDate);
      const dueBadgeHTML = dueMeta ? `
        <span class="badge date-badge ${dueMeta.status}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${dueMeta.label}
        </span>
      ` : '';

      li.innerHTML = `
        <button class="task-checkbox-btn" aria-label="Mark task '${escapeHTML(task.title)}' as ${task.completed ? 'incomplete' : 'complete'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>

        <div class="task-body">
          <span class="task-title">${escapeHTML(task.title)}</span>
          <div class="task-meta">
            <span class="badge priority-badge-${task.priority}">
              ${task.priority === 'high' ? '🔥 High' : task.priority === 'medium' ? '⚡ Medium' : '🌱 Low'}
            </span>
            <span class="badge category-badge">
              ${categoryIcons[task.category] || '🏷️'} ${escapeHTML(task.category || 'General')}
            </span>
            ${dueBadgeHTML}
          </div>
        </div>

        <div class="task-actions">
          <button class="action-btn edit-btn" aria-label="Edit task" title="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn delete-btn" aria-label="Delete task" title="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Event Listeners for Item
      const checkboxBtn = li.querySelector('.task-checkbox-btn');
      checkboxBtn.addEventListener('click', () => toggleTaskComplete(task.id));

      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => openEditModal(task.id));

      const deleteBtn = li.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => deleteTaskWithAnimation(li, task.id));

      elements.taskList.appendChild(li);
    });

    updateDashboard();
  }

  // ---------------------------------------------------------------------------
  // Task Actions
  // ---------------------------------------------------------------------------
  function addTask(title, priority, category, dueDate) {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: trimmed,
      completed: false,
      priority: priority || 'medium',
      category: category || 'Personal',
      dueDate: dueDate || '',
      createdAt: Date.now(),
      completedAt: null
    };

    state.tasks.unshift(newTask);
    saveToStorage();
    renderTasks();
    playSound('add');
    showToast(`Task added: "${newTask.title.slice(0, 24)}${newTask.title.length > 24 ? '...' : ''}"`);
  }

  function toggleTaskComplete(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;

    saveToStorage();
    renderTasks();

    if (task.completed) {
      playSound('complete');
      // If all active tasks completed, trigger celebration!
      const allDone = state.tasks.length > 0 && state.tasks.every(t => t.completed);
      if (allDone) {
        setTimeout(triggerConfetti, 100);
      }
    } else {
      playSound('uncomplete');
    }
  }

  function deleteTaskWithAnimation(liElement, id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const [deletedTask] = state.tasks.splice(taskIndex, 1);
    saveToStorage();
    playSound('delete');

    liElement.classList.add('deleting');
    setTimeout(() => {
      renderTasks();
    }, 250);

    // Provide Undo via Toast
    showToast(`Deleted "${deletedTask.title.slice(0, 22)}..."`, () => {
      state.tasks.splice(taskIndex, 0, deletedTask);
      saveToStorage();
      renderTasks();
      playSound('add');
    });
  }

  function openEditModal(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    elements.editTaskId.value = task.id;
    elements.editTaskTitle.value = task.title;
    elements.editTaskPriority.value = task.priority;
    elements.editTaskCategory.value = task.category;
    elements.editTaskDue.value = task.dueDate || '';

    elements.editModal.showModal();
  }

  function closeEditModal() {
    elements.editModal.close();
  }

  function saveEditedTask(e) {
    e.preventDefault();
    const id = elements.editTaskId.value;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = elements.editTaskTitle.value.trim();
    if (!newTitle) return;

    task.title = newTitle;
    task.priority = elements.editTaskPriority.value;
    task.category = elements.editTaskCategory.value;
    task.dueDate = elements.editTaskDue.value;

    saveToStorage();
    closeEditModal();
    renderTasks();
    showToast('Task updated successfully');
  }

  function markAllDone() {
    if (state.tasks.length === 0) return;
    const anyIncomplete = state.tasks.some(t => !t.completed);
    state.tasks.forEach(t => {
      t.completed = anyIncomplete;
      t.completedAt = anyIncomplete ? Date.now() : null;
    });

    saveToStorage();
    renderTasks();

    if (anyIncomplete) {
      playSound('celebrate');
      triggerConfetti();
      showToast('All tasks marked as completed!');
    } else {
      playSound('uncomplete');
      showToast('All tasks marked as pending');
    }
  }

  function clearCompleted() {
    const completedTasks = state.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
      showToast('No completed tasks to clear');
      return;
    }

    const previousTasks = [...state.tasks];
    state.tasks = state.tasks.filter(t => !t.completed);
    saveToStorage();
    renderTasks();
    playSound('delete');

    showToast(`Cleared ${completedTasks.length} completed task(s)`, () => {
      state.tasks = previousTasks;
      saveToStorage();
      renderTasks();
    });
  }

  // ---------------------------------------------------------------------------
  // Theme & Sound Toggles
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    state.settings.theme = theme;
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
      elements.moonIcon.classList.add('hidden');
      elements.sunIcon.classList.remove('hidden');
    } else {
      elements.moonIcon.classList.remove('hidden');
      elements.sunIcon.classList.add('hidden');
    }
    saveToStorage();
  }

  function toggleTheme() {
    const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  function applySoundSettings(enabled) {
    state.settings.soundEnabled = enabled;
    if (enabled) {
      elements.soundOnIcon.classList.remove('hidden');
      elements.soundOffIcon.classList.add('hidden');
    } else {
      elements.soundOnIcon.classList.add('hidden');
      elements.soundOffIcon.classList.remove('hidden');
    }
    saveToStorage();
  }

  function toggleSound() {
    applySoundSettings(!state.settings.soundEnabled);
    if (state.settings.soundEnabled) {
      playSound('add');
      showToast('Sound effects enabled 🔔');
    } else {
      showToast('Sound effects muted 🔕');
    }
  }

  // ---------------------------------------------------------------------------
  // Export & Import Data Features
  // ---------------------------------------------------------------------------
  function exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `novatask_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    showToast('Data exported as JSON');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          state.tasks = imported;
          saveToStorage();
          renderTasks();
          showToast(`Successfully imported ${imported.length} tasks!`);
        } else {
          showToast('Invalid JSON task backup file', 'error');
        }
      } catch {
        showToast('Failed to parse JSON file', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function loadSampleTasks() {
    state.tasks = [...DEFAULT_SAMPLE_TASKS];
    saveToStorage();
    renderTasks();
    showToast('Loaded demo tasks');
  }

  // ---------------------------------------------------------------------------
  // Event Listeners Setup
  // ---------------------------------------------------------------------------
  function setupEventListeners() {
    // Theme & Sound
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.soundToggleBtn.addEventListener('click', toggleSound);

    // Task Form Submit
    elements.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTask(
        elements.taskTitleInput.value,
        elements.taskPrioritySelect.value,
        elements.taskCategorySelect.value,
        elements.taskDueDate.value
      );
      elements.taskTitleInput.value = '';
      elements.taskTitleInput.focus();
    });

    // Search Input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery.length > 0) {
        elements.clearSearchBtn.classList.remove('hidden');
      } else {
        elements.clearSearchBtn.classList.add('hidden');
      }
      renderTasks();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      renderTasks();
      elements.searchInput.focus();
    });

    // Filter Tabs
    elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.filter = btn.dataset.filter;
        renderTasks();
      });
    });

    // Category Filter Pills
    elements.categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (!pill) return;

      elements.categoryPills.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.categoryFilter = pill.dataset.category;
      renderTasks();
    });

    // Sort Select
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderTasks();
    });

    // Bulk Actions
    elements.markAllDoneBtn.addEventListener('click', markAllDone);
    elements.clearCompletedBtn.addEventListener('click', clearCompleted);

    // Modal Edit Form
    elements.editForm.addEventListener('submit', saveEditedTask);
    elements.closeModalBtn.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.editModal.addEventListener('click', (e) => {
      if (e.target === elements.editModal) {
        closeEditModal();
      }
    });

    // Data Utilities
    elements.exportBtn.addEventListener('click', exportData);
    elements.importFile.addEventListener('change', importData);
    elements.resetSampleBtn.addEventListener('click', loadSampleTasks);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Focus input with '/' or Cmd+K when not editing
      if (
        (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'SELECT' &&
        document.activeElement.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        elements.taskTitleInput.focus();
      }
      // Close modal on Escape
      if (e.key === 'Escape' && elements.editModal.open) {
        closeEditModal();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  function init() {
    loadFromStorage();
    applyTheme(state.settings.theme);
    applySoundSettings(state.settings.soundEnabled);
    setupEventListeners();
    renderTasks();
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
