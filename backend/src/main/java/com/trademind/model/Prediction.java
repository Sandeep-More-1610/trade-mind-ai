package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "predictions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Prediction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Signal signal;

    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal confidence;

    @Column(name = "ai_score", precision = 5, scale = 2)
    private BigDecimal aiScore;

    private String sentiment;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel;

    private String trend;

    @Column(name = "predicted_at")
    @Builder.Default
    private LocalDateTime predictedAt = LocalDateTime.now();

    public enum Signal   { BUY, SELL, HOLD }
    public enum RiskLevel { LOW, MEDIUM, HIGH }
}


// ============================================================
//  model/FraudAlert.java
// ============================================================
