(() => {
  'use strict';

  const STORAGE_KEY = 'calorieflow.entries.v1';
  const GOAL_KEY = 'calorieflow.goal.v1';
  const THEME_KEY = 'calorieflow.theme.v1';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 64;

  const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
  const MEAL_META = {
    breakfast: { label: 'Breakfast', icon: '🍳' },
    lunch: { label: 'Lunch', icon: '🥗' },
    dinner: { label: 'Dinner', icon: '🍽️' },
    snack: { label: 'Snack', icon: '🍎' },
  };

  const els = {
    body: document.body,
    dateDisplay: document.getElementById('date-display'),
    progressCircle: document.getElementById('progress-circle'),
    remainingValue: document.getElementById('remaining-value'),
    remainingLabel: document.getElementById('remaining-label'),
    goalValue: document.getElementById('goal-value'),
    consumedValue: document.getElementById('consumed-value'),
    burnedValue: document.getElementById('burned-value'),
    goalInput: document.getElementById('goal-input'),
    form: document.getElementById('entry-form'),
    foodName: document.getElementById('food-name-input'),
    foodCalories: document.getElementById('food-calories-input'),
    mealSelect: document.getElementById('meal-select'),
    typeSelect: document.getElementById('type-select'),
    entriesList: document.getElementById('entries-list'),
    emptyState: document.getElementById('empty-state'),
    clearAllBtn: document.getElementById('clear-all-btn'),
    themeToggle: document.getElementById('theme-toggle-btn'),
    toastContainer: document.getElementById('toast-container'),
  };

  let state = {
    entries: loadEntries(),
    goal: loadGoal(),
  };

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Could not read saved entries', err);
      return [];
    }
  }

  function loadGoal() {
    const raw = parseInt(localStorage.getItem(GOAL_KEY), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 2000;
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (err) {
      console.warn('Could not save entries', err);
      showToast('Storage is full — could not save', 'danger');
    }
  }

  function saveGoal() {
    localStorage.setItem(GOAL_KEY, String(state.goal));
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString();
  }

  function getTotals() {
    let consumed = 0;
    let burned = 0;
    for (const entry of state.entries) {
      if (entry.type === 'burned') burned += entry.calories;
      else consumed += entry.calories;
    }
    return { consumed, burned };
  }

  function render() {
    renderSummary();
    renderEntries();
    els.dateDisplay.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function renderSummary() {
    const { consumed, burned } = getTotals();
    const goal = state.goal;
    const net = consumed - burned;
    const remaining = goal - net;

    els.goalValue.textContent = formatNumber(goal);
    els.consumedValue.textContent = formatNumber(consumed);
    els.burnedValue.textContent = formatNumber(burned);

    if (remaining >= 0) {
      els.remainingValue.textContent = formatNumber(remaining);
      els.remainingLabel.textContent = 'remaining';
    } else {
      els.remainingValue.textContent = formatNumber(Math.abs(remaining));
      els.remainingLabel.textContent = 'over goal';
    }

    const ratio = goal > 0 ? Math.min(net / goal, 1) : 0;
    const clampedRatio = Math.max(ratio, 0);
    els.progressCircle.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    els.progressCircle.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - clampedRatio));
    els.progressCircle.classList.toggle('over', remaining < 0);
  }

  function renderEntries() {
    els.entriesList.innerHTML = '';

    if (state.entries.length === 0) {
      els.emptyState.classList.remove('hidden');
      return;
    }
    els.emptyState.classList.add('hidden');

    const groups = {};
    for (const entry of state.entries) {
      const meal = entry.meal || 'snack';
      (groups[meal] ||= []).push(entry);
    }

    for (const meal of MEAL_ORDER) {
      const items = groups[meal];
      if (!items || items.length === 0) continue;

      const total = items.reduce((sum, e) => sum + e.calories, 0);
      const group = document.createElement('div');
      group.className = 'meal-group';

      const header = document.createElement('div');
      header.className = 'meal-group-header';
      header.innerHTML = `
        <span class="meal-group-name">${MEAL_META[meal].icon} ${MEAL_META[meal].label}</span>
        <span class="meal-group-total">${formatNumber(total)} kcal</span>
      `;
      group.appendChild(header);

      items.forEach((entry) => group.appendChild(buildEntryItem(entry)));
      els.entriesList.appendChild(group);
    }
  }

  function buildEntryItem(entry) {
    const item = document.createElement('div');
    item.className = 'entry-item' + (entry.type === 'burned' ? ' burned' : '');

    const icon = document.createElement('div');
    icon.className = 'entry-icon';
    icon.textContent = entry.type === 'burned' ? '🔥' : MEAL_META[entry.meal]?.icon || '🍽️';

    const info = document.createElement('div');
    info.className = 'entry-info';
    const name = document.createElement('div');
    name.className = 'entry-name';
    name.textContent = entry.name;
    const meta = document.createElement('div');
    meta.className = 'entry-meta';
    meta.textContent =
      entry.type === 'burned' ? 'Exercise' : MEAL_META[entry.meal]?.label || 'Food';
    info.append(name, meta);

    const calories = document.createElement('div');
    calories.className = 'entry-calories';
    calories.textContent = (entry.type === 'burned' ? '−' : '') + formatNumber(entry.calories);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.setAttribute('aria-label', `Delete ${entry.name}`);
    del.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    del.addEventListener('click', () => deleteEntry(entry.id));

    item.append(icon, info, calories, del);
    return item;
  }

  function addEntry(event) {
    event.preventDefault();
    const name = els.foodName.value.trim();
    const calories = parseInt(els.foodCalories.value, 10);

    if (!name) {
      showToast('Please enter a food or activity name', 'danger');
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      showToast('Please enter a valid calorie amount', 'danger');
      return;
    }

    const type = els.typeSelect.value;

    state.entries.push({
      id: uid(),
      name,
      calories: Math.min(calories, 10000),
      meal: els.mealSelect.value,
      type,
      createdAt: Date.now(),
    });

    saveEntries();
    render();
    showToast(
      type === 'burned' ? `Logged ${name} burn 🔥` : `Added ${name} (${formatNumber(calories)} kcal)`,
      'success'
    );

    els.form.reset();
    els.mealSelect.value = 'lunch';
    els.typeSelect.value = 'food';
    els.foodName.focus();
  }

  function deleteEntry(id) {
    const entry = state.entries.find((e) => e.id === id);
    state.entries = state.entries.filter((e) => e.id !== id);
    saveEntries();
    render();
    if (entry) showToast(`Removed ${entry.name}`, 'danger');
  }

  function clearAll() {
    if (state.entries.length === 0) return;
    if (!confirm('Clear all entries for today?')) return;
    state.entries = [];
    saveEntries();
    render();
    showToast('All entries cleared', 'danger');
  }

  function updateGoal() {
    const value = parseInt(els.goalInput.value, 10);
    if (Number.isFinite(value) && value >= 500) {
      state.goal = Math.min(value, 10000);
      saveGoal();
      renderSummary();
    } else {
      els.goalInput.value = state.goal;
    }
  }

  let toastTimer = null;
  function showToast(message, variant = 'success') {
    els.toastContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  function applyTheme(theme) {
    els.body.setAttribute('data-theme', theme);
    document.querySelector('.moon-icon').classList.toggle('hidden', theme === 'light');
    document.querySelector('.sun-icon').classList.toggle('hidden', theme === 'dark');
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme =
      saved ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = els.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
  }

  function init() {
    initTheme();
    els.goalInput.value = state.goal;

    els.form.addEventListener('submit', addEntry);
    els.clearAllBtn.addEventListener('click', clearAll);
    els.goalInput.addEventListener('change', updateGoal);
    els.themeToggle.addEventListener('click', toggleTheme);

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
