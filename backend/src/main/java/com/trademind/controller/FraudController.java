package com.trademind.controller;

import com.trademind.service.FraudService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fraud")
@RequiredArgsConstructor
public class FraudController {

    private final FraudService fraudService;

    // GET /api/fraud/alerts  — all active fraud alerts
    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        return ResponseEntity.ok(fraudService.getActiveAlerts());
    }

    // GET /api/fraud/{symbol}  — fraud risk score for a stock
    @GetMapping("/{symbol}")
    public ResponseEntity<?> getRiskScore(@PathVariable String symbol) {
        return ResponseEntity.ok(fraudService.getRiskScore(symbol));
    }
}
