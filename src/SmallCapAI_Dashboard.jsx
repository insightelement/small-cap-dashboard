import { useState, useEffect } from "react";

const API_BASE = "https://YOUR-RAILWAY-APP.railway.app"; // Replace with your Railway URL

const MOCK_DATA = [
  { ticker: "UPST", name: "Upstart Holdings", sector: "Financial Services", current_price: 28.42, prediction: { direction: "STRONG BUY", score: 78.4, confidence: 82, signals: ["Oversold (RSI < 30)", "Near lower Bollinger Band", "Deeply underperforming — mean reversion candidate", "Trading below book value (P/B: 0.87)"], price_target: 34.20, time_horizon_days: 60 }, technical: { rsi: 27.3, momentum_1m: -18.4, momentum_3m: -31.2, volume_ratio: 2.4 } },
  { ticker: "IONQ", name: "IonQ Inc", sector: "Technology", current_price: 14.87, prediction: { direction: "BUY", score: 65.2, confidence: 65, signals: ["Bullish MACD crossover", "High volume spike (2.1x average)", "Strong revenue growth (34.2%)"], price_target: 17.80, time_horizon_days: 60 }, technical: { rsi: 43.1, momentum_1m: -8.2, momentum_3m: -12.4, volume_ratio: 2.1 } },
  { ticker: "SOFI", name: "SoFi Technologies", sector: "Financial Services", current_price: 7.23, prediction: { direction: "BUY", score: 61.8, confidence: 61, signals: ["Near oversold (RSI < 40)", "Favorable macro environment", "Strong revenue growth (26.1%)"], price_target: 8.65, time_horizon_days: 60 }, technical: { rsi: 38.4, momentum_1m: -5.1, momentum_3m: -9.8, volume_ratio: 1.3 } },
  { ticker: "ENVX", name: "Enovix Corporation", sector: "Technology", current_price: 9.14, prediction: { direction: "NEUTRAL", score: 51.2, confidence: 50, signals: ["Mixed signals", "Macro environment neutral"], price_target: 9.40, time_horizon_days: 60 }, technical: { rsi: 51.2, momentum_1m: 2.3, momentum_3m: -4.1, volume_ratio: 0.9 } },
  { ticker: "NKLA", name: "Nikola Corporation", sector: "Industrials", current_price: 1.02, prediction: { direction: "SELL", score: 32.1, confidence: 36, signals: ["Declining revenue", "High price-to-book ratio", "Bearish MACD momentum"], price_target: 0.82, time_horizon_days: 60 }, technical: { rsi: 62.3, momentum_1m: 14.2, momentum_3m: -28.4, volume_ratio: 0.7 } },
];

const MOCK_PERFORMANCE = {
  total_predictions: 147,
  correct: 96,
  accuracy_pct: 65.3,
  by_direction: {
    "STRONG BUY": { total: 38, correct: 27, accuracy: 71.1 },
    "BUY": { total: 52, correct: 34, accuracy: 65.4 },
    "NEUTRAL": { total: 21, correct: 11, accuracy: 52.4 },
    "SELL": { total: 24, correct: 16, accuracy: 66.7 },
    "STRONG SELL": { total: 12, correct: 8, accuracy: 66.7 },
  },
  retraining_history: [
    { trained_at: "2026-04-18", accuracy: 0.653, sample_count: 147 },
    { trained_at: "2026-04-11", accuracy: 0.641, sample_count: 128 },
    { trained_at: "2026-04-04", accuracy: 0.619, sample_count: 109 },
    { trained_at: "2026-03-28", accuracy: 0.584, sample_count: 91 },
    { trained_at: "2026-03-21", accuracy: 0.561, sample_count: 74 },
  ],
};

const directionColors = {
  "STRONG BUY": { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "#10b981" },
  "BUY": { bg: "rgba(52,211,153,0.1)", text: "#34d399", border: "#34d399" },
  "NEUTRAL": { bg: "rgba(156,163,175,0.1)", text: "#9ca3af", border: "#6b7280" },
  "SELL": { bg: "rgba(251,113,133,0.1)", text: "#fb7185", border: "#fb7185" },
  "STRONG SELL": { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "#ef4444" },
};

const ScoreMeter = ({ score }) => {
  const angle = (score / 100) * 180 - 90;
  const color = score >= 65 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 80, height: 48, margin: "0 auto" }}>
      <svg width="80" height="48" viewBox="0 0 80 48">
        <path d="M 8 44 A 32 32 0 0 1 72 44" fill="none" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M 8 44 A 32 32 0 0 1 72 44"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 100} 100`}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        <line
          x1="40" y1="44"
          x2={40 + 24 * Math.cos((angle * Math.PI) / 180)}
          y2={44 + 24 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2" strokeLinecap="round"
        />
        <circle cx="40" cy="44" r="3" fill={color} />
      </svg>
      <div style={{ position: "absolute", bottom: 0, width: "100%", textAlign: "center", fontSize: 13, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{score}</div>
    </div>
  );
};

const MiniBar = ({ value, max = 100, color }) => (
  <div style={{ background: "#1f2937", borderRadius: 4, height: 4, width: "100%", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
  </div>
);

const AccuracyChart = ({ history }) => {
  if (!history || history.length === 0) return null;
  const max = 0.8, min = 0.4;
  const w = 280, h = 80;
  const pts = history.slice().reverse().map((d, i) => {
    const x = (i / (history.length - 1)) * (w - 20) + 10;
    const y = h - ((d.accuracy - min) / (max - min)) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(" ");
  const lastAcc = history[0].accuracy;
  return (
    <div style={{ position: "relative" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {[0.5, 0.6, 0.7, 0.8].map(v => (
          <line key={v} x1="10" x2={w - 10}
            y1={h - ((v - min) / (max - min)) * (h - 10) - 5}
            y2={h - ((v - min) / (max - min)) * (h - 10) - 5}
            stroke="#1f2937" strokeWidth="1" strokeDasharray="4,4" />
        ))}
        <polyline points={pts} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px #6366f1)" }} />
        {history.slice().reverse().map((d, i) => {
          const x = (i / (history.length - 1)) * (w - 20) + 10;
          const y = h - ((d.accuracy - min) / (max - min)) * (h - 10) - 5;
          return <circle key={i} cx={x} cy={y} r="3.5" fill={i === history.length - 1 ? "#10b981" : "#6366f1"} style={{ filter: "drop-shadow(0 0 4px #6366f1)" }} />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4b5563", marginTop: 2, fontFamily: "'Space Mono', monospace" }}>
        {history.slice().reverse().map((d, i) => (
          <span key={i}>{new Date(d.trained_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [tab, setTab] = useState("scanner");
  const [stocks, setStocks] = useState(MOCK_DATA);
  const [performance, setPerformance] = useState(MOCK_PERFORMANCE);
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [customTicker, setCustomTicker] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeSuccess, setAnalyzeSuccess] = useState("");

  // ── Analyze a single ticker via Railway API ──
  const analyzeTicker = async (ticker) => {
    if (!ticker) return;
    const t = ticker.trim().toUpperCase();
    if (stocks.find(s => s.ticker === t)) {
      setAnalyzeError(`${t} is already in the list.`);
      setTimeout(() => setAnalyzeError(""), 3000);
      return;
    }
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalyzeSuccess("");
    try {
      const res = await fetch(`${API_BASE}/analyze/${t}`);
      if (!res.ok) throw new Error(`${t} not found or API error (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStocks(prev => [data, ...prev]);
      setSelected(data);
      setAnalyzeSuccess(`✅ ${t} analyzed and logged to database`);
      setTimeout(() => setAnalyzeSuccess(""), 4000);
    } catch (err) {
      // If Railway not connected yet, show a helpful message
      if (err.message.includes("fetch") || err.message.includes("Failed")) {
        setAnalyzeError("⚠ Railway API not connected yet — see DEPLOYMENT_GUIDE.md");
      } else {
        setAnalyzeError(`❌ ${err.message}`);
      }
      setTimeout(() => setAnalyzeError(""), 5000);
    } finally {
      setAnalyzing(false);
      setCustomTicker("");
    }
  };

  // ── Scan full watchlist via Railway API ──
  const scanWatchlist = async () => {
    setScanning(true);
    setAnalyzeError("");
    try {
      const res = await fetch(`${API_BASE}/scan`);
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setStocks(data.results);
        setAnalyzeSuccess(`✅ Scanned ${data.count} stocks`);
        setTimeout(() => setAnalyzeSuccess(""), 4000);
      }
    } catch (err) {
      setAnalyzeError("⚠ Railway API not connected yet — see DEPLOYMENT_GUIDE.md");
      setTimeout(() => setAnalyzeError(""), 5000);
    } finally {
      setScanning(false);
    }
  };

  const filtered = filter === "ALL" ? stocks : stocks.filter(s => {
    if (filter === "BUY") return s.prediction.direction.includes("BUY");
    if (filter === "SELL") return s.prediction.direction.includes("SELL");
    return s.prediction.direction === "NEUTRAL";
  });

  const styles = {
    app: { minHeight: "100vh", background: "#030712", color: "#e5e7eb", fontFamily: "'IBM Plex Sans', 'Space Mono', monospace" },
    header: { borderBottom: "1px solid #111827", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(3,7,18,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 },
    logo: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#f9fafb", fontFamily: "'Space Mono', monospace" },
    logoAccent: { color: "#10b981" },
    nav: { display: "flex", gap: 4 },
    navBtn: (active) => ({ background: active ? "rgba(99,102,241,0.15)" : "transparent", border: active ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent", color: active ? "#818cf8" : "#6b7280", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "'Space Mono', monospace", transition: "all 0.2s" }),
    badge: { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: "'Space Mono', monospace" },
    main: { padding: "28px 32px", maxWidth: 1200, margin: "0 auto" },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 },
    statCard: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "20px 24px" },
    statLabel: { fontSize: 11, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'Space Mono', monospace" },
    statValue: { fontSize: 32, fontWeight: 700, color: "#f9fafb", fontFamily: "'Space Mono', monospace", lineHeight: 1 },
    statSub: { fontSize: 12, color: "#6b7280", marginTop: 6 },
    sectionTitle: { fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'Space Mono', monospace" },
    filterRow: { display: "flex", gap: 8, marginBottom: 20, alignItems: "center" },
    filterBtn: (active) => ({ background: active ? "rgba(99,102,241,0.2)" : "#0d1117", border: `1px solid ${active ? "#6366f1" : "#1f2937"}`, color: active ? "#818cf8" : "#6b7280", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }),
    input: { background: "#0d1117", border: "1px solid #1f2937", color: "#e5e7eb", padding: "6px 14px", borderRadius: 6, fontSize: 13, fontFamily: "'Space Mono', monospace", outline: "none", width: 120 },
    scanBtn: { background: "linear-gradient(135deg, #6366f1, #10b981)", border: "none", color: "#fff", padding: "7px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Space Mono', monospace" },
    stockCard: (selected) => ({ background: selected ? "#0d1117" : "#080c12", border: `1px solid ${selected ? "#6366f1" : "#111827"}`, borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.2s", marginBottom: 10 }),
    dirBadge: (dir) => ({ background: directionColors[dir]?.bg, border: `1px solid ${directionColors[dir]?.border}`, color: directionColors[dir]?.text, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono', monospace", whiteSpace: "nowrap" }),
    detail: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: 24, marginTop: 16 },
    signal: { display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid #111827" },
    signalDot: { width: 6, height: 6, borderRadius: "50%", background: "#6366f1", marginTop: 6, flexShrink: 0 },
  };

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          Small<span style={styles.logoAccent}>Cap</span>.AI
        </div>
        <div style={styles.nav}>
          {["scanner", "predictions", "performance"].map(t => (
            <button key={t} style={styles.navBtn(tab === t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.badge}>● LIVE</div>
      </div>

      <div style={styles.main}>

        {/* SCANNER TAB */}
        {tab === "scanner" && (
          <>
            {/* Stats */}
            <div style={styles.grid3}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Model Accuracy</div>
                <div style={{ ...styles.statValue, color: "#10b981" }}>{performance.accuracy_pct}%</div>
                <div style={styles.statSub}>↑ +4.2% this month</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Predictions Made</div>
                <div style={styles.statValue}>{performance.total_predictions}</div>
                <div style={styles.statSub}>{performance.correct} correct outcomes</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Stocks Tracked</div>
                <div style={styles.statValue}>{stocks.length}</div>
                <div style={styles.statSub}>Updated weekly · auto-retrain</div>
              </div>
            </div>

            {/* Filter + Search */}
            <div style={styles.filterRow}>
              {["ALL", "BUY", "SELL", "NEUTRAL"].map(f => (
                <button key={f} style={styles.filterBtn(filter === f)} onClick={() => setFilter(f)}>{f}</button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  style={{ ...styles.input, border: analyzeError ? "1px solid #ef4444" : analyzing ? "1px solid #6366f1" : "1px solid #1f2937" }}
                  placeholder="Ticker (e.g. AAPL)"
                  value={customTicker}
                  onChange={e => { setCustomTicker(e.target.value.toUpperCase()); setAnalyzeError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") analyzeTicker(customTicker); }}
                  disabled={analyzing}
                />
                <button
                  style={{ ...styles.scanBtn, opacity: analyzing ? 0.6 : 1, minWidth: 80 }}
                  onClick={() => analyzeTicker(customTicker)}
                  disabled={analyzing || !customTicker}
                >
                  {analyzing ? "…" : "Analyze"}
                </button>
                <button
                  style={{ ...styles.scanBtn, background: "linear-gradient(135deg, #374151, #1f2937)", opacity: scanning ? 0.6 : 1 }}
                  onClick={scanWatchlist}
                  disabled={scanning}
                >
                  {scanning ? "Scanning…" : "Scan All"}
                </button>
              </div>
            </div>

            {/* Status messages */}
            {analyzeError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fb7185", padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
                {analyzeError}
              </div>
            )}
            {analyzeSuccess && (
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
                {analyzeSuccess}
              </div>
            )}
            {analyzing && (
              <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
                ⏳ Fetching data for {customTicker} — pulling price, indicators, macro signals…
              </div>
            )}

            {/* Stock List */}
            <div style={styles.sectionTitle}>Stock Analysis ({filtered.length})</div>
            {filtered.map(stock => (
              <div key={stock.ticker}>
                <div
                  style={styles.stockCard(selected?.ticker === stock.ticker)}
                  onClick={() => setSelected(selected?.ticker === stock.ticker ? null : stock)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Ticker */}
                    <div style={{ width: 64 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb", fontFamily: "'Space Mono', monospace" }}>{stock.ticker}</div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{stock.sector}</div>
                    </div>

                    {/* Name + signals */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>{stock.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {stock.prediction.signals.slice(0, 2).map((s, i) => (
                          <span key={i} style={{ fontSize: 10, color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", padding: "2px 8px", borderRadius: 10 }}>{s}</span>
                        ))}
                        {stock.prediction.signals.length > 2 && (
                          <span style={{ fontSize: 10, color: "#4b5563" }}>+{stock.prediction.signals.length - 2} more</span>
                        )}
                      </div>
                    </div>

                    {/* Score meter */}
                    <div style={{ width: 80 }}>
                      <ScoreMeter score={stock.prediction.score} />
                    </div>

                    {/* Direction */}
                    <div style={{ textAlign: "right", minWidth: 110 }}>
                      <div style={styles.dirBadge(stock.prediction.direction)}>{stock.prediction.direction}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                        ${stock.current_price} → <span style={{ color: stock.prediction.score >= 50 ? "#10b981" : "#ef4444" }}>${stock.prediction.price_target}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini indicators */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
                    {[
                      { label: "RSI", value: stock.technical.rsi, max: 100, color: stock.technical.rsi < 30 ? "#10b981" : stock.technical.rsi > 70 ? "#ef4444" : "#6366f1" },
                      { label: "1M Return", value: stock.technical.momentum_1m, max: 40, color: stock.technical.momentum_1m >= 0 ? "#10b981" : "#ef4444" },
                      { label: "Volume", value: stock.technical.volume_ratio, max: 4, color: stock.technical.volume_ratio > 1.5 ? "#f59e0b" : "#6366f1" },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4b5563", marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
                          <span>{m.label}</span>
                          <span style={{ color: m.color }}>{typeof m.value === 'number' ? (m.label === "Volume" ? `${m.value}x` : m.label === "1M Return" ? `${m.value > 0 ? "+" : ""}${m.value}%` : m.value.toFixed(1)) : "—"}</span>
                        </div>
                        <MiniBar value={m.value} max={m.max} color={m.color} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expanded detail */}
                {selected?.ticker === stock.ticker && (
                  <div style={styles.detail}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      <div>
                        <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>Signal Breakdown</div>
                        {stock.prediction.signals.map((s, i) => (
                          <div key={i} style={styles.signal}>
                            <div style={styles.signalDot} />
                            <span style={{ fontSize: 13, color: "#d1d5db" }}>{s}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>Prediction Details</div>
                        {[
                          ["Direction", stock.prediction.direction],
                          ["Score", `${stock.prediction.score} / 100`],
                          ["Confidence", `${stock.prediction.confidence}%`],
                          ["Entry Price", `$${stock.current_price}`],
                          ["Price Target", `$${stock.prediction.price_target}`],
                          ["Time Horizon", `${stock.prediction.time_horizon_days} days`],
                          ["Expected Move", `${((stock.prediction.price_target / stock.current_price - 1) * 100).toFixed(1)}%`],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #111827", fontSize: 13 }}>
                            <span style={{ color: "#6b7280" }}>{k}</span>
                            <span style={{ color: "#e5e7eb", fontFamily: "'Space Mono', monospace" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 16, padding: "10px 16px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
                      ⚠ This is an AI-generated prediction for informational purposes only. Not financial advice. Always do your own research.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* PREDICTIONS TAB */}
        {tab === "predictions" && (
          <>
            <div style={styles.sectionTitle}>Recent Predictions & Outcomes</div>
            <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#080c12" }}>
                    {["Ticker", "Predicted", "Direction", "Entry", "Target", "Outcome", "Result"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#4b5563", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Space Mono', monospace", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticker: "UPST", date: "Mar 26", direction: "STRONG BUY", entry: 24.10, target: 29.50, outcome: "+18.4%", correct: true },
                    { ticker: "SOFI", date: "Mar 26", direction: "BUY", entry: 7.80, target: 9.20, outcome: "+12.1%", correct: true },
                    { ticker: "IONQ", date: "Mar 26", direction: "BUY", entry: 13.20, target: 16.40, outcome: "-4.2%", correct: false },
                    { ticker: "NKLA", date: "Mar 26", direction: "SELL", entry: 1.18, target: 0.82, outcome: "-18.6%", correct: true },
                    { ticker: "ENVX", date: "Feb 26", direction: "NEUTRAL", entry: 9.80, target: 10.10, outcome: "+3.1%", correct: true },
                    { ticker: "LMND", date: "Feb 26", direction: "BUY", entry: 22.40, target: 26.80, outcome: "+8.4%", correct: true },
                    { ticker: "OPEN", date: "Feb 26", direction: "SELL", entry: 3.20, target: 2.50, outcome: "+6.3%", correct: false },
                  ].map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #111827", transition: "background 0.15s" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f9fafb", fontFamily: "'Space Mono', monospace" }}>{r.ticker}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280" }}>{r.date}</td>
                      <td style={{ padding: "12px 16px" }}><span style={styles.dirBadge(r.direction)}>{r.direction}</span></td>
                      <td style={{ padding: "12px 16px", color: "#9ca3af", fontFamily: "'Space Mono', monospace" }}>${r.entry}</td>
                      <td style={{ padding: "12px 16px", color: "#9ca3af", fontFamily: "'Space Mono', monospace" }}>${r.target}</td>
                      <td style={{ padding: "12px 16px", color: r.outcome.startsWith("+") ? "#10b981" : "#ef4444", fontFamily: "'Space Mono', monospace" }}>{r.outcome}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 16 }}>{r.correct ? "✅" : "❌"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#374151", textAlign: "center" }}>
              Showing demo data. Connect to Railway API to see live predictions.
            </div>
          </>
        )}

        {/* PERFORMANCE TAB */}
        {tab === "performance" && (
          <>
            <div style={styles.grid3}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Overall Accuracy</div>
                <div style={{ ...styles.statValue, color: "#10b981" }}>{performance.accuracy_pct}%</div>
                <div style={styles.statSub}>{performance.correct} / {performance.total_predictions} correct</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Best Signal</div>
                <div style={{ ...styles.statValue, fontSize: 22, color: "#818cf8" }}>STRONG BUY</div>
                <div style={styles.statSub}>{performance.by_direction["STRONG BUY"].accuracy}% accuracy</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Model Retrains</div>
                <div style={styles.statValue}>{performance.retraining_history.length}</div>
                <div style={styles.statSub}>Last: {new Date(performance.retraining_history[0].trained_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Accuracy over time */}
            <div style={{ ...styles.statCard, marginBottom: 20 }}>
              <div style={styles.sectionTitle}>Model Accuracy Over Time (Weekly Retrains)</div>
              <AccuracyChart history={performance.retraining_history} />
              <div style={{ marginTop: 12, fontSize: 12, color: "#4b5563" }}>Each point = a model retrain after evaluating new prediction outcomes</div>
            </div>

            {/* By direction */}
            <div style={styles.statCard}>
              <div style={styles.sectionTitle}>Accuracy by Signal Type</div>
              {Object.entries(performance.by_direction).map(([dir, stats]) => (
                <div key={dir} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: directionColors[dir]?.text }}>{dir}</span>
                    <span style={{ color: "#9ca3af", fontFamily: "'Space Mono', monospace" }}>{stats.accuracy}% ({stats.correct}/{stats.total})</span>
                  </div>
                  <div style={{ background: "#1f2937", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${stats.accuracy}%`, height: "100%", background: directionColors[dir]?.border, borderRadius: 4, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
