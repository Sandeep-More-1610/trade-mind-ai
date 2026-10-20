package com.trademind.controller;

import com.trademind.model.Trade;
import com.trademind.service.TradeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/trade")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    // POST /api/trade/buy
    @PostMapping("/buy")
    public ResponseEntity<?> buy(@Valid @RequestBody TradeRequest req, Authentication auth) {
        return ResponseEntity.ok(tradeService.executeBuy(auth.getName(), req.getSymbol(), req.getQuantity()));
    }

    // POST /api/trade/sell
    @PostMapping("/sell")
    public ResponseEntity<?> sell(@Valid @RequestBody TradeRequest req, Authentication auth) {
        return ResponseEntity.ok(tradeService.executeSell(auth.getName(), req.getSymbol(), req.getQuantity()));
    }

    // GET /api/trade/history
    @GetMapping("/history")
    public ResponseEntity<List<Trade>> getHistory(Authentication auth) {
        return ResponseEntity.ok(tradeService.getTradeHistory(auth.getName()));
    }

    @Data static class TradeRequest {
        @NotBlank private String symbol;
        @Min(1)  private int quantity;
    }
}


// ============================================================
//  controller/PortfolioController.java  — /api/portfolio
// ============================================================
