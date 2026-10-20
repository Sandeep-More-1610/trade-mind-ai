-- Sample prices supplied with the project, not live quotes.
MERGE INTO stocks (symbol, name, exchange, sector, last_price, change_pct, volume) KEY(symbol) VALUES
('TCS',      'Tata Consultancy Services', 'NSE', 'IT',      3812.00,  2.4,  2100000),
('RELIANCE', 'Reliance Industries Ltd',   'NSE', 'Energy',  3110.00,  1.8,  4500000),
('HDFCBANK', 'HDFC Bank Ltd',             'NSE', 'Banking', 1994.00,  1.2,  3200000),
('INFY',     'Infosys Ltd',               'NSE', 'IT',      1590.00, -0.9,  1800000),
('WIPRO',    'Wipro Ltd',                 'NSE', 'IT',       452.00, -1.4,   980000),
('TATAMOTORS','Tata Motors Ltd',          'NSE', 'Auto',    1020.00,  3.1,  5600000),
('ITC',      'ITC Ltd',                   'NSE', 'FMCG',    468.00,   0.7,  2900000),
('BAJFINANCE','Bajaj Finance Ltd',        'NSE', 'Finance', 7210.00,  1.9,   760000);
