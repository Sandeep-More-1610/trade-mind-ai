package com.trademind.service;

import com.trademind.model.*;
import com.trademind.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final UserRepository    userRepo;
    private final StockRepository   stockRepo;
    private final PortfolioRepository portRepo;
    private final TradeRepository   tradeRepo;

    @Transactional
    public Map<String, Object> executeBuy(String email, String symbol, int qty) {
        User  user  = userRepo.findByEmail(email).orElseThrow();
        Stock stock = stockRepo.findBySymbol(symbol).orElseThrow();

        BigDecimal totalCost = stock.getLastPrice().multiply(BigDecimal.valueOf(qty));

        if (user.getVirtualBalance().compareTo(totalCost) < 0)
            throw new RuntimeException("Insufficient virtual balance");

        // Deduct balance
        user.setVirtualBalance(user.getVirtualBalance().subtract(totalCost));
        userRepo.save(user);

        // Update portfolio (upsert)
        Portfolio holding = portRepo.findByUserAndSymbol(user, symbol)
            .orElse(Portfolio.builder().user(user).symbol(symbol).quantity(0)
                    .avgBuyPrice(BigDecimal.ZERO).build());

        BigDecimal totalQty   = BigDecimal.valueOf(holding.getQuantity() + qty);
        BigDecimal totalValue = holding.getAvgBuyPrice()
                .multiply(BigDecimal.valueOf(holding.getQuantity()))
                .add(totalCost);
        holding.setAvgBuyPrice(totalValue.divide(totalQty, 2, RoundingMode.HALF_UP));
        holding.setQuantity(holding.getQuantity() + qty);
        portRepo.save(holding);

        // Record trade
        tradeRepo.save(Trade.builder()
            .user(user).symbol(symbol)
            .tradeType(Trade.TradeType.BUY)
            .quantity(qty).price(stock.getLastPrice())
            .totalValue(totalCost).build());

        return Map.of("message", "BUY successful",
                      "symbol", symbol, "qty", qty,
                      "price", stock.getLastPrice(),
                      "newBalance", user.getVirtualBalance());
    }

    @Transactional
    public Map<String, Object> executeSell(String email, String symbol, int qty) {
        User      user    = userRepo.findByEmail(email).orElseThrow();
        Stock     stock   = stockRepo.findBySymbol(symbol).orElseThrow();
        Portfolio holding = portRepo.findByUserAndSymbol(user, symbol)
                .orElseThrow(() -> new RuntimeException("No holdings found for " + symbol));

        if (holding.getQuantity() < qty)
            throw new RuntimeException("Not enough shares to sell");

        BigDecimal totalValue = stock.getLastPrice().multiply(BigDecimal.valueOf(qty));

        // Credit balance
        user.setVirtualBalance(user.getVirtualBalance().add(totalValue));
        userRepo.save(user);

        // Update portfolio
        holding.setQuantity(holding.getQuantity() - qty);
        if (holding.getQuantity() == 0) portRepo.delete(holding);
        else portRepo.save(holding);

        // Record trade
        tradeRepo.save(Trade.builder()
            .user(user).symbol(symbol)
            .tradeType(Trade.TradeType.SELL)
            .quantity(qty).price(stock.getLastPrice())
            .totalValue(totalValue).build());

        BigDecimal pnl = stock.getLastPrice().subtract(holding.getAvgBuyPrice())
                .multiply(BigDecimal.valueOf(qty));

        return Map.of("message", "SELL successful",
                      "symbol", symbol, "qty", qty,
                      "price",  stock.getLastPrice(),
                      "pnl",    pnl,
                      "newBalance", user.getVirtualBalance());
    }

    public List<Trade> getTradeHistory(String email) {
        User user = userRepo.findByEmail(email).orElseThrow();
        return tradeRepo.findByUserOrderByTradedAtDesc(user);
    }
}


// ============================================================
//  service/PortfolioService.java
// ============================================================
