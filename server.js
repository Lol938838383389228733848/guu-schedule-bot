require("dotenv").config();
const fastify = require("fastify")({ logger: true }); // Включил логи
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// Данные расписания (если файла нет, будет пустой объект)
let DATA = { courses: [], institutes: [], groups: [] };
try {
  if (fs.existsSync("./schedule-data.js")) {
    DATA = require("./schedule-data.js");
  }
} catch (e) {
  console.error("Ошибка загрузки schedule-data.js:", e.message);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_API_URL = process.env.AI_API_URL || "";

const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks() { try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8")); } catch { return []; } }
function saveTasks(t) { fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2)); }
if (!fs.existsSync(TASKS_FILE)) saveTasks([]);

// ===== HTML (Мини-версия для стабильности) =====
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<style>
:root{--bg:#0f172a;--card:rgba(30,41,59,0.7);--text:#f8fafc;--dim:#94a3b8;--acc:#8b5cf6;--border:rgba(255,255,255,0.1)}
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
body{background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:80px}
.app{max-width:500px;margin:0 auto;padding:16px}
.header{text-align:center;padding:20px 0}
.logo{font-size:40px;margin-bottom:10px}
h1{font-size:24px;margin-bottom:4px}
.sub{color:var(--dim);font-size:14px}
.nav{display:flex;gap:8px;margin:20px 0;background:var(--card);padding:4px;border-radius:12px}
.nav-btn{flex:1;padding:10px;text-align:center;border-radius:8px;font-size:13px;font-weight:600;color:var(--dim);cursor:pointer}
.nav-btn.active{background:var(--acc);color:white}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px;backdrop-filter:blur(10px)}
.input{width:100%;padding:12px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:8px;color:white;margin-bottom:10px;font-size:14px}
.btn{width:100%;padding:14px;background:var(--acc);border:none;border-radius:12px;color:white;font-weight:700;font-size:16px;cursor:pointer}
.btn:active{opacity:0.8}
.answer{margin-top:15px;padding:15px;background:rgba(0,0,0,0.3);border-radius:12px;font-size:14px;line-height:1.5;display:none;white-space:pre-wrap}
.error{color:#f87171;background:rgba(239,68,68,0.1);padding:10px;border-radius:8px;margin-top:10px;display:none}
.loader{display:none;text-align:center;padding:20px;color:var(--dim)}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="logo">🎓</div>
    <h1>Расписание ГУУ</h1>
    <div class="sub">ИИ-помощник v2.0</div>
  </div>

  <div class="nav">
    <div class="nav-btn active" onclick="tab('ai')">🤖 ИИ Помощник</div>
    <div class="nav-btn" onclick="tab('info')">ℹ️ Инфо</div>
  </div>

  <div id="view-ai">
    <div class="card">
      <div style="margin-bottom:10px;font-weight:600">Задай вопрос по предмету:</div>
      <textarea class="input" id="q" rows="4" placeholder="Например: Реши задачу по эконометрике..."></textarea>
      <button class="btn" onclick="ask()">✨ Спросить ИИ</button>
      
      <div class="loader" id="load">🤖 ИИ думает...</div>
      <div class="error" id="err"></div>
      <div class="answer" id="ans"></div>
    </div>
    <div style="font-size:12px;color:var(--dim);text-align:center;margin-top:10px">
      Работает на Qwen 2.5 · Бесплатно
    </div>
  </div>

  <div id="view-info" style="display:none">
    <div class="card">
      <h3 style="margin-bottom:10px">Статус системы</h3>
      <p style="font-size:14px;color:var(--dim);line-height:1.6">
        ✅ Сервер: Работает<br>
        ✅ База данных: Подключена<br>
        🤖 ИИ API: <span id="api-status">Проверка...</span>
      </p>
    </div>
  </div>
</div>

<script>
const tg = window.Telegram.WebApp;
tg.expand();

function tab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('view-ai').style.display = name === 'ai' ? 'block' : 'none';
  document.getElementById('view-info').style.display = name === 'info' ? 'block' : 'none';
  if(name === 'info') checkStatus();
}

async function ask() {
  const q = document.getElementById('q').value;
  if(!q) return;
  
  const btn = document.querySelector('.btn');
  const load = document.getElementById('load');
  const ans = document.getElementById('ans');
  const err = document.getElementById('err');
  
  btn.disabled = true;
  load.style.display = 'block';
  ans.style.display = 'none';
  err.style.display = 'none';
  
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ task: q })
    });
    
    const data = await res.json();
    
    if(data.error) throw new Error(data.error);
    
    ans.textContent = data.answer;
    ans.style.display = 'block';
  } catch(e) {
    err.textContent = "❌ " + e.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    load.style.display = 'none';
  }
}

async function checkStatus() {
  const el = document.getElementById('api-status');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    el.textContent = data.ai ? "✅ Подключен" : "❌ Нет ключа";
    el.style.color = data.ai ? "#4ade80" : "#f87171";
  } catch {
    el.textContent = "❌ Ошибка связи";
    el.style.color = "#f87171";
  }
}
<\/script>
</body>
</html>`;

// ===== SERVER ROUTES =====

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));

// Health check для диагностики
fastify.get("/api/health", async () => {
  return { 
    status: "ok", 
    ai: !!AI_API_KEY,
    url: AI_API_URL ? "set" : "missing"
  };
});

// AI Endpoint с улучшенной обработкой ошибок
fastify.post("/api/ai", async (req, reply) => {
  const { task } = req.body;
  
  if (!task) return reply.code(400).send({ error: "Пустой запрос" });
  if (!AI_API_KEY) return reply.code(500).send({ error: "API ключ не настроен в .env" });
  if (!AI_API_URL) return reply.code(500).send({ error: "API URL не настроен в .env" });

  console.log(`[AI] Запрос: ${task.substring(0, 50)}...`);

  try {
    // Используем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 сек таймаут

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct", // Модель для HF
        messages: [
          { role: "system", content: "Ты помощник студента ГУУ. Отвечай кратко, по делу, на русском." },
          { role: "user", content: task }
        ],
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI] API Error ${response.status}:`, errText);
      
      // Специфичные ошибки
      if (response.status === 401) throw new Error("Неверный API ключ");
      if (response.status === 429) throw new Error("Лимит запросов превышен. Подожди минуту.");
      if (response.status === 503) throw new Error("Модель загружается... Попробуй через 30 сек.");
      
      throw new Error(`API вернул ошибку ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Нет ответа от модели";
    
    console.log(`[AI] Успех: ${answer.substring(0, 50)}...`);
    return { answer };

  } catch (e) {
    console.error("[AI] Catch Error:", e.message);
    
    if (e.name === 'AbortError') {
      return reply.code(504).send({ error: "Таймаут: ИИ слишком долго думает (>45с)" });
    }
    
    return reply.code(500).send({ error: e.message || "Неизвестная ошибка соединения" });
  }
});

// ===== BOT & CRON =====
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("🎓 Бот запущен!\n\nОткрой мини-приложение ниже 👇", {
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Открыть", web_app: { url: APP_URL } }]]
    }
  });
});

// Напоминания
cron.schedule("*/10 * * * *", async () => {
  const tasks = loadTasks();
  const now = new Date();
  let changed = false;

  for (let t of tasks) {
    if (t.sent) continue;
    const dl = new Date(t.deadline);
    const diff = dl - now;

    // За 1 час до дедлайна
    if (diff > 0 && diff < 3600000) {
      try {
        await bot.telegram.sendMessage(t.userId, `⏰ Напоминание!\n\n📝 ${t.title}\nДо дедлайна меньше часа!`);
        t.sent = true;
        changed = true;
      } catch (e) {
        console.error("Ошибка отправки:", e.message);
      }
    }
  }
  if (changed) saveTasks(tasks);
});

// Запуск
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🤖 AI Key: ${AI_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`🌐 AI URL: ${AI_API_URL ? 'SET' : 'MISSING'}`);
  
  if (BOT_TOKEN) {
    bot.launch().then(() => console.log("✅ Bot started"));
  }
});
