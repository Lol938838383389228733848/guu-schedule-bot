require("dotenv").config();
const fastify = require("fastify")({ logger: false });
const { Telegraf } = require("telegraf");
const DATA = require("./schedule-data.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Расписание ГУУ</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--bg:#0a0a14;--card:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.08);--text:#ececf5;--dim:#7a7a95;--acc:#8b5cf6;--acc2:#06b6d4;--acc-glow:rgba(139,92,246,0.35);--lec:#8b5cf6;--prac:#06b6d4;--lab:#f59e0b}
html,body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 20% 10%,rgba(139,92,246,0.15),transparent 50%),radial-gradient(circle at 80% 80%,rgba(6,182,212,0.12),transparent 50%);pointer-events:none;z-index:0}
.app{position:relative;z-index:1;max-width:560px;margin:0 auto;padding:16px 16px 100px}
.screen{display:none;animation:fadeIn .4s ease}.screen.active{display:block}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
.hero{text-align:center;padding:28px 8px 20px}
.hero-icon{font-size:56px;display:inline-block;animation:fadeUp .6s ease both;filter:drop-shadow(0 8px 24px var(--acc-glow))}
.hero h1{font-size:30px;font-weight:800;margin:14px 0 6px;background:linear-gradient(135deg,#c4b5fd,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:fadeUp .6s .1s ease both}
.hero p{color:var(--dim);font-size:14px;animation:fadeUp .6s .2s ease both}
.selector-label{font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1.2px;margin:18px 8px 8px}
.selector{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.selector::-webkit-scrollbar{display:none}
.sel-btn{flex-shrink:0;padding:10px 16px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--dim);font-size:13px;font-weight:600;cursor:pointer;transition:all .25s;white-space:nowrap;backdrop-filter:blur(10px)}
.sel-btn.active{background:linear-gradient(135deg,var(--acc),#6d28d9);border-color:transparent;color:#fff;box-shadow:0 6px 20px var(--acc-glow)}
.search-box{margin:16px 0}
.search-input{width:100%;padding:13px 18px 13px 42px;border-radius:16px;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:14px;outline:none;transition:all .2s;backdrop-filter:blur(10px);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237a7a95' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:14px center}
.search-input:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-glow)}
.group-list{display:flex;flex-direction:column;gap:8px}
.group-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:13px 15px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:all .3s;animation:fadeUp .5s ease both;backdrop-filter:blur(10px);position:relative;overflow:hidden}
.group-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--acc-glow),transparent);opacity:0;transition:opacity .3s}
.group-card:hover::before,.group-card:active::before{opacity:1}
.group-card:active{transform:scale(.98)}
.group-emoji{font-size:26px;position:relative;z-index:1}
.group-info{flex:1;min-width:0;position:relative;z-index:1}
.group-name{font-size:15px;font-weight:700}
.group-fac{font-size:11px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.group-arrow{color:var(--dim);font-size:20px;position:relative;z-index:1}
.empty-list{text-align:center;padding:40px 16px;color:var(--dim);font-size:13px}
.counter{text-align:center;color:var(--dim);font-size:11px;margin-top:12px}
.top-bar{display:flex;align-items:center;gap:12px;margin:8px 0 16px;animation:slideIn .4s ease}
.back-btn{width:42px;height:42px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.back-btn:active{transform:scale(.9);background:var(--acc-glow)}
.top-title{flex:1;min-width:0}
.top-title h2{font-size:19px;font-weight:800;display:flex;align-items:center;gap:8px}
.top-title .fac{font-size:11px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.week-toggle{display:flex;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:4px;margin:0 0 16px}
.week-btn{flex:1;padding:9px;border-radius:10px;text-align:center;font-size:12px;font-weight:600;color:var(--dim);cursor:pointer;transition:all .25s}
.week-btn.active{background:linear-gradient(135deg,var(--acc),#6d28d9);color:#fff;box-shadow:0 4px 14px var(--acc-glow)}
.day-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
.day-tabs::-webkit-scrollbar{display:none}
.day-tab{flex-shrink:0;padding:9px 13px;border-radius:13px;background:var(--card);border:1px solid var(--border);color:var(--dim);font-size:12px;font-weight:600;cursor:pointer;transition:all .25s;white-space:nowrap;text-align:center;min-width:52px}
.day-tab .d{display:block;font-size:9px;opacity:.7;margin-top:1px;text-transform:uppercase;letter-spacing:.5px}
.day-tab.today{border-color:var(--acc2)}
.day-tab.active{background:linear-gradient(135deg,var(--acc),#6d28d9);border-color:transparent;color:#fff;box-shadow:0 6px 20px var(--acc-glow);transform:translateY(-2px)}
.lessons{display:flex;flex-direction:column;gap:9px}
.lesson{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:13px 15px;animation:fadeUp .4s ease both;position:relative;overflow:hidden}
.lesson::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px}
.lesson.lec::before{background:var(--lec)}.lesson.prac::before{background:var(--prac)}.lesson.lab::before{background:var(--lab)}
.lesson-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:5px}
.lesson-time{font-size:12px;font-weight:700;color:#c4b5fd}
.lesson-badge{font-size:9px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
.badge-lec{background:rgba(139,92,246,.18);color:#c4b5fd}.badge-prac{background:rgba(6,182,212,.18);color:#67e8f9}.badge-lab{background:rgba(245,158,11,.18);color:#fcd34d}
.lesson-subj{font-size:14px;font-weight:700;margin-bottom:7px;line-height:1.35}
.lesson-meta{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--dim)}
.empty-state{text-align:center;padding:48px 16px;color:var(--dim)}
.empty-state .icon{font-size:48px;margin-bottom:12px;opacity:.6}
.empty-state p{font-size:13px;line-height:1.5}
.empty-state .hint{font-size:11px;margin-top:6px;opacity:.7}
.loading{text-align:center;padding:60px 16px;color:var(--dim)}
.spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--acc);border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="app">
  <div id="screen-select" class="screen active">
    <div class="hero">
      <div class="hero-icon">🎓</div>
      <h1>Расписание ГУУ</h1>
      <p>3 курс бакалавриата · осень 2026/27</p>
    </div>
    <div class="selector-label">Курс</div>
    <div class="selector" id="courseSelector"></div>
    <div class="selector-label">Институт</div>
    <div class="selector" id="instituteSelector"></div>
    <div class="search-box">
      <input class="search-input" id="searchInput" type="text" placeholder="Поиск группы или направления...">
    </div>
    <div class="selector-label" id="listLabel">Все группы</div>
    <div class="group-list" id="groupList"><div class="loading"><div class="spinner"></div>Загрузка...</div></div>
    <div class="counter" id="counter"></div>
  </div>
  <div id="screen-schedule" class="screen">
    <div class="top-bar">
      <button class="back-btn" id="backBtn">←</button>
      <div class="top-title">
        <h2 id="grpName"></h2>
        <div class="fac" id="grpFac"></div>
      </div>
    </div>
    <div class="week-toggle">
      <div class="week-btn" id="weekOdd">Нечётная</div>
      <div class="week-btn active" id="weekEven">Чётная</div>
    </div>
    <div class="day-tabs" id="dayTabs"></div>
    <div class="lessons" id="lessons"></div>
  </div>
</div>
<script>
const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();
try{tg?.setHeaderColor?.("#0a0a14");tg?.setBackgroundColor?.("#0a0a14")}catch(e){}
let DATA,COURSE=3,INST="iom",DAY_IDX=0,IS_EVEN=true,CURRENT=null;
const DAYS=["ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const FULL={"ПН":"Понедельник","ВТ":"Вторник","СР":"Среда","ЧТ":"Четверг","ПТ":"Пятница","СБ":"Суббота"};

function detectWeekParity(){const now=new Date();const start=new Date(2026,8,1);const w=Math.floor((now-start)/(7*24*3600*1000));return w%2===1}

async function init(){
  IS_EVEN=detectWeekParity();
  const r=await fetch("/api/data");DATA=await r.json();
  renderCourses();renderInstitutes();renderGroups();updateWeekToggle();
  const today=new Date().getDay();DAY_IDX=today===0?5:today-1;if(DAY_IDX>5)DAY_IDX=0;
}

function renderCourses(){
  const box=document.getElementById("courseSelector");box.innerHTML="";
  DATA.courses.forEach(c=>{
    const el=document.createElement("div");el.className="sel-btn"+(c.id===COURSE?" active":"");
    el.textContent=c.name;el.onclick=()=>{COURSE=c.id;renderCourses();renderGroups()};box.appendChild(el);
  });
}

function renderInstitutes(){
  const box=document.getElementById("instituteSelector");box.innerHTML="";
  DATA.institutes.forEach(i=>{
    const el=document.createElement("div");el.className="sel-btn"+(i.id===INST?" active":"");
    el.textContent=i.emoji+" "+i.name;el.onclick=()=>{INST=i.id;renderInstitutes();renderGroups()};box.appendChild(el);
  });
}

function renderGroups(){
  const q=document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered=DATA.groups.filter(g=>g.c===COURSE&&g.i===INST&&(!q||g.n.toLowerCase().includes(q)||(g.f||"").toLowerCase().includes(q)));
  const box=document.getElementById("groupList");
  const counter=document.getElementById("counter");
  const label=document.getElementById("listLabel");
  box.innerHTML="";
  if(filtered.length===0){box.innerHTML='<div class="empty-list">Ничего не найдено 🔍</div>';counter.textContent="";return}
  filtered.forEach((g,i)=>{
    const el=document.createElement("div");el.className="group-card";el.style.animationDelay=Math.min(i*0.04,0.5)+"s";
    el.innerHTML='<div class="group-emoji">'+(g.e||"📚")+'</div><div class="group-info"><div class="group-name">'+g.n+'</div><div class="group-fac">'+(g.f||"")+'</div></div><div class="group-arrow">›</div>';
    el.onclick=()=>openGroup(g.id);box.appendChild(el);
  });
  counter.textContent=filtered.length+" "+(filtered.length===1?"группа":(filtered.length<5?"группы":"групп"));
  label.textContent=q?"Результаты поиска":"Все группы";
}

document.getElementById("searchInput").addEventListener("input",renderGroups);

async function openGroup(id){
  CURRENT=DATA.groups.find(g=>g.id===id);
  if(!CURRENT||!CURRENT.s){alert("Расписание для этой группы пока не добавлено");return}
  document.getElementById("grpName").textContent=(CURRENT.e||"")+" "+CURRENT.n;
  document.getElementById("grpFac").textContent=CURRENT.f||"";
  renderTabs();renderLessons();
  document.getElementById("screen-select").classList.remove("active");
  document.getElementById("screen-schedule").classList.add("active");
}

function renderTabs(){
  const box=document.getElementById("dayTabs");box.innerHTML="";
  const today=new Date().getDay();const todayIdx=today===0?-1:today-1;
  DAYS.forEach((d,i)=>{
    const el=document.createElement("div");el.className="day-tab"+(i===DAY_IDX?" active":"")+(i===todayIdx?" today":"");
    el.innerHTML=d+'<span class="d">'+FULL[d].slice(0,2)+'</span>';
    el.onclick=()=>{DAY_IDX=i;renderTabs();renderLessons()};box.appendChild(el);
  });
  setTimeout(()=>{const a=box.querySelector(".active");if(a)a.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})},50);
}

function updateWeekToggle(){
  document.getElementById("weekOdd").classList.toggle("active",!IS_EVEN);
  document.getElementById("weekEven").classList.toggle("active",IS_EVEN);
}

document.getElementById("weekOdd").onclick=()=>{IS_EVEN=false;updateWeekToggle();renderLessons()};
document.getElementById("weekEven").onclick=()=>{IS_EVEN=true;updateWeekToggle();renderLessons()};

function typeClass(t){if(!t)return"lec";const l=t.toLowerCase();if(l.includes("лз")||l.includes("лаб"))return"lab";if(l.includes("пз")||l.includes("практ"))return"prac";return"lec"}
function typeName(t){if(!t)return"";const l=t.toLowerCase();if(l.includes("лз"))return"ЛЗ";if(l.includes("л"))return"Лекция";if(l.includes("пз"))return"Практика";return t}

function renderLessons(){
  if(!CURRENT)return;
  const day=DAYS[DAY_IDX];const dayData=CURRENT.s?.[day];
  const box=document.getElementById("lessons");
  if(!dayData){box.innerHTML='<div class="empty-state"><div class="icon">😴</div><p>Нет данных на этот день</p></div>';return}
  let lessons=IS_EVEN?(dayData.e||dayData.o):dayData.o;
  if(!lessons||lessons.length===0){
    box.innerHTML='<div class="empty-state"><div class="icon">🎉</div><p>В этот день занятий нет</p><div class="hint">'+(IS_EVEN?"Чётная неделя":"Нечётная неделя")+'</div></div>';
    return;
  }
  box.innerHTML="";
  lessons.forEach((l,i)=>{
    const tc=typeClass(l.y);
    const el=document.createElement("div");el.className="lesson "+tc;el.style.animationDelay=i*0.06+"s";
    el.innerHTML='<div class="lesson-top"><div class="lesson-time">'+l.t+'</div><div class="lesson-badge badge-'+tc+'">'+typeName(l.y)+'</div></div><div class="lesson-subj">'+l.s+'</div><div class="lesson-meta">'+(l.p?'<span>👤 '+l.p+'</span>':"")+(l.r?'<span>📍 '+l.r+'</span>':"")+'</div>';
    box.appendChild(el);
  });
}

document.getElementById("backBtn").onclick=()=>{document.getElementById("screen-schedule").classList.remove("active");document.getElementById("screen-select").classList.add("active")};

init();
<\/script>
</body>
</html>`;

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));
fastify.get("/api/data", async () => DATA);

const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
  ctx.reply("🎓 *Привет\\!*\\nВыбери курс, институт и группу 👇", {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: [[{ text: "📅 Открыть расписание", web_app: { url: APP_URL } }]] }
  });
});
bot.command("help", (ctx) => ctx.reply("Нажми кнопку, чтобы открыть расписание 📅"));

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log("✅ Server on port " + PORT);
  if (BOT_TOKEN) bot.launch().then(() => console.log("✅ Bot started"));
});
