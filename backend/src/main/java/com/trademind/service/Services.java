// ============================================================
//  service/StockService.java
// ============================================================
package com.trademind.service;

import com.trademind.model.Stock;
import com.trademind.repository.StockRepository;
import com.trademind.repository.PriceHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Optional;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockRepository stockRepo;
    private final PriceHistoryRepository historyRepo;

    @Value("${finnhub.api.key}")
    private String finnhubKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://finnhub.io/api/v1")
            .build();

    public List<Stock> getAllStocks() {
        return stockRepo.findAll();
    }

    public Optional<Stock> getQuote(String symbol) {
        // Try live Finnhub price first
        try {
            Map<?,?> resp = webClient.get()
                .uri("/quote?symbol={sym}&token={key}", symbol, finnhubKey)
                .retrieve().bodyToMono(Map.class).block();

            if (resp != null && resp.get("c") != null) {
                stockRepo.findBySymbol(symbol).ifPresent(s -> {
                    s.setLastPrice(new java.math.BigDecimal(resp.get("c").toString()));
                    double prev = Double.parseDouble(resp.get("pc").toString());
                    double cur  = Double.parseDouble(resp.get("c").toString());
                    s.setChangePct(new java.math.BigDecimal(
                            String.format("%.2f", ((cur - prev) / prev) * 100)));
                    s.setUpdatedAt(java.time.LocalDateTime.now());
                    stockRepo.save(s);
                });
            }
        } catch (Exception ignored) { /* fall back to DB */ }

        return stockRepo.findBySymbol(symbol);
    }

    public List<?> getPriceHistory(String symbol, String period) {
        int days = switch (period) {
            case "1W" -> 7;
            case "1M" -> 30;
            case "3M" -> 90;
            case "1Y" -> 365;
            default   -> 1;
        };
        return historyRepo.findBySymbolOrderByDateDesc(symbol, days);
    }

    public List<Stock> getTopGainers() {
        return stockRepo.findTop5ByOrderByChangePctDesc();
    }

    public List<Stock> getTopLosers() {
        return stockRepo.findTop5ByOrderByChangePctAsc();
    }
}


// ============================================================
//  service/PredictionService.java
// ============================================================
package com.trademind.service;

import com.trademind.model.Prediction;
import com.trademind.repository.PredictionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final PredictionRepository predictionRepo;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final WebClient webClient = WebClient.builder().build();

    @Cacheable(value = "predictions", key = "#symbol")
    public Prediction getPrediction(String symbol) {
        try {
            // Call Python AI microservice
            Map<?,?> resp = webClient.get()
                .uri(aiServiceUrl + "/predict/" + symbol)
                .retrieve().bodyToMono(Map.class).block();

            if (resp != null) {
                Prediction p = Prediction.builder()
                    .symbol(symbol)
                    .signal(Prediction.Signal.valueOf(resp.get("signal").toString()))
                    .confidence(new BigDecimal(resp.get("confidence").toString()))
                    .aiScore(new BigDecimal(resp.get("ai_score").toString()))
                    .sentiment(resp.get("sentiment").toString())
                    .riskLevel(Prediction.RiskLevel.valueOf(resp.get("risk_level").toString()))
                    .trend(resp.get("trend").toString())
                    .predictedAt(LocalDateTime.now())
                    .build();
                predictionRepo.save(p);
                return p;
            }
        } catch (Exception e) {
            // Return last saved prediction from DB
            return predictionRepo.findTopBySymbolOrderByPredictedAtDesc(symbol)
                    .orElse(fallbackPrediction(symbol));
        }
        return fallbackPrediction(symbol);
    }

    public Map<String, Object> getAiScore(String symbol) {
        Prediction p = getPrediction(symbol);
        return Map.of(
            "symbol",     symbol,
            "aiScore",    p.getAiScore(),
            "signal",     p.getSignal(),
            "confidence", p.getConfidence(),
            "sentiment",  p.getSentiment(),
            "riskLevel",  p.getRiskLevel(),
            "trend",      p.getTrend()
        );
    }

    private Prediction fallbackPrediction(String symbol) {
        return Prediction.builder()
            .symbol(symbol)
            .signal(Prediction.Signal.HOLD)
            .confidence(new BigDecimal("60.00"))
            .aiScore(new BigDecimal("55.00"))
            .sentiment("NEUTRAL")
            .riskLevel(Prediction.RiskLevel.MEDIUM)
            .trend("SIDEWAYS")
            .build();
    }
}


// ============================================================
//  service/SentimentService.java
// ============================================================
package com.trademind.service;

import com.trademind.repository.SentimentFeedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SentimentService {

    private final SentimentFeedRepository feedRepo;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final WebClient webClient = WebClient.builder().build();

    @Cacheable(value = "sentiment", key = "#symbol")
    public Map<?,?> getSentiment(String symbol) {
        try {
            return webClient.get()
                .uri(aiServiceUrl + "/sentiment/" + symbol)
                .retrieve().bodyToMono(Map.class).block();
        } catch (Exception e) {
            return Map.of(
                "symbol",        symbol,
                "bullishScore",  60,
                "bearishScore",  40,
                "sentiment",     "NEUTRAL",
                "newsCount",     0,
                "sources",       List.of()
            );
        }
    }

    public Map<?,?> getMarketOverview() {
        try {
            return webClient.get()
                .uri(aiServiceUrl + "/sentiment/market")
                .retrieve().bodyToMono(Map.class).block();
        } catch (Exception e) {
            return Map.of("fearGreedIndex", 55, "mood", "NEUTRAL");
        }
    }

    // Refresh sentiment every 15 minutes
    @Scheduled(fixedRate = 900000)
    public void refreshSentiment() {
        List.of("TCS","RELIANCE","HDFCBANK","INFY","WIPRO","TATAMOTORS")
            .forEach(sym -> {
                try { getSentiment(sym); } catch (Exception ignored) {}
            });
    }
}


// ============================================================
//  service/TradeService.java
// ============================================================
package com.trademind.service;

import com.trademind.model.*;
import com.trademind.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final UserRepository    userRepo;
    private final StockRepository   stockRepo;
    private final PortfolioRepository portRepo;
    private final TradeRepository   tradeRepo;

    @Transactional
    public Map<String, Object> executeBuy(String email, String symbol, int qty) {
        User  user  = userRepo.findByEmail(email).orElseThrow();
        Stock stock = stockRepo.findBySymbol(symbol).orElseThrow();

        BigDecimal totalCost = stock.getLastPrice().multiply(BigDecimal.valueOf(qty));

        if (user.getVirtualBalance().compareTo(totalCost) < 0)
            throw new RuntimeException("Insufficient virtual balance");

        // Deduct balance
        user.setVirtualBalance(user.getVirtualBalance().subtract(totalCost));
        userRepo.save(user);

        // Update portfolio (upsert)
        Portfolio holding = portRepo.findByUserAndSymbol(user, symbol)
            .orElse(Portfolio.builder().user(user).symbol(symbol).quantity(0)
                    .avgBuyPrice(BigDecimal.ZERO).build());

        BigDecimal totalQty   = BigDecimal.valueOf(holding.getQuantity() + qty);
        BigDecimal totalValue = holding.getAvgBuyPrice()
                .multiply(BigDecimal.valueOf(holding.getQuantity()))
                .add(totalCost);
        holding.setAvgBuyPrice(totalValue.divide(totalQty, 2, RoundingMode.HALF_UP));
        holding.setQuantity(holding.getQuantity() + qty);
        portRepo.save(holding);

        // Record trade
        tradeRepo.save(Trade.builder()
            .user(user).symbol(symbol)
            .tradeType(Trade.TradeType.BUY)
            .quantity(qty).price(stock.getLastPrice())
            .totalValue(totalCost).build());

        return Map.of("message", "BUY successful",
                      "symbol", symbol, "qty", qty,
                      "price", stock.getLastPrice(),
                      "newBalance", user.getVirtualBalance());
    }

    @Transactional
    public Map<String, Object> executeSell(String email, String symbol, int qty) {
        User      user    = userRepo.findByEmail(email).orElseThrow();
        Stock     stock   = stockRepo.findBySymbol(symbol).orElseThrow();
        Portfolio holding = portRepo.findByUserAndSymbol(user, symbol)
                .orElseThrow(() -> new RuntimeException("No holdings found for " + symbol));

        if (holding.getQuantity() < qty)
            throw new RuntimeException("Not enough shares to sell");

        BigDecimal totalValue = stock.getLastPrice().multiply(BigDecimal.valueOf(qty));

        // Credit balance
        user.setVirtualBalance(user.getVirtualBalance().add(totalValue));
        userRepo.save(user);

        // Update portfolio
        holding.setQuantity(holding.getQuantity() - qty);
        if (holding.getQuantity() == 0) portRepo.delete(holding);
        else portRepo.save(holding);

        // Record trade
        tradeRepo.save(Trade.builder()
            .user(user).symbol(symbol)
            .tradeType(Trade.TradeType.SELL)
            .quantity(qty).price(stock.getLastPrice())
            .totalValue(totalValue).build());

        BigDecimal pnl = stock.getLastPrice().subtract(holding.getAvgBuyPrice())
                .multiply(BigDecimal.valueOf(qty));

        return Map.of("message", "SELL successful",
                      "symbol", symbol, "qty", qty,
                      "price",  stock.getLastPrice(),
                      "pnl",    pnl,
                      "newBalance", user.getVirtualBalance());
    }

    public List<Trade> getTradeHistory(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        return tradeRepo.findByUserOrderByTradedAtDesc(user);
    }
}


// ============================================================
//  service/PortfolioService.java
// ============================================================
package com.trademind.service;

import com.trademind.model.*;
import com.trademind.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final UserRepository      userRepo;
    private final PortfolioRepository portRepo;
    private final StockRepository     stockRepo;

    public List<Map<String, Object>> getPortfolio(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        List<Portfolio> holdings = portRepo.findByUser(user);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Portfolio h : holdings) {
            Stock stock = stockRepo.findBySymbol(h.getSymbol()).orElse(null);
            if (stock == null) continue;

            BigDecimal ltp    = stock.getLastPrice();
            BigDecimal pnl    = ltp.subtract(h.getAvgBuyPrice())
                                   .multiply(BigDecimal.valueOf(h.getQuantity()));
            BigDecimal pnlPct = pnl.divide(
                    h.getAvgBuyPrice().multiply(BigDecimal.valueOf(h.getQuantity())), 4,
                    java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));

            result.add(Map.of(
                "symbol",      h.getSymbol(),
                "name",        stock.getName(),
                "quantity",    h.getQuantity(),
                "avgBuyPrice", h.getAvgBuyPrice(),
                "ltp",         ltp,
                "currentValue",ltp.multiply(BigDecimal.valueOf(h.getQuantity())),
                "pnl",         pnl,
                "pnlPct",      pnlPct
            ));
        }
        return result;
    }

    public Map<String, Object> getSummary(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        List<Portfolio> holdings = portRepo.findByUser(user);

        BigDecimal holdingsValue = holdings.stream()
            .map(h -> stockRepo.findBySymbol(h.getSymbol())
                    .map(s -> s.getLastPrice().multiply(BigDecimal.valueOf(h.getQuantity())))
                    .orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalWorth = user.getVirtualBalance().add(holdingsValue);
        BigDecimal pnl        = totalWorth.subtract(new BigDecimal("1000000"));

        return Map.of(
            "balance",       user.getVirtualBalance(),
            "holdingsValue", holdingsValue,
            "totalWorth",    totalWorth,
            "pnl",           pnl,
            "pnlPct",        pnl.divide(new BigDecimal("10000"), 2, java.math.RoundingMode.HALF_UP)
        );
    }
}


// ============================================================
//  service/LeaderboardService.java
// ============================================================
package com.trademind.service;

import com.trademind.repository.LeaderboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final LeaderboardRepository leaderboardRepo;

    @Cacheable(value = "leaderboard")
    public List<?> getTop(int limit) {
        return leaderboardRepo.getTopUsers(limit);
    }
}


// ============================================================
//  service/FraudService.java
// ============================================================
package com.trademind.service;

import com.trademind.model.FraudAlert;
import com.trademind.repository.FraudAlertRepository;
import com.trademind.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FraudService {

    private final FraudAlertRepository fraudRepo;
    private final StockRepository      stockRepo;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final WebClient webClient = WebClient.builder().build();

    public List<FraudAlert> getActiveAlerts() {
        return fraudRepo.findTop10ByOrderByDetectedAtDesc();
    }

    public Map<?,?> getRiskScore(String symbol) {
        try {
            return webClient.get()
                .uri(aiServiceUrl + "/fraud/" + symbol)
                .retrieve().bodyToMono(Map.class).block();
        } catch (Exception e) {
            return Map.of("symbol", symbol, "riskScore", 10, "riskLevel", "LOW");
        }
    }

    // Run fraud detection every 30 minutes
    @Scheduled(fixedRate = 1800000)
    public void runFraudDetection() {
        stockRepo.findAll().forEach(stock -> {
            try {
                Map<?,?> result = webClient.get()
                    .uri(aiServiceUrl + "/fraud/" + stock.getSymbol())
                    .retrieve().bodyToMono(Map.class).block();

                if (result != null) {
                    double riskScore = Double.parseDouble(result.get("riskScore").toString());
                    if (riskScore > 50) {
                        FraudAlert alert = FraudAlert.builder()
                            .symbol(stock.getSymbol())
                            .riskScore(new BigDecimal(riskScore))
                            .riskLevel(riskScore > 75
                                ? FraudAlert.RiskLevel.HIGH
                                : FraudAlert.RiskLevel.MEDIUM)
                            .volumeSpike(new BigDecimal(result.getOrDefault("volumeSpike","0").toString()))
                            .socialSpike(new BigDecimal(result.getOrDefault("socialSpike","0").toString()))
                            .description(result.getOrDefault("description","Unusual activity detected").toString())
                            .build();
                        fraudRepo.save(alert);
                    }
                }
            } catch (Exception ignored) {}
        });
    }
}
