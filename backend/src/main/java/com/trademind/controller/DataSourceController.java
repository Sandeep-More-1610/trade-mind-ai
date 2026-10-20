// ============================================================
//  controller/DataSourceController.java
//  Exposes all 4 data source endpoints to the React frontend
//  Base: /api/data
// ============================================================
package com.trademind.controller;

import com.trademind.service.DataSourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataSourceController {

    private final DataSourceService dataSourceService;

    // ── Yahoo Finance ────────────────────────────────────────

    /**
     * GET /api/data/yahoo/{symbol}/history?period=1mo&interval=1d
     * Historical OHLCV data from Yahoo Finance
     */
    @GetMapping("/yahoo/{symbol}/history")
    public ResponseEntity<?> yahooHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1mo") String period,
            @RequestParam(defaultValue = "1d")  String interval) {
        return ResponseEntity.ok(
                dataSourceService.getYahooHistory(symbol, period, interval));
    }

    /**
     * GET /api/data/yahoo/{symbol}/fundamentals
     * Company fundamentals: P/E, EPS, sector, beta, market cap
     */
    @GetMapping("/yahoo/{symbol}/fundamentals")
    public ResponseEntity<?> fundamentals(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getFundamentals(symbol));
    }

    // ── Finnhub ──────────────────────────────────────────────

    /**
     * GET /api/data/finnhub/{symbol}/quote
     * Live real-time price from Finnhub
     */
    @GetMapping("/finnhub/{symbol}/quote")
    public ResponseEntity<?> finnhubQuote(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getLiveQuote(symbol));
    }

    /**
     * GET /api/data/finnhub/market-status
     * Is NSE currently open or closed?
     */
    @GetMapping("/finnhub/market-status")
    public ResponseEntity<?> marketStatus() {
        return ResponseEntity.ok(dataSourceService.getMarketStatus());
    }

    /**
     * GET /api/data/market/overview
     * Batch live quotes + gainers/losers for all tracked stocks
     */
    @GetMapping("/market/overview")
    public ResponseEntity<?> marketOverview() {
        return ResponseEntity.ok(dataSourceService.getMarketOverview());
    }

    // ── NewsAPI ──────────────────────────────────────────────

    /**
     * GET /api/data/news/{symbol}?limit=20
     * Latest financial news articles from NewsAPI
     */
    @GetMapping("/news/{symbol}")
    public ResponseEntity<?> stockNews(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(dataSourceService.getStockNews(symbol, limit));
    }

    // ── Reddit ───────────────────────────────────────────────

    /**
     * GET /api/data/reddit/{symbol}
     * Reddit posts + mention count from r/IndiaInvestments etc.
     */
    @GetMapping("/reddit/{symbol}")
    public ResponseEntity<?> redditData(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getRedditData(symbol));
    }

    // ── Combined ─────────────────────────────────────────────

    /**
     * GET /api/data/sentiment/{symbol}
     * NLP sentiment from NewsAPI + Reddit combined → FinBERT
     */
    @GetMapping("/sentiment/{symbol}")
    public ResponseEntity<?> sentiment(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getSentiment(symbol));
    }

    /**
     * GET /api/data/sentiment/market
     * Overall Fear/Greed index across all tracked stocks
     */
    @GetMapping("/sentiment/market")
    public ResponseEntity<?> marketSentiment() {
        return ResponseEntity.ok(dataSourceService.getMarketSentiment());
    }

    /**
     * GET /api/data/predict/{symbol}
     * Full AI prediction using all 4 data sources
     */
    @GetMapping("/predict/{symbol}")
    public ResponseEntity<?> predict(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getAiPrediction(symbol));
    }

    /**
     * GET /api/data/fraud/{symbol}
     * Fraud risk score: volume + social + news spike detection
     */
    @GetMapping("/fraud/{symbol}")
    public ResponseEntity<?> fraud(@PathVariable String symbol) {
        return ResponseEntity.ok(dataSourceService.getFraudScore(symbol));
    }
}
