/* APEX SMC Phase 2 — Historical Data Engine */
(() => {
"use strict";
const $=s=>document.querySelector(s);
const TF={"1m":60,"5m":300,"15m":900,"1h":3600,"4h":14400,"1d":86400};
let activeDataset=null;
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open("ApexSMC",1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("state"))r.result.createObjectStore("state")};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function readState(k,d){try{const x=await db();return await new Promise(res=>{const r=x.transaction("state").objectStore("state").get(k);r.onsuccess=()=>res(r.result??d);r.onerror=()=>res(d)})}catch{return d}}
async function writeState(k,v){const x=await db();return new Promise((res,rej)=>{const tx=x.transaction("state","readwrite");tx.objectStore("state").put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function report(s){$("#dataReport").innerHTML=s}
function parseTime(raw){const s=String(raw).trim();if(/^\d{10,13}$/.test(s)){const n=Number(s);return Math.floor(n>9999999999?n/1000:n)}const ms=Date.parse(s);if(!Number.isFinite(ms))throw Error("Time column में date/time पढ़ा नहीं गया: "+s);return Math.floor(ms/1000)}
function parseCSV(text){
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<3)throw Error("कम-से-कम header और 2 candle rows चाहिए।");
 const h=lines.shift().split(",").map(x=>x.trim().toLowerCase());
 const ix=["time","open","high","low","close"].map(k=>h.indexOf(k));
 if(ix.some(i=>i<0))throw Error("CSV header ऐसा होना चाहिए: time,open,high,low,close");
 const rows=lines.map((line,n)=>{const c=line.split(",");const t=parseTime(c[ix[0]]);const o=Number(c[ix[1]]),hi=Number(c[ix[2]]),lo=Number(c[ix[3]]),cl=Number(c[ix[4]]);
 if(![o,hi,lo,cl].every(Number.isFinite))throw Error("Row "+(n+2)+" में OHLC number गलत है।");
 if([o,hi,lo,cl].some(v=>v<=0))throw Error("Row "+(n+2)+" में price शून्य या negative है।");
 if(hi<Math.max(o,cl,lo)||lo>Math.min(o,cl,hi))throw Error("Row "+(n+2)+" में High/Low OHLC नियम टूट रहा है।");
 return {time:t,open:o,high:hi,low:lo,close:cl}});
 for(let i=1;i<rows.length;i++){if(rows[i].time===rows[i-1].time)throw Error("Duplicate timestamp मिला।");if(rows[i].time<rows[i-1].time)throw Error("CSV chronological order में नहीं है। पुरानी candle पहले रखें।")}
 return rows;
}
function aggregate(rows,source,target){
 const a=TF[source],b=TF[target];if(!a||!b)throw Error("Timeframe पहचाना नहीं गया।");
 if(b<a)throw Error("Source timeframe "+source+" है। इससे छोटा "+target+" timeframe बनाना संभव नहीं।");
 if(a===b)return rows;
 const map=new Map();
 rows.forEach(r=>{const t=Math.floor(r.time/b)*b;const old=map.get(t);if(!old)map.set(t,{time:t,open:r.open,high:r.high,low:r.low,close:r.close});else{old.high=Math.max(old.high,r.high);old.low=Math.min(old.low,r.low);old.close=r.close}});
 return [...map.values()].sort((x,y)=>x.time-y.time);
}
function gapCount(rows,tf){const step=TF[tf];let n=0;for(let i=1;i<rows.length;i++)if(rows[i].time-rows[i-1].time>step*1.5)n++;return n}
async function refresh(selected){const all=await readState("phase2.datasets",{});const list=Object.values(all).sort((a,b)=>b.savedAt-a.savedAt);$("#datasetSelect").innerHTML=list.length?list.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.name)+' · '+d.rows.length+' candles</option>').join(""):'<option value="">कोई saved dataset नहीं</option>';if(selected&&[...$("#datasetSelect").options].some(o=>o.value===selected))$("#datasetSelect").value=selected}
async function importFile(file){
 const source=$("#csvSourceTf").value,target=$("#tfSelect").value,symbol=$("#marketSelect").value;
 try{
 const raw=parseCSV(await file.text());const gaps=gapCount(raw,source);const output=aggregate(raw,source,target);const id="ds_"+Date.now();
 const d={id,name:file.name.replace(/\.csv$/i,""),symbol,sourceTf:source,rows:raw,savedAt:Date.now(),fileName:file.name};
 const all=await readState("phase2.datasets",{});all[id]=d;await writeState("phase2.datasets",all);activeDataset=id;
 window.ApexSMCBridge.setCandles(output,{market:symbol,label:file.name+" · "+source+" → "+target+" · imported CSV"});await refresh(id);
 report("<b>Import सफल</b> · "+esc(file.name)+"<br>Symbol: "+symbol+" · Source: "+source+" · Chart: "+target+"<br>Rows: "+raw.length+" → Chart candles: "+output.length+"<br>Timestamp gap warnings: "+gaps+"<br><small>Gap weekend/session closure भी हो सकता है। Data source की स्वतंत्र जाँच करें; import source को प्रमाणित नहीं करता।</small>");
 }catch(e){report('<b class="error">Import नहीं हुआ:</b> '+esc(e.message))}
 finally{$("#csvFile").value=""}
}
async function loadSaved(){const id=$("#datasetSelect").value;if(!id)return report("पहले saved dataset चुनें।");const all=await readState("phase2.datasets",{});const d=all[id];if(!d)return report("Dataset नहीं मिला।");try{const rows=aggregate(d.rows,d.sourceTf,$("#tfSelect").value);activeDataset=id;$("#marketSelect").value=d.symbol;window.ApexSMCBridge.setCandles(rows,{market:d.symbol,label:d.name+" · "+d.sourceTf+" → "+$("#tfSelect").value+" · saved CSV"});report("<b>Saved dataset loaded</b><br>"+esc(d.name)+" · "+d.symbol+"<br>Source: "+d.sourceTf+" · Chart: "+$("#tfSelect").value+"<br>Raw rows: "+d.rows.length+" · Display candles: "+rows.length+" · Gap warnings: "+gapCount(d.rows,d.sourceTf))}catch(e){report('<b class="error">'+esc(e.message)+'</b>')}}
async function deleteSaved(){const id=$("#datasetSelect").value;if(!id)return report("Delete करने के लिए dataset चुनें।");if(!confirm("क्या चुना हुआ saved dataset इस फोन से हटाना है?"))return;const all=await readState("phase2.datasets",{});delete all[id];await writeState("phase2.datasets",all);if(activeDataset===id){activeDataset=null;window.ApexSMCBridge.resetToSample()}await refresh();report("चुना हुआ dataset इस device से हटा दिया गया।")}
$("#csvFile").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(f)importFile(f)});
$("#loadDatasetBtn").addEventListener("click",loadSaved);
$("#deleteDatasetBtn").addEventListener("click",deleteSaved);
$("#tfSelect").addEventListener("change",()=>{if(activeDataset)loadSaved()});
$("#marketSelect").addEventListener("change",()=>{activeDataset=null});
(async()=>{await refresh();report("Phase 2 Data Engine तैयार है। CSV import करने से पहले source timeframe चुनें।")})();
})();