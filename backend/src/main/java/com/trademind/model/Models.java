// ============================================================
//  model/User.java
// ============================================================
package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(name = "virtual_balance", precision = 15, scale = 2)
    private BigDecimal virtualBalance = new BigDecimal("1000000.00");

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Role { USER, ADMIN }
}


// ============================================================
//  model/Stock.java
// ============================================================
package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "stocks")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Stock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String symbol;

    @Column(nullable = false, length = 150)
    private String name;

    private String exchange;
    private String sector;

    @Column(name = "last_price", precision = 12, scale = 2)
    private BigDecimal lastPrice;

    @Column(name = "change_pct", precision = 6, scale = 2)
    private BigDecimal changePct;

    private Long volume;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}


// ============================================================
//  model/Portfolio.java
// ============================================================
package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "portfolio",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","symbol"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Portfolio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "avg_buy_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal avgBuyPrice;
}


// ============================================================
//  model/Trade.java
// ============================================================
package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "trades")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Trade {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "trade_type", nullable = false)
    private TradeType tradeType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "total_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalValue;

    @Column(name = "traded_at")
    private LocalDateTime tradedAt = LocalDateTime.now();

    public enum TradeType { BUY, SELL }
}


// ============================================================
//  model/Prediction.java
// ============================================================
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
    private LocalDateTime predictedAt = LocalDateTime.now();

    public enum Signal   { BUY, SELL, HOLD }
    public enum RiskLevel { LOW, MEDIUM, HIGH }
}


// ============================================================
//  model/FraudAlert.java
// ============================================================
package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "fraud_alerts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudAlert {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "risk_score", precision = 5, scale = 2, nullable = false)
    private BigDecimal riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "volume_spike", precision = 6, scale = 2)
    private BigDecimal volumeSpike;

    @Column(name = "social_spike", precision = 6, scale = 2)
    private BigDecimal socialSpike;

    private String description;

    @Column(name = "detected_at")
    private LocalDateTime detectedAt = LocalDateTime.now();

    public enum RiskLevel { LOW, MEDIUM, HIGH }
}
