// src/App.jsx — Main React App with Router + Sidebar Layout
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/hooks";

// Pages
import LoginPage        from "./pages/LoginPage";
import DashboardPage    from "./pages/DashboardPage";
import PredictionPage   from "./pages/PredictionPage";
import SimulatorPage    from "./pages/SimulatorPage";
import SentimentPage    from "./pages/SentimentPage";
import FraudPage        from "./pages/FraudPage";
import LeaderboardPage  from "./pages/LeaderboardPage";
import DataSourcesPage  from "./pages/DataSourcesPage";

// ── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{color:"#94a3b8", padding:"2rem"}}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// ── Sidebar Nav ──────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/dashboard",    icon: "📊", label: "Dashboard"    },
  { to: "/predict",      icon: "🔮", label: "AI Predict"   },
  { to: "/simulator",    icon: "💰", label: "Simulator"    },
  { to: "/sentiment",    icon: "📰", label: "Sentiment"    },
  { to: "/fraud",        icon: "🛡️", label: "Fraud Alert"  },
  { to: "/leaderboard",  icon: "🏆", label: "Leaderboard"  },
  { to: "/data-sources", icon: "📡", label: "Data Sources" },
];

function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={A.root}>
      {/* Sidebar */}
      <aside style={{...A.sidebar, width: collapsed ? 64 : 220}}>
        <div style={A.sideTop}>
          <div style={A.logo} onClick={() => setCollapsed(c => !c)}>
            <span style={{color:"#00d4aa", fontSize:"1.2rem"}}>⬡</span>
            {!collapsed && <span style={A.logoText}>TradeMind<span style={{color:"#00d4aa"}}>AI</span></span>}
          </div>
        </div>

        <nav style={A.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} style={({isActive}) =>
              ({...A.navItem, ...(isActive ? A.navActive : {})})}>
              <span style={{fontSize:"1.1rem"}}>{item.icon}</span>
              {!collapsed && <span style={A.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={A.sideBottom}>
          {!collapsed && user && (
            <div style={A.userChip}>
              <div style={A.avatar}>{user.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{fontSize:"0.8rem", fontWeight:700}}>{user.name}</div>
                <div style={{fontSize:"0.68rem", color:"#475569"}}>Active Trader</div>
              </div>
            </div>
          )}
          <button style={A.logoutBtn} onClick={logout} title="Logout">
            {collapsed ? "↩" : "↩ Logout"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={A.main}>
        {/* Top bar */}
        <div style={A.topbar}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={A.liveDot}></span>
            <span style={{fontSize:"0.78rem", color:"#94a3b8"}}>{process.env.REACT_APP_DEMO_MODE === "true" ? "Free demo · simulated prices · data resets on restart" : process.env.NODE_ENV === "development" ? "Local development · sample prices" : "NSE/BSE Live Market"}</span>
          </div>
          <div style={{fontSize:"0.78rem", color:"#475569"}}>
            {new Date().toLocaleString("en-IN", {timeZone:"Asia/Kolkata",
              weekday:"short", day:"numeric", month:"short",
              hour:"2-digit", minute:"2-digit"})} IST
          </div>
        </div>

        {/* Page content */}
        <div style={A.content}>
          <Routes>
            <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}/>
            <Route path="/predict"      element={<ProtectedRoute><PredictionPage/></ProtectedRoute>}/>
            <Route path="/simulator"    element={<ProtectedRoute><SimulatorPage/></ProtectedRoute>}/>
            <Route path="/sentiment"    element={<ProtectedRoute><SentimentPage/></ProtectedRoute>}/>
            <Route path="/fraud"        element={<ProtectedRoute><FraudPage/></ProtectedRoute>}/>
            <Route path="/leaderboard"  element={<ProtectedRoute><LeaderboardPage/></ProtectedRoute>}/>
            <Route path="/data-sources" element={<ProtectedRoute><DataSourcesPage/></ProtectedRoute>}/>
            <Route path="*"             element={<Navigate to="/dashboard" replace/>}/>
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{fontFamily:"'Space Grotesk', sans-serif", background:"#0a0e1a",
                     color:"#f1f5f9", minHeight:"100vh"}}>
          <Toaster position="top-right"
            toastOptions={{style:{background:"#111827", color:"#f1f5f9",
              border:"1px solid rgba(255,255,255,0.1)"}}}/>
          <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/*"     element={
              <ProtectedRoute><AppLayout/></ProtectedRoute>}/>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ── Styles ───────────────────────────────────────────────────
const A = {
  root:     { display:"flex", minHeight:"100vh" },
  sidebar:  { background:"#0f1629", borderRight:"1px solid rgba(255,255,255,0.07)",
               display:"flex", flexDirection:"column", position:"fixed",
               top:0, left:0, bottom:0, transition:"width 0.25s", overflow:"hidden", zIndex:50 },
  sideTop:  { padding:"1rem", borderBottom:"1px solid rgba(255,255,255,0.07)" },
  logo:     { display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"4px 0" },
  logoText: { fontWeight:800, fontSize:"1rem", whiteSpace:"nowrap" },
  nav:      { flex:1, padding:"1rem 0.5rem", display:"flex", flexDirection:"column", gap:4 },
  navItem:  { display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
               borderRadius:10, textDecoration:"none", color:"#64748b",
               fontWeight:600, fontSize:"0.85rem", whiteSpace:"nowrap",
               transition:"all 0.15s" },
  navActive:{ background:"rgba(0,212,170,0.1)", color:"#00d4aa" },
  navLabel: { },
  sideBottom:{ padding:"1rem", borderTop:"1px solid rgba(255,255,255,0.07)",
                display:"flex", flexDirection:"column", gap:10 },
  userChip: { display:"flex", alignItems:"center", gap:10 },
  avatar:   { width:32, height:32, borderRadius:"50%", background:"rgba(0,212,170,0.2)",
               color:"#00d4aa", display:"flex", alignItems:"center", justifyContent:"center",
               fontWeight:700, fontSize:"0.85rem", flexShrink:0 },
  logoutBtn:{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
               color:"#64748b", borderRadius:8, padding:"8px 12px",
               cursor:"pointer", fontSize:"0.8rem", textAlign:"left" },
  main:     { flex:1, marginLeft:220, display:"flex", flexDirection:"column", minHeight:"100vh" },
  topbar:   { background:"#0f1629", borderBottom:"1px solid rgba(255,255,255,0.07)",
               padding:"0.75rem 1.5rem", display:"flex", alignItems:"center",
               justifyContent:"space-between", position:"sticky", top:0, zIndex:40 },
  liveDot:  { width:7, height:7, borderRadius:"50%", background:"#10b981",
               display:"inline-block", animation:"pulse 1.5s infinite" },
  content:  { flex:1 },
};
