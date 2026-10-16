require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// --- КОНФИГУРАЦИЯ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_API_URL = process.env.AI_API_URL || "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions";

// --- ДАННЫЕ РАСПИСАНИЯ (ВШИТЫ ДЛЯ НАДЕЖНОСТИ) ---
// Это сокращенная, но рабочая версия структуры. 
// Если у тебя был полный schedule-data.js, он подключится автоматически ниже.
let SCHEDULE_DATA = {
  courses: [{ id: 3, name: "3 курс" }],
  institutes: [
    { id: "iom", name: "ИОМ", emoji: "🏗️" },
    { id: "iupsibk", name: "ИУПСиБК", emoji: "👥" },
    { id: "iis", name: "ИИС", emoji: "💻" },
    { id: "im", name: "ИМ", emoji: "📣" },
    { id: "ief", name: "ИЭиФ", emoji: "💰" },
    { id: "iguip", name: "ИГУиП", emoji: "⚖️" }
  ],
  groups: []
};

// Пытаемся загрузить полный файл, если он есть
try {
  if (fs.existsSync("./schedule-data.js")) {
    const externalData = require("./schedule-data.js");
    if (externalData.groups && externalData.groups.length > 0) {
      SCHEDULE_DATA = externalData;
      console.log("✅ Данные загружены из schedule-data.js");
    }
  }
} catch (e) {
  console.log("⚠️ schedule-data.js не найден или ошибка, используем встроенные данные");
}

// Если групп всё ещё нет (для теста), добавим одну тестовую
if (SCHEDULE_DATA.groups.length === 0) {
  SCHEDULE_DATA.groups.push({
    id: "test-group", c: 3, i: "iom", n: "Тестовая Группа", e: "🧪", f: "Для проверки работы",
    s: {
      "ПН": { o: [{ t: "10:00-11:30", s: "Тестовая пара", y: "Л", p: "Иванов", r: "101" }] },
      "ВТ": { o: [] }, "СР": { o: [] }, "ЧТ": { o: [] }, "ПТ": { o: [] }, "СБ": { o: [] }
    }
  });
}

// --- ХРАНИЛИЩЕ ЗАДАЧ ---
const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks() { try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8")); } catch { return []; } }
function saveTasks(t) { fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2)); }
if (!fs.existsSync(TASKS_FILE)) saveTasks([]);

// --- HTML ИНТЕРФЕЙС ---
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<style>
:root{--bg:#0f172a;--card:rgba(30,41,59,0.7);--text:#f8fafc;--dim:#94a3b8;--acc:#8b5cf6;--border:rgba(255,255,255,0.1)}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:80px}
.app{max-width:500px;margin:0 auto;padding:16px}
.header{text-align:center;padding:20px 0}
.logo{font-size:48px;margin-bottom:10px}
h1{font-size:24px;margin-bottom:4px}
.sub{color:var(--dim);font-size:14px}
.nav{display:flex;gap:8px;margin:20px 0;background:var(--card);padding:4px;border-radius:12px}
.nav-btn{flex:1;padding:10px;text-align:center;border-radius:8px;font-size:13px;font-weight:600;color:var(--dim);cursor:pointer;transition:0.2s}
.nav-btn.active{background:var(--acc);color:white}
.section{margin-top:20px}
.title{font-size:12px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:10px;letter-spacing:1px}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{padding:8px 16px;background:var(--card);border:1px solid var(--border);border-radius:20px;font-size:13px;white-space:nowrap;cursor:pointer;color:var(--dim)}
.chip.active{background:var(--acc);color:white;border-color:transparent}
.search{width:100%;padding:12px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;color:white;margin-bottom:16px;font-size:14px}
.list{display:flex;flex-direction:column;gap:8px}
.card{padding:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;display:flex;align-items:center;gap:12px;cursor:pointer}
.card:active{transform:scale(0.98)}
.card-icon{font-size:24px}
.card-info h3{font-size:15px;margin-bottom:2px}
.card-info p{font-size:11px;color:var(--dim)}
/* Schedule View */
.top-bar{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.back-btn{width:36px;height:36px;background:var(--card);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.days{display:flex;gap:6px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px}
.day{min-width:50px;padding:8px;background:var(--card);border:1px solid var(--border);border-radius:10px;text-align:center;cursor:pointer;font-size:12px;color:var(--dim)}
.day.active{background:var(--acc);color:white;border-color:transparent}
.lesson{padding:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;position:relative;overflow:hidden}
.lesson::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--acc)}
.l-time{font-size:12px;color:#c4b5fd;font-weight:700;margin-bottom:4px}
.l-name{font-size:15px;font-weight:700;margin-bottom:6px}
.l-meta{font-size:12px;color:var(--dim)}
.ai-btn{width:100%;margin-top:10px;padding:10px;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:none;border-radius:10px;color:white;font-weight:700;cursor:pointer}
/* Modal */
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;display:none;align-items:flex-end}
.modal.show{display:flex}
.modal-content{width:100%;background:#1e293b;border-radius:20px 20px 0 0;padding:20px;max-height:90vh;overflow-y:auto}
.close-modal{float:right;background:none;border:none;color:var(--dim);font-size:24px;cursor:pointer}
textarea{width:100%;height:100px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:10px;padding:12px;color:white;margin:12px 0;font-family:inherit}
.btn-primary{width:100%;padding:14px;background:var(--acc);border:none;border-radius:12px;color:white;font-weight:700;font-size:16px;cursor:pointer}
.answer{margin-top:16px;padding:16px;background:rgba(0,0,0,0.2);border-radius:12px;font-size:14px;line-height:1.5;display:none;white-space:pre-wrap}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--acc);color:white;padding:10px 20px;border-radius:20px;font-size:14px;opacity:0;transition:0.3s;pointer-events:none}
.toast.show{opacity:1}
.loader{text-align:center;padding:20px;color:var(--dim);display:none}
</style>
</head>
<body>
<div class="app">
  <div id="home" class="screen">
    <div class="header">
      <div class="logo">🎓</div>
      <h1>Расписание ГУУ</h1>
      <div class="sub">3 курс · Осень 2026</div>
    </div>
    <div class="nav">
      <div class="nav-btn active" onclick="tab('schedule')">📅 Пары</div>
      <div class="nav-btn" onclick="tab('ai')">🤖 ИИ</div>
      <div class="nav-btn" onclick="tab('tasks')">📝 Задачи</div>
    </div>
    
    <div id="view-schedule">
      <div class="section">
        <div class="title">Курс</div>
        <div class="chips" id="courseList"></div>
      </div>
      <div class="section">
        <div class="title">Институт</div>
        <div class="chips" id="instList"></div>
      </div>
      <input class="search" id="search" placeholder="Поиск группы...">
      <div class="title">Группы</div>
      <div class="list" id="groupList"></div>
    </div>

    <div id="view-ai" style="display:none">
      <div class="title">ИИ Помощник</div>
      <textarea id="aiQ" placeholder="Введи вопрос..."></textarea>
      <button class="btn-primary" onclick="askAI()">Спросить</button>
      <div class="loader" id="aiLoad">🤖 Думаю...</div>
      <div id="aiA" class="answer"></div>
    </div>

    <div id="view-tasks" style="display:none">
      <div class="title">Новая задача</div>
      <input class="search" id="taskTitle" placeholder="Название" style="margin-bottom:8px">
      <input type="datetime-local" class="search" id="taskDate" style="margin-bottom:8px">
      <button class="btn-primary" onclick="addTask()">Сохранить</button>
      <div class="title" style="margin-top:20px">Мои задачи</div>
      <div class="list" id="taskList"></div>
    </div>
  </div>

  <div id="sched" class="screen" style="display:none">
    <div class="top-bar">
      <div class="back-btn" onclick="back()">←</div>
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
    <textarea id="mTask" placeholder="Что решить?"></textarea>
    <button class="btn-primary" onclick="solve()">✨ Решить</button>
    <div class="loader" id="mLoad">🤖 Думаю...</div>
    <div id="mAns" class="answer"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const tg = window.Telegram.WebApp;
tg.expand();
let DATA, COURSE=3, INST="iom", DAY=0, GROUP=null;
const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ"];

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
  try {
    // Загружаем данные с сервера
    const res = await fetch('/api/data');
    if(!res.ok) throw new Error("Server error");
    DATA = await res.json();
    
    // Рендерим интерфейс
    renderFilters();
    loadTasks();
  } catch(e) {
    console.error(e);
    toast("Ошибка загрузки данных");
    document.getElementById('groupList').innerHTML = '<div style="text-align:center;color:var(--dim)">Не удалось загрузить расписание</div>';
  }
}

// --- ЛОГИКА ИНТЕРФЕЙСА ---
function renderFilters() {
  const cBox = document.getElementById('courseList');
  const iBox = document.getElementById('instList');
  
  cBox.innerHTML = DATA.courses.map(c => 
    \`<div class="chip \${c.id===COURSE?'active':''}" onclick="setCourse(\${c.id})">\${c.name}</div>\`
  ).join('');
  
  iBox.innerHTML = DATA.institutes.map(i => 
    \`<div class="chip \${i.id===INST?'active':''}" onclick="setInst('\${i.id}')">\${i.emoji} \${i.name}</div>\`
  ).join('');
  
  renderGroups();
}

function setCourse(id) { COURSE=id; renderFilters(); }
function setInst(id) { INST=id; renderFilters(); }

function renderGroups() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = DATA.groups.filter(g => g.c===COURSE && g.i===INST && (g.n.toLowerCase().includes(q) || g.f.toLowerCase().includes(q)));
  
  document.getElementById('groupList').innerHTML = list.map(g => \`
    <div class="card" onclick="openGroup('\${g.id}')">
      <div class="card-icon">\${g.e}</div>
      <div class="card-info">
        <h3>\${g.n}</h3>
        <p>\${g.f}</p>
      </div>
    </div>
  \`).join('');
}
document.getElementById('search').oninput = renderGroups;

function openGroup(id) {
  GROUP = DATA.groups.find(g => g.id === id);
  if(!GROUP) return;
  document.getElementById('sName').innerText = GROUP.n;
  document.getElementById('sFac').innerText = GROUP.f;
  document.getElementById('home').style.display = 'none';
  document.getElementById('sched').style.display = 'block';
  renderDays();
}

function back() {
  document.getElementById('sched').style.display = 'none';
  document.getElementById('home').style.display = 'block';
}

function renderDays() {
  const box = document.getElementById('dayTabs');
  box.innerHTML = DAYS.map((d,i) => 
    \`<div class="day \${i===DAY?'active':''}" onclick="setDay(\${i})">\${d}</div>\`
  ).join('');
  renderLessons();
}

function setDay(i) { DAY=i; renderDays(); }

// --- ПАРСЕР НЕДЕЛЬ ---
function checkWeek(text, currentWeek) {
  // Ищем паттерн (ПЗ 14 н) или (Л 2-10 н)
  const match = text.match(/\\(([^)]+)\\s*н\\)/);
  if (!match) return true; // Нет указания - значит всегда
  
  const content = match[1]; // "ПЗ 14" или "Л 2-10"
  const nums = content.replace(/[А-Яа-яA-Za-z]/g, '').trim(); // "14" или "2-10"
  
  if (nums.includes('-')) {
    const [start, end] = nums.split('-').map(Number);
    return currentWeek >= start && currentWeek <= end;
  } else {
    return currentWeek === parseInt(nums);
  }
}

function renderLessons() {
  if (!GROUP) return;
  const dayName = DAYS[DAY];
  const data = GROUP.s[dayName];
  
  if (!data) { 
    document.getElementById('lessonList').innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">Нет занятий</div>'; 
    return; 
  }
  
  // Определяем четность недели (1 сентября 2026 - вторник)
  // Пусть 1-я неделя будет нечетной
  const start = new Date(2026, 8, 1);
  const now = new Date();
  const weekNum = Math.floor((now - start) / (604800000)) + 1;
  const isEven = weekNum % 2 === 0;
  
  // Берем нужную неделю
  let lessons = isEven ? (data.e || data.o) : data.o;
  if (!lessons) lessons = [];
  
  // Фильтруем по неделям
  lessons = lessons.filter(l => checkWeek(l.s + " " + l.y, weekNum));
  
  const box = document.getElementById('lessonList');
  if (lessons.length === 0) {
    box.innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px">На этой неделе пар нет</div>';
    return;
  }
  
  box.innerHTML = lessons.map(l => \`
    <div class="lesson">
      <div class="l-time">\${l.t}</div>
      <div class="l-name">\${l.s}</div>
      <div class="l-meta">📍 \${l.r || '-'} • 👤 \${l.p || '-'}</div>
      <button class="ai-btn" onclick="openAI('\${l.s.replace(/'/g, "\\\\'")}')">🤖 Решить домашку</button>
    </div>
  \`).join('');
}

// --- ИИ ---
let currentSubject = "";
function openAI(subj) {
  currentSubject = subj;
  document.getElementById('mSubj').innerText = subj;
  document.getElementById('mTask').value = "";
  document.getElementById('mAns').style.display = 'none';
  document.getElementById('aiModal').classList.add('show');
}
function closeModal() { document.getElementById('aiModal').classList.remove('show'); }

async function solve() {
  const q = document.getElementById('mTask').value;
  if (!q) return toast("Введите задание");
  
  const btn = document.querySelector('#aiModal .btn-primary');
  const load = document.getElementById('mLoad');
  const ans = document.getElementById('mAns');
  
  btn.disabled = true;
  load.style.display = 'block';
  ans.style.display = 'none';
  
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ subject: currentSubject, task: q })
    });
    const d = await r.json();
    ans.innerText = d.answer || d.error;
    ans.style.display = 'block';
  } catch(e) { 
    ans.innerText = "Ошибка соединения с ИИ";
    ans.style.display = 'block';
  } finally {
    btn.disabled = false;
    load.style.display = 'none';
  }
}

async function askAI() {
  const q = document.getElementById('aiQ').value;
  if (!q) return;
  const btn = document.querySelector('#view-ai .btn-primary');
  const load = document.getElementById('aiLoad');
  const ans = document.getElementById('aiA');
  
  btn.disabled = true;
  load.style.display = 'block';
  ans.style.display = 'none';
  
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ subject: "Общий вопрос", task: q })
    });
    const d = await r.json();
    ans.innerText = d.answer || d.error;
    ans.style.display = 'block';
  } catch(e) {
    ans.innerText = "Ошибка соединения";
    ans.style.display = 'block';
  } finally {
    btn.disabled = false;
    load.style.display = 'none';
  }
}

// --- ЗАДАЧИ ---
let tasks = [];
async function loadTasks() {
  try {
    const r = await fetch('/api/tasks');
    tasks = await r.json();
    renderTasks();
  } catch(e) {}
}
function renderTasks() {
  document.getElementById('taskList').innerHTML = tasks.map(t => \`
    <div class="card" style="flex-direction:column;align-items:flex-start">
      <div style="width:100%;display:flex;justify-content:space-between">
        <b>\${t.title}</b>
        <span onclick="delTask('\${t.id}')" style="color:#f87171">✕</span>
      </div>
      <div style="font-size:12px;color:var(--dim);margin-top:4px">📅 \${new Date(t.deadline).toLocaleString()}</div>
    </div>
  \`).join('');
}
async function addTask() {
  const title = document.getElementById('taskTitle').value;
  const date = document.getElementById('taskDate').value;
  if (!title || !date) return toast("Заполните поля");
  
  const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 0;
  
  await fetch('/api/tasks', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ userId, title, deadline: date })
  });
  document.getElementById('taskTitle').value = "";
  loadTasks();
  toast("Добавлено");
}
async function delTask(id) {
  await fetch('/api/tasks/'+id, { method: 'DELETE' });
  loadTasks();
}

// --- ОБЩЕЕ ---
function tab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  ['schedule','ai','tasks'].forEach(v => {
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

// --- СЕРВЕРНАЯ ЧАСТЬ ---

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));

// API: Получить данные
fastify.get("/api/data", async () => SCHEDULE_DATA);

// API: ИИ (с защитой от ошибок)
fastify.post("/api/ai", async (req, reply) => {
  const { subject, task } = req.body;
  if (!task) return reply.code(400).send({ error: "Пустой запрос" });
  
  // Если ключа нет, возвращаем заглушку, чтобы не падать
  if (!AI_API_KEY) {
    return { answer: "⚠️ ИИ не настроен.\n\nДобавь AI_API_KEY в переменные окружения на Render." };
  }

  try {
    // Таймаут 30 секунд
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `Ты помощник студента. Предмет: ${subject}. Вопрос: ${task}`
      }),
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
       // Пробуем прочитать ошибку
       const errText = await response.text();
       console.error("AI Error:", errText);
       return { answer: `Ошибка API (${response.status}). Проверь ключ или лимиты.` };
    }

    const data = await response.json();
    // HuggingFace возвращает массив, OpenAI - объект choices
    const answer = Array.isArray(data) ? data[0]?.generated_text : data.choices?.[0]?.message?.content;
    
    return { answer: answer || "Нет ответа от модели" };

  } catch (e) {
    console.error("AI Fetch Error:", e.message);
    if (e.name === 'AbortError') return { answer: "⏱️ Таймаут. ИИ думал слишком долго." };
    return { answer: "❌ Ошибка соединения: " + e.message };
  }
});

// API: Задачи
fastify.get("/api/tasks", async () => loadTasks());
fastify.post("/api/tasks", async (req) => {
  const t = { id: Date.now().toString(), ...req.body, done: false, sent: false };
  const all = loadTasks();
  all.push(t);
  saveTasks(all);
  return t;
});
fastify.delete("/api/tasks/:id", async (req) => {
  saveTasks(loadTasks().filter(t => t.id !== req.params.id));
  return { ok: true };
});

// --- БОТ И НАПОМИНАНИЯ ---
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("🎓 Бот запущен!\n\nОткрой мини-приложение 👇", {
    reply_markup: { inline_keyboard: [[{ text: "🚀 Открыть", web_app: { url: APP_URL } }]] }
  });
});

// Проверка напоминаний каждые 5 минут
cron.schedule("*/5 * * * *", async () => {
  const tasks = loadTasks();
  const now = new Date();
  let changed = false;

  for (let t of tasks) {
    if (t.sent) continue;
    const dl = new Date(t.deadline);
    const diff = dl - now;

    // Если до дедлайна меньше 1 часа
    if (diff > 0 && diff < 3600000) {
      try {
        await bot.telegram.sendMessage(t.userId, `⏰ Напоминание!\n\n📝 ${t.title}\nДо пары меньше часа!`);
        t.sent = true;
        changed = true;
      } catch (e) {
        console.error("TG Error:", e.message);
      }
    }
  }
  if (changed) saveTasks(tasks);
});

// --- ЗАПУСК ---
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`✅ Server running on port ${PORT}`);
  if (BOT_TOKEN) {
    bot.launch().then(() => console.log("✅ Bot started"));
  }
});
