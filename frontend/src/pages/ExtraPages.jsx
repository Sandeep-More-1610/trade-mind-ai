// ============================================================
//  src/pages/SentimentPage.jsx  — NLP Sentiment Analyzer
// ============================================================
import React, { useState, useEffect } from "react";
import { sentimentAPI } from "../services/api";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis,
         ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const SYMBOLS = ["TCS","RELIANCE","HDFCBANK","INFY","WIPRO","TATAMOTORS","ITC","BAJFINANCE"];

export default function SentimentPage() {
  const [sentiments, setSentiments] = useState({});
  const [market,     setMarket]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [mkt, ...stockResults] = await Promise.allSettled([
        sentimentAPI.getMarket(),
        ...SYMBOLS.slice(0,4).map(s => sentimentAPI.getStock(s))
      ]);
      if (mkt.status === "fulfilled") setMarket(mkt.value.data);
      const map = {};
      stockResults.forEach((r, i) => {
        if (r.status === "fulfilled") map[SYMBOLS[i]] = r.value.data;
      });
      setSentiments(map);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const moodColor = { GREEDY:"#10b981", BULLISH:"#00d4aa", NEUTRAL:"#f59e0b",
                      BEARISH:"#ef4444", FEARFUL:"#dc2626" };

  return (
    <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem"}}>
      <h2>📰 Live Sentiment Intelligence</h2>
      <p style={{color:"#94a3b8", marginTop:-8}}>
        FinBERT NLP scans news + Reddit in real-time. Updated every 15 minutes.
      </p>

      {/* Market Mood */}
      {market && (
        <div style={SE.moodCard}>
          <div style={SE.moodLabel}>Overall Market Mood</div>
          <div style={{...SE.moodVal, color: moodColor[market.mood] || "#00d4aa"}}>
            {market.mood}
          </div>
          <div style={SE.fearBar}>
            <div style={{...SE.fearFill, width:`${market.fearGreedIndex}%`,
                          background: market.fearGreedIndex > 60 ? "#10b981" :
                                      market.fearGreedIndex < 40 ? "#ef4444" : "#f59e0b"}}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"#475569", marginTop:4}}>
            <span>😱 Extreme Fear</span>
            <span>Fear/Greed: {market.fearGreedIndex}</span>
            <span>🤑 Extreme Greed</span>
          </div>
        </div>
      )}

      {/* Per-stock sentiment cards */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))", gap:"1rem"}}>
        {Object.entries(sentiments).map(([sym, data]) => (
          <div key={sym} style={SE.sentCard}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
              <div style={{fontWeight:700, fontFamily:"monospace"}}>{sym}</div>
              <span style={{...SE.badge,
                background: data.sentiment==="BULLISH" ? "rgba(16,185,129,0.15)" :
                            data.sentiment==="BEARISH" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                color:      data.sentiment==="BULLISH" ? "#10b981" :
                            data.sentiment==="BEARISH" ? "#ef4444" : "#f59e0b"}}>
                {data.sentiment}
              </span>
            </div>
            <div style={{fontSize:"0.72rem", color:"#475569", marginBottom:10}}>
              {data.count} articles analyzed
            </div>
            {/* Bullish bar */}
            <div style={{marginBottom:6}}>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.7rem", marginBottom:3}}>
                <span style={{color:"#10b981"}}>Bullish</span>
                <span style={{color:"#10b981"}}>{data.bullish}%</span>
              </div>
              <div style={SE.barWrap}>
                <div style={{...SE.bar, width:`${data.bullish}%`, background:"#10b981"}}/>
              </div>
            </div>
            <div>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.7rem", marginBottom:3}}>
                <span style={{color:"#ef4444"}}>Bearish</span>
                <span style={{color:"#ef4444"}}>{data.bearish}%</span>
              </div>
              <div style={SE.barWrap}>
                <div style={{...SE.bar, width:`${data.bearish}%`, background:"#ef4444"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SE = {
  moodCard:  { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"1.5rem" },
  moodLabel: { fontSize:"0.72rem", color:"#475569", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 },
  moodVal:   { fontSize:"2rem", fontWeight:800, marginBottom:12 },
  fearBar:   { height:10, background:"#0f1629", borderRadius:5, overflow:"hidden" },
  fearFill:  { height:"100%", borderRadius:5, transition:"width 1s" },
  sentCard:  { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"1.2rem" },
  badge:     { padding:"3px 10px", borderRadius:100, fontSize:"0.72rem", fontWeight:700 },
  barWrap:   { height:7, background:"#0f1629", borderRadius:4, overflow:"hidden" },
  bar:       { height:"100%", borderRadius:4, transition:"width 0.8s" },
};


// ============================================================
//  src/pages/FraudPage.jsx  — Pump & Dump Detection
// ============================================================
import React, { useState, useEffect } from "react";
import { fraudAPI } from "../services/api";

export default function FraudPage() {
  const [alerts,  setAlerts]  = useState([]);
  const [symbol,  setSymbol]  = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fraudAPI.getAlerts().then(r => setAlerts(r.data)).catch(() => {});
  }, []);

  const checkSymbol = async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const { data } = await fraudAPI.getRiskScore(symbol.toUpperCase());
      setResult(data);
    } catch (e) {
      alert("Check failed");
    } finally {
      setLoading(false);
    }
  };

  const riskColor = { LOW:"#10b981", MEDIUM:"#f59e0b", HIGH:"#ef4444" };

  return (
    <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem"}}>
      <h2>🛡️ Fraud & Manipulation Detection</h2>
      <p style={{color:"#94a3b8", marginTop:-8}}>
        AI cross-references volume spikes + social media to detect pump-and-dump schemes.
      </p>

      {/* Manual check */}
      <div style={F.panel}>
        <div style={{fontWeight:700, marginBottom:"1rem"}}>Check Any Stock</div>
        <div style={{display:"flex", gap:10}}>
          <input style={F.input} value={symbol}
                 onChange={e => setSymbol(e.target.value.toUpperCase())}
                 placeholder="Enter symbol e.g. RELIANCE" />
          <button style={F.btn} onClick={checkSymbol} disabled={loading}>
            {loading ? "Scanning..." : "Scan for Fraud"}
          </button>
        </div>

        {result && (
          <div style={{...F.resultBox, borderColor: riskColor[result.riskLevel] + "44"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem"}}>
              <div style={{fontWeight:700}}>{result.symbol}</div>
              <span style={{...F.riskBadge, background: riskColor[result.riskLevel] + "22",
                             color: riskColor[result.riskLevel]}}>
                {result.riskLevel} RISK · Score: {result.riskScore}
              </span>
            </div>
            {[
              ["Volume Spike vs 30-day avg", `${result.volumeSpike}%`],
              ["5-Day Price Change",         `${result.priceChange5d}%`],
              ["Social Media Spike",         `${result.socialSpike}%`],
            ].map(([k,v]) => (
              <div key={k} style={F.metaRow}>
                <span style={{color:"#94a3b8"}}>{k}</span>
                <span style={{fontWeight:700}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:"1rem", fontSize:"0.82rem", color:"#94a3b8"}}>
              {result.description}
            </div>
          </div>
        )}
      </div>

      {/* Active alerts */}
      <div style={F.panel}>
        <div style={{fontWeight:700, marginBottom:"1rem"}}>🚨 Active System Alerts</div>
        {alerts.length === 0 ? (
          <div style={{color:"#475569", fontSize:"0.85rem"}}>No active alerts right now.</div>
        ) : alerts.map(a => (
          <div key={a.id} style={F.alertRow}>
            <div>
              <span style={{fontFamily:"monospace", fontWeight:700}}>{a.symbol}</span>
              <span style={{fontSize:"0.78rem", color:"#94a3b8", marginLeft:10}}>{a.description}</span>
            </div>
            <span style={{...F.riskBadge, background: riskColor[a.riskLevel] + "22",
                           color: riskColor[a.riskLevel]}}>
              {a.riskLevel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const F = {
  panel:     { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"1.5rem" },
  input:     { background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 16px", color:"#f1f5f9", fontSize:"0.88rem", outline:"none", width:240 },
  btn:       { background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontWeight:700, cursor:"pointer" },
  resultBox: { marginTop:"1.2rem", background:"#0f1629", border:"1px solid", borderRadius:12, padding:"1.2rem" },
  riskBadge: { padding:"4px 12px", borderRadius:100, fontWeight:700, fontSize:"0.75rem" },
  metaRow:   { display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:"0.85rem" },
  alertRow:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" },
};


// ============================================================
//  src/pages/LeaderboardPage.jsx
// ============================================================
import React, { useState, useEffect } from "react";
import { leaderboardAPI } from "../services/api";

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    leaderboardAPI.getTop(20).then(r => setLeaders(r.data)).catch(() => {});
  }, []);

  const medals = ["🥇","🥈","🥉"];
  const fmt = n => n ? `₹${Number(n).toLocaleString("en-IN", {maximumFractionDigits:0})}` : "—";

  return (
    <div style={{padding:"1.5rem", maxWidth:800, margin:"0 auto"}}>
      <h2 style={{marginBottom:8}}>🏆 Virtual Trading Leaderboard</h2>
      <p style={{color:"#94a3b8", marginBottom:"2rem"}}>
        Compete with other traders. Starting balance: ₹10,00,000.
      </p>

      <div style={L.board}>
        <div style={L.header}>
          {["Rank","Trader","Total Worth","P&L","Return %"].map(h =>
            <div key={h} style={L.hCell}>{h}</div>)}
        </div>
        {leaders.map((row, i) => (
          <div key={row.id || i} style={{...L.row, ...(i===0?L.row1:i===1?L.row2:i===2?L.row3:{})}}>
            <div style={{fontWeight:700, fontSize:"1.1rem"}}>{medals[i] || i+1}</div>
            <div style={{fontWeight:700}}>{row.name}</div>
            <div style={{fontFamily:"monospace", fontWeight:700}}>{fmt(row.total_worth)}</div>
            <div style={{color: row.pnl >= 0 ? "#10b981" : "#ef4444", fontFamily:"monospace"}}>
              {row.pnl >= 0 ? "+" : ""}{fmt(row.pnl)}
            </div>
            <div style={{color: row.pnl_pct >= 0 ? "#10b981" : "#ef4444"}}>
              {row.pnl_pct >= 0 ? "+" : ""}{row.pnl_pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const L = {
  board:  { background:"#111827", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" },
  header: { display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr 1fr", padding:"12px 1.2rem", borderBottom:"1px solid rgba(255,255,255,0.07)", fontSize:"0.72rem", color:"#475569", fontWeight:700, textTransform:"uppercase" },
  row:    { display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr 1fr", padding:"14px 1.2rem", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"0.88rem", color:"#94a3b8", alignItems:"center" },
  row1:   { background:"rgba(245,158,11,0.05)" },
  row2:   { background:"rgba(148,163,184,0.03)" },
  row3:   { background:"rgba(196,124,40,0.03)" },
};
