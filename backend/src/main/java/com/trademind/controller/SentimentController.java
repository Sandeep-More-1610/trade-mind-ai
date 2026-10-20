package com.trademind.controller;

import com.trademind.service.SentimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sentiment")
@RequiredArgsConstructor
public class SentimentController {

    private final SentimentService sentimentService;

    // GET /api/sentiment/{symbol}  — NLP sentiment for a stock
    @GetMapping("/{symbol}")
    public ResponseEntity<?> getSentiment(@PathVariable String symbol) {
        return ResponseEntity.ok(sentimentService.getSentiment(symbol));
    }

    // GET /api/sentiment/market/overview  — Overall market sentiment
    @GetMapping("/market/overview")
    public ResponseEntity<?> getMarketOverview() {
        return ResponseEntity.ok(sentimentService.getMarketOverview());
    }
}


// ============================================================
//  controller/TradeController.java  — /api/trade
// ============================================================
