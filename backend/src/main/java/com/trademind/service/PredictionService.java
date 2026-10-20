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
