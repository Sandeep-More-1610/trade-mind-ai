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
