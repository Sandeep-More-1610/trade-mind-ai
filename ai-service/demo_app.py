"""Free-hosting demo: simulated prices and transparent technical indicators.
No trained models, real quotes, provider keys, or external network calls are used.
The full ML service remains in app.py.
"""
from datetime import date, timedelta
import math
import random
from statistics import mean, pstdev
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
PRICES = {"TCS": 3812, "RELIANCE": 3110, "HDFCBANK": 1994,
          "INFY": 1590, "WIPRO": 452, "TATAMOTORS": 1020,
          "ITC": 468, "BAJFINANCE": 7210}


def series(symbol, count=90):
    rng = random.Random(symbol)
    prices = [PRICES[symbol] * (1 + .035 * math.sin(i / 9) + rng.uniform(-.012, .012))
              for i in range(count)]
    scale = PRICES[symbol] / prices[-1]
    return [{"Date": str(date.today() - timedelta(days=count - i - 1)),
             "Close": round(price * scale, 2), "Volume": 100000 + i * 340}
            for i, price in enumerate(prices)]


@app.before_request
def validate_symbol():
    symbol = (request.view_args or {}).get("symbol")
    if symbol and symbol.upper() not in PRICES:
        return jsonify(error="Choose one of the demo watchlist symbols", demo=True), 404


@app.get("/health")
def health():
    return jsonify(status="ok", service="TradeMind free demo", mode="demo",
                   data_sources=["Simulated sample data"], trained_models=False)


@app.get("/history/<symbol>")
def history(symbol):
    counts = {"1D": 24, "1W": 7, "1M": 30, "3M": 90, "1Y": 365,
              "1d": 24, "1wk": 7, "1mo": 30, "3mo": 90, "1y": 365}
    rows = series(symbol.upper(), counts.get(request.args.get("period"), 90))
    return jsonify(symbol=symbol.upper(), rows=len(rows), data=rows, demo=True,
                   source="Simulated sample data")


@app.get("/quote/<symbol>")
def quote(symbol):
    return jsonify(symbol=symbol.upper(), price=PRICES[symbol.upper()],
                   change=0, change_pct=0, demo=True, source="Sample price")


@app.get("/predict/<symbol>")
def predict(symbol):
    closes = [row["Close"] for row in series(symbol.upper(), 90)]
    short, long = mean(closes[-10:]), mean(closes[-30:])
    momentum = (short / long - 1) * 100
    score = round(max(0, min(100, 50 + momentum * 8)), 2)
    signal = "BUY" if score > 60 else "SELL" if score < 40 else "HOLD"
    volatility = pstdev(closes[-30:]) / mean(closes[-30:]) * 100
    return jsonify(symbol=symbol.upper(), signal=signal, confidence=0,
                   ai_score=score, sentiment="UNAVAILABLE",
                   risk_level="HIGH" if volatility > 3 else "MEDIUM",
                   trend="UPTREND" if momentum > .5 else "DOWNTREND" if momentum < -.5 else "SIDEWAYS",
                   demo=True, method="Moving averages on simulated prices; not trained ML",
                   live_price=PRICES[symbol.upper()])


@app.get("/sentiment/market")
def market_sentiment():
    return jsonify(fearGreedIndex=None, mood="UNAVAILABLE", demo=True, top_news=[],
                   message="Live news and sentiment are disabled in this demo")


@app.get("/sentiment/<symbol>")
def sentiment(symbol):
    return jsonify(symbol=symbol.upper(), sentiment="UNAVAILABLE", score=0,
                   bullishScore=0, bearishScore=0, newsCount=0, sources=[],
                   top_headlines=[], sources_used=[], demo=True)


@app.get("/fraud/<symbol>")
def fraud(symbol):
    return jsonify(symbol=symbol.upper(), riskScore=0, riskLevel="LOW", volumeSpike=0,
                   socialSpike=0, demo=True,
                   description="Demo only: no live fraud monitoring is available")


@app.get("/news/<symbol>")
def news(symbol):
    return jsonify(symbol=symbol.upper(), count=0, articles=[], demo=True)


@app.get("/reddit/<symbol>")
def reddit(symbol):
    return jsonify(symbol=symbol.upper(), posts=[], mentions={"post_count": 0}, demo=True)


@app.get("/fundamentals/<symbol>")
def fundamentals(symbol):
    return jsonify(symbol=symbol.upper(), demo=True, source="Unavailable in demo")


@app.get("/market/overview")
def overview():
    return jsonify(demo=True, stocks=[{"symbol": s, "price": p} for s, p in PRICES.items()])


@app.get("/market-status")
def status():
    return jsonify(demo=True, isOpen=False, message="Simulated data; not a live exchange feed")
