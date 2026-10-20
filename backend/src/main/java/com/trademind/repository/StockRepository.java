package com.trademind.repository;

import com.trademind.model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {
    Optional<Stock> findBySymbol(String symbol);
    List<Stock> findTop5ByOrderByChangePctDesc();
    List<Stock> findTop5ByOrderByChangePctAsc();
}


// ============================================================
//  repository/PortfolioRepository.java
// ============================================================
