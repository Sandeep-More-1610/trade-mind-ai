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
