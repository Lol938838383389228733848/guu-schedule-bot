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
:root{
  --bg:#0a0a14;
  --card:rgba(255,255,255,0.04);
  --border:rgba(255,255,255,0.08);
  --text:#ececf5;
  --dim:#7a7a95;
  --acc:#8b5cf6;
  --acc2:#06b6d4;
  --acc-glow:rgba(139,92,246,0.35);
  --lec:#8b5cf6;
  --prac:#06b6d4;
  --lab:#f59e0b;
  --green:#10b981;
  --red:#ef4444;
}

html,body{
  background:var(--bg);
  color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif;
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  background:
    radial-gradient(circle at 20% 10%,rgba(139,92,246,0.18),transparent 50%),
    radial-gradient(circle at 80% 80%,rgba(6,182,212,0.15),transparent 50%),
    radial-gradient(circle at 50% 50%,rgba(16,185,129,0.08),transparent 60%);
  pointer-events:none;
  z-index:0;
  animation:bgShift 20s ease infinite;
}

@keyframes bgShift{
  0%,100%{opacity:1}
  50%{opacity:0.7}
}

.app{
  position:relative;
  z-index:1;
  max-width:560px;
  margin:0 auto;
  padding:16px 16px 100px;
}

.screen{
  display:none;
  opacity:0;
  transform:translateX(30px);
  transition:all 0.4s cubic-bezier(0.4,0,0.2,1);
}

.screen.active{
  display:block;
  opacity:1;
  transform:translateX(0);
}

.screen.slide-out-left{
  transform:translateX(-30px);
  opacity:0;
}

.screen.slide-in-right{
  transform:translateX(30px);
  opacity:0;
}

@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

/* ===== ГЛАВНЫЙ ЭКРАН ===== */
.hero{
  text-align:center;
  padding:32px 8px 24px;
  position:relative;
}

.hero-logo{
  width:120px;
  height:120px;
  margin:0 auto 20px;
  background:linear-gradient(135deg,var(--acc),var(--acc2));
  border-radius:32px;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 20px 60px var(--acc-glow);
  animation:fadeIn 0.6s ease both;
  position:relative;
  overflow:hidden;
}

.hero-logo::before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,transparent,rgba(255,255,255,0.2),transparent);
  animation:shimmer 3s infinite;
}

.hero-logo svg{
  width:72px;
  height:72px;
  fill:#fff;
  position:relative;
  z-index:1;
}

.hero h1{
  font-size:36px;
  font-weight:800;
  margin:0 0 8px;
  background:linear-gradient(135deg,#c4b5fd,#67e8f9,#6ee7b7);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:fadeIn 0.6s 0.1s ease both;
  letter-spacing:-0.5px;
}

.hero p{
  color:var(--dim);
  font-size:14px;
  animation:fadeIn 0.6s 0.2s ease both;
  font-weight:500;
}

.week-badge{
  display:inline-block;
  margin-top:12px;
  padding:8px 18px;
  border-radius:24px;
  background:linear-gradient(135deg,var(--acc),#6d28d9);
  color:#fff;
  font-size:13px;
  font-weight:700;
  box-shadow:0 8px 24px var(--acc-glow);
  animation:fadeIn 0.6s 0.3s ease both;
}

.quick-actions{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  margin:24px 0;
}

.action-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:20px;
  padding:20px;
  cursor:pointer;
  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
  text-align:center;
  backdrop-filter:blur(20px);
  position:relative;
  overflow:hidden;
}

.action-card::before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,var(--acc-glow),transparent);
  opacity:0;
  transition:opacity 0.3s;
}

.action-card:hover::before,
.action-card:active::before{
  opacity:1;
}

.action-card:active{
  transform:scale(0.95);
}

.action-icon{
  font-size:40px;
  margin-bottom:8px;
  position:relative;
  z-index:1;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));
}

.action-label{
  font-size:15px;
  font-weight:700;
  position:relative;
  z-index:1;
  margin-bottom:4px;
}

.action-sub{
  font-size:12px;
  color:var(--dim);
  position:relative;
  z-index:1;
  font-weight:500;
}

/* ===== СЕЛЕКТОРЫ ===== */
.selector-label{
  font-size:11px;
  font-weight:700;
  color:var(--dim);
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin:20px 8px 10px;
}

.selector{
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding-bottom:6px;
  scrollbar-width:none;
}

.selector::-webkit-scrollbar{display:none}

.sel-btn{
  flex-shrink:0;
  padding:11px 18px;
  border-radius:16px;
  background:var(--card);
  border:1px solid var(--border);
  color:var(--dim);
  font-size:13px;
  font-weight:600;
  cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  white-space:nowrap;
  backdrop-filter:blur(20px);
}

.sel-btn.active{
  background:linear-gradient(135deg,var(--acc),#6d28d9);
  border-color:transparent;
  color:#fff;
  box-shadow:0 8px 24px var(--acc-glow);
  transform:translateY(-2px);
}

.sel-btn:active{
  transform:scale(0.95);
}

/* ===== ПОИСК ===== */
.search-box{
  margin:16px 0;
}

.search-input{
  width:100%;
  padding:14px 18px 14px 46px;
  border-radius:18px;
  background:var(--card);
  border:1px solid var(--border);
  color:var(--text);
  font-size:14px;
  outline:none;
  transition:all 0.25s;
  backdrop-filter:blur(20px);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%237a7a95' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
  background-repeat:no-repeat;
  background-position:16px center;
}

.search-input:focus{
  border-color:var(--acc);
  box-shadow:0 0 0 4px var(--acc-glow);
}

.search-input::placeholder{
  color:var(--dim);
}

/* ===== СПИСОК ГРУПП ===== */
.group-list{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.group-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:18px;
  padding:14px 16px;
  display:flex;
  align-items:center;
  gap:14px;
  cursor:pointer;
  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
  animation:fadeIn 0.5s ease both;
  backdrop-filter:blur(20px);
  position:relative;
  overflow:hidden;
}

.group-card::before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,var(--acc-glow),transparent);
  opacity:0;
  transition:opacity 0.3s;
}

.group-card:hover::before,
.group-card:active::before{
  opacity:1;
}

.group-card:active{
  transform:scale(0.97);
}

.group-emoji{
  font-size:28px;
  position:relative;
  z-index:1;
  filter:drop-shadow(0 2px 8px rgba(0,0,0,0.2));
}

.group-info{
  flex:1;
  min-width:0;
  position:relative;
  z-index:1;
}

.group-name{
  font-size:15px;
  font-weight:700;
  margin-bottom:3px;
}

.group-fac{
  font-size:11px;
  color:var(--dim);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  font-weight:500;
}

.group-arrow{
  color:var(--dim);
  font-size:22px;
  position:relative;
  z-index:1;
  transition:transform 0.3s;
}

.group-card:hover .group-arrow{
  transform:translateX(4px);
  color:var(--acc);
}

.empty-list{
  text-align:center;
  padding:48px 16px;
  color:var(--dim);
  font-size:13px;
}

.counter{
  text-align:center;
  color:var(--dim);
  font-size:11px;
  margin-top:16px;
  font-weight:600;
}

/* ===== ЭКРАН РАСПИСАНИЯ ===== */
.top-bar{
  display:flex;
  align-items:center;
  gap:12px;
  margin:8px 0 20px;
  animation:slideIn 0.4s ease;
}

.back-btn{
  width:44px;
  height:44px;
  border-radius:14px;
  background:var(--card);
  border:1px solid var(--border);
  color:var(--text);
  font-size:20px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all 0.25s;
  backdrop-filter:blur(20px);
}

.back-btn:active{
  transform:scale(0.9);
  background:var(--acc-glow);
}

.top-title{
  flex:1;
  min-width:0;
}

.top-title h2{
  font-size:20px;
  font-weight:800;
  display:flex;
  align-items:center;
  gap:8px;
}

.top-title .fac{
  font-size:11px;
  color:var(--dim);
  margin-top:3px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  font-weight:500;
}

.week-toggle{
  display:flex;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:16px;
  padding:4px;
  margin:0 0 20px;
  backdrop-filter:blur(20px);
}

.week-btn{
  flex:1;
  padding:11px;
  border-radius:12px;
  text-align:center;
  font-size:13px;
  font-weight:600;
  color:var(--dim);
  cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
}

.week-btn.active{
  background:linear-gradient(135deg,var(--acc),#6d28d9);
  color:#fff;
  box-shadow:0 6px 20px var(--acc-glow);
}

.day-tabs{
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding-bottom:6px;
  margin-bottom:20px;
  scrollbar-width:none;
}

.day-tabs::-webkit-scrollbar{display:none}

.day-tab{
  flex-shrink:0;
  padding:10px 14px;
  border-radius:14px;
  background:var(--card);
  border:1px solid var(--border);
  color:var(--dim);
  font-size:13px;
  font-weight:600;
  cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  white-space:nowrap;
  text-align:center;
  min-width:54px;
  backdrop-filter:blur(20px);
}

.day-tab .d{
  display:block;
  font-size:9px;
  opacity:0.7;
  margin-top:2px;
  text-transform:uppercase;
  letter-spacing:0.5px;
}

.day-tab.today{
  border-color:var(--acc2);
}

.day-tab.active{
  background:linear-gradient(135deg,var(--acc),#6d28d9);
  border-color:transparent;
  color:#fff;
  box-shadow:0 8px 24px var(--acc-glow);
  transform:translateY(-2px);
}

.day-tab:active{
  transform:scale(0.95);
}

/* ===== КАРТОЧКИ ЗАНЯТИЙ ===== */
.lessons{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.lesson{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:18px;
  padding:14px 16px;
  animation:fadeIn 0.4s ease both;
  position:relative;
  overflow:hidden;
  backdrop-filter:blur(20px);
}

.lesson::before{
  content:"";
  position:absolute;
  left:0;
  top:0;
  bottom:0;
  width:4px;
  border-radius:4px 0 0 4px;
}

.lesson.lec::before{background:var(--lec)}
.lesson.prac::before{background:var(--prac)}
.lesson.lab::before{background:var(--lab)}

.lesson-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  margin-bottom:6px;
}

.lesson-time{
  font-size:13px;
  font-weight:700;
  color:#c4b5fd;
}

.lesson-badge{
  font-size:9px;
  font-weight:700;
  padding:4px 10px;
  border-radius:20px;
  text-transform:uppercase;
  letter-spacing:0.5px;
  flex-shrink:0;
}

.badge-lec{background:rgba(139,92,246,.18);color:#c4b5fd}
.badge-prac{background:rgba(6,182,212,.18);color:#67e8f9}
.badge-lab{background:rgba(245,158,11,.18);color:#fcd34d}

.lesson-subj{
  font-size:14px;
  font-weight:700;
  margin-bottom:8px;
  line-height:1.4;
}

.lesson-meta{
  display:flex;
  flex-direction:column;
  gap:4px;
  font-size:11px;
  color:var(--dim);
  font-weight:500;
}

.empty-state{
  text-align:center;
  padding:56px 16px;
  color:var(--dim);
}

.empty-state .icon{
  font-size:56px;
  margin-bottom:16px;
  opacity:0.6;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,0.2));
}

.empty-state p{
  font-size:14px;
  line-height:1.5;
  font-weight:600;
}

.empty-state .hint{
  font-size:12px;
  margin-top:8px;
  opacity:0.7;
  font-weight:500;
}

/* ===== ЭКРАН ФИЗРЫ ===== */
.fitness-hero{
  text-align:center;
  padding:24px 8px;
}

.fitness-icon{
  font-size:80px;
  display:inline-block;
  filter:drop-shadow(0 12px 32px rgba(16,185,129,0.5));
  animation:pulse 2s ease infinite;
}

.fitness-title{
  font-size:28px;
  font-weight:800;
  margin:16px 0 8px;
  background:linear-gradient(135deg,#6ee7b7,#3b82f6);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}

.fitness-sub{
  color:var(--dim);
  font-size:14px;
  font-weight:500;
}

.progress-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:22px;
  padding:22px;
  margin:20px 0;
  backdrop-filter:blur(20px);
}

.progress-top{
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  margin-bottom:14px;
}

.progress-numbers{
  font-size:36px;
  font-weight:800;
  letter-spacing:-1px;
}

.progress-numbers .cur{color:var(--green)}
.progress-numbers .sep{color:var(--dim);margin:0 6px;font-weight:400}
.progress-numbers .tot{color:var(--dim);font-size:22px}

.progress-label{
  font-size:13px;
  color:var(--dim);
  font-weight:600;
}

.progress-bar{
  height:14px;
  background:rgba(255,255,255,0.06);
  border-radius:12px;
  overflow:hidden;
  position:relative;
}

.progress-fill{
  height:100%;
  background:linear-gradient(90deg,var(--green),#06b6d4);
  border-radius:12px;
  transition:width 0.5s cubic-bezier(0.4,0,0.2,1);
  position:relative;
  overflow:hidden;
}

.progress-fill::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);
  animation:shimmer 2.5s infinite;
}

.progress-percent{
  text-align:right;
  font-size:12px;
  color:var(--dim);
  margin-top:8px;
  font-weight:700;
}

.progress-done{
  color:var(--green);
}

.action-buttons{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  margin:20px 0;
}

.act-btn{
  padding:18px;
  border-radius:18px;
  border:1px solid var(--border);
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  backdrop-filter:blur(20px);
  position:relative;
  overflow:hidden;
}

.act-btn::before{
  content:"";
  position:absolute;
  inset:0;
  background:radial-gradient(circle at center,rgba(255,255,255,0.2),transparent);
  opacity:0;
  transition:opacity 0.3s;
}

.act-btn:active::before{
  opacity:1;
}

.act-btn:active{
  transform:scale(0.95);
}

.act-btn .big{
  font-size:28px;
  font-weight:800;
}

.act-btn.primary{
  background:linear-gradient(135deg,var(--green),#059669);
  color:#fff;
  border-color:transparent;
  box-shadow:0 8px 24px rgba(16,185,129,0.4);
}

.act-btn.secondary{
  background:var(--card);
  color:var(--text);
}

.act-btn.danger{
  background:rgba(239,68,68,0.1);
  color:#f87171;
  border-color:rgba(239,68,68,0.2);
}

.section-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:20px;
  padding:18px;
  margin:20px 0;
  backdrop-filter:blur(20px);
}

.section-title{
  font-size:13px;
  font-weight:700;
  color:var(--dim);
  text-transform:uppercase;
  letter-spacing:1.2px;
  margin-bottom:14px;
}

.target-presets{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
  margin-bottom:12px;
}

.preset-btn{
  padding:12px;
  border-radius:14px;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  color:var(--dim);
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  transition:all 0.25s;
}

.preset-btn.active{
  background:linear-gradient(135deg,var(--acc2),#0891b2);
  color:#fff;
  border-color:transparent;
  box-shadow:0 6px 20px rgba(6,182,212,0.4);
}

.preset-btn:active{
  transform:scale(0.95);
}

.custom-target{
  display:flex;
  gap:10px;
  align-items:center;
}

.custom-input{
  flex:1;
  padding:12px 16px;
  border-radius:14px;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  color:var(--text);
  font-size:14px;
  font-weight:600;
  outline:none;
  text-align:center;
}

.custom-input:focus{
  border-color:var(--acc);
  box-shadow:0 0 0 3px var(--acc-glow);
}

.apply-btn{
  padding:12px 20px;
  border-radius:14px;
  background:var(--acc);
  color:#fff;
  border:none;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  transition:all 0.25s;
}

.apply-btn:active{
  transform:scale(0.95);
}

.history-list{
  display:flex;
  flex-direction:column;
  gap:8px;
  max-height:260px;
  overflow-y:auto;
}

.history-item{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:12px 14px;
  background:rgba(255,255,255,0.03);
  border-radius:14px;
  font-size:13px;
  transition:all 0.2s;
}

.history-item:active{
  background:rgba(255,255,255,0.06);
}

.history-date{
  color:var(--dim);
  font-weight:500;
}

.history-hours{
  color:var(--green);
  font-weight:700;
  display:flex;
  align-items:center;
  gap:8px;
}

.history-empty{
  text-align:center;
  padding:24px;
  color:var(--dim);
  font-size:13px;
  font-weight:500;
}

.reset-btn{
  width:100%;
  padding:14px;
  margin-top:14px;
  border-radius:14px;
  background:transparent;
  border:1px solid rgba(239,68,68,0.3);
  color:#f87171;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
  transition:all 0.25s;
}

.reset-btn:active{
  background:rgba(239,68,68,0.1);
  transform:scale(0.98);
}

.toast{
  position:fixed;
  bottom:24px;
  left:50%;
  transform:translateX(-50%) translateY(100px);
  background:var(--green);
  color:#fff;
  padding:14px 28px;
  border-radius:16px;
  font-weight:700;
  font-size:15px;
  box-shadow:0 12px 40px rgba(16,185,129,0.5);
  transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);
  z-index:100;
  opacity:0;
}

.toast.show{
  transform:translateX(-50%) translateY(0);
  opacity:1;
}

/* ===== СКРОЛЛБАР ===== */
::-webkit-scrollbar{
  width:6px;
  height:6px;
}

::-webkit-scrollbar-track{
  background:transparent;
}

::-webkit-scrollbar-thumb{
  background:rgba(255,255,255,0.1);
  border-radius:3px;
}

::-webkit-scrollbar-thumb:hover{
  background:rgba(255,255,255,0.2);
}
</style>
</head>
<body>
<div class="app">

  <!-- ГЛАВНЫЙ ЭКРАН -->
  <div id="screen-home" class="screen active">
    <div class="hero">
      <div class="hero-logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
        </svg>
      </div>
      <h1>Расписание ГУУ</h1>
      <p>3 курс бакалавриата · осень 2026/27</p>
      <div class="week-badge" id="weekBadge">7 учебная неделя</div>
    </div>

    <div class="quick-actions">
      <div class="action-card" onclick="goToSchedule()">
        <div class="action-icon">📅</div>
        <div class="action-label">Расписание</div>
        <div class="action-sub">Выбрать группу</div>
      </div>
      <div class="action-card" onclick="openFitness()">
        <div class="action-icon">🏃</div>
        <div class="action-label">Физра</div>
        <div class="action-sub" id="fitnessQuick">0 / 72 ч</div>
      </div>
    </div>

    <div class="selector-label">Курс</div>
    <div class="selector" id="courseSelector"></div>
    <div class="selector-label">Институт</div>
    <div class="selector" id="instituteSelector"></div>
    <div class="search-box">
      <input class="search-input" id="searchInput" type="text" placeholder="Поиск группы или направления...">
    </div>
    <div class="selector-label" id="listLabel">Все группы</div>
    <div class="group-list" id="groupList"></div>
    <div class="counter" id="counter"></div>
  </div>

  <!-- ЭКРАН РАСПИСАНИЯ -->
  <div id="screen-schedule" class="screen">
    <div class="top-bar">
      <button class="back-btn" onclick="backHome()">←</button>
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

  <!-- ЭКРАН ФИЗРЫ -->
  <div id="screen-fitness" class="screen">
    <div class="top-bar">
      <button class="back-btn" onclick="backHome()">←</button>
      <div class="top-title">
        <h2>🏃 Физкультура</h2>
        <div class="fac">Трекер посещений</div>
      </div>
    </div>

    <div class="fitness-hero">
      <div class="fitness-icon">💪</div>
      <div class="fitness-title">Часы физры</div>
      <div class="fitness-sub">Отмечай посещённые пары</div>
    </div>

    <div class="progress-card">
      <div class="progress-top">
        <div class="progress-numbers">
          <span class="cur" id="fitCur">0</span>
          <span class="sep">/</span>
          <span class="tot" id="fitTot">72</span>
        </div>
        <div class="progress-label" id="fitLabel">часов</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="fitFill" style="width:0%"></div>
      </div>
      <div class="progress-percent" id="fitPercent">0%</div>
    </div>

    <div class="action-buttons">
      <button class="act-btn primary" onclick="addVisit()">
        <span class="big">+2</span>
        <span>Отметить пару</span>
      </button>
      <button class="act-btn secondary" onclick="removeVisit()">
        <span class="big">−2</span>
        <span>Убрать пару</span>
      </button>
    </div>

    <div class="section-card">
      <div class="section-title">🎯 Цель (часов)</div>
      <div class="target-presets" id="targetPresets">
        <div class="preset-btn" data-target="36">36</div>
        <div class="preset-btn active" data-target="72">72</div>
        <div class="preset-btn" data-target="108">108</div>
      </div>
      <div class="custom-target">
        <input type="number" class="custom-input" id="customTarget" placeholder="Своё значение" min="1" max="500">
        <button class="apply-btn" onclick="applyCustomTarget()">ОК</button>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">📋 История посещений</div>
      <div class="history-list" id="historyList"></div>
      <button class="reset-btn" onclick="resetFitness()">🗑 Сбросить всё</button>
    </div>
  </div>

</div>

<div class="toast" id="toast"></div>

<script>
const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();
try{tg?.setHeaderColor?.("#0a0a14");tg?.setBackgroundColor?.("#0a0a14")}catch(e){}

let DATA,COURSE=3,INST="iom",DAY_IDX=0,IS_EVEN=true,CURRENT=null;
const DAYS=["ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const FULL={"ПН":"Понедельник","ВТ":"Вторник","СР":"Среда","ЧТ":"Четверг","ПТ":"Пятница","СБ":"Суббота"};
const FITNESS_KEY="guu_fitness_v1";
const LAST_GROUP_KEY="guu_last_group";

function getCurrentWeekNumber(){
  const now=new Date();
  const start=new Date(2026,8,1);
  const diffMs=now-start;
  const diffDays=Math.floor(diffMs/(24*3600*1000));
  const week=Math.floor(diffDays/7)+1;
  return week>0?week:1;
}
const CURRENT_WEEK=getCurrentWeekNumber();

function getWeekRanges(lesson){
  const text=(lesson.s||"")+" "+(lesson.y||"")+" "+(lesson.p||"")+" "+(lesson.r||"");
  const ranges=[];
  const listMatch=text.match(/(\d+(?:[.,]\d+)+)\s*[-–]\s*(\d+)\s*н/);
  if(listMatch){
    const parts=listMatch[1].split(/[.,]/).map(Number);
    const first=parts[0];
    const step=parts.length>1?parts[1]-parts[0]:2;
    const end=parseInt(listMatch[2]);
    const weeks=[];
    for(let w=first;w<=end;w+=step)weeks.push(w);
    return{type:"list",weeks};
  }
  const rangeMatch=text.match(/(\d+)\s*[-–]\s*(\d+)\s*н/);
  if(rangeMatch){
    return{type:"range",min:parseInt(rangeMatch[1]),max:parseInt(rangeMatch[2])};
  }
  return null;
}

function isLessonActive(lesson,week){
  const ranges=getWeekRanges(lesson);
  if(!ranges)return true;
  if(ranges.type==="range"){
    return week>=ranges.min&&week<=ranges.max;
  }
  if(ranges.type==="list"){
    return ranges.weeks.includes(week);
  }
  return true;
}

function detectWeekParity(){
  return CURRENT_WEEK%2===0;
}

function loadFitness(){
  try{
    const raw=localStorage.getItem(FITNESS_KEY);
    if(!raw)return{target:72,visits:[]};
    const data=JSON.parse(raw);
    return{target:data.target||72,visits:Array.isArray(data.visits)?data.visits:[]};
  }catch{return{target:72,visits:[]};}
}

function saveFitness(data){
  localStorage.setItem(FITNESS_KEY,JSON.stringify(data));
}

function getFitnessHours(data){return data.visits.length*2;}

function updateFitnessUI(){
  const data=loadFitness();
  const hours=getFitnessHours(data);
  const percent=Math.min(100,Math.round((hours/data.target)*100));
  
  document.getElementById("fitCur").textContent=hours;
  document.getElementById("fitTot").textContent=data.target;
  document.getElementById("fitFill").style.width=percent+"%";
  
  const percentEl=document.getElementById("fitPercent");
  if(percent>=100){
    percentEl.textContent="✓ Цель достигнута!";
    percentEl.classList.add("progress-done");
  }else{
    percentEl.textContent=percent+"% · осталось "+(data.target-hours)+" ч";
    percentEl.classList.remove("progress-done");
  }
  
  document.querySelectorAll("#targetPresets .preset-btn").forEach(btn=>{
    btn.classList.toggle("active",parseInt(btn.dataset.target)===data.target);
  });
  
  const list=document.getElementById("historyList");
  if(data.visits.length===0){
    list.innerHTML='<div class="history-empty">Пока нет посещений</div>';
  }else{
    list.innerHTML=data.visits.slice().reverse().map((v,i)=>{
      const realIdx=data.visits.length-1-i;
      const d=new Date(v.date);
      const dateStr=d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
      const timeStr=d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
      return '<div class="history-item"><span class="history-date">📅 '+dateStr+', '+timeStr+'</span><span class="history-hours">+2 ч <span style="color:var(--dim);cursor:pointer;margin-left:10px;font-size:16px" onclick="deleteVisit('+realIdx+')">✕</span></span></div>';
    }).join("");
  }
  
  document.getElementById("fitnessQuick").textContent=hours+" / "+data.target+" ч";
}

function addVisit(){
  const data=loadFitness();
  data.visits.push({date:new Date().toISOString()});
  saveFitness(data);
  updateFitnessUI();
  showToast("+2 часа ✓");
}

function removeVisit(){
  const data=loadFitness();
  if(data.visits.length===0){showToast("Нечего убирать");return;}
  data.visits.pop();
  saveFitness(data);
  updateFitnessUI();
  showToast("−2 часа");
}

function deleteVisit(idx){
  const data=loadFitness();
  if(!confirm("Удалить это посещение?"))return;
  data.visits.splice(idx,1);
  saveFitness(data);
  updateFitnessUI();
}

function setTarget(t){
  const data=loadFitness();
  data.target=t;
  saveFitness(data);
  updateFitnessUI();
}

function applyCustomTarget(){
  const input=document.getElementById("customTarget");
  const val=parseInt(input.value);
  if(!val||val<1||val>500){showToast("Введи число 1-500");return;}
  setTarget(val);
  input.value="";
  showToast("Цель: "+val+" ч");
}

function resetFitness(){
  if(!confirm("Точно сбросить весь прогресс?"))return;
  saveFitness({target:loadFitness().target,visits:[]});
  updateFitnessUI();
  showToast("Прогресс сброшен");
}

function showToast(text){
  const t=document.getElementById("toast");
  t.textContent=text;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}

async function init(){
  IS_EVEN=detectWeekParity();
  const r=await fetch("/api/data");
  DATA=await r.json();
  
  document.getElementById("weekBadge").textContent=CURRENT_WEEK+" учебная неделя";
  
  renderCourses();
  renderInstitutes();
  renderGroups();
  updateWeekToggle();
  updateFitnessUI();
  
  const lastId=localStorage.getItem(LAST_GROUP_KEY);
  if(lastId){
    const g=DATA.groups.find(x=>x.id===lastId);
    if(g){COURSE=g.c;INST=g.i;renderCourses();renderInstitutes();renderGroups();}
  }
  
  const today=new Date().getDay();
  DAY_IDX=today===0?5:today-1;
  if(DAY_IDX>5)DAY_IDX=0;
  
  document.querySelectorAll("#targetPresets .preset-btn").forEach(btn=>{
    btn.onclick=()=>setTarget(parseInt(btn.dataset.target));
  });
}

function renderCourses(){
  const box=document.getElementById("courseSelector");
  box.innerHTML="";
  DATA.courses.forEach(c=>{
    const el=document.createElement("div");
    el.className="sel-btn"+(c.id===COURSE?" active":"");
    el.textContent=c.name;
    el.onclick=()=>{COURSE=c.id;renderCourses();renderGroups();};
    box.appendChild(el);
  });
}

function renderInstitutes(){
  const box=document.getElementById("instituteSelector");
  box.innerHTML="";
  DATA.institutes.forEach(i=>{
    const el=document.createElement("div");
    el.className="sel-btn"+(i.id===INST?" active":"");
    el.textContent=i.emoji+" "+i.name;
    el.onclick=()=>{INST=i.id;renderInstitutes();renderGroups();};
    box.appendChild(el);
  });
}

function renderGroups(){
  const q=document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered=DATA.groups.filter(g=>
    g.c===COURSE&&g.i===INST&&
    (!q||g.n.toLowerCase().includes(q)||(g.f||"").toLowerCase().includes(q))
  );
  const box=document.getElementById("groupList");
  const counter=document.getElementById("counter");
  const label=document.getElementById("listLabel");
  box.innerHTML="";
  if(filtered.length===0){
    box.innerHTML='<div class="empty-list">Ничего не найдено 🔍</div>';
    counter.textContent="";
    return;
  }
  filtered.forEach((g,i)=>{
    const el=document.createElement("div");
    el.className="group-card";
    el.style.animationDelay=Math.min(i*0.04,0.5)+"s";
    el.innerHTML='<div class="group-emoji">'+(g.e||"📚")+'</div><div class="group-info"><div class="group-name">'+g.n+'</div><div class="group-fac">'+(g.f||"")+'</div></div><div class="group-arrow">›</div>';
    el.onclick=()=>openGroup(g.id);
    box.appendChild(el);
  });
  counter.textContent=filtered.length+" "+pluralize(filtered.length,"группа","группы","групп");
  label.textContent=q?"Результаты поиска":"Все группы";
}

function pluralize(n,one,few,many){
  const mod10=n%10,mod100=n%100;
  if(mod10===1&&mod100!==11)return one;
  if(mod10>=2&&mod10<=4&&(mod100<10||mod100>=20))return few;
  return many;
}

document.getElementById("searchInput").addEventListener("input",renderGroups);

function showScreen(fromId,toId){
  const from=document.getElementById(fromId);
  const to=document.getElementById(toId);
  
  from.classList.add("slide-out-left");
  
  setTimeout(()=>{
    from.classList.remove("active","slide-out-left");
    to.classList.add("active","slide-in-right");
    
    setTimeout(()=>{
      to.classList.remove("slide-in-right");
    },50);
  },200);
  
  window.scrollTo({top:0,behavior:"smooth"});
}

function backHome(){
  const active=document.querySelector(".screen.active");
  if(active&&active.id!=="screen-home"){
    showScreen(active.id,"screen-home");
  }
}

function goToSchedule(){
  document.getElementById("courseSelector").scrollIntoView({behavior:"smooth"});
}

function openFitness(){
  updateFitnessUI();
  showScreen("screen-home","screen-fitness");
}

function openGroup(id){
  CURRENT=DATA.groups.find(g=>g.id===id);
  if(!CURRENT||!CURRENT.s){alert("Расписание для этой группы пока не добавлено");return;}
  localStorage.setItem(LAST_GROUP_KEY,id);
  document.getElementById("grpName").textContent=(CURRENT.e||"")+" "+CURRENT.n;
  document.getElementById("grpFac").textContent=CURRENT.f||"";
  renderTabs();
  renderLessons();
  showScreen("screen-home","screen-schedule");
}

function renderTabs(){
  const box=document.getElementById("dayTabs");
  box.innerHTML="";
  const today=new Date().getDay();
  const todayIdx=today===0?-1:today-1;
  DAYS.forEach((d,i)=>{
    const el=document.createElement("div");
    el.className="day-tab"+(i===DAY_IDX?" active":"")+(i===todayIdx?" today":"");
    el.innerHTML=d+'<span class="d">'+FULL[d].slice(0,2)+'</span>';
    el.onclick=()=>{DAY_IDX=i;renderTabs();renderLessons();};
    box.appendChild(el);
  });
  setTimeout(()=>{
    const a=box.querySelector(".active");
    if(a)a.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  },50);
}

function updateWeekToggle(){
  document.getElementById("weekOdd").classList.toggle("active",!IS_EVEN);
  document.getElementById("weekEven").classList.toggle("active",IS_EVEN);
}

document.getElementById("weekOdd").onclick=()=>{IS_EVEN=false;updateWeekToggle();renderLessons();};
document.getElementById("weekEven").onclick=()=>{IS_EVEN=true;updateWeekToggle();renderLessons();};

function typeClass(t){if(!t)return"lec";const l=t.toLowerCase();if(l.includes("лз")||l.includes("лаб"))return"lab";if(l.includes("пз")||l.includes("практ"))return"prac";return"lec";}
function typeName(t){if(!t)return"";const l=t.toLowerCase();if(l.includes("лз"))return"ЛЗ";if(l.includes("л"))return"Лекция";if(l.includes("пз"))return"Практика";return t;}

function renderLessons(){
  if(!CURRENT)return;
  const day=DAYS[DAY_IDX];
  const dayData=CURRENT.s?.[day];
  const box=document.getElementById("lessons");
  
  if(!dayData){
    box.innerHTML='<div class="empty-state"><div class="icon">😴</div><p>Нет данных на этот день</p></div>';
    return;
  }
  
  let lessons=IS_EVEN?(dayData.e||dayData.o):dayData.o;
  if(!lessons||lessons.length===0){
    box.innerHTML='<div class="empty-state"><div class="icon">🎉</div><p>В этот день занятий нет</p><div class="hint">'+(IS_EVEN?"Чётная неделя":"Нечётная неделя")+'</div></div>';
    return;
  }
  
  const activeLessons=lessons.filter(l=>isLessonActive(l,CURRENT_WEEK));
  
  if(activeLessons.length===0){
    box.innerHTML='<div class="empty-state"><div class="icon">📭</div><p>На этой неделе занятий нет</p><div class="hint">Неделя '+CURRENT_WEEK+' · '+(IS_EVEN?"чётная":"нечётная")+'</div></div>';
    return;
  }
  
  box.innerHTML="";
  activeLessons.forEach((l,i)=>{
    const tc=typeClass(l.y);
    const el=document.createElement("div");
    el.className="lesson "+tc;
    el.style.animationDelay=i*0.06+"s";
    el.innerHTML='<div class="lesson-top"><div class="lesson-time">'+l.t+'</div><div class="lesson
