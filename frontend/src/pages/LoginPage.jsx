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

        {process.env.REACT_APP_DEMO_MODE === "true" && <p style={S.note}>Free demo: simulated prices and lightweight indicators. Accounts and virtual trades reset when the server restarts. No real money is used.</p>}
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
        {loading && process.env.REACT_APP_DEMO_MODE === "true" && (
          <p style={S.note} role="status">The free demo server may take up to 5 minutes to wake up. Please keep this page open.</p>
        )}

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
