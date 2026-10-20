// ============================================================
//  src/pages/LoginPage.jsx  — JWT Auth Form
// ============================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/hooks";

export default function LoginPage() {
  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login, register }     = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else                  await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.error || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>⬡ TradeMind<span style={{color:"#00d4aa"}}>AI</span></div>
        <p style={S.sub}>India's AI-Powered Stock Intelligence Platform</p>

        <div style={S.tabs}>
          {["login","register"].map(m => (
            <button key={m} style={{...S.tab, ...(mode===m ? S.tabActive : {})}}
                    onClick={() => setMode(m)}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          {mode === "register" && (
            <input style={S.input} placeholder="Full Name" value={name}
                   onChange={e => setName(e.target.value)} required />
          )}
          <input style={S.input} type="email" placeholder="Email" value={email}
                 onChange={e => setEmail(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Password" value={password}
                 onChange={e => setPassword(e.target.value)} required />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        {mode === "register" && (
          <p style={S.note}>🎉 Get ₹10,00,000 virtual money to start trading risk-free!</p>
        )}
      </div>
    </div>
  );
}

const S = {
  page:      { minHeight:"100vh", background:"#0a0e1a", display:"flex", alignItems:"center", justifyContent:"center" },
  card:      { background:"#111827", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"2.5rem", width:"100%", maxWidth:420, textAlign:"center" },
  logo:      { fontSize:"1.5rem", fontWeight:700, marginBottom:8 },
  sub:       { color:"#94a3b8", fontSize:"0.82rem", marginBottom:"1.5rem" },
  tabs:      { display:"flex", background:"#0f1629", borderRadius:10, padding:4, marginBottom:"1.5rem", gap:4 },
  tab:       { flex:1, padding:"8px 0", border:"none", background:"transparent", color:"#64748b", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:"0.85rem" },
  tabActive: { background:"#1a2540", color:"#00d4aa" },
  form:      { display:"flex", flexDirection:"column", gap:"0.8rem" },
  input:     { background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 16px", color:"#f1f5f9", fontSize:"0.9rem", outline:"none" },
  btn:       { background:"#00d4aa", color:"#000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:"0.95rem", cursor:"pointer", marginTop:4 },
  note:      { marginTop:"1rem", color:"#00d4aa", fontSize:"0.8rem", background:"rgba(0,212,170,0.08)", padding:"10px", borderRadius:8 },
};


// ============================================================
//  src/pages/DashboardPage.jsx  — Real-time market overview
// ============================================================
import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
         BarChart, Bar } from "recharts";
import { stocksAPI, sentimentAPI } from "../services/api";

export default function DashboardPage() {
  const [stocks,   setStocks]   = useState([]);
  const [history,  setHistory]  = useState([]);
  const [market,   setMarket]   = useState(null);
  const [selected, setSelected] = useState("TCS");
  const [period,   setPeriod]   = useState("1M");

  useEffect(() => {
    stocksAPI.getAll().then(r => setStocks(r.data)).catch(() => {});
    sentimentAPI.getMarket().then(r => setMarket(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    stocksAPI.getHistory(selected, period)
      .then(r => setHistory(r.data))
      .catch(() => {});
  }, [selected, period]);

  const gainers = [...stocks].sort((a,b) => b.changePct - a.changePct).slice(0,5);

  return (
    <div style={D.wrap}>
      {/* Market Summary Bar */}
      <div style={D.summaryBar}>
        {[
          { label:"NIFTY 50",   val:"22,486", chg:"+1.24%", pos:true },
          { label:"SENSEX",     val:"73,961", chg:"+0.97%", pos:true },
          { label:"BANK NIFTY", val:"48,210", chg:"-0.3%",  pos:false },
          { label:"Fear/Greed", val: market ? `${market.fearGreedIndex}` : "--",
            chg: market?.mood || "NEUTRAL", pos: true },
        ].map(m => (
          <div key={m.label} style={D.summaryTile}>
            <div style={D.tileLabel}>{m.label}</div>
            <div style={D.tileVal}>{m.val}</div>
            <div style={{fontSize:"0.72rem", color: m.pos ? "#10b981" : "#ef4444"}}>{m.chg}</div>
          </div>
        ))}
      </div>

      <div style={D.grid}>
        {/* Left: chart */}
        <div style={D.chartBox}>
          <div style={D.chartHeader}>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {stocks.slice(0,6).map(s => (
                <button key={s.symbol} style={{...D.symBtn, ...(selected===s.symbol ? D.symActive : {})}}
                        onClick={() => setSelected(s.symbol)}>
                  {s.symbol}
                </button>
              ))}
            </div>
            <div style={{display:"flex", gap:4}}>
              {["1D","1W","1M","3M","1Y"].map(p => (
                <button key={p} style={{...D.periodBtn, ...(period===p ? D.periodActive : {})}}
                        onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="Date" tick={{fill:"#475569", fontSize:10}} tickLine={false}/>
              <YAxis tick={{fill:"#475569", fontSize:10}} tickLine={false} axisLine={false}
                     tickFormatter={v => `₹${v}`}/>
              <Tooltip contentStyle={{background:"#111827", border:"1px solid #1a2540", borderRadius:8}}
                       labelStyle={{color:"#94a3b8"}} itemStyle={{color:"#00d4aa"}}/>
              <Area type="monotone" dataKey="Close" stroke="#00d4aa"
                    strokeWidth={2} fill="url(#grad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right: stocks list */}
        <div style={D.stockList}>
          <div style={D.listHeader}>Live Watchlist</div>
          {stocks.map(s => (
            <div key={s.symbol} style={{...D.stockRow, ...(selected===s.symbol ? D.rowActive : {})}}
                 onClick={() => setSelected(s.symbol)}>
              <div>
                <div style={{fontWeight:700, fontSize:"0.88rem"}}>{s.symbol}</div>
                <div style={{fontSize:"0.7rem", color:"#475569"}}>{s.sector}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"monospace", fontWeight:700}}>₹{s.lastPrice?.toLocaleString("en-IN")}</div>
                <div style={{fontSize:"0.72rem", color: s.changePct >= 0 ? "#10b981" : "#ef4444"}}>
                  {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gainers Chart */}
      <div style={D.chartBox}>
        <div style={{fontWeight:700, marginBottom:"1rem"}}>🏆 Top Gainers Today</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={gainers}>
            <XAxis dataKey="symbol" tick={{fill:"#475569", fontSize:11}} tickLine={false}/>
            <YAxis tick={{fill:"#475569", fontSize:10}} tickLine={false} axisLine={false}
                   tickFormatter={v => `+${v}%`}/>
            <Tooltip contentStyle={{background:"#111827", border:"1px solid #1a2540", borderRadius:8}}/>
            <Bar dataKey="changePct" fill="#00d4aa" radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const D = {
  wrap:        { padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem" },
  summaryBar:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem" },
  summaryTile: { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"1rem 1.2rem" },
  tileLabel:   { fontSize:"0.7rem", color:"#475569", marginBottom:4 },
  tileVal:     { fontSize:"1.4rem", fontWeight:700, fontFamily:"monospace" },
  grid:        { display:"grid", gridTemplateColumns:"1fr 280px", gap:"1.5rem" },
  chartBox:    { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"1.2rem" },
  chartHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 },
  symBtn:      { padding:"5px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#64748b", cursor:"pointer", fontSize:"0.78rem", fontWeight:600 },
  symActive:   { background:"rgba(0,212,170,0.12)", color:"#00d4aa", borderColor:"rgba(0,212,170,0.3)" },
  periodBtn:   { padding:"4px 10px", borderRadius:6, border:"none", background:"transparent", color:"#64748b", cursor:"pointer", fontSize:"0.72rem" },
  periodActive:{ background:"rgba(0,212,170,0.1)", color:"#00d4aa" },
  stockList:   { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" },
  listHeader:  { padding:"1rem 1.2rem", fontWeight:700, fontSize:"0.85rem", borderBottom:"1px solid rgba(255,255,255,0.07)" },
  stockRow:    { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 1.2rem", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer", transition:"background 0.15s" },
  rowActive:   { background:"rgba(0,212,170,0.06)", borderLeft:"2px solid #00d4aa" },
};


// ============================================================
//  src/pages/PredictionPage.jsx  — AI Brain Score
// ============================================================
import React, { useState } from "react";
import { predictAPI } from "../services/api";

export default function PredictionPage() {
  const [symbol,     setSymbol]     = useState("TCS");
  const [prediction, setPrediction] = useState(null);
  const [loading,    setLoading]    = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const { data } = await predictAPI.predict(symbol.toUpperCase());
      setPrediction(data);
    } catch (e) {
      alert("Prediction failed: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const signalColor = { BUY:"#10b981", SELL:"#ef4444", HOLD:"#f59e0b" };

  return (
    <div style={{padding:"1.5rem", maxWidth:900, margin:"0 auto"}}>
      <h2 style={{marginBottom:8}}>🔮 AI Market Brain</h2>
      <p style={{color:"#94a3b8", marginBottom:"1.5rem"}}>
        5-signal fusion: LSTM · XGBoost · Random Forest · FinBERT NLP · Technical Indicators
      </p>

      <div style={{display:"flex", gap:10, marginBottom:"2rem"}}>
        <input style={P.input} value={symbol}
               onChange={e => setSymbol(e.target.value.toUpperCase())}
               placeholder="Enter symbol e.g. TCS" />
        <button style={P.btn} onClick={handlePredict} disabled={loading}>
          {loading ? "Analysing AI..." : "Run AI Prediction"}
        </button>
      </div>

      {prediction && (
        <div style={P.resultGrid}>
          {/* Score */}
          <div style={P.card}>
            <div style={P.cardLabel}>AI Market Score</div>
            <div style={{...P.scoreCircle, borderColor: signalColor[prediction.signal] + "55"}}>
              <div style={{fontSize:"2.5rem", fontWeight:700, color: signalColor[prediction.signal]}}>
                {prediction.ai_score}
              </div>
              <div style={{fontSize:"0.7rem", color:"#94a3b8"}}>/100</div>
            </div>
            <div style={{...P.signal, background: signalColor[prediction.signal] + "22",
                         color: signalColor[prediction.signal]}}>
              {prediction.signal}
            </div>
          </div>

          {/* Details */}
          <div style={P.card}>
            <div style={P.cardLabel}>Signal Details — {prediction.symbol}</div>
            {[
              ["Confidence",    `${prediction.confidence}%`],
              ["Sentiment",     prediction.sentiment],
              ["Risk Level",    prediction.risk_level],
              ["Trend",         prediction.trend],
            ].map(([k,v]) => (
              <div key={k} style={P.detailRow}>
                <span style={{color:"#94a3b8"}}>{k}</span>
                <span style={{fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          {prediction.breakdown && (
            <div style={{...P.card, gridColumn:"span 2"}}>
              <div style={P.cardLabel}>Model Breakdown</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem"}}>
                {[
                  ["LSTM",           prediction.breakdown.lstm_signal,    "30%"],
                  ["XGBoost",        prediction.breakdown.xgb_signal,     "25%"],
                  ["Random Forest",  prediction.breakdown.rf_signal,      "20%"],
                  ["NLP Sentiment",  prediction.breakdown.sentiment_score + " score", "25%"],
                ].map(([name,val,weight]) => (
                  <div key={name} style={P.modelTile}>
                    <div style={{fontSize:"0.7rem", color:"#475569", marginBottom:4}}>{name} · {weight}</div>
                    <div style={{fontWeight:700, color: typeof val==="string" && signalColor[val] ? signalColor[val] : "#00d4aa"}}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const P = {
  input:      { background:"#111827", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 16px", color:"#f1f5f9", fontSize:"0.9rem", outline:"none", width:220 },
  btn:        { background:"#00d4aa", color:"#000", border:"none", borderRadius:10, padding:"12px 24px", fontWeight:700, cursor:"pointer" },
  resultGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" },
  card:       { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"1.5rem" },
  cardLabel:  { fontSize:"0.72rem", color:"#475569", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"1rem" },
  scoreCircle:{ width:130, height:130, borderRadius:"50%", border:"4px solid", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" },
  signal:     { padding:"8px 24px", borderRadius:8, textAlign:"center", fontWeight:700, fontSize:"1.1rem", letterSpacing:"0.15em" },
  detailRow:  { display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:"0.88rem" },
  modelTile:  { background:"#0f1629", borderRadius:10, padding:"1rem" },
};


// ============================================================
//  src/pages/SimulatorPage.jsx  — Virtual Trading
// ============================================================
import React, { useState, useEffect } from "react";
import { tradeAPI, stocksAPI } from "../services/api";
import { usePortfolio } from "../hooks/hooks";
import toast from "react-hot-toast";

export default function SimulatorPage() {
  const [stocks,   setStocks]   = useState([]);
  const [symbol,   setSymbol]   = useState("TCS");
  const [qty,      setQty]      = useState(1);
  const [loading,  setLoading]  = useState(false);
  const { portfolio, summary, refresh } = usePortfolio();

  useEffect(() => {
    stocksAPI.getAll().then(r => setStocks(r.data)).catch(() => {});
  }, []);

  const handleTrade = async (type) => {
    setLoading(true);
    try {
      const fn = type === "BUY" ? tradeAPI.buy : tradeAPI.sell;
      const { data } = await fn(symbol, qty);
      toast.success(`${type} ${qty} × ${symbol} @ ₹${data.price}`);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.error || "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => n ? `₹${Number(n).toLocaleString("en-IN", {maximumFractionDigits:2})}` : "—";

  return (
    <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem"}}>
      <h2>💰 Virtual Trading Simulator</h2>

      {/* Summary Tiles */}
      {summary && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem"}}>
          {[
            ["Cash Balance",   fmt(summary.balance),       "#00d4aa"],
            ["Holdings Value", fmt(summary.holdingsValue),  "#3b82f6"],
            ["Total Worth",    fmt(summary.totalWorth),    "#f59e0b"],
            ["P&L",            fmt(summary.pnl),           summary.pnl >= 0 ? "#10b981" : "#ef4444"],
          ].map(([label, val, color]) => (
            <div key={label} style={T.tile}>
              <div style={T.tileLabel}>{label}</div>
              <div style={{fontSize:"1.3rem", fontWeight:700, color, fontFamily:"monospace"}}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trade Panel */}
      <div style={T.tradePanel}>
        <div style={{fontWeight:700, marginBottom:"1rem"}}>Place Order</div>
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <select style={T.select} value={symbol} onChange={e => setSymbol(e.target.value)}>
            {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
          </select>
          <input style={T.numInput} type="number" min={1} value={qty}
                 onChange={e => setQty(Number(e.target.value))} placeholder="Qty" />
          <button style={{...T.tradeBtn, background:"#10b981"}} onClick={() => handleTrade("BUY")} disabled={loading}>
            BUY
          </button>
          <button style={{...T.tradeBtn, background:"#ef4444"}} onClick={() => handleTrade("SELL")} disabled={loading}>
            SELL
          </button>
        </div>
      </div>

      {/* Portfolio Table */}
      <div style={T.tableWrap}>
        <div style={{fontWeight:700, padding:"1rem 1.2rem", borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          My Portfolio
        </div>
        <table style={T.table}>
          <thead>
            <tr>{["Stock","Qty","Avg Buy","LTP","Current Value","P&L","P&L %"].map(h =>
              <th key={h} style={T.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {portfolio.map(h => (
              <tr key={h.symbol}>
                <td style={{...T.td, fontWeight:700, fontFamily:"monospace"}}>{h.symbol}</td>
                <td style={T.td}>{h.quantity}</td>
                <td style={T.td}>{fmt(h.avgBuyPrice)}</td>
                <td style={T.td}>{fmt(h.ltp)}</td>
                <td style={T.td}>{fmt(h.currentValue)}</td>
                <td style={{...T.td, color: h.pnl >= 0 ? "#10b981" : "#ef4444"}}>{fmt(h.pnl)}</td>
                <td style={{...T.td, color: h.pnlPct >= 0 ? "#10b981" : "#ef4444"}}>
                  {h.pnl >= 0 ? "+" : ""}{h.pnlPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const T = {
  tile:      { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"1rem 1.2rem" },
  tileLabel: { fontSize:"0.7rem", color:"#475569", marginBottom:4 },
  tradePanel:{ background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"1.2rem" },
  select:    { background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", color:"#f1f5f9", fontSize:"0.88rem", flex:1, minWidth:200 },
  numInput:  { background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", color:"#f1f5f9", width:90, fontSize:"0.88rem" },
  tradeBtn:  { border:"none", borderRadius:10, padding:"10px 28px", fontWeight:700, color:"#fff", cursor:"pointer", fontSize:"0.9rem", letterSpacing:"0.05em" },
  tableWrap: { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { textAlign:"left", padding:"10px 14px", color:"#475569", fontWeight:600, fontSize:"0.72rem", borderBottom:"1px solid rgba(255,255,255,0.07)", textTransform:"uppercase" },
  td:        { padding:"11px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"0.85rem", color:"#94a3b8" },
};
