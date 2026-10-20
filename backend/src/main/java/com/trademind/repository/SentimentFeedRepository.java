package com.trademind.repository;

import com.trademind.model.SentimentFeed;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SentimentFeedRepository extends JpaRepository<SentimentFeed, Long> {
    List<SentimentFeed> findTop20BySymbolOrderByFetchedAtDesc(String symbol);
}


// ============================================================
//  repository/FraudAlertRepository.java
// ============================================================
