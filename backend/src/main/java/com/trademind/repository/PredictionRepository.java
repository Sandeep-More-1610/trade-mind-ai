package com.trademind.repository;

import com.trademind.model.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    Optional<Prediction> findTopBySymbolOrderByPredictedAtDesc(String symbol);
}


// ============================================================
//  repository/SentimentFeedRepository.java
// ============================================================
