
/* APEX SMC Phase 2.1 — India Timezone */
(() => {
"use strict";

const $ = s => document.querySelector(s);
const TF = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400
};

const TZ_KEY = "phase2.marketTimezoneOffset";
let activeDataset = null;

function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("ApexSMC", 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("state")) {
        r.result.createObjectStore("state");
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function readState(k, d) {
  try {
    const x = await db();
    return await new Promise(res => {
      const r = x.transaction("state").objectStore("state").get(k);
      r.onsuccess = () => res(r.result ?? d);
      r.onerror = () => res(d);
    });
  } catch {
    return d;
  }
}

async function writeState(k, v) {
  const x = await db();
  return new Promise((res, rej) => {
    const tx = x.transaction("state", "readwrite");
    tx.objectStore("state").put(v, k);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function report(s) {
  $("#dataReport").innerHTML = s;
}

function ensureTimezoneControl() {
  if ($("#marketTimezone")) return;

  const source = $("#csvSourceTf");
  if (!source) return;

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "margin:10px 0;padding:10px;border:1px solid #ccc;border-radius:10px";

  wrap.innerHTML = `
    <label for="marketTimezone"
      style="display:block;font-weight:600;margin-bottom:6px">
      Market Timezone
    </label>
    <select id="marketTimezone"
      style="width:100%;padding:10px;border-radius:8px">
      <option value="330">
        India · Asia/Kolkata (UTC+5:30) — Default
      </option>
      <option value="0">UTC (00:00)</option>
    </select>
    <small style="display:block;margin-top:5px">
      Timezone-free CSV timestamps चुने गए market timezone में पढ़े जाएँगे।
    </small>
  `;

  source.parentElement.parentElement.insertBefore(
    wrap,
    source.parentElement
  );
}

function offsetMinutes() {
  const el = $("#marketTimezone");
  return el ? Number(el.value) : 330;
}

function parseTime(raw, offset) {
  const s = String(raw).trim();

  // Unix seconds or milliseconds
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return Math.floor(
      n > 9999999999 ? n / 1000 : n
    );
  }

  // Explicit timezone: Z or +05:30 / -0400
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const ms = Date.parse(s);
    if (Number.isFinite(ms)) {
      return Math.floor(ms / 1000);
    }
  }

  // Timezone-free date/time is interpreted in selected market timezone
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/
  );

  if (m) {
    const [
      ,
      Y,
      M,
      D,
      h = "0",
      mi = "0",
      sec = "0",
      frac = "0"
    ] = m;

    const ms = Date.UTC(
      Number(Y),
      Number(M) - 1,
      Number(D),
      Number(h),
      Number(mi),
      Number(sec),
      Number(("0." + frac)) * 1000
    );

    return Math.floor(
      (ms - offset * 60000) / 1000
    );
  }

  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) {
    throw Error("Time column में date/time पढ़ा नहीं गया: " + s);
  }

  return Math.floor(ms / 1000);
}

function parseCSV(text, offset) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(x => x.trim());

  if (lines.length < 3) {
    throw Error("कम-से-कम header और 2 candle rows चाहिए।");
  }

  const h = lines.shift()
    .split(",")
    .map(x => x.trim().toLowerCase());

  const ix = ["time", "open", "high", "low", "close"]
    .map(k => h.indexOf(k));

  if (ix.some(i => i < 0)) {
    throw Error(
      "CSV header ऐसा होना चाहिए: time,open,high,low,close"
    );
  }

  const rows = lines.map((line, n) => {
    const c = line.split(",");
    const t = parseTime(c[ix[0]], offset);
    const o = Number(c[ix[1]]);
    const hi = Number(c[ix[2]]);
    const lo = Number(c[ix[3]]);
    const cl = Number(c[ix[4]]);

    if (![o, hi, lo, cl].every(Number.isFinite)) {
      throw Error("Row " + (n + 2) + " में OHLC number गलत है।");
    }

    if ([o, hi, lo, cl].some(v => v <= 0)) {
      throw Error("Row " + (n + 2) + " में price शून्य या negative है।");
    }

    if (hi < Math.max(o, cl, lo) ||
        lo > Math.min(o, cl, hi)) {
      throw Error("Row " + (n + 2) + " में High/Low OHLC नियम टूट रहा है।");
    }

    return {
      time: t,
      open: o,
      high: hi,
      low: lo,
      close: cl
    };
  });

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].time === rows[i - 1].time) {
      throw Error("Duplicate timestamp मिला।");
    }
    if (rows[i].time < rows[i - 1].time) {
      throw Error(
        "CSV chronological order में नहीं है। पुरानी candle पहले रखें।"
      );
    }
  }

  return rows;
}

function aggregate(rows, source, target, offset) {
  const a = TF[source];
  const b = TF[target];

  if (!a || !b) {
    throw Error("Timeframe पहचाना नहीं गया।");
  }

  if (b < a) {
    throw Error(
      "Source timeframe " + source +
      " है। इससे छोटा " + target +
      " timeframe बनाना संभव नहीं।"
    );
  }

  if (a === b) return rows;

  const map = new Map();

  rows.forEach(r => {
    const t =
      Math.floor((r.time + offset * 60) / b) * b
      - offset * 60;

    const old = map.get(t);

    if (!old) {
      map.set(t, {
        time: t,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close
      });
    } else {
      old.high = Math.max(old.high, r.high);
      old.low = Math.min(old.low, r.low);
      old.close = r.close;
    }
  });

  return [...map.values()]
    .sort((x, y) => x.time - y.time);
}

function gapCount(rows, tf) {
  const step = TF[tf];
  let n = 0;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].time - rows[i - 1].time > step * 1.5) {
      n++;
    }
  }

  return n;
}

async function refresh(selected) {
  const all = await readState("phase2.datasets", {});
  const list = Object.values(all)
    .sort((a, b) => b.savedAt - a.savedAt);

  $("#datasetSelect").innerHTML = list.length
    ? list.map(d =>
        '<option value="' + esc(d.id) + '">' +
        esc(d.name) + " · " + d.rows.length +
        " candles</option>"
      ).join("")
    : '<option value="">कोई saved dataset नहीं</option>';

  if (
    selected &&
    [...$("#datasetSelect").options].some(o => o.value === selected)
  ) {
    $("#datasetSelect").value = selected;
  }
}

async function importFile(file) {
  const source = $("#csvSourceTf").value;
  const target = $("#tfSelect").value;
  const symbol = $("#marketSelect").value;
  const offset = offsetMinutes();

  try {
    const raw = parseCSV(await file.text(), offset);
    const gaps = gapCount(raw, source);
    const output = aggregate(raw, source, target, offset);
    const id = "ds_" + Date.now();

    const d = {
      id,
      name: file.name.replace(/\.csv$/i, ""),
      symbol,
      sourceTf: source,
      timezoneOffset: offset,
      rows: raw,
      savedAt: Date.now(),
      fileName: file.name
    };

    const all = await readState("phase2.datasets", {});
    all[id] = d;

    await writeState("phase2.datasets", all);
    await writeState(TZ_KEY, offset);

    activeDataset = id;

    window.ApexSMCBridge.setCandles(output, {
      market: symbol,
      label: file.name + " · " + source +
        " → " + target + " · imported CSV"
    });

    await refresh(id);

    report(
      "<b>Import सफल</b> · " + esc(file.name) +
      "<br>Symbol: " + symbol +
      " · Source: " + source +
      " · Chart: " + target +
      "<br>Timezone: " +
      (offset === 330
        ? "India · Asia/Kolkata (UTC+5:30)"
        : "UTC") +
      "<br>Rows: " + raw.length +
      " → Chart candles: " + output.length +
      "<br>Timestamp gap warnings: " + gaps +
      "<br><small>Gap weekend/session closure भी हो सकता है। " +
      "Data source की स्वतंत्र जाँच करें; import source को प्रमाणित नहीं करता।</small>"
    );

  } catch (e) {
    report(
      '<b class="error">Import नहीं हुआ:</b> ' +
      esc(e.message)
    );
  } finally {
    $("#csvFile").value = "";
  }
}

async function loadSaved() {
  const id = $("#datasetSelect").value;

  if (!id) {
    return report("पहले saved dataset चुनें।");
  }

  const all = await readState("phase2.datasets", {});
  const d = all[id];

  if (!d) {
    return report("Dataset नहीं मिला।");
  }

  try {
    const offset = offsetMinutes();
    const rows = aggregate(
      d.rows,
      d.sourceTf,
      $("#tfSelect").value,
      offset
    );

    activeDataset = id;
    $("#marketSelect").value = d.symbol;

    window.ApexSMCBridge.setCandles(rows, {
      market: d.symbol,
      label: d.name + " · " + d.sourceTf +
        " → " + $("#tfSelect").value + " · saved CSV"
    });

    report(
      "<b>Saved dataset loaded</b><br>" +
      esc(d.name) + " · " + d.symbol +
      "<br>Source: " + d.sourceTf +
      " · Chart: " + $("#tfSelect").value +
      "<br>Timezone: " +
      (offset === 330
        ? "India · Asia/Kolkata (UTC+5:30)"
        : "UTC") +
      "<br>Raw rows: " + d.rows.length +
      " · Display candles: " + rows.length +
      " · Gap warnings: " + gapCount(d.rows, d.sourceTf)
    );

  } catch (e) {
    report('<b class="error">' + esc(e.message) + '</b>');
  }
}

async function deleteSaved() {
  const id = $("#datasetSelect").value;

  if (!id) {
    return report("Delete करने के लिए dataset चुनें।");
  }

  if (!confirm("क्या चुना हुआ saved dataset इस फोन से हटाना है?")) {
    return;
  }

  const all = await readState("phase2.datasets", {});
  delete all[id];

  await writeState("phase2.datasets", all);

  if (activeDataset === id) {
    activeDataset = null;
    window.ApexSMCBridge.resetToSample();
  }

  await refresh();
  report("चुना हुआ dataset इस device से हटा दिया गया।");
}

async function init() {
  ensureTimezoneControl();

  const savedOffset = await readState(TZ_KEY, 330);

  if ($("#marketTimezone")) {
    $("#marketTimezone").value =
      String(savedOffset === 0 ? 0 : 330);
  }

  $("#csvFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (f) importFile(f);
  });

  $("#loadDatasetBtn").addEventListener("click", loadSaved);
  $("#deleteDatasetBtn").addEventListener("click", deleteSaved);

  $("#tfSelect").addEventListener("change", () => {
    if (activeDataset) loadSaved();
  });

  $("#marketSelect").addEventListener("change", () => {
    activeDataset = null;
  });

  $("#marketTimezone").addEventListener("change", async () => {
    const v = offsetMinutes();
    await writeState(TZ_KEY, v);

    if (activeDataset) {
      loadSaved();
    } else {
      report(
        "Timezone बदल गया: " +
        (v === 330
          ? "India · Asia/Kolkata (UTC+5:30)"
          : "UTC") +
        ". अगली CSV import इसी timezone में पढ़ी जाएगी।"
      );
    }
  });

  await refresh();

  report(
    "Phase 2.1 तैयार है। Default Market Timezone: " +
    "India · Asia/Kolkata (UTC+5:30)।"
  );
}

init();

})();
     
