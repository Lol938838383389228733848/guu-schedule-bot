require("dotenv").config();
const fastify = require("fastify")({ logger: false });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// Загружаем данные из отдельного файла, чтобы не раздувать server.js
// Если у тебя нет schedule-data.js, данные будут браться из переменной DATA ниже
let DATA;
try {
  DATA = require("./schedule-data.js");
} catch (e) {
  console.log("schedule-data.js not found, using embedded data");
  DATA = { courses: [], institutes: [], groups: [] };
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_API_URL = process.env.AI_API_URL || "https://api.baimo.ai/v1/chat/completions";

const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks(){try{return JSON.parse(fs.readFileSync(TASKS_FILE,"utf-8"))}catch{return[]}}
function saveTasks(t){fs.writeFileSync(TASKS_FILE,JSON.stringify(t,null,2))}
if(!fs.existsSync(TASKS_FILE))saveTasks([]);

// Если данных нет, добавляем тестовые, чтобы интерфейс не был пустым
if (!DATA.courses || DATA.courses.length === 0) {
  DATA = {
    courses: [{ id: 3, name: "3 курс" }],
    institutes: [
      { id: "iom", name: "ИОМ", emoji: "🏗️" },
      { id: "iupsibk", name: "ИУПСиБК", emoji: "👥" },
      { id: "iis", name: "ИИС", emoji: "💻" },
      { id: "im", name: "ИМ", emoji: "📣" },
      { id: "ief", name: "ИЭиФ", emoji: "💰" },
      { id: "iguip", name: "ИГУиП", emoji: "⚖️" }
    ],
    groups: [
      { id: "test-1", c: 3, i: "iom", n: "Тестовая группа", e: "🧪", f: "Для проверки", s: { "ПН": { o: [{ t: "10:00-11:30", s: "Тестовая пара", y: "Л", p: "Иванов", r: "101" }] } } }
    ]
  };
}

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no,maximum-scale=1">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#03030a;--glass:rgba(255,255,255,0.03);--border:rgba(255,255,255,0.08);--text:#fff;--dim:#9ca3af;--v:#8b5cf6;--c:#06b6d4;--p:#ec4899;--g:#10b981;--o:#f59e0b;--gv:rgba(139,92,246,0.4);--r-lg:24px;--r-md:16px;--r-sm:12px;--font:'Inter',sans-serif}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden}
.bg-mesh{position:fixed;inset:0;z-index:0;pointer-events:none}
.orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.5;animation:float 20s infinite}
.orb-1{width:300px;height:300px;background:var(--v);top:-10%;left:-10%}
.orb-2{width:250px;height:250px;background:var(--c);bottom:10%;right:-10%;animation-delay:-7s}
@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-20px)}}
.app{position:relative;z-index:1;max-width:500px;margin:0 auto;padding:16px}
.screen{display:none;opacity:0;transition:opacity 0.3s}.screen.active{display:block;opacity:1}
.hero{text-align:center;padding:20px 0}
.logo{width:80px;height:80px;margin:0 auto 16px;background:linear-gradient(135deg,var(--v),var(--c));border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:40px;box-shadow:0 10px 30px var(--gv)}
h1{font-size:28px;font-weight:800;background:linear-gradient(to right,#fff,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:var(--dim);font-size:13px}
.badge{display:inline-block;margin-top:12px;padding:6px 12px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);border-radius:20px;font-size:12px;color:#c4b5fd}
.nav{display:flex;gap:8px;margin:20px 0;background:var(--glass);padding:4px;border-radius:var(--r-md);border:1px solid var(--border)}
.nav-btn{flex:1;padding:10px;text-align:center;border-radius:var(--r-sm);font-size:12px;font-weight:600;color:var(--dim);cursor:pointer;transition:0.2s}
.nav-btn.active{background:var(--v);color:#fff;box-shadow:0 4px 12px var(--gv)}
.section-title{font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;margin:16px 0 8px;letter-spacing:1px}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{padding:8px 16px;background:var(--glass);border:1px solid var(--border);border-radius:20px;font-size:13px;white-space:nowrap;cursor:pointer;color:var(--dim)}
.chip.active{background:var(--v);color:#fff;border-color:transparent}
.search{width:100%;padding:12px 16px;background:var(--glass);border:1px solid var(--border);border-radius:var(--r-md);color:#fff;margin:12px 0;font-family:inherit}
.list{display:flex;flex-direction:column;gap:8px}
.card{padding:14px;background:var(--glass);border:1px solid var(--border);border-radius:var(--r-md);display:flex;align-items:center;gap:12px;cursor:pointer}
.card:active{transform:scale(0.98)}
.card-emoji{font-size:24px}
.card-info h3{font-size:15px;margin-bottom:2px}
.card-info p{font-size:11px;color:var(--dim)}
/* Schedule */
.top-bar{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.back{width:36px;height:36px;background:var(--glass);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.days{display:flex;gap:6px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px}
.day{min-width:50px;padding:8px;background:var(--glass);border:1px solid var(--border);border-radius:10px;text-align:center;cursor:pointer;font-size:12px;color:var(--dim)}
.day.active{background:var(--v);color:#fff;border-color:transparent}
.lesson{padding:14px;background:var(--glass);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:10px;position:relative;overflow:hidden}
.lesson::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v)}
.lesson.prac::before{background:var(--c)}
.lesson.lab::before{background:var(--o)}
.l-time{font-size:12px;color:#c4b5fd;font-weight:700;margin-bottom:4px}
.l-name{font-size:15px;font-weight:700;margin-bottom:6px}
.l-meta{font-size:12px;color:var(--dim)}
.ai-btn{width:100%;margin-top:10px;padding:10px;background:linear-gradient(135deg,var(--v),var(--p));border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer}
/* Modal */
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;display:none;align-items:flex-end}
.modal.show{display:flex}
.modal-content{width:100%;background:#0f0f1e;border-radius:24px 24px 0 0;padding:20px;max-height:90vh;overflow-y:auto;border:1px solid var(--border)}
.close-modal{float:right;background:none;border:none;color:var(--dim);font-size:24px;cursor:pointer}
textarea{width:100%;height:100px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:12px;padding:12px;color:#fff;margin:12px 0;font-family:inherit}
.btn-primary{width:100%;padding:14px;background:var(--v);border:none;border-radius:12px;color:#fff;font-weight:700;font-size:16px;cursor:pointer}
.answer{margin-top:16px;padding:16px;background:rgba(139,92,246,0.1);border-radius:12px;font-size:14px;line-height:1.6;display:none}
.answer.show{display:block}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--g);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;opacity:0;transition:0.3s;pointer-events:none}
.toast.show{opacity:1}
</style>
</head>
<body>
<div class="bg-mesh"><div class="orb orb-1"></div><div class="orb orb-2"></div></div>
<div class="app">
  <div id="home" class="screen active">
    <div class="hero">
      <div class="logo">🎓</div>
      <h1>Расписание ГУУ</h1>
      <div class="sub">3 курс · Осень 2026</div>
      <div class="badge" id="weekBadge">Загрузка...</div>
    </div>
    <div class="nav">
      <div class="nav-btn active" onclick="tab('schedule')">📅 Пары</div>
      <div class="nav-btn" onclick="tab('ai')">🤖 ИИ</div>
      <div class="nav-btn" onclick="tab('tasks')">📝 Задачи</div>
      <div class="nav-btn" onclick="tab('fit')">🏃 Физра</div>
    </div>
    
    <div id="view-schedule">
      <div class="section-title">Курс</div>
      <div class="chips" id="courseList"></div>
      <div class="section-title">Институт</div>
      <div class="chips" id="instList"></div>
      <input class="search" id="search" placeholder="Поиск группы...">
      <div class="section-title">Группы</div>
      <div class="list" id="groupList"></div>
    </div>

    <div id="view-ai" style="display:none">
      <div class="section-title">ИИ Помощник</div>
      <textarea id="aiQ" placeholder="Введи вопрос или задание..."></textarea>
      <button class="btn-primary" onclick="askAI()">Спросить</button>
      <div id="aiA" class="answer"></div>
    </div>

    <div id="view-tasks" style="display:none">
      <div class="section-title">Добавить задачу</div>
      <input class="search" id="taskTitle" placeholder="Название">
      <input type="datetime-local" class="search" id="taskDate">
      <button class="btn-primary" onclick="addTask()">Сохранить</button>
      <div class="section-title" style="margin-top:20px">Мои задачи</div>
      <div class="list" id="taskList"></div>
    </div>

    <div id="view-fit" style="display:none">
      <div class="section-title">Физкультура</div>
      <div style="text-align:center;padding:20px">
        <div style="font-size:40px;font-weight:800" id="fitScore">0 / 72</div>
        <div style="color:var(--dim);margin-top:8px">часов</div>
        <button class="btn-primary" style="margin-top:20px" onclick="addFit()">+2 часа (Пара)</button>
      </div>
    </div>
  </div>

  <div id="sched" class="screen">
    <div class="top-bar">
      <div class="back" onclick="back()">←</div>
      <div>
        <div style="font-weight:700" id="sName">Группа</div>
        <div style="font-size:12px;color:var(--dim)" id="sFac">Институт</div>
      </div>
    </div>
    <div class="days" id="dayTabs"></div>
    <div id="lessonList"></div>
  </div>
</div>

<div class="modal" id="aiModal">
  <div class="modal-content">
    <button class="close-modal" onclick="closeModal()">×</button>
    <h3 id="mSubj" style="margin-bottom:10px">Предмет</h3>
    <textarea id="mTask" placeholder="Что нужно решить?"></textarea>
    <button class="btn-primary" onclick="solve()">✨ Решить через ИИ</button>
    <div id="mAns" class="answer"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const tg = window.Telegram.WebApp;
tg.expand();
let DATA, COURSE=3, INST="iom", DAY=0, GROUP=null;
const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ"];

// Инициализация
async function init() {
  // ВОТ ТУТ БЫЛА ОШИБКА - ТЕПЕРЬ МЫ ГРУЗИМ ДАННЫЕ
  const res = await fetch('/api/data');
  DATA = await res.json();
  
  // Неделя
  const start = new Date(2026, 8, 1);
  const now = new Date();
  const week = Math.floor((now - start) / (604800000)) + 1;
  document.getElementById('weekBadge').innerText = week + " учебная неделя";
  
  renderFilters();
  loadTasks();
  updateFit();
}

function renderFilters() {
  const cBox = document.getElementById('courseList');
  const iBox = document.getElementById('instList');
  cBox.innerHTML = DATA.courses.map(c => `<div class="chip ${c.id===COURSE?'active':''}" onclick="setCourse(${c.id})">${c.name}</div>`).join('');
  iBox.innerHTML = DATA.institutes.map(i => `<div class="chip ${i.id===INST?'active':''}" onclick="setInst('${i.id}')">${i.emoji} ${i.name}</div>`).join('');
  renderGroups();
}

function setCourse(id) { COURSE=id; renderFilters(); }
function setInst(id) { INST=id; renderFilters(); }

function renderGroups() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = DATA.groups.filter(g => g.c===COURSE && g.i===INST && (g.n.toLowerCase().includes(q) || g.f.toLowerCase().includes(q)));
  document.getElementById('groupList').innerHTML = list.map(g => `
    <div class="card" onclick="openGroup('${g.id}')">
      <div class="card-emoji">${g.e}</div>
      <div class="card-info">
        <h3>${g.n}</h3>
        <p>${g.f}</p>
      </div>
    </div>
  `).join('');
}
document.getElementById('search').oninput = renderGroups;

function openGroup(id) {
  GROUP = DATA.groups.find(g => g.id === id);
  document.getElementById('sName').innerText = GROUP.n;
  document.getElementById('sFac').innerText = GROUP.f;
  document.getElementById('home').classList.remove('active');
  document.getElementById('sched').classList.add('active');
  renderDays();
}

function back() {
  document.getElementById('sched').classList.remove('active');
  document.getElementById('home').classList.add('active');
}

function renderDays() {
  const box = document.getElementById('dayTabs');
  box.innerHTML = DAYS.map((d,i) => `<div class="day ${i===DAY?'active':''}" onclick="setDay(${i})">${d}</div>`).join('');
  renderLessons();
}

function setDay(i) { DAY=i; renderDays(); }

// Умный парсер недель
function checkWeek(text, currentWeek) {
  // Ищем (ПЗ 14 н) или (Л 2-10 н)
  const match = text.match(/\\(([^)]+)\\s*н\\)/);
  if (!match) return true; // Нет указания недель - значит всегда
  
  const content = match[1]; // Например "ПЗ 14" или "Л 2-10"
  // Убираем тип занятия (ПЗ, Л, ЛЗ)
  const nums = content.replace(/[А-Яа-яA-Za-z]/g, '').trim();
  
  if (nums.includes('-')) {
    const [start, end] = nums.split('-').map(Number);
    return currentWeek >= start && currentWeek <= end;
  } else {
    const num = parseInt(nums);
    return currentWeek === num;
  }
}

function renderLessons() {
  if (!GROUP) return;
  const dayName = DAYS[DAY];
  const data = GROUP.s[dayName];
  if (!data) { document.getElementById('lessonList').innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">Нет занятий</div>'; return; }
  
  // Определяем четность. 1 сентября 2026 - вторник. 
  // Пусть 1-я неделя будет нечетной для примера, или считаем по дате.
  // Для простоты: если неделя нечетная - берем 'o', иначе 'e' (если есть)
  const start = new Date(2026, 8, 1);
  const now = new Date();
  const weekNum = Math.floor((now - start) / (604800000)) + 1;
  const isEven = weekNum % 2 === 0;
  
  let lessons = isEven ? (data.e || data.o) : data.o;
  if (!lessons) lessons = [];
  
  // Фильтрация по неделям
  lessons = lessons.filter(l => checkWeek(l.s + " " + l.y, weekNum));
  
  const box = document.getElementById('lessonList');
  if (lessons.length === 0) {
    box.innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">На этой неделе пар нет</div>';
    return;
  }
  
  box.innerHTML = lessons.map(l => {
    const type = l.y?.includes('ПЗ') ? 'prac' : (l.y?.includes('ЛЗ') ? 'lab' : '');
    return `
    <div class="lesson ${type}">
      <div class="l-time">${l.t}</div>
      <div class="l-name">${l.s}</div>
      <div class="l-meta">📍 ${l.r || '-'} • 👤 ${l.p || '-'}</div>
      <button class="ai-btn" onclick="openAI('${l.s.replace(/'/g, "\\'")}')">🤖 Решить домашку</button>
    </div>
  `}).join('');
}

// AI
let currentSubject = "";
function openAI(subj) {
  currentSubject = subj;
  document.getElementById('mSubj').innerText = subj;
  document.getElementById('mTask').value = "";
  document.getElementById('mAns').classList.remove('show');
  document.getElementById('aiModal').classList.add('show');
}
function closeModal() { document.getElementById('aiModal').classList.remove('show'); }

async function solve() {
  const q = document.getElementById('mTask').value;
  if (!q) return toast("Введите задание");
  const btn = document.querySelector('#aiModal .btn-primary');
  btn.innerText = "Думаю...";
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ subject: currentSubject, task: q })
    });
    const d = await r.json();
    const ans = document.getElementById('mAns');
    ans.innerText = d.answer || d.error;
    ans.classList.add('show');
  } catch(e) { toast("Ошибка ИИ"); }
  btn.innerText = "✨ Решить через ИИ";
}

async function askAI() {
  const q = document.getElementById('aiQ').value;
  if (!q) return;
  const btn = document.querySelector('#view-ai .btn-primary');
  btn.innerText = "Думаю...";
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ subject: "Общий вопрос", task: q })
    });
    const d = await r.json();
    const ans = document.getElementById('aiA');
    ans.innerText = d.answer || d.error;
    ans.classList.add('show');
  } catch(e) { toast("Ошибка"); }
  btn.innerText = "Спросить";
}

// Tasks
let tasks = [];
async function loadTasks() {
  const r = await fetch('/api/tasks');
  tasks = await r.json();
  renderTasks();
}
function renderTasks() {
  document.getElementById('taskList').innerHTML = tasks.map(t => `
    <div class="card" style="flex-direction:column;align-items:flex-start">
      <div style="width:100%;display:flex;justify-content:space-between">
        <b>${t.title}</b>
        <span onclick="delTask('${t.id}')" style="color:var(--p)">✕</span>
      </div>
      <div style="font-size:12px;color:var(--dim);margin-top:4px">📅 ${new Date(t.deadline).toLocaleString()}</div>
    </div>
  `).join('');
}
async function addTask() {
  const title = document.getElementById('taskTitle').value;
  const date = document.getElementById('taskDate').value;
  if (!title || !date) return toast("Заполните всё");
  await fetch('/api/tasks', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId: tg.initDataUnsafe.user?.id || 0, title, deadline: date })
  });
  document.getElementById('taskTitle').value = "";
  loadTasks();
  toast("Добавлено");
}
async function delTask(id) {
  await fetch('/api/tasks/'+id, { method: 'DELETE' });
  loadTasks();
}

// Fitness
function updateFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0}');
  document.getElementById('fitScore').innerText = fit.h + " / 72";
}
function addFit() {
  const fit = JSON.parse(localStorage.getItem('fit') || '{"h":0}');
  fit.h += 2;
  localStorage.setItem('fit', JSON.stringify(fit));
  updateFit();
  toast("+2 часа");
}

// Tabs
function tab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  ['schedule','ai','tasks','fit'].forEach(v => {
    document.getElementById('view-'+v).style.display = v===name ? 'block' : 'none';
  });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

init();
<\/script>
</body>
</html>`;

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));
fastify.get("/api/data", async () => DATA);

// AI Endpoint
fastify.post("/api/ai", async (req, reply) => {
  if (!AI_API_KEY) return { error: "API ключ не настроен" };
  try {
    const r = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: "Ты помощник студента ГУУ. Отвечай кратко и по делу. Предмет: " + req.body.subject },
          { role: "user", content: req.body.task }
        ]
      })
    });
    const d = await r.json();
    return { answer: d.choices?.[0]?.message?.content || "Нет ответа" };
  } catch (e) {
    return { error: e.message };
  }
});

// Tasks API
fastify.get("/api/tasks", async (req) => loadTasks());
fastify.post("/api/tasks", async (req) => {
  const t = { id: Date.now().toString(), ...req.body, done: false, reminded: false };
  const all = loadTasks();
  all.push(t);
  saveTasks(all);
  return t;
});
fastify.delete("/api/tasks/:id", async (req) => {
  saveTasks(loadTasks().filter(t => t.id !== req.params.id));
  return { ok: true };
});

// Bot & Reminders
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => ctx.reply("🎓 Расписание ГУУ готово!", {
  reply_markup: { inline_keyboard: [[{ text: "Открыть", web_app: { url: APP_URL } }]] }
}));

// Проверка напоминаний каждые 5 минут
cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  const tasks = loadTasks();
  let changed = false;
  
  for (let t of tasks) {
    if (t.reminded) continue;
    const dl = new Date(t.deadline);
    const diff = dl - now;
    
    // За 1 час до дедлайна (пары)
    if (diff > 0 && diff < 3600000) {
      try {
        await bot.telegram.sendMessage(t.userId, `⏰ Скоро пара!\n📝 ${t.title}\nНе забудь домашку!`);
        t.reminded = true;
        changed = true;
      } catch(e) {}
    }
  }
  if (changed) saveTasks(tasks);
});

fastify.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  console.log("Server started");
  bot.launch();
});
