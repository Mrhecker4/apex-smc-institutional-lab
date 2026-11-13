/* =====================================================
   APEX SMC INSTITUTIONAL TRADING LAB
   APP.JS — RESTORED PHASE 1 + PHASE 2 + PHASE 3.1
   Educational / Historical Simulation Only
===================================================== */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const lessons = [
["1","Market Basics","Candlestick, OHLC, timeframe और market sessions","हर candle में Open, High, Low और Close होता है। Timeframe बताता है कि एक candle कितने समय का डेटा दिखाती है।","चार्ट पर 20 candles देखें और bullish/bearish candles को अलग पहचानें।","एक candle का रंग अकेले trend तय नहीं करता।"],
["2","Market Structure","Swing High/Low, HH, HL, LH, LL","Swing points वे turning points हैं जहाँ कीमत ने दिशा बदली। HH/HL सामान्यतः bullish structure और LH/LL bearish structure बताते हैं।","कम-से-कम 30 candles पर swing points manually mark करें।","हर छोटे pivot को महत्वपूर्ण swing न मानें; context जरूरी है।"],
["3","BOS, CHoCH & MSS","Break of Structure और बदलाव की पुष्टि","BOS आम तौर पर मौजूदा structure की दिशा में break है। CHoCH संभावित बदलाव का शुरुआती संकेत और MSS अधिक संदर्भ-आधारित structural shift है।","Break के पहले वाला relevant swing और candle close नोट करें।","Wick और candle close के नियम अपनी strategy में पहले तय करें।"],
["4","Liquidity","BSL, SSL, Equal Highs/Lows, Sweep","Liquidity concepts संभावित stop clusters और obvious highs/lows के आसपास price behaviour का अध्ययन करते हैं।","Equal highs/lows खोजें और देखें कि price उनके पार कैसे व्यवहार करती है।","हर breakout liquidity sweep नहीं होता।"],
["5","Order Blocks & FVG","Displacement, imbalance, OB","FVG तीन-candle price imbalance का एक model है। Order Block की परिभाषा अलग-अलग ICT/SMC शिक्षकों में बदल सकती है।","तीन-candle sequence में middle candle की displacement और gap देखें।","हर gap या आखिरी opposite candle valid setup नहीं होती।"],
["6","Premium & Discount","Dealing range, equilibrium, OTE","एक चुने हुए dealing range के 50% स्तर को equilibrium कहकर ऊपर/नीचे के क्षेत्रों का अध्ययन किया जाता है।","एक स्पष्ट swing range चुनें और midpoint mark करें।","Range चुनने का तरीका परिणाम बदल सकता है।"],
["7","Multi-Timeframe Strategy","HTF bias, LTF confirmation, invalidation","Higher timeframe context देता है; lower timeframe संभावित execution structure दिखाता है।","HTF bias लिखें, फिर LTF confirmation और invalidation condition दर्ज करें।","एक ही संकेत कई timeframes पर विरोधाभासी हो सकता है।"],
["8","Professional Testing","Backtesting, journal, expectancy, drawdown","एक strategy को स्पष्ट rules, पर्याप्त samples, costs और out-of-sample data के साथ जाँचना चाहिए।","कम-से-कम 30–50 historical examples का नियमबद्ध review करें।","Past performance भविष्य के परिणाम की गारंटी नहीं है।"]
];

let allCandles = [];
let visibleCount = 0;
let chart = null;
let series = null;
let timer = null;
let notes = [];
let completed = new Set();

let p31Markers = [];
let p31Levels = [];
let p31TrendLines = [];

const sample = {
XAUUSD: [
["2025-01-06",2640,2650,2634,2647],
["2025-01-07",2647,2656,2641,2652],
["2025-01-08",2652,2661,2648,2658],
["2025-01-09",2658,2664,2645,2650],
["2025-01-10",2650,2658,2644,2655],
["2025-01-13",2655,2668,2651,2663],
["2025-01-14",2663,2667,2652,2656],
["2025-01-15",2656,2664,2650,2660],
["2025-01-16",2660,2674,2658,2670],
["2025-01-17",2670,2678,2660,2665],
["2025-01-20",2665,2672,2657,2661],
["2025-01-21",2661,2670,2655,2668],
["2025-01-22",2668,2682,2665,2678],
["2025-01-23",2678,2685,2668,2671],
["2025-01-24",2671,2679,2662,2667],
["2025-01-27",2667,2688,2664,2682],
["2025-01-28",2682,2691,2672,2676],
["2025-01-29",2676,2681,2658,2661],
["2025-01-30",2661,2666,2648,2652],
["2025-01-31",2652,2658,2638,2642]
],
BTCUSD: [
["2025-01-06",99000,101000,98000,100200],
["2025-01-07",100200,102000,99500,101500],
["2025-01-08",101500,102300,99000,99500],
["2025-01-09",99500,100400,97000,98000],
["2025-01-10",98000,99000,95500,96500],
["2025-01-13",96500,98500,96000,98000],
["2025-01-14",98000,100000,97500,99500],
["2025-01-15",99500,101500,99000,101000],
["2025-01-16",101000,102000,99500,100000],
["2025-01-17",100000,101000,98500,99000],
["2025-01-20",99000,102000,98500,101500],
["2025-01-21",101500,103000,100500,102500],
["2025-01-22",102500,104000,101500,103500],
["2025-01-23",103500,104500,101000,101500],
["2025-01-24",101500,102000,99000,99500]
],
EURUSD: [
["2025-01-06",1.0300,1.0340,1.0280,1.0320],
["2025-01-07",1.0320,1.0350,1.0290,1.0300],
["2025-01-08",1.0300,1.0330,1.0260,1.0270],
["2025-01-09",1.0270,1.0310,1.0250,1.0300],
["2025-01-10",1.0300,1.0340,1.0290,1.0330],
["2025-01-13",1.0330,1.0360,1.0310,1.0350],
["2025-01-14",1.0350,1.0370,1.0300,1.0310],
["2025-01-15",1.0310,1.0340,1.0280,1.0330],
["2025-01-16",1.0330,1.0380,1.0320,1.0370],
["2025-01-17",1.0370,1.0390,1.0330,1.0340],
["2025-01-20",1.0340,1.0360,1.0300,1.0320],
["2025-01-21",1.0320,1.0350,1.0290,1.0340],
["2025-01-22",1.0340,1.0400,1.0330,1.0390],
["2025-01-23",1.0390,1.0410,1.0350,1.0360],
["2025-01-24",1.0360,1.0380,1.0320,1.0330]
]
};

/* BASIC HELPERS */
function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2100);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

/* LOCAL DATABASE */
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
  } catch {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  }
}

async function setState(key, value) {
  try {
    const database = await db();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("state", "readwrite");
      transaction.objectStore("state").put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
}

/* NAVIGATION */
function navigate(id) {
  $$(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === id);
  });
  $$(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.go === id);
  });

  if (id === "chart") setTimeout(initChart, 100);
  if (id === "journal") renderJournal();
  window.scrollTo(0, 0);
}

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

/* LESSONS */
function renderLessons() {
  const list = $("#lessonList");
  if (!list) return;

  list.innerHTML = lessons.map((lesson, index) => `
    <div class="lesson-item">
      <div>
        <b>LEVEL ${lesson[0]} · ${lesson[1]}</b>
        <small>${lesson[2]}</small>
      </div>
      <button class="secondary" data-lesson="${index}">
        ${completed.has(index) ? "Review" : "Open"}
      </button>
    </div>
  `).join("");

  $$("[data-lesson]").forEach(button => {
    button.onclick = () => openLesson(Number(button.dataset.lesson));
  });
}

function openLesson(index) {
  const lesson = lessons[index];
  const detail = $("#lessonDetail");
  if (!lesson || !detail) return;

  detail.classList.remove("hidden");
  detail.innerHTML = `
    <p class="eyebrow">LEVEL ${lesson[0]}</p>
    <h3>${lesson[1]}</h3>
    <p><b>Theory:</b> ${lesson[3]}</p>
    <p><b>Practice:</b> ${lesson[4]}</p>
    <p><b>Invalidation / सावधानी:</b> ${lesson[5]}</p>
    <button class="primary full" id="completeLesson">
      इस लेसन को पूरा किया
    </button>
  `;

  $("#completeLesson").onclick = async () => {
    completed.add(index);
    await setState("completed", [...completed]);
    renderLessons();
    updateStats();
    toast("Lesson progress saved");
  };

  detail.scrollIntoView({ behavior:"smooth", block:"start" });
}

function updateStats() {
  if ($("#lessonCount")) $("#lessonCount").textContent = `${completed.size} / 8`;
  if ($("#practiceCount")) $("#practiceCount").textContent = notes.length;
  if ($("#journalCount")) $("#journalCount").textContent = notes.length;
  if ($("#journalTotal")) $("#journalTotal").textContent = notes.length;
}

/* CHART DATA */
function toChartData(rows) {
  return rows.map(row => ({
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4])
  }));
}

function initChart() {
  const container = $("#chartContainer");
  if (!container) return;

  if (!window.LightweightCharts) {
    container.innerHTML =
      "<p style='padding:15px'>Chart library load नहीं हुई। इंटरनेट कनेक्शन जाँचें।</p>";
    return;
  }

  if (!chart) {
    chart = LightweightCharts.createChart(container, {
      width: container.clientWidth || 600,
      height: container.clientHeight || 360,
      layout: {
        background: { color:"#080f1a" },
        textColor:"#a9b8ca"
      },
      grid: {
        vertLines:{ color:"#1b2a3d" },
        horzLines:{ color:"#1b2a3d" }
      },
      rightPriceScale:{ borderColor:"#34445b" },
      timeScale:{
        borderColor:"#34445b",
        timeVisible:true
      }
    });

    series = chart.addCandlestickSeries({
      upColor:"#22c55e",
      downColor:"#ef4444",
      borderVisible:false,
      wickUpColor:"#22c55e",
      wickDownColor:"#ef4444"
    });

    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (!chart || !container) return;
        chart.applyOptions({
          width:container.clientWidth,
          height:container.clientHeight || 360
        });
      }).observe(container);
    }
  }

  if (!allCandles.length) loadMarket();
  else renderReplay();

  addPhase31Tools();
}

function loadMarket() {
  const marketSelect = $("#marketSelect");
  const market = marketSelect ? marketSelect.value : "XAUUSD";
  const rows = sample[market] || sample.XAUUSD;

  allCandles = toChartData(rows);
  visibleCount = Math.min(8, allCandles.length);

  stopReplay();
  clearPhase31Drawings();
  renderReplay();

  if ($("#chartLabel")) {
    $("#chartLabel").textContent =
      "Illustrative sample · NOT real historical market data";
  }
  if ($("#dataStatus")) $("#dataStatus").textContent = "SAMPLE DATA";
}

function renderReplay() {
  if (!series) return;

  series.setData(allCandles.slice(0, visibleCount));

  if ($("#candleCount")) {
    $("#candleCount").textContent =
      `${visibleCount} / ${allCandles.length} candles`;
  }

  if (chart) chart.timeScale().fitContent();

  if (p31Markers.length) {
    const visibleTimes = new Set(
      allCandles.slice(0, visibleCount).map(candle => timeValue(candle.time))
    );
    try {
      series.setMarkers(
        p31Markers.filter(marker => visibleTimes.has(timeValue(marker.time)))
      );
    } catch {}
  }
}

function stopReplay() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if ($("#playBtn")) $("#playBtn").textContent = "Play ▶";
}

function advance() {
  if (!series) return;

  if (visibleCount < allCandles.length) {
    visibleCount++;
    series.update(allCandles[visibleCount - 1]);

    if ($("#candleCount")) {
      $("#candleCount").textContent =
        `${visibleCount} / ${allCandles.length} candles`;
    }
  } else {
    stopReplay();
    toast("Replay पूरा हुआ");
  }
}

/* REPLAY CONTROLS */
if ($("#marketSelect")) $("#marketSelect").onchange = loadMarket;

if ($("#resetBtn")) {
  $("#resetBtn").onclick = () => {
    stopReplay();
    visibleCount = Math.min(8, allCandles.length);
    renderReplay();
  };
}

if ($("#nextBtn")) {
  $("#nextBtn").onclick = () => {
    stopReplay();
    advance();
  };
}

if ($("#prevBtn")) {
  $("#prevBtn").onclick = () => {
    stopReplay();
    visibleCount = Math.max(1, visibleCount - 1);
    renderReplay();
  };
}

if ($("#playBtn")) {
  $("#playBtn").onclick = () => {
    if (timer) {
      stopReplay();
      return;
    }
    if (visibleCount >= allCandles.length) {
      visibleCount = 1;
      renderReplay();
    }
    $("#playBtn").textContent = "Pause Ⅱ";
    timer = setInterval(advance, Number($("#speedSelect")?.value || 800));
  };
}

if ($("#speedSelect")) {
  $("#speedSelect").onchange = () => {
    if (timer) {
      stopReplay();
      $("#playBtn")?.click();
    }
  };
}

/* JOURNAL */
function saveNote(type, content) {
  notes.unshift({
    type,
    content,
    market: $("#marketSelect")?.value || "Unknown",
    date: new Date().toLocaleString(),
    setup: $("#setupSelect")?.value || "Replay"
  });

  setState("notes", notes);
  updateStats();
  renderJournal();
  toast("आपकी entry सेव हो गई");
}

if ($("#saveObservation")) {
  $("#saveObservation").onclick = () => {
    const value = $("#observation").value.trim();
    if (!value) return toast("पहले observation लिखें");
    saveNote("Replay", value);
    $("#observation").value = "";
  };
}

if ($("#saveBacktest")) {
  $("#saveBacktest").onclick = () => {
    const value = $("#backtestNote").value.trim();
    if (!value) return toast("पहले note लिखें");

    saveNote(
      "Backtest",
      `Setup: ${$("#setupSelect")?.value || "Practice"}; Risk simulation: ${$("#riskSelect")?.value || "—"}%; ${value}`
    );
    $("#backtestNote").value = "";
  };
}

function renderJournal() {
  const entries = $("#journalEntries");
  if (!entries) return;

  entries.innerHTML = notes.length
    ? notes.map(note => `
      <article class="journal-entry">
        <b>${escapeHTML(note.type)} · ${escapeHTML(note.market)}</b>
        <small>${escapeHTML(note.date)}</small>
        <p>${escapeHTML(note.content)}</p>
      </article>
    `).join("")
    : "<p class='muted'>अभी कोई Journal Entry नहीं है। Chart Replay या Backtest से शुरुआत करें।</p>";

  if ($("#journalTotal")) $("#journalTotal").textContent = notes.length;
}

if ($("#exportBtn")) {
  $("#exportBtn").onclick = () => {
    const blob = new Blob(
      [JSON.stringify({ notes, completed:[...completed] }, null, 2)],
      { type:"application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "apex-smc-journal.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}

if ($("#clearBtn")) {
  $("#clearBtn").onclick = async () => {
    if (!confirm("क्या आप सभी saved lessons और journal entries मिटाना चाहते हैं?")) return;

    notes = [];
    completed.clear();

    await setState("notes", []);
    await setState("completed", []);

    updateStats();
    renderJournal();
    renderLessons();
    toast("Local data cleared");
  };
}

/* CSV IMPORT */
if ($("#csvFile")) {
  $("#csvFile").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const lines = (await file.text()).trim().split(/\r?\n/);
      if (lines.length < 2) throw Error("CSV में data rows नहीं हैं।");

      const header = lines.shift().toLowerCase().split(",").map(x => x.trim());
      const indexes = ["time","open","high","low","close"].map(key => header.indexOf(key));

      if (indexes.some(index => index < 0)) {
        throw Error("Required headers: time,open,high,low,close");
      }

      const rows = lines.filter(line => line.trim()).map(line => {
        const cells = line.split(",");
        return [
          cells[indexes[0]]?.trim(),
          Number(cells[indexes[1]]),
          Number(cells[indexes[2]]),
          Number(cells[indexes[3]]),
          Number(cells[indexes[4]])
        ];
      });

      if (!rows.length) throw Error("CSV में कोई candle नहीं मिली।");

      if (rows.some(row =>
        !row[0] ||
        row.slice(1).some(number => !Number.isFinite(number)) ||
        row[2] < row[3] ||
        row[2] < Math.max(row[1], row[4]) ||
        row[3] > Math.min(row[1], row[4])
      )) {
        throw Error("CSV में invalid OHLC values हैं।");
      }

      allCandles = toChartData(rows);
      visibleCount = Math.min(8, allCandles.length);

      stopReplay();
      clearPhase31Drawings();
      renderReplay();

      if ($("#chartLabel")) {
        $("#chartLabel").textContent = `Imported: ${file.name} · source not verified`;
      }
      if ($("#dataStatus")) $("#dataStatus").textContent = "CSV IMPORT";

      toast(`${rows.length} candles loaded`);
    } catch (error) {
      alert("CSV Error: " + error.message);
    }
  };
}

/* PHASE 2 BRIDGE */
window.ApexSMCBridge = {
  setCandles(rows, meta = {}) {
    if (!Array.isArray(rows) || !rows.length) {
      toast("Dataset में candles नहीं मिलीं");
      return;
    }

    stopReplay();
    clearPhase31Drawings();

    allCandles = rows.map(row => ({
      time:row.time,
      open:Number(row.open),
      high:Number(row.high),
      low:Number(row.low),
      close:Number(row.close)
    }));

    visibleCount = Math.min(8, allCandles.length);

    const market = meta.market || $("#marketSelect")?.value || "XAUUSD";
    if ($("#marketSelect") &&
        [...$("#marketSelect").options].some(option => option.value === market)) {
      $("#marketSelect").value = market;
    }

    if ($("#chartLabel")) {
      $("#chartLabel").textContent = meta.label || "Imported historical dataset";
    }
    if ($("#dataStatus")) $("#dataStatus").textContent = "HISTORICAL DATA";

    if (series) renderReplay();
  },

  resetToSample() {
    loadMarket();
  }
};

/* =====================================================
   PHASE 3.1 — SWING STRUCTURE & DRAWING TOOLS
===================================================== */

function addPhase31Tools() {
  if ($("#phase31Tools")) return;

  const chartWrap = $(".chart-wrap");
  if (!chartWrap) return;

  const panel = document.createElement("section");
  panel.id = "phase31Tools";
  panel.className = "panel";

  panel.innerHTML = `
    <h3>Phase 3.1 · Structure & Drawing Lab</h3>
    <p class="muted">
      Visible historical candles पर structure पहचानने और drawing का अभ्यास करें।
    </p>
    <div class="p31-grid">
      <button class="primary" id="p31Detect">Swing पहचानें</button>
      <button class="secondary" id="p31Level">Horizontal Level</button>
      <button class="secondary" id="p31Trend">Trendline</button>
      <button class="danger" id="p31Clear">Drawings हटाएँ</button>
    </div>
    <div id="p31Report" class="data-report">
      पहले Swing पहचानें दबाएँ।
    </div>
    <p class="muted" style="font-size:11px;line-height:1.5">
      Swing नियम: 2 पिछली और 2 अगली candles से तुलना।
      अंतिम दो अधूरी candles को swing confirmation में शामिल नहीं किया जाता।
      यह अभ्यास संकेत है, अपने-आप trading signal नहीं।
    </p>
  `;

  chartWrap.insertAdjacentElement("afterend", panel);

  $("#p31Detect").onclick = detectSwings;
  $("#p31Level").onclick = drawHorizontalLevel;
  $("#p31Trend").onclick = drawPracticeTrendline;
  $("#p31Clear").onclick = clearPhase31Drawings;
}

function phase31Report(message) {
  const element = $("#p31Report");
  if (element) element.innerHTML = message;
}

function getVisibleData() {
  return allCandles.slice(0, visibleCount);
}

/* Convert chart time values into sortable numbers */
function timeValue(time) {
  if (typeof time === "number") return time;

  if (typeof time === "string") {
    const parsed = Date.parse(time);
    return Number.isFinite(parsed) ? parsed : 0;
  }

   
