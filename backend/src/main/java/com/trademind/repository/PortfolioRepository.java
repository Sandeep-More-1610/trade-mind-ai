package com.trademind.repository;

import com.trademind.model.Portfolio;
import com.trademind.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findByUser(User user);
    Optional<Portfolio> findByUserAndSymbol(User user, String symbol);
}


// ============================================================
//  repository/TradeRepository.java
// ============================================================
