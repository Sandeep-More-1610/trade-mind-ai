# ============================================================
#  TradeMind AI — Python AI Microservice (Updated)
#  Now fully wired to DataAggregator (all 4 data sources)
# ============================================================

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import pandas as pd
import os, logging
from datetime import datetime

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MinMaxScaler
from transformers import pipeline
import xgboost as xgb

# ── Import our unified data aggregator ──────────────────────
from data_sources import aggregator

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("TradeMindAI")

app    = Flask(__name__)
CORS(app)

_scaler             = MinMaxScaler()
_lstm_models        = {}
_xgb_model          = None
_rf_model           = None
_sentiment_pipeline = None

FEATURE_COLS = ["RSI", "MACD", "Signal_Line", "ATR", "BB_Width", "Vol_Ratio"]


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        log.info("Loading FinBERT...")
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert"
        )
    return _sentiment_pipeline


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip() for c in df.columns]
    if "Close" not in df.columns and "close" in df.columns:
        df.rename(columns={"close":"Close","open":"Open",
                            "high":"High","low":"Low","volume":"Volume"}, inplace=True)
    delta = df["Close"].diff()
    gain  = delta.where(delta > 0, 0).rolling(14).mean()
    loss  = (-delta.where(delta < 0, 0)).rolling(14).mean()
    df["RSI"] = 100 - (100 / (1 + gain / (loss + 1e-9)))
    ema12 = df["Close"].ewm(span=12).mean()
    ema26 = df["Close"].ewm(span=26).mean()
    df["MACD"]        = ema12 - ema26
    df["Signal_Line"] = df["MACD"].ewm(span=9).mean()
    sma20 = df["Close"].rolling(20).mean()
    std20 = df["Close"].rolling(20).std()
    df["BB_Width"]  = (sma20 + 2*std20 - (sma20 - 2*std20)) / sma20
    hl  = df["High"] - df["Low"]
    hc  = (df["High"] - df["Close"].shift()).abs()
    lc  = (df["Low"]  - df["Close"].shift()).abs()
    df["ATR"]       = pd.concat([hl,hc,lc],axis=1).max(axis=1).rolling(14).mean()
    df["Vol_Ratio"] = df["Volume"] / (df["Volume"].rolling(30).mean() + 1e-9)
    df.dropna(inplace=True)
    return df


def lstm_predict(symbol: str, df: pd.DataFrame) -> dict:
    closes = _scaler.fit_transform(df[["Close"]].values)
    if symbol not in _lstm_models:
        X, y = [], []
        for i in range(60, len(closes)):
            X.append(closes[i-60:i])
            y.append(1 if closes[i] > closes[i-1] else 0)
        X = np.array(X).reshape(-1, 60, 1)
        y = np.array(y)
        m = Sequential([
            LSTM(128, return_sequences=True, input_shape=(60,1)),
            Dropout(0.2), LSTM(64), Dropout(0.2),
            Dense(3, activation="softmax")
        ])
        m.compile(optimizer="adam", loss="sparse_categorical_crossentropy")
        m.fit(X, y, epochs=20, batch_size=32,
              callbacks=[EarlyStopping(patience=3)], verbose=0)
        _lstm_models[symbol] = m
    seq   = closes[-60:].reshape(1,60,1)
    probs = _lstm_models[symbol].predict(seq, verbose=0)[0]
    labels = ["BUY","HOLD","SELL"]
    return {"signal": labels[np.argmax(probs)], "confidence": float(max(probs))*100}


def xgb_predict(df: pd.DataFrame) -> dict:
    global _xgb_model
    dfc = df.copy()
    dfc["Target"] = (dfc["Close"].shift(-1) > dfc["Close"]).astype(int)
    dfc.dropna(inplace=True)
    if _xgb_model is None:
        _xgb_model = xgb.XGBClassifier(n_estimators=200, learning_rate=0.05,
                                         max_depth=6, eval_metric="logloss")
        _xgb_model.fit(dfc[FEATURE_COLS], dfc["Target"])
    proba  = _xgb_model.predict_proba(dfc[FEATURE_COLS].iloc[-1:])[0]
    signal = "BUY" if proba[1]>0.55 else ("SELL" if proba[0]>0.55 else "HOLD")
    return {"signal": signal, "confidence": float(max(proba))*100}


def rf_predict(df: pd.DataFrame) -> dict:
    global _rf_model
    dfc = df.copy()
    dfc["Target"] = (dfc["Close"].shift(-1) > dfc["Close"]).astype(int)
    dfc.dropna(inplace=True)
    if _rf_model is None:
        _rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        _rf_model.fit(dfc[FEATURE_COLS], dfc["Target"])
    proba  = _rf_model.predict_proba(dfc[FEATURE_COLS].iloc[-1:])[0]
    signal = "BUY" if proba[1]>0.55 else ("SELL" if proba[0]>0.55 else "HOLD")
    return {"signal": signal, "confidence": float(max(proba))*100}


def run_finbert(texts: list) -> dict:
    if not texts:
        return {"bullish":50,"bearish":50,"neutral":0,
                "sentiment":"NEUTRAL","score":50,"count":0}
    nlp     = get_sentiment_pipeline()
    results = nlp(texts[:15], truncation=True, max_length=512)
    bull    = sum(1 for r in results if r["label"]=="positive")
    bear    = sum(1 for r in results if r["label"]=="negative")
    total   = len(results) or 1
    bull_pct = round(bull/total*100, 2)
    bear_pct = round(bear/total*100, 2)
    sent = ("BULLISH" if bull_pct>60 else "BEARISH" if bear_pct>60 else "NEUTRAL")
    return {"bullish":bull_pct,"bearish":bear_pct,
            "neutral":round((total-bull-bear)/total*100,2),
            "sentiment":sent,"score":bull_pct,"count":total}


def brain_score(lstm_r, xgb_r, rf_r, sent_score: float) -> dict:
    sm  = {"BUY":1,"HOLD":0,"SELL":-1}
    raw = (0.30*sm[lstm_r["signal"]]*lstm_r["confidence"]/100
          +0.25*sm[xgb_r["signal"]] *xgb_r["confidence"] /100
          +0.20*sm[rf_r["signal"]]  *rf_r["confidence"]  /100
          +0.25*(sent_score-50)/50)
    score  = round((raw+1)/2*100, 2)
    signal = "BUY" if raw>0.2 else ("SELL" if raw<-0.2 else "HOLD")
    risk   = "LOW" if score>70 else ("HIGH" if score<40 else "MEDIUM")
    trend  = "UPWARD" if raw>0 else ("DOWNWARD" if raw<0 else "SIDEWAYS")
    return {"ai_score":score,"signal":signal,"risk_level":risk,"trend":trend,
            "breakdown":{"lstm":lstm_r["signal"],"xgb":xgb_r["signal"],
                         "rf":rf_r["signal"],"sentiment_score":sent_score}}


# ═══════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════

@app.route("/health")
def health():
    return jsonify({"status":"ok","service":"TradeMind-AI",
                    "data_sources":["Yahoo Finance","Finnhub","NewsAPI","Reddit"],
                    "timestamp":datetime.utcnow().isoformat()})


@app.route("/predict/<symbol>")
def predict(symbol: str):
    try:
        data = aggregator.get_full_data(symbol)
        if not data.get("ohlcv"):
            return jsonify({"error":f"No OHLCV data for {symbol}"}), 404
        df         = pd.DataFrame(data["ohlcv"])
        df         = add_indicators(df)
        lstm_r     = lstm_predict(symbol, df)
        xgb_r      = xgb_predict(df.copy())
        rf_r       = rf_predict(df.copy())
        texts      = aggregator.get_all_text_for_nlp(symbol)
        sent_result = run_finbert(texts)
        brain      = brain_score(lstm_r, xgb_r, rf_r, sent_result["score"])
        live       = data.get("live_quote", {})
        return jsonify({
            "symbol":      symbol,
            "signal":      brain["signal"],
            "confidence":  round((lstm_r["confidence"]+xgb_r["confidence"]+rf_r["confidence"])/3,2),
            "ai_score":    brain["ai_score"],
            "sentiment":   sent_result["sentiment"],
            "risk_level":  brain["risk_level"],
            "trend":       brain["trend"],
            "breakdown":   brain["breakdown"],
            "live_price":  live.get("price"),
            "change_pct":  live.get("change_pct"),
            "news_count":  data.get("news_count",0),
            "reddit_posts":data.get("reddit_mentions",{}).get("post_count",0),
            "timestamp":   datetime.utcnow().isoformat(),
        })
    except Exception as e:
        log.error(f"[predict] {symbol}: {e}")
        return jsonify({"error":str(e)}), 500


@app.route("/quote/<symbol>")
def quote(symbol: str):
    try:
        finn = aggregator.finnhub.get_quote(symbol)
        if finn.get("price"):
            return jsonify(finn)
        return jsonify(aggregator.yahoo.get_quote(symbol))
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/history/<symbol>")
def history(symbol: str):
    period   = request.args.get("period",   "1mo")
    interval = request.args.get("interval", "1d")
    try:
        df = aggregator.yahoo.get_history(symbol, period=period, interval=interval)
        return jsonify({"symbol":symbol,"period":period,
                        "rows":len(df),"data":df.to_dict("records")})
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/sentiment/<symbol>")
def sentiment(symbol: str):
    try:
        texts       = aggregator.get_all_text_for_nlp(symbol)
        result      = run_finbert(texts)
        news        = aggregator.news.get_stock_news(symbol, page_size=5)
        reddit_data = aggregator.reddit.get_mention_count(symbol,"week")
        result.update({
            "symbol":         symbol,
            "top_headlines":  [a["title"] for a in news[:5]],
            "reddit_mentions":reddit_data.get("post_count",0),
            "reddit_score":   reddit_data.get("total_score",0),
            "sources_used":   ["NewsAPI","Reddit","FinBERT-NLP"],
            "timestamp":      datetime.utcnow().isoformat(),
        })
        return jsonify(result)
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/sentiment/market")
def market_sentiment():
    symbols = ["TCS","RELIANCE","HDFCBANK","INFY","WIPRO","TATAMOTORS","ITC"]
    scores, breakdown = [], {}
    for sym in symbols:
        try:
            texts  = aggregator.get_all_text_for_nlp(sym)
            result = run_finbert(texts)
            scores.append(result["score"])
            breakdown[sym] = result["sentiment"]
        except Exception:
            pass
    avg  = round(sum(scores)/len(scores),2) if scores else 50
    mood = ("GREEDY"  if avg>65 else "BULLISH" if avg>55 else
            "FEARFUL" if avg<35 else "BEARISH" if avg<45 else "NEUTRAL")
    try:
        market_news = aggregator.news.get_market_news(page_size=5)
    except Exception:
        market_news = []
    return jsonify({"fearGreedIndex":avg,"mood":mood,"breakdown":breakdown,
                    "top_news":[a["title"] for a in market_news[:5]],
                    "timestamp":datetime.utcnow().isoformat()})


@app.route("/fraud/<symbol>")
def fraud(symbol: str):
    try:
        df = aggregator.yahoo.get_history(symbol, period="3mo", interval="1d")
        if df.empty:
            return jsonify({"symbol":symbol,"riskScore":0,"riskLevel":"LOW"})
        avg_vol30  = df["Volume"].rolling(30).mean().iloc[-1]
        latest_vol = df["Volume"].iloc[-1]
        vol_spike  = round(((latest_vol-avg_vol30)/(avg_vol30+1))*100, 2)
        price_chg5 = round((df["Close"].iloc[-1]-df["Close"].iloc[-5])
                           /df["Close"].iloc[-5]*100, 2)
        social_spike = aggregator.get_social_spike_score(symbol)
        news         = aggregator.news.get_stock_news(symbol, page_size=20)
        news_cnt     = len(news)
        risk_score   = 0
        if vol_spike    > 200: risk_score += 35
        elif vol_spike  > 100: risk_score += 18
        if abs(price_chg5)  > 20: risk_score += 25
        elif abs(price_chg5)> 10: risk_score += 12
        if social_spike > 300:    risk_score += 25
        elif social_spike > 100:  risk_score += 12
        if news_cnt > 15:         risk_score += 15
        risk_level  = ("HIGH" if risk_score>60 else
                        "MEDIUM" if risk_score>30 else "LOW")
        description = (f"Volume spike {vol_spike:.1f}% above 30-day avg. "
                       f"5-day price: {price_chg5:+.1f}%. "
                       f"Reddit mentions up {social_spike:.0f}%. "
                       f"{news_cnt} news articles found.")
        return jsonify({"symbol":symbol,"riskScore":risk_score,
                        "riskLevel":risk_level,"volumeSpike":vol_spike,
                        "priceChange5d":price_chg5,"socialSpike":social_spike,
                        "newsVolume":news_cnt,"description":description,
                        "timestamp":datetime.utcnow().isoformat()})
    except Exception as e:
        log.error(f"[fraud] {symbol}: {e}")
        return jsonify({"error":str(e)}), 500


@app.route("/news/<symbol>")
def news(symbol: str):
    try:
        articles = aggregator.news.get_stock_news(
            symbol, page_size=int(request.args.get("limit",20)))
        return jsonify({"symbol":symbol,"count":len(articles),"articles":articles})
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/reddit/<symbol>")
def reddit_route(symbol: str):
    try:
        posts   = aggregator.reddit.search_stock_posts(symbol, limit=20)
        mention = aggregator.reddit.get_mention_count(symbol)
        return jsonify({"symbol":symbol,"mentions":mention,"posts":posts})
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/market/overview")
def market_overview():
    symbols = ["TCS","RELIANCE","HDFCBANK","INFY","WIPRO",
               "TATAMOTORS","ITC","BAJFINANCE"]
    try:
        data = aggregator.get_market_overview(symbols)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/fundamentals/<symbol>")
def fundamentals(symbol: str):
    try:
        return jsonify(aggregator.yahoo.get_fundamentals(symbol))
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route("/market-status")
def market_status():
    try:
        return jsonify(aggregator.finnhub.get_market_status("NSE"))
    except Exception as e:
        return jsonify({"error":str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
