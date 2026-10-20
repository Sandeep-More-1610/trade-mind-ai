// src/pages/DataSourcesPage.jsx
// ── Live dashboard showing all 4 data sources in action ─────
import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import API from "../services/api";

// ── Helpers ──────────────────────────────────────────────────
const fmt  = (n, dec=2) => n != null ? Number(n).toFixed(dec) : "—";
const fmtK = (n) => n > 1e7 ? `₹${(n/1e7).toFixed(1)}Cr`
                  : n > 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n;

// ── Color tokens ─────────────────────────────────────────────
const C = {
  yahoo:   "#00d4aa",
  finnhub: "#3b82f6",
  news:    "#8b5cf6",
  reddit:  "#f97316",
  bg:      "#111827",
  bg2:     "#0f1629",
  bg3:     "#141d35",
  border:  "rgba(255,255,255,0.07)",
  muted:   "#94a3b8",
  dim:     "#475569",
};

// ── Source badge ─────────────────────────────────────────────
const Badge = ({ label, color, count }) => (
  <span style={{
    background: color + "18", border: `1px solid ${color}44`,
    color, borderRadius: 100, padding: "3px 12px",
    fontSize: "0.72rem", fontWeight: 700, display:"inline-flex",
    alignItems:"center", gap:5,
  }}>
    {label}{count != null && <span style={{opacity:0.7}}>· {count}</span>}
  </span>
);

// ── Section card ─────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: "1.4rem", ...style
  }}>
    {children}
  </div>
);

// ── Section header ───────────────────────────────────────────
const SectionHead = ({ icon, title, sub, color, badge, count }) => (
  <div style={{ marginBottom: "1.2rem" }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
      <div style={{
        width:36, height:36, borderRadius:10,
        background: color + "18", display:"flex",
        alignItems:"center", justifyContent:"center", fontSize:"1.1rem",
      }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:"1rem" }}>{title}</div>
      {badge && <Badge label={badge} color={color} count={count} />}
    </div>
    <div style={{ fontSize:"0.78rem", color: C.muted }}>{sub}</div>
  </div>
);

// ── Row key-value ────────────────────────────────────────────
const KV = ({ label, value, valueColor }) => (
  <div style={{
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"7px 0", borderBottom:`1px solid ${C.border}`,
    fontSize:"0.84rem",
  }}>
    <span style={{ color: C.dim }}>{label}</span>
    <span style={{ fontWeight:600, color: valueColor || "#f1f5f9",
                   fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function DataSourcesPage() {
  const [symbol,      setSymbol]      = useState("TCS");
  const [inputSym,    setInputSym]    = useState("TCS");
  const [loading,     setLoading]     = useState(false);

  // Data state for each source
  const [yahooData,   setYahooData]   = useState(null);
  const [fundData,    setFundData]    = useState(null);
  const [finnData,    setFinnData]    = useState(null);
  const [mktStatus,   setMktStatus]   = useState(null);
  const [newsData,    setNewsData]    = useState(null);
  const [redditData,  setRedditData]  = useState(null);
  const [sentData,    setSentData]    = useState(null);
  const [mktOverview, setMktOverview] = useState(null);
  const [errors,      setErrors]      = useState({});

  const safe = (fn, key) => fn().catch(e => {
    setErrors(prev => ({ ...prev, [key]: e.message }));
    return null;
  });

  const fetchAll = useCallback(async (sym) => {
    setLoading(true);
    setErrors({});

    const [yh, fund, finn, mkts, news, reddit, sent, overview] =
      await Promise.all([
        safe(() => API.get(`/data/yahoo/${sym}/history?period=3mo&interval=1d`), "yahoo"),
        safe(() => API.get(`/data/yahoo/${sym}/fundamentals`),                   "fund"),
        safe(() => API.get(`/data/finnhub/${sym}/quote`),                        "finnhub"),
        safe(() => API.get(`/data/finnhub/market-status`),                       "mktStatus"),
        safe(() => API.get(`/data/news/${sym}?limit=10`),                        "news"),
        safe(() => API.get(`/data/reddit/${sym}`),                               "reddit"),
        safe(() => API.get(`/data/sentiment/${sym}`),                            "sent"),
        safe(() => API.get(`/data/market/overview`),                             "overview"),
      ]);

    if (yh)       setYahooData(yh.data);
    if (fund)     setFundData(fund.data);
    if (finn)     setFinnData(finn.data);
    if (mkts)     setMktStatus(mkts.data);
    if (news)     setNewsData(news.data);
    if (reddit)   setRedditData(reddit.data);
    if (sent)     setSentData(sent.data);
    if (overview) setMktOverview(overview.data);

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(symbol); }, [symbol, fetchAll]);

  const handleSearch = () => {
    const s = inputSym.trim().toUpperCase();
    if (s) setSymbol(s);
  };

  // Chart data from Yahoo OHLCV
  const chartData = (yahooData?.data || []).slice(-60).map(r => ({
    date:   r.Date ? new Date(r.Date).toLocaleDateString("en-IN",{month:"short",day:"numeric"}) : "",
    close:  r.Close  ? +r.Close.toFixed(2)  : 0,
    volume: r.Volume ? Math.round(r.Volume / 1000) : 0,
    high:   r.High   ? +r.High.toFixed(2)   : 0,
    low:    r.Low    ? +r.Low.toFixed(2)    : 0,
  }));

  const pos = finnData?.change_pct >= 0;

  return (
    <div style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <h2 style={{ marginBottom:4 }}>📡 Live Data Sources</h2>
          <p style={{ color: C.muted, fontSize:"0.85rem" }}>
            Real-time data flowing from all 4 sources into TradeMind AI
          </p>
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            <Badge label="Yahoo Finance"  color={C.yahoo}   />
            <Badge label="Finnhub API"    color={C.finnhub}  />
            <Badge label="NewsAPI"        color={C.news}     />
            <Badge label="Reddit API"     color={C.reddit}   />
          </div>
        </div>

        {/* Search */}
        <div style={{ display:"flex", gap:8 }}>
          <input
            value={inputSym}
            onChange={e => setInputSym(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Symbol e.g. INFY"
            style={{
              background: C.bg2, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"10px 14px", color:"#f1f5f9",
              fontSize:"0.88rem", outline:"none", width:160,
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: C.yahoo, color:"#000", border:"none",
              borderRadius:10, padding:"10px 20px", fontWeight:700,
              cursor:"pointer", fontSize:"0.88rem",
            }}
          >
            {loading ? "Loading..." : "Fetch"}
          </button>
        </div>
      </div>

      {/* ── Market Status Bar ── */}
      <div style={{
        background: C.bg, border:`1px solid ${C.border}`,
        borderRadius:12, padding:"0.9rem 1.2rem",
        display:"flex", alignItems:"center", gap:"2rem", flexWrap:"wrap",
      }}>
        {mktStatus && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{
                width:9, height:9, borderRadius:"50%",
                background: mktStatus.is_open ? "#10b981" : "#ef4444",
                display:"inline-block",
                boxShadow: mktStatus.is_open ? "0 0 6px #10b981" : "none",
              }}/>
              <span style={{ fontSize:"0.82rem", fontWeight:600 }}>
                NSE {mktStatus.is_open ? "OPEN" : "CLOSED"}
              </span>
            </div>
            <span style={{ fontSize:"0.78rem", color: C.dim }}>
              Exchange: {mktStatus.exchange}
            </span>
            <span style={{ fontSize:"0.78rem", color: C.dim }}>
              Session: {mktStatus.session || "—"}
            </span>
            <span style={{ fontSize:"0.78rem", color: C.dim }}>
              Source: Finnhub
            </span>
          </>
        )}
        <div style={{ marginLeft:"auto", fontSize:"0.78rem", color: C.dim }}>
          Viewing: <strong style={{ color:"#f1f5f9" }}>{symbol}</strong>
          {finnData?.price && (
            <span style={{ marginLeft:12, fontFamily:"monospace", fontWeight:700,
                           color: pos ? "#10b981" : "#ef4444" }}>
              ₹{fmt(finnData.price)} ({pos?"+":""}{fmt(finnData.change_pct)}%)
            </span>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
           ROW 1 — Yahoo Finance (OHLCV chart + fundamentals)
         ════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"1.5rem" }}>

        {/* Chart */}
        <Card>
          <SectionHead
            icon="📈" title="Yahoo Finance — OHLCV History"
            sub={`${yahooData?.rows || 0} trading days · 3-month window · Free, no key required`}
            color={C.yahoo} badge="Yahoo Finance"
          />
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="yg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.yahoo} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={C.yahoo} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill:C.dim, fontSize:10 }} tickLine={false}
                         interval="preserveStartEnd"/>
                  <YAxis tick={{ fill:C.dim, fontSize:10 }} tickLine={false} axisLine={false}
                         tickFormatter={v => `₹${v}`} width={65}/>
                  <Tooltip
                    contentStyle={{ background:"#0f1629", border:`1px solid ${C.border}`,
                                    borderRadius:8, fontSize:"0.78rem" }}
                    labelStyle={{ color: C.muted }}
                    itemStyle={{ color: C.yahoo }}
                  />
                  <Area type="monotone" dataKey="close" stroke={C.yahoo}
                        strokeWidth={2} fill="url(#yg)" name="Close"/>
                </AreaChart>
              </ResponsiveContainer>

              {/* Volume bar */}
              <div style={{ marginTop:"1rem" }}>
                <div style={{ fontSize:"0.72rem", color:C.dim, marginBottom:6 }}>
                  Volume (thousands)
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={chartData}>
                    <Bar dataKey="volume" fill={C.yahoo} opacity={0.4} radius={[2,2,0,0]}/>
                    <Tooltip
                      contentStyle={{ background:"#0f1629", border:`1px solid ${C.border}`,
                                      borderRadius:8, fontSize:"0.75rem" }}
                      formatter={v => [`${v}K`, "Volume"]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ color:C.dim, textAlign:"center", padding:"3rem 0" }}>
              {loading ? "Fetching from Yahoo Finance..." : errors.yahoo || "No data"}
            </div>
          )}
        </Card>

        {/* Fundamentals */}
        <Card>
          <SectionHead
            icon="🏢" title="Fundamentals"
            sub="Company data via Yahoo Finance"
            color={C.yahoo} badge="Yahoo Finance"
          />
          {fundData ? (
            <>
              <div style={{ fontWeight:700, marginBottom:4 }}>{fundData.name || symbol}</div>
              <div style={{ fontSize:"0.75rem", color:C.muted, marginBottom:"1rem" }}>
                {fundData.sector} · {fundData.industry}
              </div>
              <KV label="P/E Ratio"      value={fundData.pe_ratio ? fmt(fundData.pe_ratio,1) : "—"} />
              <KV label="EPS"            value={fundData.eps       ? `₹${fmt(fundData.eps)}` : "—"} />
              <KV label="Beta"           value={fundData.beta      ? fmt(fundData.beta)       : "—"} />
              <KV label="Book Value"     value={fundData.book_value? `₹${fmt(fundData.book_value)}`: "—"} />
              <KV label="Profit Margin"  value={fundData.profit_margin ? `${fmt(fundData.profit_margin*100,1)}%` : "—"} />
              <KV label="Dividend Yield" value={fundData.dividend_yield ? `${fmt(fundData.dividend_yield*100,2)}%` : "—"} />
              <KV label="Revenue"        value={fundData.revenue   ? fmtK(fundData.revenue)   : "—"} />
              {fundData.description && (
                <p style={{ fontSize:"0.75rem", color:C.dim, marginTop:"1rem", lineHeight:1.6 }}>
                  {fundData.description}
                </p>
              )}
            </>
          ) : (
            <div style={{ color:C.dim, fontSize:"0.82rem" }}>
              {loading ? "Loading fundamentals..." : errors.fund || "No data"}
            </div>
          )}
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════
           ROW 2 — Finnhub live quote + Market Overview
         ════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:"1.5rem" }}>

        {/* Finnhub live quote */}
        <Card>
          <SectionHead
            icon="⚡" title="Finnhub — Live Quote"
            sub="Real-time price · 60 API calls/min free"
            color={C.finnhub} badge="Finnhub"
          />
          {finnData?.price ? (
            <>
              <div style={{ textAlign:"center", padding:"1rem 0" }}>
                <div style={{ fontSize:"2.2rem", fontWeight:800,
                              fontFamily:"monospace", color:"#f1f5f9" }}>
                  ₹{fmt(finnData.price)}
                </div>
                <div style={{ fontSize:"1rem", fontWeight:700, marginTop:4,
                              color: pos ? "#10b981" : "#ef4444" }}>
                  {pos ? "▲" : "▼"} {fmt(Math.abs(finnData.change))} ({pos?"+":""}{fmt(finnData.change_pct)}%)
                </div>
              </div>
              <KV label="Open"       value={`₹${fmt(finnData.open)}`} />
              <KV label="High"       value={`₹${fmt(finnData.high)}`} valueColor="#10b981"/>
              <KV label="Low"        value={`₹${fmt(finnData.low)}`}  valueColor="#ef4444"/>
              <KV label="Prev Close" value={`₹${fmt(finnData.prev_close)}`} />
              <KV label="Updated"    value={finnData.timestamp
                                           ? new Date(finnData.timestamp).toLocaleTimeString("en-IN")
                                           : "—"} />
              <div style={{ marginTop:"1rem", fontSize:"0.72rem", color:C.dim,
                            background: C.bg2, borderRadius:8, padding:"8px 12px" }}>
                🔌 Also supports WebSocket tick stream for sub-second updates<br/>
                <code style={{ color: C.finnhub }}>wss://ws.finnhub.io?token=KEY</code>
              </div>
            </>
          ) : (
            <div style={{ color:C.dim, fontSize:"0.82rem" }}>
              {loading ? "Fetching from Finnhub..." : errors.finnhub || "No data"}
            </div>
          )}
        </Card>

        {/* Market overview (all stocks) */}
        <Card>
          <SectionHead
            icon="🌐" title="Market Overview — All Tracked Stocks"
            sub="Batch Yahoo Finance quotes · Gainers & losers"
            color={C.finnhub} badge="Yahoo Finance"
          />
          {mktOverview?.quotes ? (
            <>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
                  <thead>
                    <tr>
                      {["Symbol","Price","Change","Change %","52W High","52W Low"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"7px 12px",
                          color:C.dim, fontWeight:600, fontSize:"0.7rem",
                          borderBottom:`1px solid ${C.border}`,
                          textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mktOverview.quotes).map(([sym, q]) => (
                      <tr key={sym} style={{ cursor:"pointer" }}
                          onClick={() => { setInputSym(sym); setSymbol(sym); }}>
                        <td style={{ padding:"9px 12px", fontWeight:700,
                                     fontFamily:"monospace", borderBottom:`1px solid ${C.border}44` }}>
                          {sym}
                        </td>
                        <td style={{ padding:"9px 12px", fontFamily:"monospace",
                                     borderBottom:`1px solid ${C.border}44` }}>
                          ₹{fmt(q.price)}
                        </td>
                        <td style={{ padding:"9px 12px", color: q.change>=0?"#10b981":"#ef4444",
                                     fontFamily:"monospace", borderBottom:`1px solid ${C.border}44` }}>
                          {q.change>=0?"+":""}{fmt(q.change)}
                        </td>
                        <td style={{ padding:"9px 12px", color: q.change_pct>=0?"#10b981":"#ef4444",
                                     fontWeight:700, borderBottom:`1px solid ${C.border}44` }}>
                          {q.change_pct>=0?"+":""}{fmt(q.change_pct)}%
                        </td>
                        <td style={{ padding:"9px 12px", color:C.muted,
                                     borderBottom:`1px solid ${C.border}44` }}>
                          ₹{fmt(q["52w_high"])}
                        </td>
                        <td style={{ padding:"9px 12px", color:C.muted,
                                     borderBottom:`1px solid ${C.border}44` }}>
                          ₹{fmt(q["52w_low"])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ color:C.dim, fontSize:"0.82rem" }}>
              {loading ? "Loading market data..." : "No overview data"}
            </div>
          )}
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════
           ROW 3 — NewsAPI + Reddit
         ════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>

        {/* NewsAPI */}
        <Card>
          <SectionHead
            icon="📰" title="NewsAPI — Financial Headlines"
            sub="Top business news · English · Published today"
            color={C.news} badge="NewsAPI"
            count={newsData?.count}
          />
          {newsData?.articles?.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.8rem" }}>
              {newsData.articles.map((a, i) => (
                <div key={i} style={{
                  background: C.bg2, borderRadius:10, padding:"0.9rem",
                  borderLeft:`3px solid ${C.news}44`,
                }}>
                  <div style={{ fontSize:"0.82rem", fontWeight:600,
                                lineHeight:1.5, marginBottom:4 }}>
                    {a.title}
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:"0.68rem", color:C.dim }}>{a.source}</span>
                    <span style={{ fontSize:"0.68rem", color:C.dim }}>·</span>
                    <span style={{ fontSize:"0.68rem", color:C.dim }}>
                      {a.published ? new Date(a.published).toLocaleDateString("en-IN") : ""}
                    </span>
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noreferrer"
                         style={{ fontSize:"0.68rem", color: C.news,
                                  textDecoration:"none", marginLeft:"auto" }}>
                        Read →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color:C.dim, fontSize:"0.82rem" }}>
              {loading ? "Fetching from NewsAPI..." : errors.news || "No articles found"}
            </div>
          )}
        </Card>

        {/* Reddit */}
        <Card>
          <SectionHead
            icon="🤖" title="Reddit API — Social Sentiment"
            sub="r/IndiaInvestments · r/DalalStreetTalks · r/IndianStockMarket"
            color={C.reddit} badge="Reddit"
            count={redditData?.mentions?.post_count}
          />

          {/* Mention stats */}
          {redditData?.mentions && (
            <div style={{
              display:"grid", gridTemplateColumns:"repeat(3,1fr)",
              gap:"0.8rem", marginBottom:"1.2rem",
            }}>
              {[
                ["Posts",    redditData.mentions.post_count,    C.reddit],
                ["Score",    redditData.mentions.total_score,   "#f59e0b"],
                ["Comments", redditData.mentions.total_comments,"#3b82f6"],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  background: C.bg2, borderRadius:10, padding:"0.8rem",
                  textAlign:"center",
                }}>
                  <div style={{ fontSize:"1.3rem", fontWeight:800, color,
                                fontFamily:"monospace" }}>{val}</div>
                  <div style={{ fontSize:"0.68rem", color:C.dim }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Posts list */}
          {redditData?.posts?.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem" }}>
              {redditData.posts.slice(0,6).map((p, i) => (
                <div key={i} style={{
                  background: C.bg2, borderRadius:10, padding:"0.8rem",
                  borderLeft:`3px solid ${C.reddit}44`,
                }}>
                  <div style={{ fontSize:"0.8rem", fontWeight:600,
                                lineHeight:1.5, marginBottom:4 }}>
                    {p.title}
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:"0.68rem", color: C.reddit }}>
                      ▲ {p.score}
                    </span>
                    <span style={{ fontSize:"0.68rem", color:C.dim }}>
                      💬 {p.comments}
                    </span>
                    <span style={{ fontSize:"0.68rem", color:C.dim }}>
                      r/{p.subreddit}
                    </span>
                    <span style={{ fontSize:"0.68rem",
                                   color: p.upvote_ratio > 0.8 ? "#10b981" : C.dim }}>
                      {p.upvote_ratio ? `${Math.round(p.upvote_ratio*100)}% upvoted` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color:C.dim, fontSize:"0.82rem" }}>
              {loading ? "Fetching from Reddit..." : errors.reddit || "No posts found"}
            </div>
          )}
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════
           ROW 4 — Combined NLP Sentiment (News + Reddit → FinBERT)
         ════════════════════════════════════════════════════ */}
      <Card>
        <SectionHead
          icon="🧠" title="Combined NLP Sentiment — NewsAPI + Reddit → FinBERT"
          sub="All text sources merged and analysed by HuggingFace ProsusAI/FinBERT"
          color="#10b981" badge="FinBERT NLP"
          count={sentData?.count}
        />
        {sentData ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem" }}>

            {/* Sentiment gauge */}
            <div style={{ background:C.bg2, borderRadius:12, padding:"1.2rem", textAlign:"center" }}>
              <div style={{ fontSize:"0.7rem", color:C.dim, marginBottom:8 }}>Overall Sentiment</div>
              <div style={{ fontSize:"1.6rem", fontWeight:800,
                color: sentData.sentiment==="BULLISH" ? "#10b981"
                     : sentData.sentiment==="BEARISH" ? "#ef4444" : "#f59e0b" }}>
                {sentData.sentiment}
              </div>
              <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:4 }}>
                Score: {fmt(sentData.score)}
              </div>
            </div>

            {/* Bullish */}
            <div style={{ background:C.bg2, borderRadius:12, padding:"1.2rem" }}>
              <div style={{ fontSize:"0.7rem", color:"#10b981", marginBottom:8, fontWeight:600 }}>Bullish</div>
              <div style={{ height:8, background:C.bg3, borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                <div style={{ width:`${sentData.bullish}%`, height:"100%",
                              background:"#10b981", borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:"1.4rem", fontWeight:800, color:"#10b981",
                            fontFamily:"monospace" }}>
                {fmt(sentData.bullish)}%
              </div>
            </div>

            {/* Bearish */}
            <div style={{ background:C.bg2, borderRadius:12, padding:"1.2rem" }}>
              <div style={{ fontSize:"0.7rem", color:"#ef4444", marginBottom:8, fontWeight:600 }}>Bearish</div>
              <div style={{ height:8, background:C.bg3, borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                <div style={{ width:`${sentData.bearish}%`, height:"100%",
                              background:"#ef4444", borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:"1.4rem", fontWeight:800, color:"#ef4444",
                            fontFamily:"monospace" }}>
                {fmt(sentData.bearish)}%
              </div>
            </div>

            {/* Sources used */}
            <div style={{ background:C.bg2, borderRadius:12, padding:"1.2rem" }}>
              <div style={{ fontSize:"0.7rem", color:C.dim, marginBottom:10, fontWeight:600 }}>Sources Used</div>
              {(sentData.sources_used || []).map(s => (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:8,
                                       marginBottom:6, fontSize:"0.78rem" }}>
                  <span style={{ color:"#10b981" }}>✓</span> {s}
                </div>
              ))}
              <div style={{ marginTop:"0.8rem", fontSize:"0.7rem", color:C.dim }}>
                {sentData.count} texts analysed
              </div>
              {sentData.reddit_mentions > 0 && (
                <div style={{ fontSize:"0.7rem", color: C.reddit, marginTop:4 }}>
                  Reddit: {sentData.reddit_mentions} posts
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color:C.dim, fontSize:"0.82rem" }}>
            {loading ? "Running FinBERT sentiment analysis..." : errors.sent || "No sentiment data"}
          </div>
        )}

        {/* Top headlines used for NLP */}
        {sentData?.top_headlines?.length > 0 && (
          <div style={{ marginTop:"1.2rem" }}>
            <div style={{ fontSize:"0.72rem", color:C.dim, fontWeight:700,
                          marginBottom:"0.8rem", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Headlines fed into FinBERT
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {sentData.top_headlines.map((h, i) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:"0.8rem",
                                       color:C.muted, alignItems:"flex-start" }}>
                  <span style={{ color:"#10b981", flexShrink:0 }}>›</span>
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Data Source Summary Table ── */}
      <Card>
        <SectionHead
          icon="📊" title="Data Source Summary"
          sub="All 4 sources and what each provides to TradeMind AI"
          color="#8b5cf6"
        />
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
          <thead>
            <tr>
              {["Source","Type","What it provides","Used for","Rate limit"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"8px 14px",
                  color:C.dim, fontWeight:600, fontSize:"0.7rem",
                  borderBottom:`1px solid ${C.border}`, textTransform:"uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              [C.yahoo,   "📈 Yahoo Finance", "Free / yfinance", "Historical OHLCV, fundamentals, 52W H/L",   "AI training data, chart rendering",     "Generous (no official limit)"],
              [C.finnhub, "⚡ Finnhub",        "REST + WebSocket", "Live quotes, candles, company profile",   "Real-time price display, tick stream",  "60 calls/min (free)"],
              [C.news,    "📰 NewsAPI",        "REST API",         "News headlines, articles, sources",        "FinBERT NLP, fraud news volume check",  "100 req/day (free)"],
              [C.reddit,  "🤖 Reddit (PRAW)",  "OAuth2 / PRAW",   "Posts, scores, comments, mentions",        "Social sentiment, pump-dump detection",  "60 req/min (free)"],
            ].map(([color, src, type, provides, usedFor, rateLimit]) => (
              <tr key={src}>
                <td style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}44` }}>
                  <Badge label={src} color={color}/>
                </td>
                <td style={{ padding:"10px 14px", color:C.dim, fontSize:"0.78rem",
                             borderBottom:`1px solid ${C.border}44` }}>{type}</td>
                <td style={{ padding:"10px 14px", color:C.muted,
                             borderBottom:`1px solid ${C.border}44` }}>{provides}</td>
                <td style={{ padding:"10px 14px", color:C.muted,
                             borderBottom:`1px solid ${C.border}44` }}>{usedFor}</td>
                <td style={{ padding:"10px 14px", color:C.dim, fontSize:"0.75rem",
                             borderBottom:`1px solid ${C.border}44`,
                             fontFamily:"monospace" }}>{rateLimit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

    </div>
  );
}
