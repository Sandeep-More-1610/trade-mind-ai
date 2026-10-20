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
