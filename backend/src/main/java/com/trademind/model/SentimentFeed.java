package com.trademind.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sentiment_feed")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SentimentFeed {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;

    @Column(columnDefinition = "TEXT")
    private String headline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sentiment sentiment;

    @Column(precision = 5, scale = 2)
    private BigDecimal score;

    @Column(length = 500)
    private String url;

    @Column(name = "fetched_at")
    @Builder.Default
    private LocalDateTime fetchedAt = LocalDateTime.now();

    public enum Source { NEWS, REDDIT, TWITTER }
    public enum Sentiment { BULLISH, BEARISH, NEUTRAL }
}
