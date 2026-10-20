// ============================================================
//  controller/AuthController.java  — /api/auth
// ============================================================
package com.trademind.controller;

import com.trademind.model.User;
import com.trademind.repository.UserRepository;
import com.trademind.security.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .role(User.Role.USER)
                .build();

        userRepo.save(user);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(Map.of("token", token, "name", user.getName()));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return userRepo.findByEmail(req.getEmail())
                .filter(u -> encoder.matches(req.getPassword(), u.getPassword()))
                .map(u -> {
                    String token = jwtUtil.generateToken(u.getEmail(), u.getRole().name());
                    return ResponseEntity.ok(Map.of(
                            "token", token,
                            "name",  u.getName(),
                            "balance", u.getVirtualBalance()
                    ));
                })
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Invalid credentials")));
    }

    @Data static class RegisterRequest {
        @NotBlank private String name;
        @Email @NotBlank private String email;
        @NotBlank private String password;
    }
    @Data static class LoginRequest {
        @Email @NotBlank private String email;
        @NotBlank private String password;
    }
}


// ============================================================
//  controller/StockController.java  — /api/stocks
// ============================================================
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
package com.trademind.controller;

import com.trademind.model.Prediction;
import com.trademind.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    // GET /api/predict/{symbol}  — Run AI prediction for a stock
    @GetMapping("/{symbol}")
    public ResponseEntity<?> predict(@PathVariable String symbol) {
        Prediction prediction = predictionService.getPrediction(symbol);
        return ResponseEntity.ok(prediction);
    }

    // GET /api/predict/{symbol}/score  — Get AI Market Brain Score
    @GetMapping("/{symbol}/score")
    public ResponseEntity<?> getAiScore(@PathVariable String symbol) {
        return ResponseEntity.ok(predictionService.getAiScore(symbol));
    }
}


// ============================================================
//  controller/SentimentController.java  — /api/sentiment
// ============================================================
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
