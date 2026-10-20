package com.trademind.repository;

import com.trademind.model.Trade;
import com.trademind.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {
    List<Trade> findByUserOrderByTradedAtDesc(User user);
}


// ============================================================
//  repository/PredictionRepository.java
// ============================================================
