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
