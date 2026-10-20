package com.trademind.repository;

import com.trademind.model.FraudAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FraudAlertRepository extends JpaRepository<FraudAlert, Long> {
    List<FraudAlert> findTop10ByOrderByDetectedAtDesc();
}


// ============================================================
//  repository/PriceHistoryRepository.java
// ============================================================
