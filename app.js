/* =====================================================
   APEX SMC INSTITUTIONAL TRADING LAB
   Restored application core: Phase 1 + Phase 2 bridge + Phase 3.1
   Educational / historical simulation only. No live trading.
===================================================== */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const lessons = [
  ["1","Market Basics","Candlestick, OHLC, timeframe और market sessions","हर candle में Open, High, Low और Close होता है। Timeframe बताता है कि एक candle कितने समय का डेटा दिखाती है।","20 candles देखें और bullish/bearish candles पहचानें।","एक candle का रंग अकेले trend तय नहीं करता।"],
  ["2","Market Structure","Swing High/Low, HH, HL, LH, LL","Swing points वे turning points हैं जहाँ कीमत ने दिशा बदली। HH/HL सामान्यतः bullish और LH/LL bearish structure बताते हैं।","Historical chart पर swing points mark करें।","हर छोटे pivot को महत्वपूर्ण swing न मानें।"],
  ["3","BOS, CHoCH & MSS","Break of Structure और बदलाव की पुष्टि","BOS मौजूदा structure की दिशा में break है। CHoCH संभावित बदलाव का शुरुआती संकेत है। MSS अधिक संदर्भ-आधारित structural shift है।","Relevant swing और candle close नोट करें।","Wick और candle-close नियम पहले तय करें।"],
  ["4","Liquidity","BSL, SSL, Equal Highs/Lows, Sweep","Liquidity concepts obvious highs/lows के आसपास price behaviour का अध्ययन करते हैं।","Equal highs/lows खोजें और price reaction देखें।","हर breakout liquidity sweep नहीं होता।"],
  ["5","Order Blocks & FVG","Displacement, imbalance, OB","FVG तीन-candle price imbalance का एक model है। Order Block की परिभाषा अलग-अलग frameworks में बदल सकती है।","तीन-candle sequence में imbalance देखें।","हर gap या opposite candle valid setup नहीं होती।"],
  ["6","Premium & Discount","Dealing range, equilibrium, OTE","चुने हुए dealing range के 50% स्तर को equilibrium मानकर ऊपर/नीचे के क्षेत्रों का अध्ययन किया जाता है।","एक स्पष्ट swing range चुनकर midpoint mark करें।","Range चुनने का तरीका परिणाम बदल सकता है।"],
  ["7","Multi-Timeframe Strategy","HTF bias, LTF confirmation, invalidation","Higher timeframe context देता है; lower timeframe संभावित structure दिखाता है।","HTF bias और LTF confirmation लिखें।","Timeframes पर संकेत विरोधाभासी हो सकते हैं।"],
  ["8","Professional Testing","Backtesting, journal, expectancy, drawdown","स्पष्ट rules, पर्याप्त samples, costs और out-of-sample data के साथ strategy जाँचें।","30–50 historical examples का नियमबद्ध review करें।","Past performance भविष्य के परिणाम की गारंटी नहीं है।"]
];

let allCandles = [], visibleCount = 0, chart = null, series = null, timer = null;
let notes = [], completed = new Set();
let p31Markers = [], p31Levels = [], p31TrendSeries = [];

const sample = {
  XAUUSD: [
    ["2025-01-06",2640,2650,2634,2647],["2025-01-07",2647,2656,2641,2652],
    ["2025-01-08",2652,2661,2648,2658],["2025-01-09",2658,2664,2645,2650],
    ["2025-01-10",2650,2658,2644,2655],["2025-01-13",2655,2668,2651,2663],
    ["2025-01-14",2663,2667,2652,2656],["2025-01-15",2656,2664,2650,2660],
    ["2025-01-16",2660,2674,2658,2670],["2025-01-17",2670,2678,2660,2665],
    ["2025-01-20",2665,2672,2657,2661],["2025-01-21",2661,2670,2655,2668],
    ["2025-01-22",2668,2682,2665,2678],["2025-01-23",2678,2685,2668,2671],
    ["2025-01-24",2671,2679,2662,2667],["2025-01-27",2667,2688,2664,2682],
    ["2025-01-28",2682,2691,2672,2676],["2025-01-29",2676,2681,2658,2661],
    ["2025-01-30",2661,2666,2648,2652],["2025-01-31",2652,2658,2638,2642]
  ],
  BTCUSD: [
    ["2025-01-06",99000,101000,98000,100200],["2025-01-07",100200,102000,99500,101500],
    ["2025-01-08",101500,102300,99000,99500],["2025-01-09",99500,100400,97000,98000],
    ["2025-01-10",98000,99000,95500,96500],["2025-01-13",96500,98500,96000,98000],
    ["2025-01-14",98000,100000,97500,99500],["2025-01-15",99500,101500,99000,101000],
    ["2025-01-16",101000,102000,99500,100000],["2025-01-17",100000,101000,98500,99000],
    ["2025-01-20",99000,102000,98500,101500],["2025-01-21",101500,103000,100500,102500],
    ["2025-01-22",102500,104000,101500,103500],["2025-01-23",103500,104500,101000,101500],
    ["2025-01-24",101500,102000,99000,99500]
  ],
  EURUSD: [
    ["2025-01-06",1.0300,1.0340,1.0280,1.0320],["2025-01-07",1.0320,1.0350,1.0290,1.0300],
    ["2025-01-08",1.0300,1.0330,1.0260,1.0270],["2025-01-09",1.0270,1.0310,1.0250,1.0300],
    ["2025-01-10",1.0300,1.0340,1.0290,1.0330],["2025-01-13",1.0330,1.0360,1.0310,1.0350],
    ["2025-01-14",1.0350,1.0370,1.0300,1.0310],["2025-01-15",1.0310,1.0340,1.0280,1.0330],
    ["2025-01-16",1.0330,1.0380,1.0320,1.0370],["2025-01-17",1.0370,1.0390,1.0330,1.0340],
    ["2025-01-20",1.0340,1.0360,1.0300,1.0320],["2025-01-21",1.0320,1.0350,1.0290,1.0340],
    ["2025-01-22",1.0340,1.0400,1.0330,1.0390],["2025-01-23",1.0390,1.0410,1.0350,1.0360],
    ["2025-01-24",1.0360,1.0380,1.0320,1.0330]
  ]
};

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2100);
}

function db() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ApexSMC", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("state")) {
        request.result.createObjectStore("state");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getState(key, fallback) {
  try {
    const database = await db();
    return await new Promise(resolve => {
      const request = database.transaction("state").objectStore("state").get(key);
      request.onsuccess = () => resolve(request.result ?? fallback);
      request.onerror = () => resolve(fallback);
    });
  } catch (_) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }
}

async function setState(key, value) {
  try {
    const database = await db();
    await new Promise((resolve, reject) => {
      const tx = database.transaction("state", "readwrite");
      tx.objectStore("state").put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function navigate(id) {
  $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === id));
  $$(".nav-btn").forEach(button => button.classList.toggle("active", button.dataset.go === id));
  if (id === "chart") setTimeout(initChart, 80);
  if (id === "journal") renderJournal();
  window.scrollTo(0, 0);
}

$$("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));

function renderLessons() {
  const list = $("#lessonList");
  if (!list) return;
  list.innerHTML = lessons.map((lesson, index) => `
    <div class="lesson-item">
      <div><b>LEVEL ${lesson[0]} · ${lesson[1]}</b><small>${lesson[2]}</small></div>
      <button class="secondary" data-lesson="${index}">${completed.has(index) ? "Review" : "Open"}</button>
    </div>`).join("");
  $$("[data-lesson]").forEach(button => button.onclick = () => openLesson(Number(button.dataset.lesson)));
}

function openLesson(index) {
  const lesson = lessons[index], detail = $("#lessonDetail");
  if (!lesson || !detail) return;
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <p class="eyebrow">LEVEL ${lesson[0]}</p><h3>${lesson[1]}</h3>
    <p><b>Theory:</b> ${lesson[3]}</p><p><b>Practice:</b> ${lesson[4]}</p>
    <p><b>Invalidation / सावधानी:</b> ${lesson[5]}</p>
    <button class="primary full" id="completeLesson">इस लेसन को पूरा किया</button>`;
  $("#completeLesson").onclick = async () => {
    completed.add(index);
    await setState("completed", [...completed]);
    renderLessons(); updateStats(); toast("Lesson progress saved");
  };
  detail.scrollIntoView({behavior:"smooth", block:"start"});
}

function updateStats() {
  if ($("#lessonCount")) $("#lessonCount").textContent = `${completed.size} / 8`;
  if ($("#practiceCount")) $("#practiceCount").textContent = notes.length;
  if ($("#journalCount")) $("#journalCount").textContent = notes.length;
  if ($("#journalTotal")) $("#journalTotal").textContent = notes.length;
}

function toChartData(rows) {
  return rows.map(row => ({
    time: row.time ?? row[0],
    open: Number(row.open ?? row[1]),
    high: Number(row.high ?? row[2]),
    low: Number(row.low ?? row[3]),
    close: Number(row.close ?? row[4])
  }));
}

function initChart() {
  const host = $("#chartContainer");
  if (!host) return;
  if (!window.LightweightCharts) {
    host.innerHTML = "<p style='padding:15px'>Chart library load नहीं हुई। इंटरनेट कनेक्शन जाँचें।</p>";
    return;
  }
  if (!chart) {
    chart = LightweightCharts.createChart(host, {
      width: host.clientWidth, height: host.clientHeight || 320,
      layout: {background:{color:"#080f1a"}, textColor:"#a9b8ca"},
      grid: {vertLines:{color:"#1b2a3d"}, horzLines:{color:"#1b2a3d"}},
      rightPriceScale: {borderColor:"#34445b"},
      timeScale: {borderColor:"#34445b", timeVisible:true}
    });
    series = chart.addCandlestickSeries({
      upColor:"#22c55e", downColor:"#ef4444", borderVisible:false,
      wickUpColor:"#22c55e", wickDownColor:"#ef4444"
    });
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        if (chart && host.clientWidth) chart.applyOptions({width:host.clientWidth, height:host.clientHeight || 320});
      }).observe(host);
    }
  }
  addPhase31Tools();
  if (!allCandles.length) loadMarket();
  else renderReplay();
}

function loadMarket() {
  const market = $("#marketSelect")?.value || "XAUUSD";
  allCandles = toChartData(sample[market] || sample.XAUUSD);
  visibleCount = Math.min(8, allCandles.length);
  stopReplay(); clearPhase31Drawings(false); renderReplay();
  if ($("#chartLabel")) $("#chartLabel").textContent = "Illustrative sample · NOT real historical market data";
  if ($("#dataStatus")) $("#dataStatus").textContent = "SAMPLE DATA";
}

function renderReplay() {
  if (!series) return;
  series.setData(allCandles.slice(0, visibleCount));
  if ($("#candleCount")) $("#candleCount").textContent = `${visibleCount} / ${allCandles.length} candles`;
  chart?.timeScale().fitContent();
}

function stopReplay() {
  if (timer) { clearInterval(timer); timer = null; }
  if ($("#playBtn")) $("#playBtn").textContent = "Play ▶";
}

function advance() {
  if (!series || visibleCount >= allCandles.length) { stopReplay(); toast("Replay पूरा हुआ"); return; }
  visibleCount++;
  series.update(allCandles[visibleCount - 1]);
  if ($("#candleCount")) $("#candleCount").textContent = `${visibleCount} / ${allCandles.length} candles`;
}

$("#marketSelect")?.addEventListener("change", loadMarket);
$("#resetBtn")?.addEventListener("click", () => { stopReplay(); visibleCount = Math.min(8, allCandles.length); renderReplay(); });
$("#nextBtn")?.addEventListener("click", () => { stopReplay(); advance(); });
$("#prevBtn")?.addEventListener("click", () => { stopReplay(); visibleCount = Math.max(1, visibleCount - 1); renderReplay(); });
$("#playBtn")?.addEventListener("click", () => {
  if (timer) return stopReplay();
  if (!allCandles.length) return toast("पहले candles लोड करें");
  if (visibleCount >= allCandles.length) { visibleCount = 1; renderReplay(); }
  $("#playBtn").textContent = "Pause Ⅱ";
  timer = setInterval(advance, Number($("#speedSelect")?.value || 600));
});
$("#speedSelect")?.addEventListener("change", () => {
  if (timer) { stopReplay(); $("#playBtn")?.click(); }
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

function saveNote(type, content) {
  notes.unshift({
    type, content, market: $("#marketSelect")?.value || "XAUUSD",
    date: new Date().toLocaleString(), setup: $("#setupSelect")?.value || "Replay"
  });
  setState("notes", notes);
  updateStats(); renderJournal(); toast("आपकी entry सेव हो गई");
}

$("#saveObservation")?.addEventListener("click", () => {
  const value = $("#observation")?.value.trim();
  if (!value) return toast("पहले observation लिखें");
  saveNote("Replay", value); $("#observation").value = "";
});
$("#saveBacktest")?.addEventListener("click", () => {
  const value = $("#backtestNote")?.value.trim();
  if (!value) return toast("पहले note लिखें");
  saveNote("Backtest", `Setup: ${$("#setupSelect").value}; Simulation risk: ${$("#riskSelect").value}%; ${value}`);
  $("#backtestNote").value = "";
});

function renderJournal() {
  const host = $("#journalEntries");
  if (!host) return;
  host.innerHTML = notes.length ? notes.map(note => `
    <article class="journal-entry"><b>${escapeHTML(note.type)} · ${escapeHTML(note.market)}</b>
    <small>${escapeHTML(note.date)}</small><p>${escapeHTML(note.content)}</p></article>`).join("")
    : "<p class='muted'>अभी कोई Journal Entry नहीं है। Chart Replay या Backtest से शुरुआत करें।</p>";
}

$("#exportBtn")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({notes, completed:[...completed]}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = "apex-smc-journal.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("#clearBtn")?.addEventListener("click", async () => {
  if (!confirm("क्या आप सभी saved lessons और journal entries मिटाना चाहते हैं?")) return;
  notes = []; completed.clear();
  await setState("notes", []); await setState("completed", []);
  updateStats(); renderJournal(); renderLessons(); toast("Local data cleared");
});

/* Phase 2.1 script owns CSV file input via addEventListener.
   This prevents the previous legacy onchange handler from importing twice. */
if ($("#csvFile")) $("#csvFile").onchange = null;

/* Public bridge used by phase2.js after CSV validation and timeframe conversion. */
window.ApexSMCBridge = {
  setCandles(rows, meta = {}) {
    if (!Array.isArray(rows) || !rows.length) { toast("Dataset में candles नहीं मिलीं"); return; }
    const normalized = toChartData(rows);
    if (normalized.some(c => !Number.isFinite(c.open) || !Number.isFinite(c.high) ||
      !Number.isFinite(c.low) || !Number.isFinite(c.close) || c.high < Math.max(c.open,c.close,c.low) ||
      c.low > Math.min(c.open,c.close,c.high))) {
      toast("CSV में invalid OHLC values हैं"); return;
    }
    stopReplay(); clearPhase31Drawings(false);
    allCandles = normalized;
    visibleCount = Math.min(8, allCandles.length);
    const market = meta.market || $("#marketSelect")?.value || "XAUUSD";
    if ($("#marketSelect") && [...$("#marketSelect").options].some(option => option.value === market)) {
      $("#marketSelect").value = market;
    }
    if ($("#chartLabel")) $("#chartLabel").textContent = meta.label || "Imported historical dataset";
    if ($("#dataStatus")) $("#dataStatus").textContent = "HISTORICAL DATA";
    if (series) renderReplay();
  },
  resetToSample() { loadMarket(); }
};

/* ---------------- Phase 3.1: Structure and Drawing ---------------- */
function addPhase31Tools() {
  if ($("#phase31Tools") || !$(".chart-wrap")) return;
  const panel = document.createElement("section");
  panel.id = "phase31Tools"; panel.className = "panel";
  panel.innerHTML = `
    <h3>Phase 3.1 · Structure & Drawing Lab</h3>
    <p class="muted">Visible historical candles पर structure पहचानने और drawing का अभ्यास करें।</p>
    <div class="p31-grid">
      <button class="primary" id="p31Detect">Swing पहचानें</button>
      <button class="secondary" id="p31Level">Horizontal Level</button>
      <button class="secondary" id="p31Trend">Trendline</button>
      <button class="danger" id="p31Clear">Drawings हटाएँ</button>
    </div>
    <div id="p31Report" class="data-report">पहले Swing पहचानें दबाएँ।</div>
    <p class="muted" style="font-size:11px;line-height:1.5">Swing नियम: 2 पिछली और 2 अगली candles। अंतिम दो अधूरी candles confirm नहीं मानी जातीं। यह अभ्यास संकेत नहीं है।</p>`;
  $(".chart-wrap").insertAdjacentElement("afterend", panel);
  $("#p31Detect").onclick = detectSwings;
  $("#p31Level").onclick = drawHorizontalLevel;
  $("#p31Trend").onclick = drawPracticeTrendline;
  $("#p31Clear").onclick = () => clearPhase31Drawings(true);
}
function phase31Report(message) { if ($("#p31Report")) $("#p31Report").innerHTML = message; }
function getVisibleData() { return allCandles.slice(0, visibleCount); }

function findSwings(data) {
  const highs = [], lows = [];
  for (let i=2; i<data.length-2; i++) {
    const c=data[i], left=data.slice(i-2,i), right=data.slice(i+1,i+3);
    if (left.every(x=>c.high>x.high) && right.every(x=>c.high>x.high)) {
      const prev=highs[highs.length-1];
      highs.push({time:c.time,price:c.high,label:!prev?"SH":c.high>prev.price?"HH":"LH"});
    }
    if (left.every(x=>c.low<x.low) && right.every(x=>c.low<x.low)) {
      const prev=lows[lows.length-1];
      lows.push({time:c.time,price:c.low,label:!prev?"SL":c.low>prev.price?"HL":"LL"});
    }
  }
  return {highs,lows};
}
function detectSwings() {
  if (!series) return phase31Report("पहले Chart खोलें।");
  const data=getVisibleData();
  if (data.length<5) return phase31Report("कम-से-कम 5 visible candles चाहिए।");
  const result=findSwings(data);
  p31Markers=[
    ...result.highs.map(p=>({time:p.time,position:"aboveBar",color:"#f5b942",shape:"arrowDown",text:p.label})),
    ...result.lows.map(p=>({time:p.time,position:"belowBar",color:"#38bdf8",shape:"arrowUp",text:p.label}))
  ];
  p31Markers.sort((a,b)=>timeSort(a.time)-timeSort(b.time));
  series.setMarkers(p31Markers);
  phase31Report(`<b>Swing Analysis Complete</b><br>Swing High: <b>${result.highs.length}</b><br>Swing Low: <b>${result.lows.length}</b><br>High: ${result.highs.map(x=>x.label).join(" → ")||"नहीं मिला"}<br>Low: ${result.lows.map(x=>x.label).join(" → ")||"नहीं मिला"}`);
}
function timeSort(time) {
  if (typeof time==="number") return time;
  if (typeof time==="string") return Math.floor(Date.parse(time)/1000);
  return Date.UTC(time.year,time.month-1,time.day)/1000;
}
function drawHorizontalLevel() {
  if (!series || !getVisibleData().length) return phase31Report("पहले candles लोड करें।");
  const price=getVisibleData()[getVisibleData().length-1].close;
  p31Levels.push(series.createPriceLine({
    price,color:"#f5b942",lineWidth:2,lineStyle:LightweightCharts.LineStyle.Dashed,
    axisLabelVisible:true,title:"Practice Level"
  }));
  phase31Report(`Horizontal Practice Level बनाया गया: <b>${price}</b>`);
}
function drawPracticeTrendline() {
  if (!chart || !series) return phase31Report("पहले Chart खोलें।");
  const result=findSwings(getVisibleData());
  const points=result.lows.length>=2?result.lows.slice(-2):result.highs.slice(-2);
  if (points.length<2) return phase31Report("Trendline के लिए दो confirmed swing points चाहिए।");
  const line=chart.addLineSeries({color:"#38bdf8",lineWidth:2,priceLineVisible:false,lastValueVisible:false});
  line.setData(points.map(p=>({time:p.time,value:p.price})).sort((a,b)=>timeSort(a.time)-timeSort(b.time)));
  p31TrendSeries.push(line);
  phase31Report("दो confirmed swing points के बीच अभ्यास Trendline बनाई गई।");
}
function clearPhase31Drawings(showMessage=true) {
  if (series) {
    try { series.setMarkers([]); } catch (_) {}
    p31Levels.forEach(line=>{try{series.removePriceLine(line);}catch(_){}});
  }
  if (chart) p31TrendSeries.forEach(line=>{try{chart.removeSeries(line);}catch(_){}});
  p31Markers=[]; p31Levels=[]; p31TrendSeries=[];
  if (showMessage) phase31Report("Chart drawings साफ़ कर दिए गए।");
}

async function boot() {
  notes = await getState("notes", []);
  completed = new Set(await getState("completed", []));
  renderLessons(); updateStats(); renderJournal();
  const cards=$("#levelCards");
  if (cards) {
    cards.innerHTML=lessons.map((lesson,index)=>`<div class="level-card" 
