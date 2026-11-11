# APEX SMC Institutional Trading Lab — v1.0

## यह क्या है?
Android-first Hindi learning और historical candle replay का शुरुआती static web app.

## अभी शामिल
- Home dashboard और 8-level learning roadmap
- Hindi lessons: basics से professional testing तक
- Chart replay: Play, Pause, Step Forward/Back, Reset, speed
- Gold, Bitcoin और EURUSD के illustrative sample candles
- CSV OHLC import (`time,open,high,low,close`)
- Replay observations और manual backtest notes
- IndexedDB local persistence; JSON journal export
- Basic PWA manifest/service worker

## महत्वपूर्ण डेटा चेतावनी
Bundled candles **synthetic/illustrative sample data** हैं, वास्तविक historical market prices नहीं। UI में इन्हें SAMPLE DATA दिखाया गया है। CSV import के लिए अपने वैध स्रोत से प्राप्त historical OHLC data इस्तेमाल करें और timezone, symbol, timeframe, missing candles तथा broker differences जाँचें। अभी live prices, automatic ICT detection या automated profitability backtest नहीं है।

## Android पर चलाना
1. ZIP extract करें।
2. `index.html` खोलें। कुछ Android file managers में local file से JavaScript/library restrictions हो सकती हैं।
3. भरोसेमंद तरीका: GitHub पर नया public repository बनाएँ, ये files upload करें, Settings → Pages → Deploy from branch → main / root चुनें।
4. मिले हुए HTTPS GitHub Pages URL को Chrome में खोलें और Add to Home screen करें।
5. Chart library CDN से आती है, इसलिए पहली बार chart के लिए इंटरनेट चाहिए। बाकी app shell cache हो सकती है।

## CSV format
Header बिल्कुल यह रखें:
`time,open,high,low,close`

उदाहरण (सिर्फ format example, market data नहीं):
`2025-01-06,2640,2650,2634,2647`

Date-only values को daily candles की तरह समझें। Intraday data के लिए Unix timestamp seconds इस्तेमाल करना बेहतर है। सभी rows chronological order में हों।

## v1.0 सीमाएँ / अगले चरण
- CSV validation और timezone handling को और मजबूत करना
- Intraday timeframe aggregation
- Historical data source adapters
- Chart annotations: swing highs/lows, BOS, MSS, FVG, OB
- Rule-based backtest engine with fees/spread/slippage
- Walk-forward / out-of-sample evaluation
- Python FastAPI backend केवल जरूरत पड़ने पर

## Risk note
यह शिक्षा और simulation के लिए है, निवेश सलाह नहीं। कोई setup, win rate या backtest भविष्य के profit की गारंटी नहीं देता।


## Phase 2 — Historical Data Engine
- User-supplied CSV import for Gold, Crypto and Forex symbols.
- OHLC validation: positive numeric prices, high/low consistency, duplicate timestamps and chronological ordering.
- Source timeframe selector (1m, 5m, 15m, 1h, 4h, 1d).
- Aggregation from smaller source timeframe to selected 15m/1h/4h/1d chart timeframe. The app refuses to invent lower-timeframe candles from higher-timeframe data.
- On-device saved dataset library using IndexedDB; load/delete saved datasets.
- Timestamp gap warnings. Session closures/weekends may also cause gaps and must be checked against the data source.
- User-supplied data only; the app does not verify the vendor/source or fetch live market prices.
