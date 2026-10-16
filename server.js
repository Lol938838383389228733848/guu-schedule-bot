require("dotenv").config();
const fastify = require("fastify")({ logger: false });
const { Telegraf } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const DATA = require("./schedule-data.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// ===== ХРАНИЛИЩЕ ЗАДАЧ =====
const TASKS_FILE = path.join(__dirname, "tasks.json");
function loadTasks(){try{return JSON.parse(fs.readFileSync(TASKS_FILE,"utf-8"))}catch{return[]}}
function saveTasks(t){fs.writeFileSync(TASKS_FILE,JSON.stringify(t,null,2))}
if(!fs.existsSync(TASKS_FILE))saveTasks([]);

// ===== HTML =====
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>ГУУ Расписание</title>
<script src="https://telegram.org/js/telegram-web-app.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
:root{
  --bg:#050510;--bg2:#0a0a1e;--card:rgba(255,255,255,0.04);--card2:rgba(255,255,255,0.07);
  --border:rgba(255,255,255,0.08);--text:#f0f0fa;--dim:#8585a8;
  --acc:#8b5cf6;--acc2:#06b6d4;--acc3:#ec4899;--glow:rgba(139,92,246,0.4);
  --lec:#8b5cf6;--prac:#06b6d4;--lab:#f59e0b;--green:#10b981;--red:#ef4444;--yellow:#eab308;
}
html,body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
body::before{content:"";position:fixed;inset:0;background:
  radial-gradient(ellipse at 20% 0%,rgba(139,92,246,0.25),transparent 50%),
  radial-gradient(ellipse at 80% 100%,rgba(6,182,212,0.2),transparent 50%),
  radial-gradient(ellipse at 50% 50%,rgba(236,72,153,0.08),transparent 70%);
pointer-events:none;z-index:0;animation:bgPulse 15s ease infinite}
@keyframes bgPulse{0%,100%{opacity:1}50%{opacity:0.6}}
body::after{content:"";position:fixed;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.03 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.4}
.app{position:relative;z-index:1;max-width:560px;margin:0 auto;padding:16px 16px 120px}
.screen{display:none;animation:screenIn 0.5s cubic-bezier(0.16,1,0.3,1)}
.screen.active{display:block}
@keyframes screenIn{from{opacity:0;transform:translateY(15px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.7}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--glow)}50%{box-shadow:0 0 40px var(--glow),0 0 60px rgba(139,92,246,0.2)}}
.hero{text-align:center;padding:32px 8px 20px;position:relative}
.hero-logo{width:110px;height:110px;margin:0 auto 20px;background:linear-gradient(135deg,var(--acc),var(--acc2),var(--acc3));border-radius:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px var(--glow),inset 0 1px 0 rgba(255,255,255,0.2);animation:fadeUp 0.6s ease both,float 4s ease-in-out infinite,glow 3s ease-in-out infinite;position:relative;overflow:hidden}
.hero-logo::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.25) 50%,transparent 70%);animation:shimmer 3s infinite}
.hero-logo::after{content:"";position:absolute;inset:2px;border-radius:30px;background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(6,182,212,0.3));z-index:0}
.hero-logo svg{width:58px;height:58px;fill:#fff;position:relative;z-index:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))}
.hero h1{font-size:34px;font-weight:900;margin:0 0 8px;background:linear-gradient(135deg,#fff 0%,#c4b5fd 40%,#67e8f9 70%,#f0abfc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:fadeUp 0.6s 0.1s ease both;letter-spacing:-1px;line-height:1.1}
.hero p{color:var(--dim);font-size:14px;animation:fadeUp 0.6s 0.2s ease both;font-weight:500}
.week-badge{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:8px 18px;border-radius:24px;background:linear-gradient(135deg,var(--acc),#6d28d9);color:#fff;font-size:13px;font-weight:700;box-shadow:0 8px 24px var(--glow),inset 0 1px 0 rgba(255,255,255,0.2);animation:fadeUp 0.6s 0.3s ease both}
.week-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:#6ee7b7;box-shadow:0 0 12px #6ee7b7;animation:pulse 2s infinite}
.next-lesson{background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.15));border:1px solid rgba(139,92,246,0.4);border-radius:20px;padding:16px;margin:16px 0;animation:fadeUp 0.6s 0.4s ease both;backdrop-filter:blur(20px);position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(139,92,246,0.2)}
.next-lesson::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--acc),var(--acc2),var(--acc3));animation:shimmer 3s infinite}
.next-label{font-size:10px;font-weight:800;color:var(--acc2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.next-label .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 16px var(--green);animation:pulse 1.5s infinite}
.next-label.live .dot{background:var(--red);box-shadow:0 0 16px var(--red)}
.next-subj{font-size:16px;font-weight:800;margin-bottom:6px;line-height:1.3}
.next-meta{font-size:12px;color:var(--dim);display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.next-timer{display:inline-block;padding:4px 12px;border-radius:10px;background:rgba(139,92,246,0.2);color:var(--acc2);font-size:12px;font-weight:700}
.nav-tabs{display:flex;gap:6px;margin:20px 0 16px;padding:4px;background:var(--card);border-radius:16px;border:1px solid var(--border);backdrop-filter:blur(20px)}
.nav-tab{flex:1;padding:10px;border-radius:12px;text-align:center;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);color:var(--dim);position:relative;overflow:hidden}
.nav-tab .ico{font-size:18px;display:block;margin-bottom:2px}
.nav-tab.active{background:linear-gradient(135deg,var(--acc),#6d28d9);color:#fff;box-shadow:0 6px 20px var(--glow)}
.nav-tab:active{transform:scale(0.95)}
.quick-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
.action-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px 8px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);text-align:center;backdrop-filter:blur(20px);position:relative;overflow:hidden}
.action-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--glow),transparent);opacity:0;transition:opacity 0.3s}
.action-card:active::before{opacity:1}
.action-card:active{transform:scale(0.94)}
.action-icon{font-size:28px;margin-bottom:4px;position:relative;z-index:1}
.action-label{font-size:11px;font-weight:700;position:relative;z-index:1;margin-bottom:2px}
.action-sub{font-size:10px;color:var(--dim);position:relative;z-index:1;font-weight:500}
.selector-label{font-size:11px;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin:18px 8px 10px;display:flex;align-items:center;gap:6px}
.selector-label::before{content:"";width:3px;height:12px;background:linear-gradient(180deg,var(--acc),var(--acc2));border-radius:2px}
.selector{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.selector::-webkit-scrollbar{display:none}
.sel-btn{flex-shrink:0;padding:10px 16px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--dim);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);white-space:nowrap;backdrop-filter:blur(20px)}
.sel-btn.active{background:linear-gradient(135deg,var(--acc),#6d28d9);border-color:transparent;color:#fff;box-shadow:0 8px 24px var(--glow);transform:translateY(-2px)}
.sel-btn:active{transform:scale(0.95)}
.search-box{margin:14px 0}
.search-input{width:100%;padding:14px 18px 14px 46px;border-radius:16px;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:14px;outline:none;transition:all 0.25s;backdrop-filter:blur(20px);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%238585a8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:16px center}
.search-input:focus{border-color:var(--acc);box-shadow:0 0 0 4px var(--glow)}
.group-list{display:flex;flex-direction:column;gap:8px}
.group-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);animation:fadeUp 0.5s ease both;backdrop-filter:blur(20px);position:relative;overflow:hidden}
.group-card::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--glow),transparent);opacity:0;transition:opacity 0.3s}
.group-card:active::before{opacity:1}
.group-card:active{transform:scale(0.97)}
.group-emoji{font-size:30px;position:relative;z-index:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))}
.group-info{flex:1;min-width:0;position:relative;z-index:1}
.group-name{font-size:15px;font-weight:800;margin-bottom:3px}
.group-fac{font-size:11px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.group-arrow{color:var(--dim);font-size:22px;position:relative;z-index:1;transition:transform 0.3s}
.group-card:active .group-arrow{transform:translateX(6px);color:var(--acc)}
.empty-list{text-align:center;padding:40px 16px;color:var(--dim);font-size:13px}
.counter{text-align:center;color:var(--dim);font-size:11px;margin-top:14px;font-weight:600}
.top-bar{display:flex;align-items:center;gap:12px;margin:8px 0 18px;animation:slideIn 0.4s ease}
.back-btn{width:44px;height:44px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.25s;backdrop-filter:blur(20px)}
.back-btn:active{transform:scale(0.9);background:var(--glow)}
.top-title{flex:1;min-width:0}
.top-title h2{font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px;letter-spacing:-0.3px}
.top-title .fac{font-size:11px;color:var(--dim);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.week-toggle{display:flex;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:4px;margin:0 0 16px;backdrop-filter:blur(20px)}
.week-btn{flex:1;padding:11px;border-radius:12px;text-align:center;font-size:13px;font-weight:700;color:var(--dim);cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
.week-btn.active{background:linear-gradient(135deg,var(--acc),#6d28d9);color:#fff;box-shadow:0 6px 20px var(--glow)}
.day-tabs-wrap{position:relative;margin-bottom:16px;touch-action:pan-y}
.day-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;scroll-behavior:smooth}
.day-tabs::-webkit-scrollbar{display:none}
.day-tab{flex-shrink:0;padding:10px 14px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--dim);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);white-space:nowrap;text-align:center;min-width:58px;backdrop-filter:blur(20px)}
.day-tab .d{display:block;font-size:9px;opacity:0.7;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
.day-tab.today{border-color:var(--acc2);color:var(--acc2)}
.day-tab.active{background:linear-gradient(135deg,var(--acc),#6d28d9);border-color:transparent;color:#fff;box-shadow:0 8px 24px var(--glow);transform:translateY(-2px)}
.day-tab:active{transform:scale(0.95)}
.lessons{display:flex;flex-direction:column;gap:10px}
.lesson{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:14px 16px;animation:fadeUp 0.4s ease both;position:relative;overflow:hidden;backdrop-filter:blur(20px);transition:transform 0.2s}
.lesson:active{transform:scale(0.98)}
.lesson::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px}
.lesson.lec::before{background:linear-gradient(180deg,var(--lec),#a78bfa)}
.lesson.prac::before{background:linear-gradient(180deg,var(--prac),#22d3ee)}
.lesson.lab::before{background:linear-gradient(180deg,var(--lab),#fbbf24)}
.lesson.current{border-color:var(--green);box-shadow:0 8px 32px rgba(16,185,129,0.3);background:linear-gradient(135deg,rgba(16,185,129,0.1),var(--card))}
.lesson.current::after{content:"СЕЙЧАС";position:absolute;top:12px;right:12px;font-size:9px;font-weight:800;color:var(--green);background:rgba(16,185,129,0.15);padding:3px 8px;border-radius:10px;letter-spacing:1px}
.lesson-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
.lesson-time{font-size:12px;font-weight:800;color:#c4b5fd;letter-spacing:-0.2px}
.lesson-badge{font-size:9px;font-weight:800;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}
.badge-lec{background:rgba(139,92,246,.2);color:#c4b5fd}
.badge-prac{background:rgba(6,182,212,.2);color:#67e8f9}
.badge-lab{background:rgba(245,158,11,.2);color:#fcd34d}
.lesson-subj{font-size:15px;font-weight:800;margin-bottom:8px;line-height:1.35;letter-spacing:-0.2px}
.lesson-meta{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dim);font-weight:500}
.empty-state{text-align:center;padding:56px 16px;color:var(--dim)}
.empty-state .icon{font-size:56px;margin-bottom:14px;opacity:0.7;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.3))}
.empty-state p{font-size:14px;line-height:1.5;font-weight:700}
.empty-state .hint{font-size:12px;margin-top:8px;opacity:0.7;font-weight:500}
.fitness-hero,.tasks-hero{text-align:center;padding:24px 8px}
.fitness-icon,.tasks-icon{font-size:72px;display:inline-block;filter:drop-shadow(0 12px 32px rgba(16,185,129,0.5));animation:pulse 2s ease infinite,float 4s ease-in-out infinite}
.tasks-icon{filter:drop-shadow(0 12px 32px rgba(234,179,8,0.5))}
.fitness-title,.tasks-title{font-size:28px;font-weight:900;margin:14px 0 6px;background:linear-gradient(135deg,#6ee7b7,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px}
.tasks-title{background:linear-gradient(135deg,#fde047,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.fitness-sub,.tasks-sub{color:var(--dim);font-size:13px;font-weight:500}
.progress-card{background:linear-gradient(135deg,rgba(16,185,129,0.1),var(--card));border:1px solid rgba(16,185,129,0.3);border-radius:22px;padding:22px;margin:18px 0;backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(16,185,129,0.15)}
.progress-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.progress-numbers{font-size:36px;font-weight:900;letter-spacing:-1.5px}
.progress-numbers .cur{color:var(--green)}
.progress-numbers .sep{color:var(--dim);margin:0 6px;font-weight:400}
.progress-numbers .tot{color:var(--dim);font-size:22px}
.progress-label{font-size:12px;color:var(--dim);font-weight:700}
.progress-bar{height:14px;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.05)}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--green),#06b6d4);border-radius:10px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;box-shadow:0 0 20px rgba(16,185,129,0.5)}
.progress-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);animation:shimmer 2s infinite}
.progress-percent{text-align:right;font-size:11px;color:var(--dim);margin-top:8px;font-weight:700}
.progress-done{color:var(--green)!important}
.action-buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
.act-btn{padding:16px;border-radius:16px;border:1px solid var(--border);font-size:13px;font-weight:800;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;align-items:center;gap:4px;backdrop-filter:blur(20px)}
.act-btn:active{transform:scale(0.95)}
.act-btn .big{font-size:26px;font-weight:900}
.act-btn.primary{background:linear-gradient(135deg,var(--green),#059669);color:#fff;border-color:transparent;box-shadow:0 8px 24px rgba(16,185,129,0.4)}
.act-btn.secondary{background:var(--card);color:var(--text)}
.section-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:16px;margin:16px 0;backdrop-filter:blur(20px)}
.section-title{font-size:12px;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.target-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.preset-btn{padding:11px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--dim);font-size:14px;font-weight:800;cursor:pointer;transition:all 0.2s}
.preset-btn.active{background:linear-gradient(135deg,var(--acc2),#0891b2);color:#fff;border-color:transparent;box-shadow:0 6px 20px rgba(6,182,212,0.4)}
.custom-target{display:flex;gap:8px;align-items:center}
.custom-input,.task-input,.deadline-input{flex:1;padding:11px 14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text);font-size:14px;font-weight:600;outline:none;text-align:center;transition:all 0.2s}
.custom-input:focus,.task-input:focus,.deadline-input:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--glow)}
.apply-btn,.add-task-btn{padding:11px 18px;border-radius:12px;background:linear-gradient(135deg,var(--acc),#6d28d9);color:#fff;border:none;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px var(--glow);transition:all 0.2s}
.apply-btn:active,.add-task-btn:active{transform:scale(0.95)}
.history-list,.task-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto}
.history-item,.task-item{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:14px;font-size:13px;transition:all 0.2s}
.task-item{flex-direction:column;align-items:flex-start;gap:6px}
.task-item-header{display:flex;justify-content:space-between;width:100%;align-items:center;gap:8px}
.task-title{font-weight:700;font-size:14px;flex:1;word-break:break-word}
.task-deadline{font-size:11px;color:var(--dim);display:flex;align-items:center;gap:6px;font-weight:600}
.task-deadline.urgent{color:var(--red);font-weight:800}
.task-deadline.soon{color:var(--yellow);font-weight:700}
.task-deadline.done{color:var(--green);text-decoration:line-through;opacity:0.6}
.task-delete{color:var(--dim);cursor:pointer;font-size:16px;padding:4px 8px;transition:all 0.2s;border-radius:8px}
.task-delete:active{background:rgba(239,68,68,0.1);color:var(--red)}
.task-form{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px;margin:14px 0;backdrop-filter:blur(20px)}
.task-form-row{display:flex;gap:8px;margin-bottom:8px}
.task-form-row:last-child{margin-bottom:0}
.history-date{color:var(--dim);font-weight:500}
.history-hours{color:var(--green);font-weight:800;display:flex;align-items:center;gap:8px}
.history-empty,.task-empty{text-align:center;padding:28px;color:var(--dim);font-size:13px;font-weight:500}
.reset-btn{width:100%;padding:13px;margin-top:12px;border-radius:12px;background:transparent;border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s}
.reset-btn:active{background:rgba(239,68,68,0.1)}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:linear-gradient(135deg,var(--green),#059669);color:#fff;padding:14px 28px;border-radius:16px;font-weight:800;font-size:14px;box-shadow:0 12px 40px rgba(16,185,129,0.5);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);z-index:100;opacity:0}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.error{background:linear-gradient(135deg,var(--red),#dc2626)}
.gesture-hint{text-align:center;color:var(--dim);font-size:11px;margin-top:8px;opacity:0.7;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
</style>
</head>
<body>
<div class="app">

<div id="screen-home" class="screen active">
  <div class="hero">
    <div class="hero-logo">
      <svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
    </div>
    <h1>Расписание ГУУ</h1>
    <p>3 курс бакалавриата · осень 2026/27</p>
    <div class="week-badge" id="weekBadge">7 учебная неделя</div>
  </div>
  <div id="nextLesson"></div>
  <div class="nav-tabs">
    <div class="nav-tab active" onclick="showTab('schedule')"><span class="ico">📅</span>Расписание</div>
    <div class="nav-tab" onclick="showTab('tasks')"><span class="ico">📝</span>Задачи</div>
    <div class="nav-tab" onclick="showTab('fitness')"><span class="ico">🏃</span>Физра</div>
  </div>
  <div id="tab-schedule">
    <div class="selector-label">Курс</div>
    <div class="selector" id="courseSelector"></div>
    <div class="selector-label">Институт</div>
    <div class="selector" id="instituteSelector"></div>
    <div class="search-box"><input class="search-input" id="searchInput" type="text" placeholder="Поиск группы или направления..."></div>
    <div class="selector-label" id="listLabel">Все группы</div>
    <div class="group-list" id="groupList"></div>
    <div class="counter" id="counter"></div>
  </div>
  <div id="tab-tasks" style="display:none">
    <div class="tasks-hero">
      <div class="tasks-icon">📝</div>
      <div class="tasks-title">Домашние задания</div>
      <div class="tasks-sub">Напоминания за 2 дня до дедлайна</div>
    </div>
    <div class="task-form">
      <div class="task-form-row"><input class="task-input" id="taskTitle" placeholder="Что нужно сделать?" maxlength="100"></div>
      <div class="task-form-row">
        <input class="deadline-input" id="taskDeadline" type="datetime-local">
        <button class="add-task-btn" onclick="addTask()">Добавить</button>
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">📋 Активные задачи</div>
      <div class="task-list" id="taskList"></div>
    </div>
  </div>
  <div id="tab-fitness" style="display:none">
    <div class="fitness-hero">
      <div class="fitness-icon">💪</div>
      <div class="fitness-title">Часы физры</div>
      <div class="fitness-sub">Отмечай посещённые пары</div>
    </div>
    <div class="progress-card">
      <div class="progress-top">
        <div class="progress-numbers"><span class="cur" id="fitCur">0</span><span class="sep">/</span><span class="tot" id="fitTot">72</span></div>
        <div class="progress-label">часов</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="fitFill" style="width:0%"></div></div>
      <div class="progress-percent" id="fitPercent">0%</div>
    </div>
    <div class="action-buttons">
      <button class="act-btn primary" onclick="addVisit()"><span class="big">+2</span><span>Отметить пару</span></button>
      <button class="act-btn secondary" onclick="removeVisit()"><span class="big">−2</span><span>Убрать пару</span></button>
    </div>
    <div class="section-card">
      <div class="section-title">🎯 Цель (часов)</div>
      <div class="target-presets" id="targetPresets">
        <div class="preset-btn" data-target="36">36</div>
        <div class="preset-btn active" data-target="72">72</div>
        <div class="preset-btn" data-target="108">108</div>
      </div>
      <div class="custom-target">
        <input type="number" class="custom-input" id="customTarget" placeholder="Своё" min="1" max="500">
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
  <div class="day-tabs-wrap" id="dayTabsWrap">
    <div class="day-tabs" id="dayTabs"></div>
    <div class="gesture-hint">👈 Свайп для переключения дней 👉</div>
  </div>
  <div class="lessons" id="lessons"></div>
</div>

</div>
<div class="toast" id="toast"></div>

<script>
const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();
try{tg?.setHeaderColor?.("#050510");tg?.setBackgroundColor?.("#050510")}catch(e){}
let DATA,COURSE=3,INST="iom",DAY_IDX=0,IS_EVEN=true,CURRENT=null,USER_ID=null;
const DAYS=["ПН","ВТ","СР","ЧТ","ПТ","СБ"];
const FULL={"ПН":"Понедельник","ВТ":"Вторник","СР":"Среда","ЧТ":"Четверг","ПТ":"Пятница","СБ":"Суббота"};
const FITNESS_KEY="guu_fitness_v2";
const LAST_GROUP_KEY="guu_last_group_v2";

try{const u=JSON.parse(tg?.initDataUnsafe?.user?JSON.stringify(tg.initDataUnsafe.user):"{}");USER_ID=u.id||0}catch{USER_ID=0}

function getCurrentWeekNumber(){const now=new Date();const start=new Date(2026,8,1);const diffDays=Math.floor((now-start)/(24*3600*1000));const week=Math.floor(diffDays/7)+1;return week>0?week:1}
const CURRENT_WEEK=getCurrentWeekNumber();

// ===== УМНЫЙ ПАРСЕР НЕДЕЛЬ =====
// Поддерживает: "14 н", "2-14 н", "1,5-13 н", "1-2,4-13 н"
function parseWeeks(text){
  if(!text)return null;
  const match=text.match(/\\(([^)]*\\d[^)]*)\\s*н\\)/);
  if(!match)return null;
  const content=match[1];
  const numMatch=content.match(/([\\d,\\-\\s\\.]+)/);
  if(!numMatch)return null;
  const parts=numMatch[1].trim().split(/[,\\s]+/).filter(p=>p);
  const weeks=[];
  for(const part of parts){
    if(part.includes("-")){
      const [s,e]=part.split("-").map(Number);
      if(!isNaN(s)&&!isNaN(e)){for(let i=s;i<=e;i++)weeks.push(i)}
    }else{
      const n=parseInt(part);
      if(!isNaN(n))weeks.push(n);
    }
  }
  return weeks.length?[...new Set(weeks)]:null;
}
function isLessonActive(lesson,week){
  const text=[lesson.s,lesson.y,lesson.p,lesson.r].filter(Boolean).join(" ");
  const weeks=parseWeeks(text);
  if(!weeks)return true;
  return weeks.includes(week);
}
function detectWeekParity(){return CURRENT_WEEK%2===0}

// ===== ФИЗРА =====
function loadFitness(){try{const r=localStorage.getItem(FITNESS_KEY);if(!r)return{target:72,visits:[]};const d=JSON.parse(r);return{target:d.target||72,visits:Array.isArray(d.visits)?d.visits:[]}}catch{return{target:72,visits:[]}}}
function saveFitness(d){localStorage.setItem(FITNESS_KEY,JSON.stringify(d))}
function updateFitnessUI(){const d=loadFitness();const h=d.visits.length*2;const p=Math.min(100,Math.round((h/d.target)*100));document.getElementById("fitCur").textContent=h;document.getElementById("fitTot").textContent=d.target;document.getElementById("fitFill").style.width=p+"%";const pe=document.getElementById("fitPercent");if(p>=100){pe.textContent="✓ Цель достигнута!";pe.classList.add("progress-done")}else{pe.textContent=p+"% · осталось "+(d.target-h)+" ч";pe.classList.remove("progress-done")}document.querySelectorAll("#targetPresets .preset-btn").forEach(b=>b.classList.toggle("active",parseInt(b.dataset.target)===d.target));const l=document.getElementById("historyList");if(d.visits.length===0)l.innerHTML='<div class="history-empty">Пока нет посещений</div>';else l.innerHTML=d.visits.slice().reverse().map((v,i)=>{const ri=d.visits.length-1-i;const dt=new Date(v.date);return'<div class="history-item"><span class="history-date">📅 '+dt.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+', '+dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+'</span><span class="history-hours">+2 ч <span style="color:var(--dim);cursor:pointer;margin-left:8px" onclick="deleteVisit('+ri+')">✕</span></span></div>'}).join("")}
function addVisit(){const d=loadFitness();d.visits.push({date:new Date().toISOString()});saveFitness(d);updateFitnessUI();showToast("+2 часа ✓")}
function removeVisit(){const d=loadFitness();if(!d.visits.length){showToast("Нечего убирать","error");return}d.visits.pop();saveFitness(d);updateFitnessUI();showToast("−2 часа")}
function deleteVisit(i){const d=loadFitness();if(!confirm("Удалить это посещение?"))return;d.visits.splice(i,1);saveFitness(d);updateFitnessUI()}
function setTarget(t){const d=loadFitness();d.target=t;saveFitness(d);updateFitnessUI()}
function applyCustomTarget(){const i=document.getElementById("customTarget");const v=parseInt(i.value);if(!v||v<1||v>500){showToast("Введи число 1-500","error");return}setTarget(v);i.value="";showToast("Цель: "+v+" ч")}
function resetFitness(){if(!confirm("Точно сбросить весь прогресс?"))return;saveFitness({target:loadFitness().target,visits:[]});updateFitnessUI();showToast("Прогресс сброшен")}

// ===== ЗАДАЧИ =====
let TASKS=[];
async function loadTasks(){if(!USER_ID)return;try{const r=await fetch("/api/tasks?userId="+USER_ID);TASKS=await r.json()}catch{TASKS=[]}renderTasks()}
async function addTask(){const t=document.getElementById("taskTitle");const dl=document.getElementById("taskDeadline");const title=t.value.trim();if(!title){showToast("Введи название задачи","error");return}if(!dl.value){showToast("Выбери дедлайн","error");return}try{const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:USER_ID,title,deadline:dl.value})});if(r.ok){t.value="";dl.value="";showToast("Задача добавлена ✓");loadTasks()}else showToast("Ошибка сохранения","error")}catch{showToast("Нет связи с сервером","error")}}
async function deleteTask(id){if(!confirm("Удалить задачу?"))return;try{await fetch("/api/tasks/"+id,{method:"DELETE"});showToast("Удалено");loadTasks()}catch{showToast("Ошибка","error")}}
function renderTasks(){const l=document.getElementById("taskList");const active=TASKS.filter(t=>!t.done).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));if(!active.length){l.innerHTML='<div class="task-empty">Нет активных задач 📭</div>';return}const now=new Date();l.innerHTML=active.map(t=>{const d=new Date(t.deadline);const diff=(d-now)/(1000*60*60*24);let cls="";let label="";if(diff<0){cls="urgent";label="⚠️ Просрочено"}else if(diff<1){cls="urgent";label="⏰ Сегодня"}else if(diff<2){cls="soon";label="🔥 Завтра"}else if(diff<7){cls="soon";label="📅 "+Math.ceil(diff)+" дн"}else label="📅 "+d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});return'<div class="task-item"><div class="task-item-header"><div class="task-title">'+escapeHtml(t.title)+'</div><span class="task-delete" onclick="deleteTask(\\''+t.id+'\\')">✕</span></div><div class="task-deadline '+cls+'">'+label+' · '+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+'</div></div>'}).join("")}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

// ===== УВЕДОМЛЕНИЯ =====
function showToast(text,type){const t=document.getElementById("toast");t.textContent=text;t.className="toast show"+(type==="error"?" error":"");setTimeout(()=>t.className="toast",2500)}

// ===== НАВИГАЦИЯ =====
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"})}
function backHome(){showScreen("screen-home")}
function showTab(tab){document.querySelectorAll(".nav-tab").forEach((t,i)=>t.classList.toggle("active",["schedule","tasks","fitness"][i]===tab));["schedule","tasks","fitness"].forEach(t=>{document.getElementById("tab-"+t).style.display=t===tab?"block":"none"});if(tab==="tasks")loadTasks();if(tab==="fitness")updateFitnessUI()}
function openGroup(id){CURRENT=DATA.groups.find(g=>g.id===id);if(!CURRENT||!CURRENT.s){showToast("Нет расписания для этой группы","error");return}localStorage.setItem(LAST_GROUP_KEY,id);document.getElementById("grpName").textContent=(CURRENT.e||"")+" "+CURRENT.n;document.getElementById("grpFac").textContent=CURRENT.f||"";renderTabs();renderLessons();showScreen("screen-schedule")}

// ===== ЖЕСТЫ (свайпы) =====
let touchStartX=0,touchStartY=0;
document.addEventListener("touchstart",e=>{touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY},{passive:true});
document.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-touchStartX;
  const dy=e.changedTouches[0].clientY-touchStartY;
  if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.7)return;
  const scheduleScreen=document.getElementById("screen-schedule");
  if(!scheduleScreen.classList.contains("active"))return;
  if(dx>0&&DAY_IDX>0){DAY_IDX--;renderTabs();renderLessons()}
  else if(dx<0&&DAY_IDX<5){DAY_IDX++;renderTabs();renderLessons()}
},{passive:true});

function renderCourses(){const b=document.getElementById("courseSelector");b.innerHTML="";DATA.courses.forEach(c=>{const e=document.createElement("div");e.className="sel-btn"+(c.id===COURSE?" active":"");e.textContent=c.name;e.onclick=()=>{COURSE=c.id;renderCourses();renderGroups()};b.appendChild(e)})}
function renderInstitutes(){const b=document.getElementById("instituteSelector");b.innerHTML="";DATA.institutes.forEach(i=>{const e=document.createElement("div");e.className="sel-btn"+(i.id===INST?" active":"");e.textContent=i.emoji+" "+i.name;e.onclick=()=>{INST=i.id;renderInstitutes();renderGroups()};b.appendChild(e)})}
function renderGroups(){const q=document.getElementById("searchInput").value.toLowerCase().trim();const f=DATA.groups.filter(g=>g.c===COURSE&&g.i===INST&&(!q||g.n.toLowerCase().includes(q)||(g.f||"").toLowerCase().includes(q)));const b=document.getElementById("groupList");const c=document.getElementById("counter");const l=document.getElementById("listLabel");b.innerHTML="";if(!f.length){b.innerHTML='<div class="empty-list">Ничего не найдено 🔍</div>';c.textContent="";return}f.forEach((g,i)=>{const e=document.createElement("div");e.className="group-card";e.style.animationDelay=Math.min(i*0.04,0.5)+"s";e.innerHTML='<div class="group-emoji">'+(g.e||"📚")+'</div><div class="group-info"><div class="group-name">'+g.n+'</div><div class="group-fac">'+(g.f||"")+'</div></div><div class="group-arrow">›</div>';e.onclick=()=>openGroup(g.id);b.appendChild(e)});c.textContent=f.length+" "+pluralize(f.length,"группа","группы","групп");l.textContent=q?"Результаты поиска":"Все группы"}
function pluralize(n,o,f,m){const m10=n%10,m100=n%100;if(m10===1&&m100!==11)return o;if(m10>=2&&m10<=4&&(m100<10||m100>=20))return f;return m}
document.getElementById("searchInput").addEventListener("input",renderGroups);
function renderTabs(){const b=document.getElementById("dayTabs");b.innerHTML="";const today=new Date().getDay();const ti=today===0?-1:today-1;DAYS.forEach((d,i)=>{const e=document.createElement("div");e.className="day-tab"+(i===DAY_IDX?" active":"")+(i===ti?" today":"");e.innerHTML=d+'<span class="d">'+FULL[d].slice(0,2)+'</span>';e.onclick=()=>{DAY_IDX=i;renderTabs();renderLessons()};b.appendChild(e)});setTimeout(()=>{const a=b.querySelector(".active");if(a)a.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})},50)}
function updateWeekToggle(){document.getElementById("weekOdd").classList.toggle("active",!IS_EVEN);document.getElementById("weekEven").classList.toggle("active",IS_EVEN)}
document.getElementById("weekOdd").onclick=()=>{IS_EVEN=false;updateWeekToggle();renderLessons()};
document.getElementById("weekEven").onclick=()=>{IS_EVEN=true;updateWeekToggle();renderLessons()};
function typeClass(t){if(!t)return"lec";const l=t.toLowerCase();if(l.includes("лз")||l.includes("лаб"))return"lab";if(l.includes("пз")||l.includes("практ"))return"prac";return"lec"}
function typeName(t){if(!t)return"";const l=t.toLowerCase();if(l.includes("лз"))return"ЛЗ";if(l.includes("л"))return"Лекция";if(l.includes("пз"))return"Практика";return t}
function parseTime(t){const m=t.match(/(\\d+)[:.](\\d+)\\s*[-–]\\s*(\\d+)[:.](\\d+)/);if(!m)return null;return{start:+m[1]*60+ +m[2],end:+m[3]*60+ +m[4]}}
function renderLessons(){if(!CURRENT)return;const day=DAYS[DAY_IDX];const dd=CURRENT.s?.[day];const b=document.getElementById("lessons");if(!dd){b.innerHTML='<div class="empty-state"><div class="icon">😴</div><p>Нет данных на этот день</p></div>';return}let lessons=IS_EVEN?(dd.e||dd.o):dd.o;if(!lessons||!lessons.length){b.innerHTML='<div class="empty-state"><div class="icon">🎉</div><p>В этот день занятий нет</p><div class="hint">'+(IS_EVEN?"Чётная неделя":"Нечётная неделя")+'</div></div>';return}const active=lessons.filter(l=>isLessonActive(l,CURRENT_WEEK));if(!active.length){b.innerHTML='<div class="empty-state"><div class="icon">📭</div><p>На этой неделе занятий нет</p><div class="hint">Неделя '+CURRENT_WEEK+' · '+(IS_EVEN?"чётная":"нечётная")+'</div></div>';return}const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();b.innerHTML="";active.forEach((l,i)=>{const tc=typeClass(l.y);const t=parseTime(l.t);const isCurrent=t&&nowMin>=t.start&&nowMin<t.end;const e=document.createElement("div");e.className="lesson "+tc+(isCurrent?" current":"");e.style.animationDelay=i*0.06+"s";e.innerHTML='<div class="lesson-top"><div class="lesson-time">'+l.t+'</div><div class="lesson-badge badge-'+tc+'">'+typeName(l.y)+'</div></div><div class="lesson-subj">'+l.s+'</div><div class="lesson-meta">'+(l.p?'<span>👤 '+l.p+'</span>':"")+(l.r?'<span>📍 '+l.r+'</span>':"")+'</div>';b.appendChild(e)})}

function updateNextLesson(){const box=document.getElementById("nextLesson");const lastId=localStorage.getItem(LAST_GROUP_KEY);if(!lastId||!DATA){box.innerHTML="";return}const g=DATA.groups.find(x=>x.id===lastId);if(!g||!g.s){box.innerHTML="";return}const now=new Date();const today=now.getDay();const ti=today===0?5:today-1;const dayName=DAYS[ti];const dd=g.s[dayName];if(!dd){box.innerHTML="";return}const isEven=CURRENT_WEEK%2===0;let lessons=isEven?(dd.e||dd.o):dd.o;if(!lessons){box.innerHTML="";return}lessons=lessons.filter(l=>isLessonActive(l,CURRENT_WEEK));const nowMin=now.getHours()*60+now.getMinutes();let cur=null,next=null;for(const l of lessons){const t=parseTime(l.t);if(!t)continue;if(nowMin>=t.start&&nowMin<t.end)cur={lesson:l,time:t};else if(nowMin<t.start&&!next)next={lesson:l,time:t}}if(cur){const left=cur.time.end-nowMin;box.innerHTML='<div class="next-lesson"><div class="next-label live"><span class="dot"></span>ИДЁТ СЕЙЧАС</div><div class="next-subj">'+cur.lesson.s+'</div><div class="next-meta"><span>📍 '+(cur.lesson.r||"—")+'</span><span>👤 '+(cur.lesson.p||"—")+'</span></div><div class="next-timer">⏱ До конца: '+Math.floor(left/60)+' ч '+left%60+' мин</div></div>'}else if(next){const left=next.time.start-nowMin;box.innerHTML='<div class="next-lesson"><div class="next-label"><span class="dot"></span>СЛЕДУЮЩАЯ ПАРА</div><div class="next-subj">'+next.lesson.s+'</div><div class="next-meta"><span>⏰ '+next.lesson.t+'</span><span>📍 '+(next.lesson.r||"—")+'</span></div><div class="next-timer">⏱ Через '+Math.floor(left/60)+' ч '+left%60+' мин</div></div>'}else{box.innerHTML=""}}

async function init(){IS_EVEN=detectWeekParity();const r=await fetch("/api/data");DATA=await r.json();document.getElementById("weekBadge").textContent=CURRENT_WEEK+" учебная неделя";renderCourses();renderInstitutes();renderGroups();updateWeekToggle();updateFitnessUI();const lastId=localStorage.getItem(LAST_GROUP_KEY);if(lastId){const g=DATA.groups.find(x=>x.id===lastId);if(g){COURSE=g.c;INST=g.i;renderCourses();renderInstitutes();renderGroups()}}const today=new Date().getDay();DAY_IDX=today===0?5:today-1;if(DAY_IDX>5)DAY_IDX=0;document.querySelectorAll("#targetPresets .preset-btn").forEach(b=>{b.onclick=()=>setTarget(parseInt(b.dataset.target))});updateNextLesson();setInterval(updateNextLesson,60000);const now=new Date();const dl=document.getElementById("taskDeadline");dl.min=now.toISOString().slice(0,16);loadTasks()}
init();
<\/script>
</body>
</html>`;

// ===== API =====
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

// ===== БОТ =====
const bot = new Telegraf(BOT_TOKEN);
bot.start((ctx) => {
  ctx.reply("🎓 *Привет\\!*\\nЯ бот расписания ГУУ\\.\\nВыбери группу, открой задачи или трекер физры 👇", {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: [[{ text: "📅 Открыть приложение", web_app: { url: APP_URL } }]] }
  });
});
bot.command("help", (ctx) => ctx.reply("Нажми кнопку, чтобы открыть расписание 📅"));

// ===== НАПОМИНАНИЯ ЗА 2 ДНЯ =====
async function checkReminders() {
  const tasks = loadTasks();
  const now = new Date();
  const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  let changed = false;
  
  for (const task of tasks) {
    if (task.done || task.reminded) continue;
    const deadline = new Date(task.deadline);
    const diff = deadline - now;
    // Напоминаем за 2 дня (±30 минут окно, чтобы сработало ровно раз)
    if (diff > 0 && diff <= 2 * 24 * 60 * 60 * 1000 && diff >= (2 * 24 * 60 - 30) * 60 * 1000) {
      try {
        const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
        const timeStr = deadline.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
        await bot.telegram.sendMessage(
          task.userId,
          `🔔 *Напоминание\\!*\n\n📝 ${task.title.replace(/[\\_*\\[\\]()~`>#+=|{}.!-]/g, "\\$&")}\n📅 Дедлайн: ${timeStr}\n⏰ Осталось: ${daysLeft} дн\\.`,
          { parse_mode: "MarkdownV2" }
        );
        task.reminded = true;
        changed = true;
      } catch (e) {
        console.log("Не удалось отправить напоминание", task.userId, e.message);
      }
    }
    // Финальное напоминание за 2 часа
    if (diff > 0 && diff <= 2 * 60 * 60 * 1000 && diff >= 90 * 60 * 1000) {
      try {
        await bot.telegram.sendMessage(
          task.userId,
          `⚠️ *Скоро дедлайн\\!*\n\n📝 ${task.title.replace(/[\\_*\\[\\]()~`>#+=|{}.!-]/g, "\\$&")}\n⏰ Осталось меньше 2 часов\\!`,
          { parse_mode: "MarkdownV2" }
        );
      } catch (e) {}
    }
  }
  if (changed) saveTasks(tasks);
}

// Запускаем проверку каждые 10 минут
cron.schedule("*/10 * * * *", checkReminders);
// Первая проверка через 30 секунд после старта
setTimeout(checkReminders, 30000);

// ===== ЗАПУСК =====
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log("✅ Server on port " + PORT);
  if (BOT_TOKEN) bot.launch().then(() => console.log("✅ Bot started"));
});
