require("dotenv").config();
const fastify = require("fastify")({ logger: false });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const DATA = require("./schedule-data.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_API_URL = process.env.AI_API_URL || "https://api.baimo.ai/v1/chat/completions";

const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks(){try{return JSON.parse(fs.readFileSync(TASKS_FILE,"utf-8"))}catch{return[]}}
function saveTasks(t){fs.writeFileSync(TASKS_FILE,JSON.stringify(t,null,2))}
if(!fs.existsSync(TASKS_FILE))saveTasks([]);

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no,maximum-scale=1">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root {
  --bg-deep: #03030a;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.12);
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --accent-violet: #8b5cf6;
  --accent-cyan: #06b6d4;
  --accent-pink: #ec4899;
  --accent-green: #10b981;
  --accent-orange: #f59e0b;
  --glow-violet: rgba(139, 92, 246, 0.4);
  --glow-cyan: rgba(6, 182, 212, 0.4);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 12px;
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
html, body { 
  background: var(--bg-deep); 
  color: var(--text-primary); 
  font-family: var(--font-main); 
  min-height: 100vh; 
  overflow-x: hidden; 
  -webkit-font-smoothing: antialiased;
}

/* === ANIMATED BACKGROUND === */
.bg-mesh {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
}
.bg-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6; animation: floatOrb 20s infinite ease-in-out;
}
.bg-orb.orb-1 { width: 300px; height: 300px; background: var(--accent-violet); top: -10%; left: -10%; animation-delay: 0s; }
.bg-orb.orb-2 { width: 250px; height: 250px; background: var(--accent-cyan); bottom: 10%; right: -10%; animation-delay: -7s; }
.bg-orb.orb-3 { width: 200px; height: 200px; background: var(--accent-pink); top: 40%; left: 30%; animation-delay: -14s; opacity: 0.4; }
@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}
.noise-overlay {
  position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

.app { position: relative; z-index: 2; max-width: 560px; margin: 0 auto; padding: 16px 16px 100px; }

/* === SCREENS & TRANSITIONS === */
.screen { display: none; opacity: 0; transform: translateY(10px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.screen.active { display: block; opacity: 1; transform: translateY(0); }

/* === TYPOGRAPHY === */
.gradient-text {
  background: linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #67e8f9 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gradient-text-warm {
  background: linear-gradient(135deg, #fde047 0%, #f97316 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gradient-text-cool {
  background: linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* === HERO SECTION === */
.hero { text-align: center; padding: 40px 0 24px; position: relative; }
.hero-logo {
  width: 88px; height: 88px; margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--accent-violet), var(--accent-cyan));
  border-radius: 28px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 20px 40px -10px var(--glow-violet), inset 0 1px 1px rgba(255,255,255,0.3);
  animation: logoFloat 6s ease-in-out infinite;
}
@keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.hero-logo svg { width: 44px; height: 44px; fill: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
.hero h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 8px; }
.hero p { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
.week-badge {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 16px;
  padding: 6px 14px; border-radius: 100px;
  background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd; font-size: 12px; font-weight: 700; letter-spacing: 0.02em;
}
.week-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

/* === NEXT LESSON WIDGET === */
.next-card {
  margin: 16px 0; padding: 16px; border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08));
  border: 1px solid rgba(139,92,246,0.2); backdrop-filter: blur(20px);
  position: relative; overflow: hidden;
}
.next-card::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}
.next-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.next-status { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-cyan); }
.next-status.live { color: var(--accent-pink); }
.next-subj { font-size: 16px; font-weight: 800; margin-bottom: 6px; line-height: 1.3; }
.next-meta { display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; flex-wrap: wrap; }
.next-timer {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.06);
  font-size: 12px; font-weight: 700; color: var(--accent-cyan);
}

/* === NAVIGATION TABS === */
.nav-bar {
  display: flex; gap: 4px; padding: 4px; margin: 20px 0;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-md); backdrop-filter: blur(20px);
}
.nav-item {
  flex: 1; padding: 10px 4px; border-radius: var(--radius-sm);
  text-align: center; cursor: pointer; transition: all 0.3s ease;
  color: var(--text-secondary); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
}
.nav-item .ico { font-size: 20px; display: block; margin-bottom: 2px; transition: transform 0.3s; }
.nav-item.active { background: linear-gradient(135deg, var(--accent-violet), #7c3aed); color: white; box-shadow: 0 4px 12px var(--glow-violet); }
.nav-item.active .ico { transform: scale(1.1); }
.nav-item:active { transform: scale(0.95); }

/* === SELECTORS & SEARCH === */
.section-label {
  font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;
  letter-spacing: 0.12em; margin: 20px 4px 10px; display: flex; align-items: center; gap: 8px;
}
.section-label::before { content: ""; width: 3px; height: 10px; background: var(--accent-violet); border-radius: 2px; }
.h-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
.h-scroll::-webkit-scrollbar { display: none; }
.chip {
  flex-shrink: 0; padding: 10px 16px; border-radius: 100px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--text-secondary); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; white-space: nowrap; backdrop-filter: blur(10px);
}
.chip.active { background: var(--accent-violet); border-color: transparent; color: white; box-shadow: 0 4px 12px var(--glow-violet); }
.chip:active { transform: scale(0.95); }
.search-wrap { margin: 12px 0; position: relative; }
.search-input {
  width: 100%; padding: 14px 16px 14px 44px; border-radius: var(--radius-md);
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: white; font-size: 14px; font-family: inherit; transition: all 0.2s; backdrop-filter: blur(10px);
}
.search-input:focus { border-color: var(--accent-violet); box-shadow: 0 0 0 3px var(--glow-violet); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none; }

/* === GROUP CARDS === */
.group-list { display: flex; flex-direction: column; gap: 8px; }
.group-card {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
}
.group-card:active { transform: scale(0.98); background: var(--glass-highlight); }
.g-emoji { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
.g-info { flex: 1; min-width: 0; }
.g-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.g-fac { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-arrow { color: var(--text-secondary); font-size: 18px; transition: transform 0.2s; }
.group-card:active .g-arrow { transform: translateX(4px); color: var(--accent-violet); }

/* === SCHEDULE VIEW === */
.top-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.back-btn {
  width: 40px; height: 40px; border-radius: var(--radius-sm);
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: white; font-size: 18px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
}
.back-btn:active { transform: scale(0.9); background: var(--glass-highlight); }
.toggle-row { display: flex; gap: 4px; padding: 3px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); margin-bottom: 16px; }
.toggle-btn { flex: 1; padding: 8px; border-radius: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.toggle-btn.active { background: var(--accent-violet); color: white; box-shadow: 0 2px 8px var(--glow-violet); }
.day-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px; scrollbar-width: none; }
.day-tabs::-webkit-scrollbar { display: none; }
.day-tab {
  flex-shrink: 0; min-width: 56px; padding: 10px 8px; border-radius: var(--radius-sm);
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  text-align: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
}
.day-tab .d-name { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.day-tab .d-sub { font-size: 9px; color: var(--text-secondary); opacity: 0.7; margin-top: 2px; text-transform: uppercase; }
.day-tab.today { border-color: var(--accent-cyan); }
.day-tab.today .d-name { color: var(--accent-cyan); }
.day-tab.active { background: var(--accent-violet); border-color: transparent; box-shadow: 0 4px 12px var(--glow-violet); }
.day-tab.active .d-name, .day-tab.active .d-sub { color: white; opacity: 1; }
.day-tab:active { transform: scale(0.95); }

/* === LESSON CARDS === */
.lessons { display: flex; flex-direction: column; gap: 10px; }
.lesson {
  padding: 16px; border-radius: var(--radius-md);
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  position: relative; overflow: hidden; backdrop-filter: blur(10px);
  transition: transform 0.2s;
}
.lesson:active { transform: scale(0.99); }
.lesson::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.lesson.lec::before { background: var(--accent-violet); box-shadow: 0 0 8px var(--glow-violet); }
.lesson.prac::before { background: var(--accent-cyan); box-shadow: 0 0 8px var(--glow-cyan); }
.lesson.lab::before { background: var(--accent-orange); box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.lesson.current { border-color: var(--accent-green); background: rgba(16,185,129,0.08); }
.lesson.current::after {
  content: "LIVE"; position: absolute; top: 12px; right: 12px;
  font-size: 9px; font-weight: 800; color: var(--accent-green);
  background: rgba(16,185,129,0.15); padding: 2px 8px; border-radius: 6px; letter-spacing: 0.05em;
}
.l-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
.l-time { font-size: 13px; font-weight: 800; color: #c4b5fd; font-feature-settings: "tnum"; }
.l-badge {
  font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 6px;
  text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
}
.badge-lec { background: rgba(139,92,246,0.2); color: #c4b5fd; }
.badge-prac { background: rgba(6,182,212,0.2); color: #67e8f9; }
.badge-lab { background: rgba(245,158,11,0.2); color: #fcd34d; }
.l-subj { font-size: 15px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
.l-meta { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
.ai-btn {
  width: 100%; padding: 10px; border-radius: var(--radius-sm); border: none;
  background: linear-gradient(135deg, var(--accent-violet), var(--accent-pink));
  color: white; font-size: 13px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px var(--glow-violet);
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.ai-btn:active { transform: scale(0.97); opacity: 0.9; }
.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* === EMPTY STATES === */
.empty { text-align: center; padding: 48px 16px; color: var(--text-secondary); }
.empty .icon { font-size: 48px; margin-bottom: 12px; opacity: 0.6; }
.empty p { font-size: 14px; font-weight: 600; }
.empty .hint { font-size: 12px; margin-top: 6px; opacity: 0.7; }

/* === FITNESS & TASKS === */
.stat-hero { text-align: center; padding: 24px 0; }
.stat-icon { font-size: 64px; display: inline-block; animation: logoFloat 4s ease-in-out infinite; filter: drop-shadow(0 8px 24px rgba(16,185,129,0.4)); }
.stat-title { font-size: 28px; font-weight: 900; margin: 12px 0 4px; letter-spacing: -0.02em; }
.progress-card {
  padding: 20px; border-radius: var(--radius-lg); margin: 16px 0;
  background: linear-gradient(135deg, rgba(16,185,129,0.1), var(--glass-bg));
  border: 1px solid rgba(16,185,129,0.2); backdrop-filter: blur(20px);
}
.prog-nums { font-size: 36px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 12px; }
.prog-nums .cur { color: var(--accent-green); }
.prog-nums .sep { color: var(--text-secondary); margin: 0 4px; font-weight: 400; }
.prog-nums .tot { color: var(--text-secondary); font-size: 20px; }
.prog-bar { height: 10px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan)); border-radius: 10px; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
.prog-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shimmer 2s infinite; }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
.act-btn {
  padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: white; font-family: inherit;
  cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 4px; backdrop-filter: blur(10px);
}
.act-btn:active { transform: scale(0.95); }
.act-btn .big { font-size: 24px; font-weight: 900; }
.act-btn.primary { background: linear-gradient(135deg, var(--accent-green), #059669); border: none; box-shadow: 0 4px 16px rgba(16,185,129,0.3); }
.card { padding: 16px; border-radius: var(--radius-md); background: var(--glass-bg); border: 1px solid var(--glass-border); margin: 16px 0; backdrop-filter: blur(10px); }
.card-title { font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
.preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.preset-btn { padding: 10px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.preset-btn.active { background: var(--accent-cyan); color: white; border-color: transparent; box-shadow: 0 4px 12px var(--glow-cyan); }
.input-row { display: flex; gap: 8px; }
.input-field { flex: 1; padding: 12px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); color: white; font-size: 14px; font-family: inherit; text-align: center; }
.input-field:focus { border-color: var(--accent-violet); }
.btn-accent { padding: 12px 16px; border-radius: var(--radius-sm); background: var(--accent-violet); color: white; border: none; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); margin-bottom: 6px; font-size: 13px; }
.task-item { flex-direction: column; align-items: flex-start; gap: 6px; }
.task-head { display: flex; justify-content: space-between; width: 100%; align-items: center; }
.task-title { font-weight: 700; font-size: 14px; flex: 1; }
.task-dl { font-size: 11px; font-weight: 600; }
.task-dl.urgent { color: var(--accent-pink); }
.task-dl.soon { color: var(--accent-orange); }
.del-btn { color: var(--text-secondary); cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 16px; }
.del-btn:active { background: rgba(239,68,68,0.1); color: var(--accent-pink); }
.reset-btn { width: 100%; padding: 12px; margin-top: 12px; border-radius: var(--radius-sm); background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; }

/* === AI MODAL === */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  z-index: 100; display: none; align-items: flex-end; justify-content: center;
}
.modal-overlay.show { display: flex; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal {
  width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
  background: #0a0a14; border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 20px;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-title { font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
.modal-close { width: 32px; height: 32px; border-radius: 50%; background: var(--glass-bg); border: 1px solid var(--glass-border); color: white; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-subj { padding: 12px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 14px; font-weight: 700; }
.ai-textarea { width: 100%; min-height: 80px; padding: 12px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); color: white; font-size: 14px; font-family: inherit; resize: vertical; margin-bottom: 10px; }
.ai-textarea:focus { border-color: var(--accent-violet); }
.ai-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.ai-preset { padding: 6px 12px; border-radius: 100px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer; }
.ai-preset:active { background: var(--accent-violet); color: white; border-color: transparent; }
.ai-submit { width: 100%; padding: 14px; border-radius: var(--radius-sm); border: none; background: linear-gradient(135deg, var(--accent-violet), var(--accent-pink)); color: white; font-size: 15px; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 4px 16px var(--glow-violet); }
.ai-submit:active { transform: scale(0.98); }
.ai-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.ai-loading { display: none; align-items: center; justify-content: center; gap: 10px; padding: 20px; color: var(--text-secondary); font-weight: 600; }
.ai-loading.show { display: flex; }
.spinner { width: 20px; height: 20px; border: 3px solid var(--glass-border); border-top-color: var(--accent-violet); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ai-answer { margin-top: 16px; padding: 16px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.15); border-radius: var(--radius-md); font-size: 14px; line-height: 1.6; display: none; animation: fadeIn 0.4s ease; }
.ai-answer.show { display: block; }
.ai-answer h1,.ai-answer h2,.ai-answer h3 { margin: 12px 0 8px; color: #c4b5fd; font-weight: 800; }
.ai-answer h1 { font-size: 18px; } .ai-answer h2 { font-size: 16px; } .ai-answer h3 { font-size: 15px; }
.ai-answer p { margin: 8px 0; }
.ai-answer ul, .ai-answer ol { margin: 8px 0 8px 20px; }
.ai-answer li { margin: 4px 0; }
.ai-answer code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
.ai-answer pre { background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px; overflow-x: auto; margin: 10px 0; }
.ai-answer pre code { background: none; padding: 0; }
.ai-answer strong { color: white; font-weight: 800; }
.ai-tip { font-size: 11px; color: var(--text-secondary); margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 10px; line-height: 1.5; }

/* === TOAST === */
.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
  background: linear-gradient(135deg, var(--accent-green), #059669); color: white;
  padding: 12px 24px; border-radius: 100px; font-weight: 700; font-size: 14px;
  box-shadow: 0 8px 32px rgba(16,185,129,0.4); z-index: 200; opacity: 0; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); max-width: 90%; text-align: center;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 8px 32px rgba(239,68,68,0.4); }

.gesture-hint { text-align: center; font-size: 11px; color: var(--text-secondary); opacity: 0.6; margin-top: 8px; }
.counter { text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 12px; font-weight: 600; }
</style>
</head>
<body>

<div class="bg-mesh">
  <div class="bg-orb orb-1"></div>
  <div class="bg-orb orb-2"></div>
  <div class="bg-orb orb-3"></div>
</div>
<div class="noise-overlay"></div>

<div class="app">

<!-- HOME SCREEN -->
<div id="screen-home" class="screen active">
  <div class="hero">
    <div class="hero-logo">
      <svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
    </div>
    <h1 class="gradient-text">Расписание ГУУ</h1>
    <p>3 курс бакалавриата · осень 2026/27</p>
    <div class="week-badge"><span class="week-dot"></span><span id="weekBadge">7 учебная неделя</span></div>
  </div>

  <div id="nextLesson"></div>

  <div class="nav-bar">
    <div class="nav-item active" onclick="showTab('schedule')"><span class="ico">📅</span>Пары</div>
    <div class="nav-item" onclick="showTab('ai')"><span class="ico">🤖</span>ИИ</div>
    <div class="nav-item" onclick="showTab('tasks')"><span class="ico">📝</span>Задачи</div>
    <div class="nav-item" onclick="showTab('fitness')"><span class="ico">🏃</span>Физра</div>
  </div>

  <!-- TAB: SCHEDULE -->
  <div id="tab-schedule">
    <div class="section-label">Курс</div>
    <div class="h-scroll" id="courseSelector"></div>
    <div class="section-label">Институт</div>
    <div class="h-scroll" id="instituteSelector"></div>
    <div class="search-wrap">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="search-input" id="searchInput" type="text" placeholder="Поиск группы...">
    </div>
    <div class="section-label" id="listLabel">Все группы</div>
    <div class="group-list" id="groupList"></div>
    <div class="counter" id="counter"></div>
  </div>

  <!-- TAB: AI -->
  <div id="tab-ai" style="display:none">
    <div class="stat-hero">
      <div class="stat-icon">🤖</div>
      <div class="stat-title gradient-text">ИИ-помощник</div>
      <p style="color:var(--text-secondary);font-size:13px">Решает домашки по любому предмету</p>
    </div>
    <div class="card">
      <div class="card-title">💬 Задай вопрос</div>
      <textarea class="ai-textarea" id="globalAiInput" placeholder="Например: Реши задачу по эконометрике..."></textarea>
      <div class="ai-presets">
        <div class="ai-preset" onclick="setAiPrompt('Объясни тему простыми словами: ')">📚 Объяснить</div>
        <div class="ai-preset" onclick="setAiPrompt('Реши задачу: ')">🧮 Решить</div>
        <div class="ai-preset" onclick="setAiPrompt('Напиши план эссе: ')">📝 Эссе</div>
        <div class="ai-preset" onclick="setAiPrompt('Переведи на английский: ')">🌐 Перевод</div>
      </div>
      <button class="ai-submit" id="globalAiBtn" onclick="askGlobalAi()">🚀 Спросить ИИ</button>
      <div class="ai-loading" id="globalAiLoading"><div class="spinner"></div>ИИ думает...</div>
      <div class="ai-answer" id="globalAiAnswer"></div>
    </div>
    <div class="ai-tip">💡 <b>Совет:</b> быстрее всего решать домашки прямо из расписания — нажми кнопку 🤖 у нужной пары.</div>
  </div>

  <!-- TAB: TASKS -->
  <div id="tab-tasks" style="display:none">
    <div class="stat-hero">
      <div class="stat-icon" style="filter:drop-shadow(0 8px 24px rgba(234,179,8,0.4))">📝</div>
      <div class="stat-title gradient-text-warm">Домашние задания</div>
      <p style="color:var(--text-secondary);font-size:13px">Напоминания за 2 дня до дедлайна</p>
    </div>
    <div class="card">
      <div class="input-row" style="margin-bottom:8px"><input class="input-field" id="taskTitle" placeholder="Что нужно сделать?" maxlength="100" style="text-align:left"></div>
      <div class="input-row">
        <input class="input-field" id="taskDeadline" type="datetime-local">
        <button class="btn-accent" onclick="addTask()">+</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📋 Активные задачи</div>
      <div id="taskList"></div>
    </div>
  </div>

  <!-- TAB: FITNESS -->
  <div id="tab-fitness" style="display:none">
    <div class="stat-hero">
      <div class="stat-icon">💪</div>
      <div class="stat-title gradient-text-cool">Часы физры</div>
      <p style="color:var(--text-secondary);font-size:13px">Отмечай посещённые пары</p>
    </div>
    <div class="progress-card">
      <div class="prog-nums"><span class="cur" id="fitCur">0</span><span class="sep">/</span><span class="tot" id="fitTot">72</span></div>
      <div class="prog-bar"><div class="prog-fill" id="fitFill" style="width:0%"></div></div>
      <div style="text-align:right;font-size:11px;color:var(--text-secondary);margin-top:8px;font-weight:700" id="fitPercent">0%</div>
    </div>
    <div class="action-grid">
      <button class="act-btn primary" onclick="addVisit()"><span class="big">+2</span><span>Отметить</span></button>
      <button class="act-btn" onclick="removeVisit()"><span class="big">−2</span><span>Убрать</span></button>
    </div>
    <div class="card">
      <div class="card-title">🎯 Цель (часов)</div>
      <div class="preset-grid" id="targetPresets">
        <div class="preset-btn" data-target="36">36</div>
        <div class="preset-btn active" data-target="72">72</div>
        <div class="preset-btn" data-target="108">108</div>
      </div>
      <div class="input-row">
        <input type="number" class="input-field" id="customTarget" placeholder="Своё" min="1" max="500">
        <button class="btn-accent" onclick="applyCustomTarget()">ОК</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📋 История</div>
      <div id="historyList"></div>
      <button class="reset-btn" onclick="resetFitness()">🗑 Сбросить всё</button>
    </div>
  </div>
</div>

<!-- SCHEDULE SCREEN -->
<div id="screen-schedule" class="screen">
  <div class="top-bar">
    <button class="back-btn" onclick="backHome()">←</button>
    <div style="flex:1;min-width:0">
      <div style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:8px" id="grpName"></div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="grpFac"></div>
    </div>
  </div>
  <div class="toggle-row">
    <div class="toggle-btn" id="weekOdd" onclick="setWeek(false)">Нечётная</div>
    <div class="toggle-btn active" id="weekEven" onclick="setWeek(true)">Чётная</div>
  </div>
  <div class="day-tabs" id="dayTabs"></div>
  <div class="gesture-hint">👈 Свайп вне табов · клики по табам работают 👉</div>
  <div class="lessons" id="lessons" style="margin-top:12px"></div>
</div>

</div>

<!-- AI MODAL -->
<div class="modal-overlay" id="aiModal">
  <div class="modal">
    <div class="modal-head">
      <div class="modal-title">🤖 <span id="aiModalSubject"></span></div>
      <button class="modal-close" onclick="closeAiModal()">✕</button>
    </div>
    <div class="modal-subj" id="aiModalFullSubject"></div>
    <textarea class="ai-textarea" id="aiTaskInput" placeholder="Напиши задание или вопрос..."></textarea>
    <div class="ai-presets">
      <div class="ai-preset" onclick="setModalPrompt('Реши типовую задачу по этой теме с подробным решением')">🧮 Решить задачу</div>
      <div class="ai-preset" onclick="setModalPrompt('Объясни тему простыми словами, с примерами')">📚 Объяснить</div>
      <div class="ai-preset" onclick="setModalPrompt('Напиши краткий конспект по теме')">📝 Конспект</div>
      <div class="ai-preset" onclick="setModalPrompt('Какие вопросы могут быть на экзамене по этой теме?')">❓ Экзамен</div>
    </div>
    <button class="ai-submit" id="aiSubmitBtn" onclick="submitAiRequest()">🚀 Решить</button>
    <div class="ai-loading" id="aiLoading"><div class="spinner"></div>ИИ решает...</div>
    <div class="ai-answer" id="aiAnswer"></div>
    <div class="ai-tip">⚠️ Всегда проверяй ответ ИИ перед сдачей.</div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();
try{tg?.setHeaderColor?.("#03030a");tg?.setBackgroundColor?.("#03030a")}catch(e){}
let DATA,COURSE=3,INST="iom",DAY_IDX=0,IS_EVEN=true,CURRENT=null,USER_ID=null;
const DAYS=["ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const FULL={"ПН":"Понедельник","ВТ":"Вторник","СР":"Среда","ЧТ":"Четверг","ПТ":"Пятница","СБ":"Суббота"};
const FITNESS_KEY="guu_fitness_v2";
const LAST_GROUP_KEY="guu_last_group_v2";
let currentAiLesson=null;

try{const u=tg?.initDataUnsafe?.user;USER_ID=u?.id||0}catch{USER_ID=0}

function getCurrentWeekNumber(){const now=new Date();const start=new Date(2026,8,1);const diffDays=Math.floor((now-start)/(24*3600*1000));const week=Math.floor(diffDays/7)+1;return week>0?week:1}
const CURRENT_WEEK=getCurrentWeekNumber();

function parseWeeks(text){if(!text)return null;const match=text.match(/\\(([^)]*\\d[^)]*)\\s*н\\)/);if(!match)return null;const content=match[1];const numMatch=content.match(/([\\d,\\-\\s\\.]+)/);if(!numMatch)return null;const parts=numMatch[1].trim().split(/[,\\s]+/).filter(p=>p);const weeks=[];for(const part of parts){if(part.includes("-")){const [s,e]=part.split("-").map(Number);if(!isNaN(s)&&!isNaN(e)){for(let i=s;i<=e;i++)weeks.push(i)}}else{const n=parseInt(part);if(!isNaN(n))weeks.push(n)}}return weeks.length?[...new Set(weeks)]:null}
function isLessonActive(lesson,week){const text=[lesson.s,lesson.y,lesson.p,lesson.r].filter(Boolean).join(" ");const weeks=parseWeeks(text);if(!weeks)return true;return weeks.includes(week)}
function detectWeekParity(){return CURRENT_WEEK%2===0}

// FITNESS
function loadFitness(){try{const r=localStorage.getItem(FITNESS_KEY);if(!r)return{target:72,visits:[]};const d=JSON.parse(r);return{target:d.target||72,visits:Array.isArray(d.visits)?d.visits:[]}}catch{return{target:72,visits:[]}}}
function saveFitness(d){localStorage.setItem(FITNESS_KEY,JSON.stringify(d))}
function updateFitnessUI(){const d=loadFitness();const h=d.visits.length*2;const p=Math.min(100,Math.round((h/d.target)*100));document.getElementById("fitCur").textContent=h;document.getElementById("fitTot").textContent=d.target;document.getElementById("fitFill").style.width=p+"%";const pe=document.getElementById("fitPercent");if(p>=100){pe.textContent="✓ Цель достигнута!";pe.style.color="var(--accent-green)"}else{pe.textContent=p+"% · осталось "+(d.target-h)+" ч";pe.style.color="var(--text-secondary)"}document.querySelectorAll("#targetPresets .preset-btn").forEach(b=>b.classList.toggle("active",parseInt(b.dataset.target)===d.target));const l=document.getElementById("historyList");if(d.visits.length===0)l.innerHTML='<div class="empty" style="padding:20px"><p>Пока нет посещений</p></div>';else l.innerHTML=d.visits.slice().reverse().map((v,i)=>{const ri=d.visits.length-1-i;const dt=new Date(v.date);return'<div class="list-item"><span style="color:var(--text-secondary)">📅 '+dt.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+', '+dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+'</span><span style="color:var(--accent-green);font-weight:700;display:flex;align-items:center;gap:8px">+2 ч <span class="del-btn" onclick="deleteVisit('+ri+')">✕</span></span></div>'}).join("")}
function addVisit(){const d=loadFitness();d.visits.push({date:new Date().toISOString()});saveFitness(d);updateFitnessUI();showToast("+2 часа ✓")}
function removeVisit(){const d=loadFitness();if(!d.visits.length){showToast("Нечего убирать","error");return}d.visits.pop();saveFitness(d);updateFitnessUI();showToast("−2 часа")}
function deleteVisit(i){const d=loadFitness();if(!confirm("Удалить?"))return;d.visits.splice(i,1);saveFitness(d);updateFitnessUI()}
function setTarget(t){const d=loadFitness();d.target=t;saveFitness(d);updateFitnessUI()}
function applyCustomTarget(){const i=document.getElementById("customTarget");const v=parseInt(i.value);if(!v||v<1||v>500){showToast("Введи число 1-500","error");return}setTarget(v);i.value="";showToast("Цель: "+v+" ч")}
function resetFitness(){if(!confirm("Сбросить прогресс?"))return;saveFitness({target:loadFitness().target,visits:[]});updateFitnessUI();showToast("Сброшено")}

// TASKS
let TASKS=[];
async function loadTasks(){if(!USER_ID)return;try{const r=await fetch("/api/tasks?userId="+USER_ID);TASKS=await r.json()}catch{TASKS=[]}renderTasks()}
async function addTask(){const t=document.getElementById("taskTitle");const dl=document.getElementById("taskDeadline");const title=t.value.trim();if(!title){showToast("Введи название","error");return}if(!dl.value){showToast("Выбери дедлайн","error");return}try{const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:USER_ID,title,deadline:dl.value})});if(r.ok){t.value="";dl.value="";showToast("Задача добавлена ✓");loadTasks()}else showToast("Ошибка","error")}catch{showToast("Нет связи","error")}}
async function deleteTask(id){if(!confirm("Удалить?"))return;try{await fetch("/api/tasks/"+id,{method:"DELETE"});showToast("Удалено");loadTasks()}catch{showToast("Ошибка","error")}}
function renderTasks(){const l=document.getElementById("taskList");const active=TASKS.filter(t=>!t.done).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));if(!active.length){l.innerHTML='<div class="empty" style="padding:20px"><p>Нет активных задач 📭</p></div>';return}const now=new Date();l.innerHTML=active.map(t=>{const d=new Date(t.deadline);const diff=(d-now)/(1000*60*60*24);let cls="",label="";if(diff<0){cls="urgent";label="⚠️ Просрочено"}else if(diff<1){cls="urgent";label="⏰ Сегодня"}else if(diff<2){cls="soon";label="🔥 Завтра"}else if(diff<7){cls="soon";label="📅 "+Math.ceil(diff)+" дн"}else label="📅 "+d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});return'<div class="list-item task-item"><div class="task-head"><div class="task-title">'+escapeHtml(t.title)+'</div><span class="del-btn" onclick="deleteTask(\\''+t.id+'\\')">✕</span></div><div class="task-dl '+cls+'">'+label+' · '+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+'</div></div>'}).join("")}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function showToast(text,type){const t=document.getElementById("toast");t.textContent=text;t.className="toast show"+(type==="error"?" error":"");setTimeout(()=>t.className="toast",2500)}

// NAVIGATION
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"})}
function backHome(){showScreen("screen-home")}
function showTab(tab){document.querySelectorAll(".nav-item").forEach((t,i)=>t.classList.toggle("active",["schedule","ai","tasks","fitness"][i]===tab));["schedule","ai","tasks","fitness"].forEach(t=>{document.getElementById("tab-"+t).style.display=t===tab?"block":"none"});if(tab==="tasks")loadTasks();if(tab==="fitness")updateFitnessUI()}
function openGroup(id){CURRENT=DATA.groups.find(g=>g.id===id);if(!CURRENT||!CURRENT.s){showToast("Нет расписания","error");return}localStorage.setItem(LAST_GROUP_KEY,id);document.getElementById("grpName").textContent=(CURRENT.e||"")+" "+CURRENT.n;document.getElementById("grpFac").textContent=CURRENT.f||"";renderTabs();renderLessons();showScreen("screen-schedule")}

// AI
function openAiModal(lesson,idx){
  currentAiLesson=lesson;
  document.getElementById("aiModalSubject").textContent=lesson.s;
  document.getElementById("aiModalFullSubject").innerHTML='<b>'+lesson.s+'</b><br><span style="color:var(--text-secondary);font-size:12px">'+(lesson.p||"")+(lesson.r?" · "+lesson.r:"")+'</span>';
  document.getElementById("aiTaskInput").value="";
  document.getElementById("aiAnswer").classList.remove("show");
  document.getElementById("aiLoading").classList.remove("show");
  document.getElementById("aiSubmitBtn").disabled=false;
  document.getElementById("aiModal").classList.add("show");
}
function closeAiModal(){document.getElementById("aiModal").classList.remove("show");currentAiLesson=null}
function setModalPrompt(text){document.getElementById("aiTaskInput").value=text;document.getElementById("aiTaskInput").focus()}
function setAiPrompt(text){document.getElementById("globalAiInput").value=text;document.getElementById("globalAiInput").focus()}

async function submitAiRequest(){
  if(!currentAiLesson)return;
  const task=document.getElementById("aiTaskInput").value.trim();
  if(!task){showToast("Напиши задание","error");return}
  const btn=document.getElementById("aiSubmitBtn");
  const loading=document.getElementById("aiLoading");
  const answer=document.getElementById("aiAnswer");
  btn.disabled=true;loading.classList.add("show");answer.classList.remove("show");
  try{
    const r=await fetch("/api/ai-solve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:currentAiLesson.s,teacher:currentAiLesson.p||"",task})});
    const data=await r.json();
    if(data.error)throw new Error(data.error);
    answer.innerHTML=renderMarkdown(data.answer);answer.classList.add("show");
  }catch(e){answer.innerHTML='<div style="color:#f87171">❌ Ошибка: '+escapeHtml(e.message)+'</div>';answer.classList.add("show")}
  finally{btn.disabled=false;loading.classList.remove("show")}
}

async function askGlobalAi(){
  const task=document.getElementById("globalAiInput").value.trim();
  if(!task){showToast("Напиши вопрос","error");return}
  const btn=document.getElementById("globalAiBtn");
  const loading=document.getElementById("globalAiLoading");
  const answer=document.getElementById("globalAiAnswer");
  btn.disabled=true;loading.classList.add("show");answer.classList.remove("show");
  try{
    const r=await fetch("/api/ai-solve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:"Общий вопрос",teacher:"",task})});
    const data=await r.json();
    if(data.error)throw new Error(data.error);
    answer.innerHTML=renderMarkdown(data.answer);answer.classList.add("show");
  }catch(e){answer.innerHTML='<div style="color:#f87171">❌ Ошибка: '+escapeHtml(e.message)+'</div>';answer.classList.add("show")}
  finally{btn.disabled=false;loading.classList.remove("show")}
}

function renderMarkdown(text){
  let html=escapeHtml(text);
  html=html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g,'<pre><code>$1</code></pre>');
  html=html.replace(/\`([^\`]+)\`/g,'<code>$1</code>');
  html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  html=html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  html=html.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  html=html.replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>');
  html=html.replace(/\\*([^*]+)\\*/g,'<em>$1</em>');
  html=html.replace(/^\\s*[-•]\\s+(.+)$/gm,'<li>$1</li>');
  html=html.replace(/(<li>.*<\\/li>\\n?)+/g,'<ul>$&</ul>');
  html=html.replace(/\\n\\n/g,'</p><p>');
  html=html.replace(/\\n/g,'<br>');
  return '<p>'+html+'</p>';
}

// GESTURES
let touchStartX=0,touchStartY=0,touchStartTarget=null;
document.addEventListener("touchstart",e=>{touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;touchStartTarget=e.target},{passive:true});
document.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-touchStartX;
  const dy=e.changedTouches[0].clientY-touchStartY;
  if(Math.abs(dx)<80||Math.abs(dy)>Math.abs(dx)*0.7)return;
  if(touchStartTarget&&touchStartTarget.closest('.day-tab,.back-btn,.toggle-btn,.lesson,.ai-btn,.group-card,.chip,.nav-item,.act-btn,.preset-btn,.btn-accent,.ai-submit,.ai-preset,.reset-btn,input,textarea,button'))return;
  const scheduleScreen=document.getElementById("screen-schedule");
  if(!scheduleScreen.classList.contains("active"))return;
  if(dx>0&&DAY_IDX>0){DAY_IDX--;renderTabs();renderLessons()}
  else if(dx<0&&DAY_IDX<5){DAY_IDX++;renderTabs();renderLessons()}
},{passive:true});

document.getElementById("aiModal").addEventListener("click",e=>{if(e.target.id==="aiModal")closeAiModal()});

// RENDER FUNCTIONS
function renderCourses(){const b=document.getElementById("courseSelector");b.innerHTML="";DATA.courses.forEach(c=>{const e=document.createElement("div");e.className="chip"+(c.id===COURSE?" active":"");e.textContent=c.name;e.onclick=()=>{COURSE=c.id;renderCourses();renderGroups()};b.appendChild(e)})}
function renderInstitutes(){const b=document.getElementById("instituteSelector");b.innerHTML="";DATA.institutes.forEach(i=>{const e=document.createElement("div");e.className="chip"+(i.id===INST?" active":"");e.textContent=i.emoji+" "+i.name;e.onclick=()=>{INST=i.id;renderInstitutes();renderGroups()};b.appendChild(e)})}
function renderGroups(){const q=document.getElementById("searchInput").value.toLowerCase().trim();const f=DATA.groups.filter(g=>g.c===COURSE&&g.i===INST&&(!q||g.n.toLowerCase().includes(q)||(g.f||"").toLowerCase().includes(q)));const b=document.getElementById("groupList");const c=document.getElementById("counter");const l=document.getElementById("listLabel");b.innerHTML="";if(!f.length){b.innerHTML='<div class="empty"><p>Ничего не найдено 🔍</p></div>';c.textContent="";return}f.forEach((g,i)=>{const e=document.createElement("div");e.className="group-card";e.style.animationDelay=Math.min(i*0.04,0.5)+"s";e.innerHTML='<div class="g-emoji">'+(g.e||"📚")+'</div><div class="g-info"><div class="g-name">'+g.n+'</div><div class="g-fac">'+(g.f||"")+'</div></div><div class="g-arrow">›</div>';e.onclick=()=>openGroup(g.id);b.appendChild(e)});c.textContent=f.length+" "+pluralize(f.length,"группа","группы","групп");l.textContent=q?"Результаты поиска":"Все группы"}
function pluralize(n,o,f,m){const m10=n%10,m100=n%100;if(m10===1&&m100!==11)return o;if(m10>=2&&m10<=4&&(m100<10||m100>=20))return f;return m}
document.getElementById("searchInput").addEventListener("input",renderGroups);

function renderTabs(){const b=document.getElementById("dayTabs");b.innerHTML="";const today=new Date();const ti=today.getDay()===0?-1:today.getDay()-1;DAYS.forEach((d,i)=>{const e=document.createElement("div");e.className="day-tab"+(i===DAY_IDX?" active":"")+(i===ti?" today":"");e.innerHTML='<div class="d-name">'+d+'</div><div class="d-sub">'+FULL[d].slice(0,2)+'</div>';e.onclick=(ev)=>{ev.stopPropagation();DAY_IDX=i;renderTabs();renderLessons()};b.appendChild(e)});setTimeout(()=>{const a=b.querySelector(".active");if(a)a.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})},50)}

function setWeek(isEven){IS_EVEN=isEven;document.getElementById("weekOdd").classList.toggle("active",!isEven);document.getElementById("weekEven").classList.toggle("active",isEven);renderLessons()}

function typeClass(t){if(!t)return"lec";const l=t.toLowerCase();if(l.includes("лз")||l.includes("лаб"))return"lab";if(l.includes("пз")||l.includes("практ"))return"prac";return"lec"}
function typeName(t){if(!t)return"";const l=t.toLowerCase();if(l.includes("лз"))return"ЛЗ";if(l.includes("л"))return"Лекция";if(l.includes("пз"))return"Практика";return t}
function parseTime(t){const m=t.match(/(\\d+)[:.](\\d+)\\s*[-–]\\s*(\\d+)[:.](\\d+)/);if(!m)return null;return{start:+m[1]*60+ +m[2],end:+m[3]*60+ +m[4]}}

function renderLessons(){
  if(!CURRENT)return;
  const day=DAYS[DAY_IDX];const dd=CURRENT.s?.[day];const b=document.getElementById("lessons");
  if(!dd){b.innerHTML='<div class="empty"><div class="icon">😴</div><p>Нет данных</p></div>';return}
  let lessons=IS_EVEN?(dd.e||dd.o):dd.o;
  if(!lessons||!lessons.length){b.innerHTML='<div class="empty"><div class="icon">🎉</div><p>Занятий нет</p><div class="hint">'+(IS_EVEN?"Чётная":"Нечётная")+'</div></div>';return}
  const active=lessons.filter(l=>isLessonActive(l,CURRENT_WEEK));
  if(!active.length){b.innerHTML='<div class="empty"><div class="icon">📭</div><p>На этой неделе занятий нет</p></div>';return}
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  b.innerHTML="";
  active.forEach((l,i)=>{
    const tc=typeClass(l.y);const t=parseTime(l.t);const isCurrent=t&&nowMin>=t.start&&nowMin<t.end;
    const e=document.createElement("div");e.className="lesson "+tc+(isCurrent?" current":"");
    const lessonJson=encodeURIComponent(JSON.stringify(l));
    e.innerHTML='<div class="l-head"><div class="l-time">'+l.t+'</div><div class="l-badge badge-'+tc+'">'+typeName(l.y)+'</div></div><div class="l-subj">'+escapeHtml(l.s)+'</div><div class="l-meta">'+(l.p?'<span>👤 '+escapeHtml(l.p)+'</span>':"")+(l.r?'<span>📍 '+escapeHtml(l.r)+'</span>':"")+'</div><button class="ai-btn" onclick="openAiModal(JSON.parse(decodeURIComponent(\\''+lessonJson+'\\')),'+i+')">🤖 Решить домашку</button>';
    b.appendChild(e)
  })
}

function updateNextLesson(){const box=document.getElementById("nextLesson");const lastId=localStorage.getItem(LAST_GROUP_KEY);if(!lastId||!DATA){box.innerHTML="";return}const g=DATA.groups.find(x=>x.id===lastId);if(!g||!g.s){box.innerHTML="";return}const now=new Date();const ti=now.getDay()===0?5:now.getDay()-1;const dayName=DAYS[ti];const dd=g.s[dayName];if(!dd){box.innerHTML="";return}const isEven=CURRENT_WEEK%2===0;let lessons=isEven?(dd.e||dd.o):dd.o;if(!lessons){box.innerHTML="";return}lessons=lessons.filter(l=>isLessonActive(l,CURRENT_WEEK));const nowMin=now.getHours()*60+now.getMinutes();let cur=null,next=null;for(const l of lessons){const t=parseTime(l.t);if(!t)continue;if(nowMin>=t.start&&nowMin<t.end)cur={lesson:l,time:t};else if(nowMin<t.start&&!next)next={lesson:l,time:t}}if(cur){const left=cur.time.end-nowMin;box.innerHTML='<div class="next-card"><div class="next-header"><span class="week-dot" style="background:var(--accent-pink);box-shadow:0 0 8px var(--accent-pink)"></span><span class="next-status live">ИДЁТ СЕЙЧАС</span></div><div class="next-subj">'+cur.lesson.s+'</div><div class="next-meta"><span>📍 '+(cur.lesson.r||"—")+'</span><span>👤 '+(cur.lesson.p||"—")+'</span></div><div class="next-timer">⏱ До конца: '+Math.floor(left/60)+' ч '+left%60+' мин</div></div>'}else if(next){const left=next.time.start-nowMin;box.innerHTML='<div class="next-card"><div class="next-header"><span class="week-dot"></span><span class="next-status">СЛЕДУЮЩАЯ ПАРА</span></div><div class="next-subj">'+next.lesson.s+'</div><div class="next-meta"><span>⏰ '+next.lesson.t+'</span><span>📍 '+(next.lesson.r||"—")+'</span></div><div class="next-timer">⏱ Через '+Math.floor(left/60)+' ч '+left%60+' мин</div></div>'}else{box.innerHTML=""}}

async function init(){IS_EVEN=detectWeekParity();const r=await fetch("/api/data");DATA=await r.json();document.getElementById("weekBadge").textContent=CURRENT_WEEK+" учебная неделя";renderCourses();renderInstitutes();renderGroups();document.getElementById("weekOdd").classList.toggle("active",!IS_EVEN);document.getElementById("weekEven").classList.toggle("active",IS_EVEN);updateFitnessUI();const lastId=localStorage.getItem(LAST_GROUP_KEY);if(lastId){const g=DATA.groups.find(x=>x.id===lastId);if(g){COURSE=g.c;INST=g.i;renderCourses();renderInstitutes();renderGroups()}}const today=new Date().getDay();DAY_IDX=today===0?5:today-1;if(DAY_IDX>5)DAY_IDX=0;document.querySelectorAll("#targetPresets .preset-btn").forEach(b=>{b.onclick=()=>setTarget(parseInt(b.dataset.target))});updateNextLesson();setInterval(updateNextLesson,60000);const now=new Date();const dl=document.getElementById("taskDeadline");dl.min=now.toISOString().slice(0,16);loadTasks()}
init();
<\/script>
</body>
</html>`;

fastify.get("/", (req, reply) => reply.type("text/html").send(HTML));
fastify.get("/api/data", async () => DATA);

fastify.get("/api/tasks", async (req) => {
  const userId = parseInt(req.query.userId) || 0;
  return loadTasks().filter(t => t.userId === userId);
});

fastify.post("/api/tasks", async (req, reply) => {
  const { userId, title, deadline } = req.body || {};
  if (!userId || !title || !deadline) return reply.code(400).send({ error: "Bad request" });
  const tasks = loadTasks();
  const task = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), userId: parseInt(userId), title, deadline, done: false, reminded: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  saveTasks(tasks);
  return task;
});

fastify.delete("/api/tasks/:id", async (req) => {
  const tasks = loadTasks().filter(t => t.id !== req.params.id);
  saveTasks(tasks);
  return { ok: true };
});

// AI SOLVER
fastify.post("/api/ai-solve", async (req, reply) => {
  const { subject, teacher, task } = req.body || {};
  if (!task) return reply.code(400).send({ error: "Нет задания" });
  if (!AI_API_KEY) return reply.code(500).send({ error: "AI_API_KEY не настроен. Добавь его в .env" });
  const systemPrompt = `Ты — умный помощник студента 3 курса ГУУ. Отвечай на русском, структурированно, с примерами. Используй markdown. Предмет: ${subject}${teacher ? ", преподаватель: " + teacher : ""}.`;
  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + AI_API_KEY },
      body: JSON.stringify({ model: "qwen-plus", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: task }], temperature: 0.7, max_tokens: 2000 })
    });
    if (!response.ok) return reply.code(500).send({ error: "Ошибка AI API: " + response.status });
    const data = await response.json();
    return { answer: data.choices?.[0]?.message?.content || "Не удалось получить ответ" };
  } catch (e) { return reply.code(500).send({ error: e.message }); }
});

const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
  ctx.reply("🎓 *Привет\\!*\\nЯ бот расписания ГУУ с ИИ\\-помощником\\.\\nВыбери группу и жми 🤖 у любой пары 👇", {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: [[{ text: "📅 Открыть приложение", web_app: { url: APP_URL } }]] }
  });
});
bot.command("help", (ctx) => ctx.reply("Нажми кнопку, чтобы открыть расписание 📅"));

async function checkReminders() {
  const tasks = loadTasks(); const now = new Date(); let changed = false;
  for (const task of tasks) {
    if (task.done || task.reminded) continue;
    const deadline = new Date(task.deadline); const diff = deadline - now;
    if (diff > 0 && diff <= 2*24*60*60*1000 && diff >= (2*24*60-30)*60*1000) {
      try {
        const daysLeft = Math.ceil(diff / (24*60*60*1000));
        const timeStr = deadline.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
        await bot.telegram.sendMessage(task.userId, `🔔 *Напоминание\\!*\n\n📝 ${task.title.replace(/[\\_*\\[\\]()~\`>#+=|{}.!-]/g, "\\$&")}\n📅 Дедлайн: ${timeStr}\n⏰ Осталось: ${daysLeft} дн\\.`, { parse_mode: "MarkdownV2" });
        task.reminded = true; changed = true;
      } catch (e) { console.log("Не удалось отправить", task.userId, e.message); }
    }
  }
  if (changed) saveTasks(tasks);
}
cron.schedule("*/10 * * * *", checkReminders);
setTimeout(checkReminders, 30000);

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log("✅ Server on port " + PORT);
  if (BOT_TOKEN) bot.launch().then(() => console.log("✅ Bot started"));
});
