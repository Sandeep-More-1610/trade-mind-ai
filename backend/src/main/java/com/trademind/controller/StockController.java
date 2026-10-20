package com.trademind.controller;

import com.trademind.model.Stock;
import com.trademind.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    // GET /api/stocks  — all stocks
    @GetMapping
    public ResponseEntity<List<Stock>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    // GET /api/stocks/{symbol}  — single stock quote
    @GetMapping("/{symbol}")
    @Cacheable(value = "stockQuotes", key = "#symbol")
    public ResponseEntity<?> getQuote(@PathVariable String symbol) {
        return stockService.getQuote(symbol)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/stocks/{symbol}/history?period=1M
    @GetMapping("/{symbol}/history")
    public ResponseEntity<?> getHistory(@PathVariable String symbol,
                                         @RequestParam(defaultValue = "1M") String period) {
        return ResponseEntity.ok(stockService.getPriceHistory(symbol, period));
    }

    // GET /api/stocks/market/gainers
    @GetMapping("/market/gainers")
    @Cacheable("gainers")
    public ResponseEntity<?> getGainers() {
        return ResponseEntity.ok(stockService.getTopGainers());
    }

    // GET /api/stocks/market/losers
    @GetMapping("/market/losers")
    @Cacheable("losers")
    public ResponseEntity<?> getLosers() {
        return ResponseEntity.ok(stockService.getTopLosers());
    }
}


// ============================================================
//  controller/PredictionController.java  — /api/predict
// ============================================================
