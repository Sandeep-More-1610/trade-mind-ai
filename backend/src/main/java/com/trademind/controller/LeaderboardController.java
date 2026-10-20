package com.trademind.controller;

import com.trademind.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    // GET /api/leaderboard?limit=10
    @GetMapping
    public ResponseEntity<?> getLeaderboard(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(leaderboardService.getTop(limit));
    }
}


// ============================================================
//  controller/FraudController.java  — /api/fraud
// ============================================================
