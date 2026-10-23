/* ============================================================
   EDIT ME: wording the account holder can personalise.
   ============================================================ */
const CONFIG = {
  friendName: "Laura",
  friendFullName: "Laura King",
  // Status lines by energy range. {pct} is replaced with the level.
  levels: [
    { max: 10,  pill: "Critical",        cls: "lvl-crit", color: "#d6453d", text: "Today: {pct}%. Full shutdown. Please leave a message after the nap." },
    { max: 30,  pill: "Low reserve",     cls: "lvl-low",  color: "#F2A93B", text: "Today: {pct}%. Bring snacks." },
    { max: 50,  pill: "Limited service", cls: "lvl-mid",  color: "#F2C14E", text: "Today: {pct}%. One (1) activity available. Choose wisely." },
    { max: 75,  pill: "Stable",          cls: "lvl-ok",   color: "#6cc59b", text: "Today: {pct}%. Operating at reduced capacity. Brunch is possible." },
    { max: 100, pill: "Rare surplus",    cls: "lvl-high", color: "#1f9d6b", text: "Today: {pct}%. Surplus detected. Book something before it wears off." }
  ],
  defaultLevel: 23
};

const EXCUSES = [
  "Cellular workforce has unionised.",
  "ATP shipment delayed at customs.",
  "Krebs cycle closed for scheduled maintenance.",
  "Electron transport chain experiencing a signal failure.",
  "Proton gradient has gone flat. Engineers are on site.",
  "Mitochondria working from home today. Home is the bed.",
  "Energy reserves reallocated to the essential task of lying down.",
  "Industrial action at the inner membrane. Pickets are peaceful but firm.",
  "Glucose arrived but nobody signed for it.",
  "Rolling blackouts in effect across all major organs.",
  "ATP synthase has stopped spinning and refuses to say why.",
  "Cristae folded. Unclear if this is a metaphor.",
  "Annual leave approved for all 37 trillion staff simultaneously.",
  "Cellular respiration paused pending a pay review.",
  "Grid operator has declared a code amber. Sofa protocol initiated.",
  "Power plant is operating on a skeleton crew. The skeleton is also tired.",
  "Citric acid cycle has gone round once and wants a sit down.",
  "Oxygen delivered as normal. Mitochondria declined to use it.",
  "Energy forecast revised down following an unexpected staircase.",
  "Head office is reviewing whether today needs to happen at all.",
  "Mitochondrial DNA has requested a quiet one in.",
  "Backup generator found to be a smaller, sleepier mitochondrion."
];

const REPLIES = [
  "Thanks for getting in touch. Have you tried resting?",
  "I completely understand. Have you tried resting?",
  "I've escalated this to our technical team. They've asked if you've tried resting.",
  "Have you tried turning yourself off and on again? By which I mean resting.",
  "Our records show you last rested a while ago. Have you tried resting?",
  "That does sound frustrating. Have you tried resting, but harder?",
  "I've checked with my supervisor. She is resting. Have you tried that?",
  "Great question. Our recommended fix is rest. Our backup fix is also rest."
];

/* ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const STORE_KEY = "mitochondont.level";

// Name placeholders
document.querySelectorAll(".name-slot").forEach(el => el.textContent = CONFIG.friendName);
document.querySelectorAll(".name-full").forEach(el => el.textContent = CONFIG.friendFullName);
$("#year").textContent = new Date().getFullYear();

// Uptime bars (deterministic)
(function () {
  const wrap = $("#uptimeBars");
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 45; i++) {
    const r = rnd();
    const b = document.createElement("i");
    b.className = r > 0.88 ? "ok" : r > 0.62 ? "warn" : "bad";
    wrap.appendChild(b);
  }
})();

// Battery meter
const slider = $("#levelSlider");
function levelFor(p) { return CONFIG.levels.find(l => p <= l.max) || CONFIG.levels[CONFIG.levels.length - 1]; }
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}
function render(p, ts) {
  const l = levelFor(p);
  $("#pctBig").textContent = p;
  $("#batteryFill").style.width = Math.max(p, 2) + "%";
  $("#batteryFill").style.background = l.color;
  $("#meterStatus").textContent = l.text.replace("{pct}", p);
  const pill = $("#meterPill");
  pill.className = "pill " + l.cls;
  $("#meterPillText").textContent = l.pill;
  $("#meterUpdated").textContent = ts ? fmtTime(ts) : "just now";
  slider.value = p;
}
function setLevel(p) {
  p = Math.max(0, Math.min(100, Math.round(p)));
  const ts = Date.now();
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ p, ts })); } catch (e) {}
  render(p, ts);
}
(function init() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
  if (saved && typeof saved.p === "number") render(saved.p, saved.ts);
  else render(CONFIG.defaultLevel);
})();
slider.addEventListener("input", e => setLevel(+e.target.value));
document.querySelectorAll(".presets button").forEach(b => b.addEventListener("click", () => setLevel(+b.dataset.level)));

// Excuse generator
let lastIdx = -1;
const excuseText = $("#excuseText"), copyBtn = $("#copyBtn");
$("#excuseBtn").addEventListener("click", () => {
  let i;
  do { i = Math.floor(Math.random() * EXCUSES.length); } while (i === lastIdx && EXCUSES.length > 1);
  lastIdx = i;
  excuseText.classList.remove("fresh"); void excuseText.offsetWidth;
  excuseText.textContent = EXCUSES[i];
  excuseText.classList.add("fresh");
  $("#noticeRef").textContent = "Ref MD-" + String(1000 + Math.floor(Math.random() * 9000));
  copyBtn.disabled = false;
  copyBtn.textContent = "Copy";
  $("#excuseBtn").textContent = "Generate another";
});
copyBtn.addEventListener("click", async () => {
  const msg = "Official notice from Mitochondon't: " + excuseText.textContent + " We apologise for any inconvenience.";
  try {
    await navigator.clipboard.writeText(msg);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = msg; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
  }
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
});

// Chat
const log = $("#chatLog"), form = $("#chatForm"), input = $("#chatInput");
let replyIdx = 0, busy = false;
function addMsg(who, text) {
  const d = document.createElement("div");
  d.className = "msg " + who;
  const p = document.createElement("p");
  p.textContent = text;
  d.appendChild(p);
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}
form.addEventListener("submit", e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMsg("user", text);
  input.value = "";
  if (busy) return;
  busy = true;
  setTimeout(() => {
    const t = document.createElement("div");
    t.className = "msg agent typing";
    t.innerHTML = "<p><span></span><span></span><span></span></p>";
    log.appendChild(t); log.scrollTop = log.scrollHeight;
    setTimeout(() => {
      t.remove();
      addMsg("agent", REPLIES[replyIdx++ % REPLIES.length]);
      busy = false;
    }, 1100 + Math.random() * 900);
  }, 350);
});
