package com.trademind.repository;

import com.trademind.model.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    @Query(value = """
        SELECT * FROM price_history
        WHERE symbol = :symbol
        ORDER BY recorded_date DESC
        LIMIT :days
        """, nativeQuery = true)
    List<PriceHistory> findBySymbolOrderByDateDesc(
            @Param("symbol") String symbol,
            @Param("days") int days);
}


// ============================================================
//  repository/LeaderboardRepository.java
// ============================================================
