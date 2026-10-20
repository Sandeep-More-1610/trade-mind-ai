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
