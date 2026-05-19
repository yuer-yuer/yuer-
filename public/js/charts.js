/**
 * 图表模块 - Chart.js 配置与渲染
 */

// ─── 全局图表配置 ──────────────────────────────────
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
Chart.defaults.color = '#9ca3af';

let calorieChart = null;
let weightChart = null;
let waterChart = null;
let historyWeightChart = null;
let statsDailyChart = null;
let statsWeightChart = null;
let exerciseWeeklyChart = null;
let exerciseTypeChart = null;
let miniWeightChart = null;

// ─── 热量环图 ──────────────────────────────────────
function updateCalorieChart(targetCal, intake, burned) {
  const ctx = document.getElementById('calorie-chart');
  if (!ctx) return;

  const netIntake = Math.max(intake - burned, 0);
  const remaining = Math.max(targetCal - netIntake, 0);
  const overBudget = netIntake > targetCal;

  const data = overBudget
    ? [netIntake - targetCal, targetCal]
    : [netIntake, remaining];

  const colors = overBudget
    ? ['#ef4444', '#fecaca']
    : ['#10b981', '#e5e7eb'];

  if (calorieChart) {
    calorieChart.data.datasets[0].data = data;
    calorieChart.data.datasets[0].backgroundColor = colors;
    calorieChart.update('none');
    return;
  }

  calorieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: overBudget ? ['超出', '目标'] : ['已摄入', '剩余'],
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} kcal`
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 600,
        easing: 'easeOutQuart'
      }
    }
  });
}

function drawRing(canvasId, value, max, color, completeColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 80;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = cssSize / 2;
  const cy = cssSize / 2;
  const radius = cssSize / 2 - 9;
  const lineWidth = cssSize >= 90 ? 8 : 6;
  const ratio = Math.max(0, Math.min(1, Number(value || 0) / (Number(max) || 1)));
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * ratio;
  const activeColor = completeColor && ratio >= 1 ? completeColor : color;

  ctx.clearRect(0, 0, cssSize, cssSize);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ece4c9';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, 0, cssSize, cssSize);
  gradient.addColorStop(0, activeColor);
  gradient.addColorStop(1, completeColor && ratio >= 1 ? completeColor : '#111827');

  ctx.save();
  ctx.shadowColor = activeColor;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  if (ratio > 0) {
    const dotX = cx + Math.cos(end) * radius;
    const dotY = cy + Math.sin(end) * radius;
    ctx.beginPath();
    ctx.arc(dotX, dotY, lineWidth * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827';
    ctx.stroke();
  }
}

function updateCalorieRings() {
  if (typeof AppState === 'undefined') return;
  const target = calcTargetCal() || 1500;
  const exerciseTarget = calcExerciseTarget();
  const intake = AppState.todayFood.reduce((s, f) => s + Number(f.total_calories || 0), 0);
  const burned = AppState.todayExercise.reduce((s, e) => s + Number(e.calories_burned || 0), 0);
  const remain = Math.max(0, target - intake);
  const exerciseNeed = Math.max(0, exerciseTarget - burned);

  drawRing('calorie-ring-main', intake, target, '#10b981');
  drawRing('calorie-ring-remaining', remain, target, '#f97316');
  drawRing('calorie-ring-exercise', burned, exerciseTarget, '#3b82f6', '#10b981');
  drawRing('food-ring', intake, target, '#10b981');
  drawRing('exercise-ring', burned, exerciseTarget, '#3b82f6', '#10b981');

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('calorie-percent', `${Math.round((intake / target) * 100)}%`);
  setText('calorie-current', Math.round(intake));
  setText('calorie-ring-target', Math.round(target));
  setText('remaining-kcal', Math.round(remain));
  setText('exercise-need', Math.round(exerciseNeed));
  setText('food-remaining-ring', Math.round(remain));
  setText('food-ring-percent', `${Math.round((intake / target) * 100)}%`);
  setText('exercise-need-ring', Math.round(exerciseNeed));
  setText('exercise-ring-percent', `${Math.round((burned / exerciseTarget) * 100)}%`);

  const setWidth = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, value))}%`;
  };
  setWidth('calorie-intake-bar', (intake / target) * 100);
  setWidth('calorie-remaining-bar', (remain / target) * 100);
  setWidth('exercise-need-bar', (exerciseNeed / exerciseTarget) * 100);
}

window.addEventListener('resize', () => {
  clearTimeout(window.__calorieRingResizeTimer);
  window.__calorieRingResizeTimer = setTimeout(updateCalorieRings, 120);
});

// ─── 体重趋势图 ────────────────────────────────────
function updateWeightChart(records) {
  const ctx = document.getElementById('weight-chart');
  if (!ctx) return;

  // 按日期排序（升序）
  const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const labels = sorted.map(r => {
    const d = new Date(r.record_date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const data = sorted.map(r => r.weight);

  if (weightChart) {
    weightChart.data.labels = labels;
    weightChart.data.datasets[0].data = data;
    weightChart.update();
    return;
  }

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '体重(kg)',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.raw} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            font: { size: 11 },
            callback: (v) => v + 'kg'
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ─── 饮水环图 ──────────────────────────────────────
function updateWaterChart(currentMl) {
  const ctx = document.getElementById('water-chart');
  if (!ctx) return;

  const target = 2000;
  const pct = Math.min(currentMl / target, 1);
  const data = [currentMl, Math.max(target - currentMl, 0)];
  const colors = pct >= 1
    ? ['#10b981', '#e5e7eb']
    : ['#3b82f6', '#e5e7eb'];

  if (waterChart) {
    waterChart.data.datasets[0].data = data;
    waterChart.data.datasets[0].backgroundColor = colors;
    waterChart.update('none');
    return;
  }

  waterChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['已喝', '剩余'],
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw}ml`
          }
        }
      },
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ─── 历史体重趋势图 ────────────────────────────────
function updateHistoryWeightChart(records) {
  const ctx = document.getElementById('history-weight-chart');
  if (!ctx) return;

  const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const labels = sorted.map(r => {
    const d = new Date(r.record_date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const data = sorted.map(r => r.weight);

  if (historyWeightChart) {
    historyWeightChart.data.labels = labels;
    historyWeightChart.data.datasets[0].data = data;
    historyWeightChart.update();
    return;
  }

  historyWeightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '体重(kg)',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#10b981',
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.raw} kg`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, callback: (v) => v + 'kg' } }
      }
    }
  });
}

function updateMiniWeightChart(records, profile = {}) {
  const ctx = document.getElementById('my-mini-weight-chart');
  if (!ctx) return;

  let sorted = [...(records || [])]
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .slice(-10);
  if (!sorted.length && (profile.weight || profile.initial_weight)) {
    const today = new Date().toISOString().split('T')[0];
    sorted = [
      { record_date: today, weight: Number(profile.initial_weight || profile.weight) },
      { record_date: today, weight: Number(profile.weight || profile.initial_weight) },
    ];
  }
  const labels = sorted.map(r => {
    const d = new Date(r.record_date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const data = sorted.map(r => Number(r.weight));

  if (miniWeightChart && miniWeightChart.canvas !== ctx) {
    miniWeightChart.destroy();
    miniWeightChart = null;
  }

  if (miniWeightChart) {
    miniWeightChart.data.labels = labels;
    miniWeightChart.data.datasets[0].data = data;
    miniWeightChart.update();
    return;
  }

  miniWeightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '体重',
        data,
        borderColor: '#111827',
        backgroundColor: 'rgba(255, 214, 10, 0.45)',
        borderWidth: 4,
        pointBackgroundColor: '#ff3b30',
        pointBorderColor: '#111827',
        pointBorderWidth: 3,
        pointRadius: 4,
        tension: 0.18,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: '#ffd60a',
          borderWidth: 2,
          displayColors: false,
          callbacks: {
            label: ctx => `${ctx.raw}kg`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#111827', font: { weight: '900' } }
        },
        y: {
          grid: { color: 'rgba(17, 24, 39, 0.14)' },
          ticks: { color: '#111827', font: { weight: '900' } }
        }
      }
    }
  });
}

function updateMyStatsCharts(stats) {
  const typeCanvas = document.getElementById('my-stats-type-chart');
  const dailyCanvas = document.getElementById('my-stats-daily-chart');
  if (!typeCanvas || !dailyCanvas) return;

  const categoryColors = {
    '有氧': '#3b82f6',
    '力量': '#f97316',
    '柔韧': '#a855f7',
    '高强度': '#ef4444',
    '球类': '#22c55e',
    '户外': '#06b6d4',
    '日常': '#9ca3af',
    '自定义': '#64748b',
  };
  const typeMap = new Map();
  (stats.exerciseByType || []).forEach(row => {
    const category = row.category || '自定义';
    typeMap.set(category, (typeMap.get(category) || 0) + Number(row.total_cal || 0));
  });
  const typeLabels = [...typeMap.keys()];
  const typeData = typeLabels.map(label => typeMap.get(label));

  if (window.myStatsTypeChart && window.myStatsTypeChart.canvas !== typeCanvas) {
    window.myStatsTypeChart.destroy();
    window.myStatsTypeChart = null;
  }

  if (window.myStatsTypeChart) {
    window.myStatsTypeChart.data.labels = typeLabels.length ? typeLabels : ['暂无'];
    window.myStatsTypeChart.data.datasets[0].data = typeData.length ? typeData : [1];
    window.myStatsTypeChart.data.datasets[0].backgroundColor = typeLabels.length ? typeLabels.map(label => categoryColors[label] || '#64748b') : ['#e5e7eb'];
    window.myStatsTypeChart.update();
  } else {
    window.myStatsTypeChart = new Chart(typeCanvas, {
      type: 'doughnut',
      data: {
        labels: typeLabels.length ? typeLabels : ['暂无'],
        datasets: [{
          data: typeData.length ? typeData : [1],
          backgroundColor: typeLabels.length ? typeLabels.map(label => categoryColors[label] || '#64748b') : ['#e5e7eb'],
          borderColor: '#111827',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#111827', font: { weight: '900' } } },
          tooltip: { backgroundColor: '#111827' },
        },
      },
    });
  }

  const foodMap = new Map((stats.dailyFood || []).map(row => [row.record_date, Number(row.daily_cal) || 0]));
  const exerciseMap = new Map((stats.dailyExercise || []).map(row => [row.record_date, Number(row.daily_cal) || 0]));
  const labels = [...new Set([...(stats.dailyFood || []).map(row => row.record_date), ...(stats.dailyExercise || []).map(row => row.record_date)])].sort();
  if (!labels.length && stats.startDate) labels.push(stats.startDate);
  const displayLabels = labels.map(label => label.slice(5).replace('-', '/'));

  if (window.myStatsDailyChart && window.myStatsDailyChart.canvas !== dailyCanvas) {
    window.myStatsDailyChart.destroy();
    window.myStatsDailyChart = null;
  }

  if (window.myStatsDailyChart) {
    window.myStatsDailyChart.data.labels = displayLabels;
    window.myStatsDailyChart.data.datasets[0].data = labels.map(date => foodMap.get(date) || 0);
    window.myStatsDailyChart.data.datasets[1].data = labels.map(date => exerciseMap.get(date) || 0);
    window.myStatsDailyChart.update();
  } else {
    window.myStatsDailyChart = new Chart(dailyCanvas, {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [
          {
            label: '摄入',
            data: labels.map(date => foodMap.get(date) || 0),
            borderColor: '#ff3b30',
            backgroundColor: 'rgba(255, 59, 48, .18)',
            borderWidth: 4,
            pointRadius: 4,
            fill: true,
            tension: .28,
          },
          {
            label: '消耗',
            data: labels.map(date => exerciseMap.get(date) || 0),
            borderColor: '#007aff',
            backgroundColor: 'rgba(0, 122, 255, .12)',
            borderWidth: 4,
            pointRadius: 4,
            fill: true,
            tension: .28,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#111827', font: { weight: '900' } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#111827', font: { weight: '900' } } },
          y: { grid: { color: 'rgba(17,24,39,.14)' }, ticks: { color: '#111827', font: { weight: '900' } } },
        },
      },
    });
  }
}

function updateStatsDailyChart(stats) {
  const ctx = document.getElementById('stats-daily-chart');
  if (!ctx) return;

  const foodMap = new Map((stats.dailyFood || []).map(r => [r.record_date, Number(r.daily_cal) || 0]));
  const exerciseMap = new Map((stats.dailyExercise || []).map(r => [r.record_date, Number(r.daily_cal) || 0]));
  const labels = [...new Set([...(stats.dailyFood || []).map(r => r.record_date), ...(stats.dailyExercise || [] ).map(r => r.record_date)])].sort();
  if (labels.length === 0 && stats.startDate && stats.endDate) {
    labels.push(stats.startDate);
  }
  const intakeData = labels.map(date => foodMap.get(date) || 0);
  const burnedData = labels.map(date => exerciseMap.get(date) || 0);

  if (statsDailyChart) {
    statsDailyChart.data.labels = labels.map(label => label.slice(5).replace('-', '/'));
    statsDailyChart.data.datasets[0].data = intakeData;
    statsDailyChart.data.datasets[1].data = burnedData;
    statsDailyChart.update();
    return;
  }

  statsDailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(label => label.slice(5).replace('-', '/')),
      datasets: [
        {
          label: '摄入(kcal)',
          data: intakeData,
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
          borderRadius: 4,
        },
        {
          label: '消耗(kcal)',
          data: burnedData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 10,
          cornerRadius: 8,
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

function updateStatsWeightChart(stats) {
  const ctx = document.getElementById('stats-weight-chart');
  if (!ctx) return;

  const records = stats.dailyWeight || [];
  const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const labels = sorted.length ? sorted.map(r => r.record_date.slice(5).replace('-', '/')) : [stats.startDate?.slice(5).replace('-', '/') || '暂无'];
  const data = sorted.length ? sorted.map(r => r.weight) : [null];

  if (statsWeightChart) {
    statsWeightChart.data.labels = labels;
    statsWeightChart.data.datasets[0].data = data;
    statsWeightChart.update();
    return;
  }

  statsWeightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '体重(kg)',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#10b981',
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.raw} kg`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, callback: (v) => v + 'kg' } }
      }
    }
  });
}

function getWeekDates(startDate) {
  const start = startDate ? new Date(startDate) : new Date();
  if (!startDate) {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d.toISOString().split('T')[0];
  });
}

function updateExerciseCharts(stats) {
  const lineCanvas = document.getElementById('exercise-weekly-chart');
  const typeCanvas = document.getElementById('exercise-type-chart');
  if (!lineCanvas || !typeCanvas) return;

  const dates = getWeekDates(stats.startDate);
  const exerciseMap = new Map((stats.dailyExercise || []).map(row => [row.record_date, Number(row.daily_cal) || 0]));
  const labels = dates.map(date => date.slice(5).replace('-', '/'));
  const data = dates.map(date => exerciseMap.get(date) || 0);
  const gradient = lineCanvas.getContext('2d').createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(59, 130, 246, .35)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

  if (exerciseWeeklyChart) {
    exerciseWeeklyChart.data.labels = labels;
    exerciseWeeklyChart.data.datasets[0].data = data;
    exerciseWeeklyChart.update();
  } else {
    exerciseWeeklyChart = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '运动消耗',
          data,
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#2563eb',
          pointBorderWidth: 2,
          fill: true,
          tension: .35,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            callbacks: { label: (ctx) => `${ctx.raw} kcal` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { color: 'rgba(17, 24, 39, .08)' }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  const categoryColors = {
    '有氧': '#3b82f6',
    '力量': '#f97316',
    '柔韧': '#a855f7',
    '高强度': '#ef4444',
    '球类': '#22c55e',
    '户外': '#06b6d4',
    '日常': '#9ca3af',
    '自定义': '#64748b',
  };
  const typeMap = new Map();
  (stats.exerciseByType || []).forEach(row => {
    const category = row.category || '自定义';
    typeMap.set(category, (typeMap.get(category) || 0) + Number(row.total_cal || 0));
  });
  const typeLabels = [...typeMap.keys()];
  const typeData = typeLabels.map(label => typeMap.get(label));

  if (exerciseTypeChart) {
    exerciseTypeChart.data.labels = typeLabels.length ? typeLabels : ['暂无'];
    exerciseTypeChart.data.datasets[0].data = typeData.length ? typeData : [1];
    exerciseTypeChart.data.datasets[0].backgroundColor = typeLabels.length ? typeLabels.map(label => categoryColors[label] || '#64748b') : ['#e5e7eb'];
    exerciseTypeChart.update();
  } else {
    exerciseTypeChart = new Chart(typeCanvas, {
      type: 'doughnut',
      data: {
        labels: typeLabels.length ? typeLabels : ['暂无'],
        datasets: [{
          data: typeData.length ? typeData : [1],
          backgroundColor: typeLabels.length ? typeLabels.map(label => categoryColors[label] || '#64748b') : ['#e5e7eb'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} kcal` },
          },
        },
      },
    });
  }
}
