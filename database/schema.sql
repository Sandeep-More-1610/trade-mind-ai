-- ============================================================
--  TradeMind AI — MySQL Database Schema
--  Database: trademind_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS trademind_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trademind_db;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    role          ENUM('USER','ADMIN') DEFAULT 'USER',
    virtual_balance DECIMAL(15,2)     DEFAULT 1000000.00,  -- ₹10 Lakh
    created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── STOCKS (watchlist / reference) ─────────────────────────
CREATE TABLE stocks (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(150) NOT NULL,
    exchange      VARCHAR(10)  DEFAULT 'NSE',
    sector        VARCHAR(80),
    last_price    DECIMAL(12,2),
    change_pct    DECIMAL(6,2),
    volume        BIGINT,
    market_cap    DECIMAL(20,2),
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── PORTFOLIO ───────────────────────────────────────────────
CREATE TABLE portfolio (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    symbol        VARCHAR(20)  NOT NULL,
    quantity      INT          NOT NULL DEFAULT 0,
    avg_buy_price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_stock (user_id, symbol)
);

-- ── TRADES (virtual trading history) ───────────────────────
CREATE TABLE trades (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    symbol        VARCHAR(20)  NOT NULL,
    trade_type    ENUM('BUY','SELL') NOT NULL,
    quantity      INT          NOT NULL,
    price         DECIMAL(12,2) NOT NULL,
    total_value   DECIMAL(15,2) NOT NULL,
    traded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── AI PREDICTIONS ──────────────────────────────────────────
CREATE TABLE predictions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20)  NOT NULL,
    signal        ENUM('BUY','SELL','HOLD') NOT NULL,
    confidence    DECIMAL(5,2) NOT NULL,  -- percentage 0-100
    ai_score      DECIMAL(5,2),
    sentiment     VARCHAR(20),
    risk_level    ENUM('LOW','MEDIUM','HIGH'),
    trend         VARCHAR(20),
    predicted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_time (symbol, predicted_at)
);

-- ── SENTIMENT FEED ──────────────────────────────────────────
CREATE TABLE sentiment_feed (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20)  NOT NULL,
    source        ENUM('NEWS','REDDIT','TWITTER') NOT NULL,
    headline      TEXT,
    sentiment     ENUM('BULLISH','BEARISH','NEUTRAL') NOT NULL,
    score         DECIMAL(5,2),
    url           VARCHAR(500),
    fetched_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol)
);

-- ── FRAUD ALERTS ────────────────────────────────────────────
CREATE TABLE fraud_alerts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20)  NOT NULL,
    risk_score    DECIMAL(5,2) NOT NULL,
    risk_level    ENUM('LOW','MEDIUM','HIGH') NOT NULL,
    volume_spike  DECIMAL(6,2),            -- % above 30-day avg
    social_spike  DECIMAL(6,2),            -- % mention increase
    description   TEXT,
    detected_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_risk (risk_level, detected_at)
);

-- ── PRICE HISTORY ───────────────────────────────────────────
CREATE TABLE price_history (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20)  NOT NULL,
    open_price    DECIMAL(12,2),
    high_price    DECIMAL(12,2),
    low_price     DECIMAL(12,2),
    close_price   DECIMAL(12,2),
    volume        BIGINT,
    rsi           DECIMAL(6,2),
    macd          DECIMAL(8,4),
    recorded_date DATE         NOT NULL,
    UNIQUE KEY uq_symbol_date (symbol, recorded_date),
    INDEX idx_symbol (symbol)
);

-- ── LEADERBOARD VIEW ────────────────────────────────────────
CREATE VIEW leaderboard AS
SELECT
    u.id,
    u.name,
    u.virtual_balance,
    COALESCE(SUM(p.quantity * s.last_price), 0)          AS holdings_value,
    u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price), 0) AS total_worth,
    (u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price), 0)) - 1000000 AS pnl,
    ROUND(((u.virtual_balance + COALESCE(SUM(p.quantity * s.last_price), 0) - 1000000) / 1000000) * 100, 2) AS pnl_pct
FROM users u
LEFT JOIN portfolio p ON u.id = p.user_id
LEFT JOIN stocks s    ON p.symbol = s.symbol
GROUP BY u.id, u.name, u.virtual_balance
ORDER BY total_worth DESC;

-- ── SEED DATA ───────────────────────────────────────────────
INSERT INTO stocks (symbol, name, exchange, sector, last_price, change_pct, volume) VALUES
('TCS',      'Tata Consultancy Services', 'NSE', 'IT',      3812.00,  2.4,  2100000),
('RELIANCE', 'Reliance Industries Ltd',   'NSE', 'Energy',  3110.00,  1.8,  4500000),
('HDFCBANK', 'HDFC Bank Ltd',             'NSE', 'Banking', 1994.00,  1.2,  3200000),
('INFY',     'Infosys Ltd',               'NSE', 'IT',      1590.00, -0.9,  1800000),
('WIPRO',    'Wipro Ltd',                 'NSE', 'IT',       452.00, -1.4,   980000),
('TATAMOTORS','Tata Motors Ltd',          'NSE', 'Auto',    1020.00,  3.1,  5600000),
('ITC',      'ITC Ltd',                   'NSE', 'FMCG',    468.00,   0.7,  2900000),
('BAJFINANCE','Bajaj Finance Ltd',        'NSE', 'Finance', 7210.00,  1.9,   760000);
