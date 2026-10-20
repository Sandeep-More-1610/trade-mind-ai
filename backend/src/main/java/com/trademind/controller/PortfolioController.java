package com.trademind.controller;

import com.trademind.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    // GET /api/portfolio  — user's full portfolio with P&L
    @GetMapping
    public ResponseEntity<?> getPortfolio(Authentication auth) {
        return ResponseEntity.ok(portfolioService.getPortfolio(auth.getName()));
    }

    // GET /api/portfolio/summary  — balance, holdings, total worth
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(Authentication auth) {
        return ResponseEntity.ok(portfolioService.getSummary(auth.getName()));
    }
}


// ============================================================
//  controller/LeaderboardController.java  — /api/leaderboard
// ============================================================
