// ============================================================
//  repository/UserRepository.java
// ============================================================
package com.trademind.repository;

import com.trademind.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}


// ============================================================
//  repository/StockRepository.java
// ============================================================
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
package com.trademind.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.trademind.model.User;
import java.util.List;

public interface LeaderboardRepository extends JpaRepository<User, Long> {

    @Query(value = """
        SELECT u.id, u.name,
               u.virtual_balance,
               COALESCE(SUM(p.quantity * s.last_price), 0) AS holdings_value,
               u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price), 0) AS total_worth,
               (u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price), 0)) - 1000000 AS pnl,
               ROUND(((u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price),0)
                       - 1000000) / 1000000) * 100, 2) AS pnl_pct
        FROM users u
        LEFT JOIN portfolio p ON u.id = p.user_id
        LEFT JOIN stocks s    ON p.symbol = s.symbol
        GROUP BY u.id, u.name, u.virtual_balance
        ORDER BY total_worth DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<?> getTopUsers(@Param("limit") int limit);
}
