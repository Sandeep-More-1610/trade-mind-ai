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

    @Value("${trademind.demo:false}")
    private boolean demo;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://finnhub.io/api/v1")
            .build();

    public List<Stock> getAllStocks() {
        return stockRepo.findAll();
    }

    public Optional<Stock> getQuote(String symbol) {
        if (demo) return stockRepo.findBySymbol(symbol);
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
        if (demo) {
            try {
                Map<?, ?> history = WebClient.create().get()
                    .uri(aiServiceUrl + "/history/" + symbol + "?period=" + period)
                    .retrieve().bodyToMono(Map.class).block(java.time.Duration.ofSeconds(12));
                if (history != null && history.get("data") instanceof List<?> rows) return rows;
            } catch (Exception ignored) { }
            return List.of();
        }
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
