require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// --- ДАННЫЕ ---
// Здесь хранится расписание. Я добавил структуру для всех институтов.
// Чтобы добавить реальное расписание, просто заполни массив 'lessons' внутри нужной группы.
const GROUPS = [
  { id: "iom-1", inst: "iom", name: "ЭиУИСД-1", faculty: "Экономика и управление...", lessons: {
    "ПН": [{ time: "12:55", subj: "Эконометрика", type: "ПЗ", room: "ЛК-110", weeks: "15-16" }],
    "ВТ": [{ time: "12:55", subj: "Организация строительного производства", type: "Л", room: "ЛК-335", weeks: "1-13" }]
  }},
  { id: "iom-2", inst: "iom", name: "ЭиПЭ-1", faculty: "Экономика предприятий...", lessons: {} },
  { id: "iupsibk-1", inst: "iupsibk", name: "ГиРБ-1", faculty: "Гостиничный бизнес", lessons: {} },
  { id: "iis-1", inst: "iis", name: "ПМИ-1", faculty: "Прикладная математика", lessons: {} },
  { id: "im-1", inst: "im", name: "БМ-1", faculty: "Бренд-менеджмент", lessons: {} },
  { id: "ief-1", inst: "ief", name: "Э-1", faculty: "Экономика", lessons: {} },
  { id: "iguip-1", inst: "iguip", name: "Ю-1", faculty: "Юриспруденция", lessons: {} }
];

const INSTITUTES = [
  { id: "iom", name: "ИОМ" }, { id: "iupsibk", name: "ИУПСиБК" },
  { id: "iis", name: "ИИС" }, { id: "im", name: "ИМ" },
  { id: "ief", name: "ИЭиФ" }, { id: "iguip", name: "ИГУиП" }
];

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AI_KEY = process.env.AI_API_KEY || "";
const AI_URL = process.env.AI_API_URL || "";

// --- ХРАНИЛИЩЕ ЗАДАЧ ---
const TASKS_FILE = path.join(__dirname, "tasks.json");
const getTasks = () => { try { return JSON.parse(fs.readFileSync(TASKS_FILE)); } catch { return []; } };
const saveTasks = (t) => fs.writeFileSync(TASKS_FILE, JSON.stringify(t));
if (!fs.existsSync(TASKS_FILE)) saveTasks([]);

// --- HTML ИНТЕРФЕЙС (Минималистичный и надежный) ---
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ГУУ Бот</title>
<style>
  body { font-family: sans-serif; background: #1a1a2e; color: #fff; margin: 0; padding: 16px; }
  .card { background: #16213e; padding: 16px; border-radius: 12px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin-bottom: 16px; text-align: center; }
  .btn { background: #4cc9f0; color: #000; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 8px; }
  .btn-ai { background: linear-gradient(45deg, #f72585, #7209b7); color: white; }
  input, select, textarea { width: 100%; padding: 10px; margin: 8px 0; border-radius: 8px; border: 1px solid #444; background: #0f3460; color: white; box-sizing: border-box; }
  .hidden { display: none; }
  .nav { display: flex; gap: 8px; margin-bottom: 16px; }
  .nav div { flex: 1; text-align: center; padding: 10px; background: #16213e; border-radius: 8px; cursor: pointer; }
  .nav div.active { background: #4cc9f0; color: #000; }
  .lesson { border-left: 4px solid #4cc9f0; padding-left: 10px; margin-bottom: 10px; }
  .answer { background: #0f3460; padding: 10px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap; font-size: 14px; }
</style>
</head>
<body>

<div id="app">
  <h1>🎓 Расписание ГУУ</h1>
  
  <div class="nav">
    <div class="active" onclick="tab('schedule')">📅 Пары</div>
    <div onclick="tab('ai')">🤖 ИИ</div>
    <div onclick="tab('tasks')">📝 Задачи</div>
  </div>

  <!-- РАСПИСАНИЕ -->
  <div id="view-schedule">
    <div class="card">
      <label>Институт</label>
      <select id="instSelect" onchange="renderGroups()"></select>
      <label>Группа</label>
      <select id="groupSelect" onchange="renderLessons()"></select>
    </div>
    <div id="lessonsList"></div>
  </div>

  <!-- ИИ -->
  <div id="view-ai" class="hidden">
    <div class="card">
      <textarea id="aiInput" rows="4" placeholder="Введи вопрос или задание..."></textarea>
      <button class="btn btn-ai" onclick="askAI()">✨ Спросить ИИ</button>
      <div id="aiLoader" class="hidden" style="text-align:center; margin:10px;">🤖 Думаю...</div>
      <div id="aiResult" class="answer hidden"></div>
    </div>
  </div>

  <!-- ЗАДАЧИ -->
  <div id="view-tasks" class="hidden">
    <div class="card">
      <input id="taskTitle" placeholder="Название задачи">
      <input type="datetime-local" id="taskDate">
      <button class="btn" onclick="addTask()">Добавить</button>
    </div>
    <div id="taskList"></div>
  </div>
</div>

<script>
  const tg = window.Telegram.WebApp;
  tg.expand();
  let DATA = { groups: [], institutes: [] };

  // Навигация
  function tab(name) {
    document.querySelectorAll('.nav div').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    ['schedule', 'ai', 'tasks'].forEach(v => {
      document.getElementById('view-' + v).classList.add('hidden');
    });
    document.getElementById('view-' + name).classList.remove('hidden');
    if(name === 'tasks') loadTasks();
  }

  // Загрузка данных
  async function init() {
    const res = await fetch('/api/data');
    DATA = await res.json();
    
    const instSel = document.getElementById('instSelect');
    instSel.innerHTML = DATA.institutes.map(i => \`<option value="\${i.id}">\${i.name}</option>\`).join('');
    renderGroups();
  }

  function renderGroups() {
    const inst = document.getElementById('instSelect').value;
    const groupSel = document.getElementById('groupSelect');
    const filtered = DATA.groups.filter(g => g.inst === inst);
    groupSel.innerHTML = filtered.map(g => \`<option value="\${g.id}">\${g.name}</option>\`).join('');
    renderLessons();
  }

  function renderLessons() {
    const groupId = document.getElementById('groupSelect').value;
    const group = DATA.groups.find(g => g.id === groupId);
    const list = document.getElementById('lessonsList');
    
    if (!group || !group.lessons) {
      list.innerHTML = '<div class="card">Нет данных о расписании</div>';
      return;
    }

    // Простой рендер пар (можно расширить)
    let html = '';
    for (let day in group.lessons) {
      html += \`<div class="card"><b>\${day}</b>\`;
      group.lessons[day].forEach(l => {
        html += \`<div class="lesson">
          <div style="font-weight:bold">\${l.time} - \${l.subj}</div>
          <div style="font-size:12px; color:#aaa">\${l.room} • \${l.type}</div>
          <button class="btn btn-ai" style="padding:8px; margin-top:5px" onclick="openAI('\${l.subj}')">🤖 Решить</button>
        </div>\`;
      });
      html += \`</div>\`;
    }
    list.innerHTML = html || '<div class="card">На этой неделе пар нет</div>';
  }

  // ИИ
  function openAI(subj) {
    tab('ai');
    document.querySelector('.nav div:nth-child(2)').classList.add('active');
    document.querySelector('.nav div:nth-child(1)').classList.remove('active');
    document.getElementById('aiInput').value = "Предмет: " + subj + ". ";
  }

  async function askAI() {
    const q = document.getElementById('aiInput').value;
    if(!q) return;
    
    document.getElementById('aiLoader').classList.remove('hidden');
    document.getElementById('aiResult').classList.add('hidden');
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ task: q })
      });
      const data = await res.json();
      document.getElementById('aiResult').innerText = data.answer || data.error;
      document.getElementById('aiResult').classList.remove('hidden');
    } catch(e) {
      document.getElementById('aiResult').innerText = "Ошибка соединения";
      document.getElementById('aiResult').classList.remove('hidden');
    } finally {
      document.getElementById('aiLoader').classList.add('hidden');
    }
  }

  // Задачи
  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();
    document.getElementById('taskList').innerHTML = tasks.map(t => \`
      <div class="card">
        <b>\${t.title}</b><br>
        <small>\${new Date(t.deadline).toLocaleString()}</small>
        <button onclick="delTask('\${t.id}')" style="float:right; background:red; border:none; color:white; border-radius:4px">X</button>
      </div>
    \`).join('');
  }

  async function addTask() {
    const title = document.getElementById('taskTitle').value;
    const date = document.getElementById('taskDate').value;
    if(!title || !date) return alert("Заполните поля");
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        userId: tg.initDataUnsafe.user?.id || 0, 
        title, deadline: date 
      })
    });
    document.getElementById('taskTitle').value = "";
    loadTasks();
  }

  async function delTask(id) {
    await fetch('/api/tasks/' + id, { method: 'DELETE' });
    loadTasks();
  }

  init();
<\/script>
</body>
</html>`;

// --- СЕРВЕР ---

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));

fastify.get("/api/data", async () => ({
  institutes: INSTITUTES,
  groups: GROUPS
}));

fastify.post("/api/ai", async (req, reply) => {
  const { task } = req.body;
  if (!AI_KEY) return { error: "API ключ не настроен в .env" };
  
  try {
    // Используем AbortController для таймаута 20 сек
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: task // Для HuggingFace Inference API
        // Если используешь OpenAI-совместимый API, раскомментируй ниже:
        /*
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: task }]
        */
      }),
      signal: controller.signal
    });

    clearTimeout(id);
    const data = await response.json();
    
    // Адаптация под разные форматы ответа
    const answer = Array.isArray(data) ? data[0]?.generated_text : data.choices?.[0]?.message?.content;
    return { answer: answer || "Нет ответа" };
  } catch (e) {
    return { error: e.name === 'AbortError' ? "Таймаут ИИ" : e.message };
  }
});

// Задачи API
fastify.get("/api/tasks", async () => getTasks());
fastify.post("/api/tasks", async (req) => {
  const t = { id: Date.now().toString(), ...req.body, sent: false };
  const all = getTasks(); all.push(t); saveTasks(all); return t;
});
fastify.delete("/api/tasks/:id", async (req) => {
  saveTasks(getTasks().filter(t => t.id !== req.params.id)); return { ok: true };
});

// Бот и напоминания
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => ctx.reply("🎓 Бот работает!\nОткрой приложение 👇", {
  reply_markup: { inline_keyboard: [[{ text: "🚀 Открыть", web_app: { url: APP_URL } }]] }
}));

cron.schedule("*/5 * * * *", async () => {
  const tasks = getTasks();
  const now = new Date();
  let changed = false;
  for (let t of tasks) {
    if (t.sent) continue;
    const diff = new Date(t.deadline) - now;
    if (diff > 0 && diff < 3600000) { // За 1 час
      try {
        await bot.telegram.sendMessage(t.userId, `⏰ Напоминание: ${t.title}`);
        t.sent = true; changed = true;
      } catch(e) {}
    }
  }
  if (changed) saveTasks(tasks);
});

fastify.listen({ port: process.env.PORT || 3000, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  console.log("✅ Server started");
  if (BOT_TOKEN) bot.launch();
});
