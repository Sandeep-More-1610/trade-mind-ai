package com.trademind.service;

import com.trademind.model.*;
import com.trademind.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final UserRepository      userRepo;
    private final PortfolioRepository portRepo;
    private final StockRepository     stockRepo;

    public List<Map<String, Object>> getPortfolio(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        List<Portfolio> holdings = portRepo.findByUser(user);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Portfolio h : holdings) {
            Stock stock = stockRepo.findBySymbol(h.getSymbol()).orElse(null);
            if (stock == null) continue;

            BigDecimal ltp    = stock.getLastPrice();
            BigDecimal pnl    = ltp.subtract(h.getAvgBuyPrice())
                                   .multiply(BigDecimal.valueOf(h.getQuantity()));
            BigDecimal pnlPct = pnl.divide(
                    h.getAvgBuyPrice().multiply(BigDecimal.valueOf(h.getQuantity())), 4,
                    java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));

            result.add(Map.of(
                "symbol",      h.getSymbol(),
                "name",        stock.getName(),
                "quantity",    h.getQuantity(),
                "avgBuyPrice", h.getAvgBuyPrice(),
                "ltp",         ltp,
                "currentValue",ltp.multiply(BigDecimal.valueOf(h.getQuantity())),
                "pnl",         pnl,
                "pnlPct",      pnlPct
            ));
        }
        return result;
    }

    public Map<String, Object> getSummary(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        List<Portfolio> holdings = portRepo.findByUser(user);

        BigDecimal holdingsValue = holdings.stream()
            .map(h -> stockRepo.findBySymbol(h.getSymbol())
                    .map(s -> s.getLastPrice().multiply(BigDecimal.valueOf(h.getQuantity())))
                    .orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalWorth = user.getVirtualBalance().add(holdingsValue);
        BigDecimal pnl        = totalWorth.subtract(new BigDecimal("1000000"));

        return Map.of(
            "balance",       user.getVirtualBalance(),
            "holdingsValue", holdingsValue,
            "totalWorth",    totalWorth,
            "pnl",           pnl,
            "pnlPct",        pnl.divide(new BigDecimal("10000"), 2, java.math.RoundingMode.HALF_UP)
        );
    }
}


// ============================================================
//  service/LeaderboardService.java
// ============================================================
