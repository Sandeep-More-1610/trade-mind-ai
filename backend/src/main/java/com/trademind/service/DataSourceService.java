// ============================================================
//  service/DataSourceService.java
//  Spring Boot service that calls the Python AI microservice
//  routes for each of the 4 data sources:
//    Yahoo Finance · Finnhub · NewsAPI · Reddit
// ============================================================
package com.trademind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataSourceService {

    @Value("${ai.service.url}")
    private String aiUrl;

    private final WebClient webClient = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();

    // ── Generic GET helper ───────────────────────────────────
    private Map<?,?> get(String path) {
        try {
            return webClient.get()
                    .uri(aiUrl + path)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.warn("DataSourceService GET {} failed: {}", path, e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════
    //  1. YAHOO FINANCE  — OHLCV + Fundamentals
    // ════════════════════════════════════════════════════════

    /**
     * Historical OHLCV from Yahoo Finance.
     * period  : 1d 5d 1mo 3mo 6mo 1y 2y
     * interval: 1m 5m 15m 1h 1d 1wk
     */
    @Cacheable(value = "yahooHistory", key = "#symbol + #period + #interval")
    public Map<?,?> getYahooHistory(String symbol, String period, String interval) {
        log.info("[Yahoo] Fetching history: {} {} {}", symbol, period, interval);
        return get("/history/" + symbol + "?period=" + period + "&interval=" + interval);
    }

    /**
     * Company fundamentals: P/E ratio, EPS, sector, beta, dividend yield.
     */
    @Cacheable(value = "fundamentals", key = "#symbol")
    public Map<?,?> getFundamentals(String symbol) {
        log.info("[Yahoo] Fetching fundamentals: {}", symbol);
        return get("/fundamentals/" + symbol);
    }

    // ════════════════════════════════════════════════════════
    //  2. FINNHUB  — Live Quotes + Market Status
    // ════════════════════════════════════════════════════════

    /**
     * Real-time stock quote from Finnhub.
     * Returns: price, change, change_pct, high, low, open, prev_close
     */
    @Cacheable(value = "finnhubQuote", key = "#symbol")
    public Map<?,?> getLiveQuote(String symbol) {
        log.info("[Finnhub] Fetching live quote: {}", symbol);
        return get("/quote/" + symbol);
    }

    /**
     * NSE market open/closed status.
     */
    @Cacheable(value = "marketStatus")
    public Map<?,?> getMarketStatus() {
        log.info("[Finnhub] Fetching market status");
        return get("/market-status");
    }

    /**
     * Batch live quotes for all tracked stocks (via Yahoo batch).
     */
    @Cacheable(value = "marketOverview")
    public Map<?,?> getMarketOverview() {
        log.info("[Yahoo/Finnhub] Fetching market overview");
        return get("/market/overview");
    }

    // ════════════════════════════════════════════════════════
    //  3. NEWS API  — Financial News Headlines
    // ════════════════════════════════════════════════════════

    /**
     * Latest news articles for a stock from NewsAPI.
     * Used by: sentiment analyzer, fraud detection news volume check.
     */
    @Cacheable(value = "stockNews", key = "#symbol + #limit")
    public Map<?,?> getStockNews(String symbol, int limit) {
        log.info("[NewsAPI] Fetching news: {} (limit {})", symbol, limit);
        return get("/news/" + symbol + "?limit=" + limit);
    }

    // ════════════════════════════════════════════════════════
    //  4. REDDIT API  — Social Sentiment
    // ════════════════════════════════════════════════════════

    /**
     * Reddit posts mentioning a stock + mention count.
     * Subreddits: r/IndiaInvestments, r/DalalStreetTalks,
     *             r/IndianStockMarket, r/wallstreetbets
     */
    @Cacheable(value = "redditData", key = "#symbol")
    public Map<?,?> getRedditData(String symbol) {
        log.info("[Reddit] Fetching mentions: {}", symbol);
        return get("/reddit/" + symbol);
    }

    // ════════════════════════════════════════════════════════
    //  COMBINED — NLP Sentiment (News + Reddit → FinBERT)
    // ════════════════════════════════════════════════════════

    /**
     * Full NLP sentiment: combines NewsAPI + Reddit text,
     * runs FinBERT, returns bullish/bearish/neutral scores.
     */
    @Cacheable(value = "sentiment", key = "#symbol")
    public Map<?,?> getSentiment(String symbol) {
        log.info("[Sentiment] Running NLP for: {}", symbol);
        return get("/sentiment/" + symbol);
    }

    /**
     * Overall market sentiment — Fear/Greed index across top stocks.
     */
    @Cacheable(value = "marketSentiment")
    public Map<?,?> getMarketSentiment() {
        log.info("[Sentiment] Fetching market overview");
        return get("/sentiment/market");
    }

    // ════════════════════════════════════════════════════════
    //  FULL AI PREDICTION (all 4 sources fused)
    // ════════════════════════════════════════════════════════

    /**
     * Complete AI prediction:
     *   Yahoo OHLCV → LSTM/XGBoost/RF models
     *   Finnhub live price
     *   NewsAPI headlines → FinBERT
     *   Reddit mentions → FinBERT
     *   → Weighted AI Brain Score (BUY/HOLD/SELL)
     */
    @Cacheable(value = "predictions", key = "#symbol")
    public Map<?,?> getAiPrediction(String symbol) {
        log.info("[AI] Running full prediction: {}", symbol);
        return get("/predict/" + symbol);
    }

    // ════════════════════════════════════════════════════════
    //  FRAUD DETECTION (Yahoo volume + Reddit social spike)
    // ════════════════════════════════════════════════════════

    /**
     * Fraud risk score:
     *   Yahoo Finance  — volume spike vs 30-day avg
     *   Reddit API     — social mention spike
     *   NewsAPI        — news volume surge
     *   → Composite risk score + HIGH/MEDIUM/LOW
     */
    @Cacheable(value = "fraudScore", key = "#symbol")
    public Map<?,?> getFraudScore(String symbol) {
        log.info("[Fraud] Scanning: {}", symbol);
        return get("/fraud/" + symbol);
    }

    // ════════════════════════════════════════════════════════
    //  SCHEDULED CACHE REFRESH JOBS
    // ════════════════════════════════════════════════════════

    private static final List<String> TRACKED = List.of(
            "TCS","RELIANCE","HDFCBANK","INFY","WIPRO",
            "TATAMOTORS","ITC","BAJFINANCE"
    );

    /** Refresh live quotes every 30 seconds during market hours */
    @Scheduled(fixedRate = 30_000)
    public void refreshLiveQuotes() {
        TRACKED.forEach(sym -> {
            try { getLiveQuote(sym); }
            catch (Exception e) { log.warn("Quote refresh failed: {}", sym); }
        });
        log.debug("Live quotes refreshed for {} symbols", TRACKED.size());
    }

    /** Refresh sentiment every 15 minutes */
    @Scheduled(fixedRate = 900_000)
    public void refreshSentiment() {
        TRACKED.forEach(sym -> {
            try { getSentiment(sym); }
            catch (Exception e) { log.warn("Sentiment refresh failed: {}", sym); }
        });
        log.info("Sentiment refreshed for {} symbols", TRACKED.size());
    }

    /** Run fraud detection every 30 minutes */
    @Scheduled(fixedRate = 1_800_000)
    public void refreshFraudScores() {
        TRACKED.forEach(sym -> {
            try {
                Map<?,?> result = getFraudScore(sym);
                Object riskLevel = result.get("riskLevel");
                if ("HIGH".equals(riskLevel) || "MEDIUM".equals(riskLevel)) {
                    log.warn("[FRAUD ALERT] {} — Risk: {}, Score: {}",
                             sym, riskLevel, result.get("riskScore"));
                }
            } catch (Exception e) {
                log.warn("Fraud scan failed: {}", sym);
            }
        });
    }

    /** Refresh fundamentals once per day */
    @Scheduled(cron = "0 0 6 * * MON-FRI")   // 6 AM on trading days
    public void refreshFundamentals() {
        TRACKED.forEach(sym -> {
            try { getFundamentals(sym); }
            catch (Exception e) { log.warn("Fundamentals refresh failed: {}", sym); }
        });
        log.info("Fundamentals refreshed for {} symbols", TRACKED.size());
    }
}
