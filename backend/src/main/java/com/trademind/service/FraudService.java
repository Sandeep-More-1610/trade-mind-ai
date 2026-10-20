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
                            .volumeSpike(new BigDecimal((result.containsKey("volumeSpike") ? result.get("volumeSpike") : "0").toString()))
                            .socialSpike(new BigDecimal((result.containsKey("socialSpike") ? result.get("socialSpike") : "0").toString()))
                            .description((result.containsKey("description") ? result.get("description") : "Unusual activity detected").toString())
                            .build();
                        fraudRepo.save(alert);
                    }
                }
            } catch (Exception ignored) {}
        });
    }
}
