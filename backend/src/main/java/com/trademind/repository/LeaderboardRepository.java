package com.trademind.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.trademind.model.User;
import java.util.List;
import java.util.Map;

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
    List<Map<String, Object>> getTopUsers(@Param("limit") int limit);
}
