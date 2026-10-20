import React, { useState } from "react";
import { predictAPI } from "../services/api";

export default function PredictionPage() {
  const demo = process.env.REACT_APP_DEMO_MODE === "true";
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
      <h2 style={{marginBottom:8}}>{demo ? "📈 Demo indicators" : "🔮 AI Market Brain"}</h2>
      <p style={{color:"#94a3b8", marginBottom:"1.5rem"}}>
        {demo ? "Free demo: moving-average indicators on simulated prices. Trained ML and live sentiment are disabled." : "5-signal fusion: LSTM · XGBoost · Random Forest · FinBERT NLP · Technical Indicators"}
      </p>

      <div style={{display:"flex", gap:10, marginBottom:"2rem"}}>
        <input style={P.input} value={symbol}
               onChange={e => setSymbol(e.target.value.toUpperCase())}
               placeholder="Enter symbol e.g. TCS" />
        <button style={P.btn} onClick={handlePredict} disabled={loading}>
          {loading ? "Analysing..." : demo ? "Calculate demo indicators" : "Run AI Prediction"}
        </button>
      </div>

      {prediction && (
        <div style={P.resultGrid}>
          {/* Score */}
          <div style={P.card}>
            <div style={P.cardLabel}>{demo ? "Demo indicator score" : "AI Market Score"}</div>
            <div style={{...P.scoreCircle, borderColor: signalColor[prediction.signal] + "55"}}>
              <div style={{fontSize:"2.5rem", fontWeight:700, color: signalColor[prediction.signal]}}>
                {prediction.ai_score ?? prediction.aiScore}
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
              [demo ? "Mode" : "Confidence", demo ? "Simulated indicator demo" : `${prediction.confidence}%`],
              ["Sentiment",     prediction.sentiment],
              ["Risk Level",    prediction.risk_level ?? prediction.riskLevel],
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
