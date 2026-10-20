// src/services/api.js
// ── Axios instance pointing at Spring Boot backend ───────────
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080/api",
  timeout: 15000,
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("tm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("tm_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => API.post("/auth/register", data),
  login:    (data) => API.post("/auth/login",    data),
};

// ── Stocks ────────────────────────────────────────────────
export const stocksAPI = {
  getAll:      ()                     => API.get("/stocks"),
  getQuote:    (symbol)               => API.get(`/stocks/${symbol}`),
  getHistory:  (symbol, period="1M")  => API.get(`/stocks/${symbol}/history?period=${period}`),
  getGainers:  ()                     => API.get("/stocks/market/gainers"),
  getLosers:   ()                     => API.get("/stocks/market/losers"),
};

// ── AI Predictions ────────────────────────────────────────
export const predictAPI = {
  predict:     (symbol) => API.get(`/predict/${symbol}`),
  getAiScore:  (symbol) => API.get(`/predict/${symbol}/score`),
};

// ── Sentiment ─────────────────────────────────────────────
export const sentimentAPI = {
  getStock:    (symbol) => API.get(`/sentiment/${symbol}`),
  getMarket:   ()       => API.get("/sentiment/market/overview"),
};

// ── Trading ───────────────────────────────────────────────
export const tradeAPI = {
  buy:         (symbol, quantity) => API.post("/trade/buy",  { symbol, quantity }),
  sell:        (symbol, quantity) => API.post("/trade/sell", { symbol, quantity }),
  getHistory:  ()                 => API.get("/trade/history"),
};

// ── Portfolio ─────────────────────────────────────────────
export const portfolioAPI = {
  getPortfolio: () => API.get("/portfolio"),
  getSummary:   () => API.get("/portfolio/summary"),
};

// ── Leaderboard ───────────────────────────────────────────
export const leaderboardAPI = {
  getTop: (limit=10) => API.get(`/leaderboard?limit=${limit}`),
};

// ── Fraud ─────────────────────────────────────────────────
export const fraudAPI = {
  getAlerts:    ()       => API.get("/fraud/alerts"),
  getRiskScore: (symbol) => API.get(`/fraud/${symbol}`),
};

// ── Data Sources (Yahoo · Finnhub · NewsAPI · Reddit) ─────
export const dataAPI = {
  // Yahoo Finance
  getHistory:      (sym, period="1mo", interval="1d") =>
                     API.get(`/data/yahoo/${sym}/history?period=${period}&interval=${interval}`),
  getFundamentals: (sym) => API.get(`/data/yahoo/${sym}/fundamentals`),

  // Finnhub
  getLiveQuote:    (sym) => API.get(`/data/finnhub/${sym}/quote`),
  getMarketStatus: ()    => API.get(`/data/finnhub/market-status`),
  getMarketOverview: ()  => API.get(`/data/market/overview`),

  // NewsAPI
  getStockNews:    (sym, limit=20) => API.get(`/data/news/${sym}?limit=${limit}`),

  // Reddit
  getRedditData:   (sym) => API.get(`/data/reddit/${sym}`),

  // Combined NLP sentiment
  getSentiment:    (sym) => API.get(`/data/sentiment/${sym}`),
  getMarketSentiment: () => API.get(`/data/sentiment/market`),

  // Full AI prediction (all sources fused)
  getAiPrediction: (sym) => API.get(`/data/predict/${sym}`),

  // Fraud (volume + social + news)
  getFraudScore:   (sym) => API.get(`/data/fraud/${sym}`),
};

export default API;
