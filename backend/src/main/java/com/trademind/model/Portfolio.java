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
