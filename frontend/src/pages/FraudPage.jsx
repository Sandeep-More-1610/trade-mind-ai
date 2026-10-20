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
