# ============================================================
#  TradeMind AI — Data Sources Layer
#  ai-service/data_sources/
#
#  Covers ALL 4 sources from the tech stack image:
#   1. Yahoo Finance  — OHLCV + fundamentals (yfinance)
#   2. Finnhub API    — Live quotes + WebSocket tick data
#   3. NewsAPI        — Financial news headlines
#   4. Reddit API     — WSB / IndiaInvestments sentiment
# ============================================================

import os, time, logging, requests
from datetime import datetime, timedelta
from typing import Optional

import yfinance  as yf
import pandas    as pd

log = logging.getLogger("DataSources")

# ── API Keys (set via env vars) ──────────────────────────────
FINNHUB_KEY   = os.getenv("FINNHUB_API_KEY",   "")
NEWS_API_KEY  = os.getenv("NEWS_API_KEY",       "")
REDDIT_ID     = os.getenv("REDDIT_CLIENT_ID",   "")
REDDIT_SECRET = os.getenv("REDDIT_CLIENT_SECRET","")
REDDIT_UA     = os.getenv("REDDIT_USER_AGENT",  "TradeMindAI/1.0")


# ╔══════════════════════════════════════════════════════════╗
#  1. YAHOO FINANCE  — Free, no key needed
#     Library: yfinance  (pip install yfinance)
# ╚══════════════════════════════════════════════════════════╝
class YahooFinanceSource:
    """
    Wraps yfinance to fetch:
      - Historical OHLCV (any period/interval)
      - Real-time quote
      - Company fundamentals (P/E, market cap, sector…)
      - 52-week high/low, dividend yield
    """

    NSE_SUFFIX = ".NS"    # Append to Indian NSE symbols
    BSE_SUFFIX = ".BO"    # Append to Indian BSE symbols

    def _ticker(self, symbol: str) -> yf.Ticker:
        """Returns yfinance Ticker; tries NSE first, then plain symbol."""
        sym = symbol.upper()
        # For well-known NSE stocks add .NS
        return yf.Ticker(sym + self.NSE_SUFFIX)

    # ── Historical OHLCV ────────────────────────────────────
    def get_history(self, symbol: str,
                    period: str = "1y",
                    interval: str = "1d") -> pd.DataFrame:
        """
        period   : 1d 5d 1mo 3mo 6mo 1y 2y 5y 10y ytd max
        interval : 1m 2m 5m 15m 30m 60m 90m 1h 1d 5d 1wk 1mo 3mo
        Returns  : DataFrame with Open/High/Low/Close/Volume
        """
        ticker = self._ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            # Fallback: plain symbol (US stocks / already-suffixed)
            df = yf.Ticker(symbol).history(period=period, interval=interval)
        df.reset_index(inplace=True)
        log.info(f"[Yahoo] {symbol}: {len(df)} rows ({period}/{interval})")
        return df

    # ── Live Quote ──────────────────────────────────────────
    def get_quote(self, symbol: str) -> dict:
        """Returns latest price, change, volume."""
        ticker = self._ticker(symbol)
        info   = ticker.fast_info          # lightweight call
        try:
            return {
                "symbol":      symbol,
                "price":       round(float(info.last_price),       2),
                "open":        round(float(info.open),             2),
                "prev_close":  round(float(info.previous_close),   2),
                "change":      round(float(info.last_price - info.previous_close), 2),
                "change_pct":  round(float((info.last_price - info.previous_close)
                                           / info.previous_close * 100), 2),
                "volume":      int(info.three_month_average_volume or 0),
                "52w_high":    round(float(info.year_high),        2),
                "52w_low":     round(float(info.year_low),         2),
                "market_cap":  info.market_cap,
                "source":      "yahoo_finance",
                "timestamp":   datetime.utcnow().isoformat(),
            }
        except Exception as e:
            log.warning(f"[Yahoo] Quote failed for {symbol}: {e}")
            return {"symbol": symbol, "error": str(e)}

    # ── Fundamentals ────────────────────────────────────────
    def get_fundamentals(self, symbol: str) -> dict:
        """Returns P/E, EPS, sector, industry, description."""
        ticker = self._ticker(symbol)
        info   = ticker.info
        return {
            "symbol":         symbol,
            "name":           info.get("longName",          ""),
            "sector":         info.get("sector",             ""),
            "industry":       info.get("industry",           ""),
            "pe_ratio":       info.get("trailingPE"),
            "eps":            info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "beta":           info.get("beta"),
            "book_value":     info.get("bookValue"),
            "profit_margin":  info.get("profitMargins"),
            "revenue":        info.get("totalRevenue"),
            "description":    info.get("longBusinessSummary", "")[:300],
            "source":         "yahoo_finance",
        }

    # ── Batch OHLCV for multiple symbols ────────────────────
    def get_batch_history(self, symbols: list, period: str = "1mo") -> dict:
        """Download multiple stocks at once (more efficient)."""
        tickers = " ".join(f"{s.upper()}{self.NSE_SUFFIX}" for s in symbols)
        df      = yf.download(tickers, period=period, group_by="ticker",
                               progress=False, auto_adjust=True)
        result  = {}
        for sym in symbols:
            key = f"{sym.upper()}{self.NSE_SUFFIX}"
            try:
                result[sym] = df[key].dropna().reset_index().to_dict("records")
            except Exception:
                result[sym] = []
        return result


# ╔══════════════════════════════════════════════════════════╗
#  2. FINNHUB API  — Live quotes, WebSocket, company data
#     Docs: https://finnhub.io/docs/api
#     Free tier: 60 API calls/minute
# ╚══════════════════════════════════════════════════════════╝
class FinnhubSource:
    BASE = "https://finnhub.io/api/v1"

    def _get(self, path: str, params: dict = None) -> dict:
        params = params or {}
        params["token"] = FINNHUB_KEY
        try:
            resp = requests.get(f"{self.BASE}{path}", params=params, timeout=8)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning(f"[Finnhub] {path} failed: {e}")
            return {}

    # ── Real-time Quote ─────────────────────────────────────
    def get_quote(self, symbol: str) -> dict:
        """
        Returns: c=current, d=change, dp=change%, h=high, l=low,
                 o=open, pc=prev_close, t=timestamp
        """
        data = self._get("/quote", {"symbol": symbol})
        if not data or data.get("c") is None:
            return {"symbol": symbol, "error": "No data"}
        return {
            "symbol":     symbol,
            "price":      data.get("c"),
            "change":     data.get("d"),
            "change_pct": data.get("dp"),
            "high":       data.get("h"),
            "low":        data.get("l"),
            "open":       data.get("o"),
            "prev_close": data.get("pc"),
            "timestamp":  datetime.utcfromtimestamp(data.get("t", 0)).isoformat(),
            "source":     "finnhub",
        }

    # ── Company Profile ─────────────────────────────────────
    def get_company_profile(self, symbol: str) -> dict:
        data = self._get("/stock/profile2", {"symbol": symbol})
        return {
            "symbol":   symbol,
            "name":     data.get("name"),
            "country":  data.get("country"),
            "currency": data.get("currency"),
            "exchange": data.get("exchange"),
            "ipo":      data.get("ipo"),
            "logo":     data.get("logo"),
            "sector":   data.get("finnhubIndustry"),
            "weburl":   data.get("weburl"),
            "source":   "finnhub",
        }

    # ── Candles (OHLCV) ─────────────────────────────────────
    def get_candles(self, symbol: str,
                    resolution: str = "D",
                    days_back: int  = 365) -> pd.DataFrame:
        """
        resolution: 1 5 15 30 60 D W M
        Returns DataFrame with t/o/h/l/c/v columns
        """
        now  = int(time.time())
        frm  = int((datetime.utcnow() - timedelta(days=days_back)).timestamp())
        data = self._get("/stock/candle",
                         {"symbol": symbol, "resolution": resolution,
                          "from": frm, "to": now})
        if data.get("s") != "ok":
            return pd.DataFrame()

        df = pd.DataFrame({
            "date":   pd.to_datetime(data["t"], unit="s"),
            "open":   data["o"],
            "high":   data["h"],
            "low":    data["l"],
            "close":  data["c"],
            "volume": data["v"],
        })
        log.info(f"[Finnhub] Candles {symbol}: {len(df)} rows")
        return df

    # ── Company News ────────────────────────────────────────
    def get_company_news(self, symbol: str, days_back: int = 7) -> list:
        frm  = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        to   = datetime.utcnow().strftime("%Y-%m-%d")
        data = self._get("/company-news",
                         {"symbol": symbol, "from": frm, "to": to})
        return [
            {
                "headline": a.get("headline"),
                "summary":  a.get("summary"),
                "url":      a.get("url"),
                "source":   a.get("source"),
                "datetime": datetime.utcfromtimestamp(a.get("datetime", 0)).isoformat(),
            }
            for a in (data if isinstance(data, list) else [])
        ][:20]

    # ── Market Status ────────────────────────────────────────
    def get_market_status(self, exchange: str = "NSE") -> dict:
        data = self._get("/stock/market-status", {"exchange": exchange})
        return {
            "exchange": exchange,
            "is_open":  data.get("isOpen", False),
            "session":  data.get("session"),
            "timezone": data.get("timezone"),
            "source":   "finnhub",
        }

    # ── Earnings Calendar ───────────────────────────────────
    def get_earnings_calendar(self, symbol: str) -> list:
        frm  = datetime.utcnow().strftime("%Y-%m-%d")
        to   = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")
        data = self._get("/calendar/earnings",
                         {"symbol": symbol, "from": frm, "to": to})
        return data.get("earningsCalendar", [])

    # ── WebSocket Tick Stream (async generator) ──────────────
    def websocket_ticker_url(self) -> str:
        """
        Connect to:  wss://ws.finnhub.io?token=YOUR_KEY
        Subscribe:   {"type":"subscribe","symbol":"TCS"}
        Message:     {"data":[{"p":price,"s":symbol,"t":timestamp,"v":volume}]}

        Usage in an async context:
            import websockets, json, asyncio
            async with websockets.connect(url) as ws:
                await ws.send(json.dumps({"type":"subscribe","symbol":"TCS"}))
                async for msg in ws:
                    tick = json.loads(msg)
                    print(tick["data"])
        """
        return f"wss://ws.finnhub.io?token={FINNHUB_KEY}"


# ╔══════════════════════════════════════════════════════════╗
#  3. NEWS API  — Financial news headlines
#     Docs: https://newsapi.org/docs
#     Free tier: 100 requests/day, last 30 days
# ╚══════════════════════════════════════════════════════════╝
class NewsAPISource:
    BASE = "https://newsapi.org/v2"

    def _get(self, path: str, params: dict) -> dict:
        params["apiKey"] = NEWS_API_KEY
        try:
            resp = requests.get(f"{self.BASE}{path}", params=params, timeout=8)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning(f"[NewsAPI] {path} failed: {e}")
            return {"articles": []}

    def _parse_articles(self, raw: list) -> list:
        return [
            {
                "title":       a.get("title",       ""),
                "description": a.get("description", ""),
                "url":         a.get("url",          ""),
                "source":      a.get("source", {}).get("name", ""),
                "published":   a.get("publishedAt",  ""),
                "content":     (a.get("content") or "")[:300],
            }
            for a in raw
            if a.get("title") and "[Removed]" not in a.get("title", "")
        ]

    # ── Stock-specific news ─────────────────────────────────
    def get_stock_news(self, symbol: str,
                       company_name: str = "",
                       page_size: int = 20) -> list:
        """
        Search for news about a specific stock/company.
        Uses `everything` endpoint with relevance sorting.
        """
        query  = f"{symbol} stock OR {company_name} NSE" if company_name else f"{symbol} stock NSE India"
        frm    = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        data   = self._get("/everything", {
            "q":          query,
            "from":       frm,
            "sortBy":     "publishedAt",
            "language":   "en",
            "pageSize":   page_size,
        })
        articles = self._parse_articles(data.get("articles", []))
        log.info(f"[NewsAPI] {symbol}: {len(articles)} articles")
        return articles

    # ── Market-wide financial news ──────────────────────────
    def get_market_news(self, page_size: int = 30) -> list:
        """Top business/finance headlines from India."""
        data = self._get("/top-headlines", {
            "category": "business",
            "country":  "in",
            "pageSize": page_size,
        })
        return self._parse_articles(data.get("articles", []))

    # ── Multi-symbol batch fetch ────────────────────────────
    def get_batch_news(self, symbols: list) -> dict:
        """Fetch news for multiple symbols; returns {symbol: [articles]}."""
        result = {}
        for sym in symbols:
            result[sym] = self.get_stock_news(sym, page_size=10)
            time.sleep(0.5)           # respect rate limit
        return result

    # ── Extract headlines only (for NLP pipeline) ───────────
    def get_headlines(self, symbol: str, limit: int = 15) -> list[str]:
        articles = self.get_stock_news(symbol, page_size=limit)
        return [a["title"] for a in articles if a["title"]]


# ╔══════════════════════════════════════════════════════════╗
#  4. REDDIT API  — Social sentiment from r/IndiaInvestments
#     Library : PRAW (pip install praw)
#     Docs    : https://praw.readthedocs.io
#     Register: https://www.reddit.com/prefs/apps
# ╚══════════════════════════════════════════════════════════╝
class RedditSource:
    # Subreddits relevant to Indian markets
    SUBREDDITS = [
        "IndiaInvestments",
        "DalalStreetTalks",
        "IndianStockMarket",
        "wallstreetbets",        # for US-listed Indian ADRs
    ]

    def __init__(self):
        self._reddit = None

    def _get_reddit(self):
        if self._reddit is None:
            try:
                import praw
                self._reddit = praw.Reddit(
                    client_id     = REDDIT_ID,
                    client_secret = REDDIT_SECRET,
                    user_agent    = REDDIT_UA,
                )
            except ImportError:
                log.error("praw not installed: pip install praw")
                raise
        return self._reddit

    # ── Search posts mentioning a stock ─────────────────────
    def search_stock_posts(self, symbol: str,
                           limit: int    = 50,
                           time_filter   = "week") -> list:
        """
        Searches all relevant subreddits for posts mentioning the symbol.
        time_filter: hour day week month year all
        Returns list of {title, score, num_comments, created_utc, url, body}
        """
        reddit  = self._get_reddit()
        results = []

        for sub_name in self.SUBREDDITS:
            try:
                subreddit = reddit.subreddit(sub_name)
                for post in subreddit.search(symbol, time_filter=time_filter,
                                             limit=limit // len(self.SUBREDDITS)):
                    results.append({
                        "subreddit":    sub_name,
                        "title":        post.title,
                        "body":         (post.selftext or "")[:500],
                        "score":        post.score,
                        "upvote_ratio": post.upvote_ratio,
                        "comments":     post.num_comments,
                        "created":      datetime.utcfromtimestamp(post.created_utc).isoformat(),
                        "url":          f"https://reddit.com{post.permalink}",
                        "awards":       post.total_awards_received,
                    })
            except Exception as e:
                log.warning(f"[Reddit] r/{sub_name} search failed: {e}")

        results.sort(key=lambda x: x["score"], reverse=True)
        log.info(f"[Reddit] {symbol}: {len(results)} posts across {len(self.SUBREDDITS)} subs")
        return results

    # ── Get hot posts from a subreddit ──────────────────────
    def get_hot_posts(self, subreddit: str = "IndiaInvestments",
                      limit: int = 25) -> list:
        reddit = self._get_reddit()
        posts  = []
        try:
            for post in reddit.subreddit(subreddit).hot(limit=limit):
                posts.append({
                    "title":    post.title,
                    "score":    post.score,
                    "comments": post.num_comments,
                    "created":  datetime.utcfromtimestamp(post.created_utc).isoformat(),
                    "url":      f"https://reddit.com{post.permalink}",
                })
        except Exception as e:
            log.warning(f"[Reddit] hot posts failed: {e}")
        return posts

    # ── Mention count (spike detector) ──────────────────────
    def get_mention_count(self, symbol: str,
                          time_filter: str = "day") -> dict:
        """
        Returns how many times a symbol was mentioned in the last
        hour/day/week — used by fraud detection to flag social spikes.
        """
        posts        = self.search_stock_posts(symbol, limit=100,
                                               time_filter=time_filter)
        total_score  = sum(p["score"]    for p in posts)
        total_cmts   = sum(p["comments"] for p in posts)
        high_upvote  = [p for p in posts if p["upvote_ratio"] > 0.9]

        return {
            "symbol":         symbol,
            "period":         time_filter,
            "post_count":     len(posts),
            "total_score":    total_score,
            "total_comments": total_cmts,
            "viral_posts":    len(high_upvote),
            "top_titles":     [p["title"] for p in posts[:5]],
            "source":         "reddit",
            "timestamp":      datetime.utcnow().isoformat(),
        }

    # ── Extract text for NLP pipeline ───────────────────────
    def get_text_for_nlp(self, symbol: str, limit: int = 20) -> list[str]:
        """Returns titles + short body text for FinBERT analysis."""
        posts = self.search_stock_posts(symbol, limit=limit)
        texts = []
        for p in posts:
            texts.append(p["title"])
            if p["body"] and len(p["body"]) > 30:
                texts.append(p["body"][:200])
        return texts[:limit]


# ╔══════════════════════════════════════════════════════════╗
#  UNIFIED DATA AGGREGATOR
#  Single class that combines all 4 sources
# ╚══════════════════════════════════════════════════════════╝
class DataAggregator:
    """
    Central hub — fetches and merges data from all 4 sources.
    Used by the AI prediction pipeline in app.py.
    """

    def __init__(self):
        self.yahoo   = YahooFinanceSource()
        self.finnhub = FinnhubSource()
        self.news    = NewsAPISource()
        self.reddit  = RedditSource()

    # ── Full data package for one symbol ────────────────────
    def get_full_data(self, symbol: str) -> dict:
        """
        Collects everything needed for AI prediction in one call:
          - OHLCV history (Yahoo Finance)
          - Live price    (Finnhub — more accurate for real-time)
          - News headlines (NewsAPI)
          - Reddit mentions (Reddit API)
        """
        log.info(f"[Aggregator] Fetching full data for {symbol}")
        result = {"symbol": symbol, "timestamp": datetime.utcnow().isoformat()}

        # 1. Historical OHLCV from Yahoo Finance
        try:
            df = self.yahoo.get_history(symbol, period="1y", interval="1d")
            result["ohlcv"]       = df.to_dict("records")
            result["ohlcv_rows"]  = len(df)
        except Exception as e:
            log.warning(f"[Yahoo] OHLCV failed: {e}")
            result["ohlcv"] = []

        # 2. Live quote from Finnhub (more real-time than Yahoo)
        try:
            result["live_quote"] = self.finnhub.get_quote(symbol)
        except Exception as e:
            log.warning(f"[Finnhub] Quote failed: {e}")
            result["live_quote"] = {}

        # 3. News headlines from NewsAPI
        try:
            result["news_headlines"] = self.news.get_headlines(symbol, limit=15)
            result["news_count"]     = len(result["news_headlines"])
        except Exception as e:
            log.warning(f"[NewsAPI] Headlines failed: {e}")
            result["news_headlines"] = []
            result["news_count"]     = 0

        # 4. Reddit mention data
        try:
            result["reddit_mentions"] = self.reddit.get_mention_count(symbol, "week")
            result["reddit_texts"]    = self.reddit.get_text_for_nlp(symbol, limit=10)
        except Exception as e:
            log.warning(f"[Reddit] Data failed: {e}")
            result["reddit_mentions"] = {}
            result["reddit_texts"]    = []

        return result

    # ── All text for NLP (news + reddit combined) ────────────
    def get_all_text_for_nlp(self, symbol: str) -> list[str]:
        """
        Merges news headlines + reddit post titles for FinBERT.
        This is what the sentiment analyzer feeds into the model.
        """
        texts = []
        try: texts += self.news.get_headlines(symbol, limit=15)
        except: pass
        try: texts += self.reddit.get_text_for_nlp(symbol, limit=10)
        except: pass
        return list(dict.fromkeys(texts))   # deduplicate, preserve order

    # ── Social spike score for fraud detection ───────────────
    def get_social_spike_score(self, symbol: str) -> float:
        """
        Compares today's Reddit mentions to last week's average.
        Returns spike% — used by fraud detection engine.
        """
        try:
            day_data  = self.reddit.get_mention_count(symbol, "day")
            week_data = self.reddit.get_mention_count(symbol, "week")

            daily_count   = day_data["post_count"]
            weekly_avg    = week_data["post_count"] / 7

            if weekly_avg < 1:
                return 0.0
            spike = ((daily_count - weekly_avg) / weekly_avg) * 100
            return round(max(spike, 0), 2)
        except Exception:
            return 0.0

    # ── Market-wide summary ──────────────────────────────────
    def get_market_overview(self, symbols: list) -> dict:
        """
        Batch collect live quotes for multiple symbols.
        Uses Yahoo for batch efficiency.
        """
        quotes = {}
        for sym in symbols:
            try:
                q = self.yahoo.get_quote(sym)
                quotes[sym] = q
            except Exception:
                pass
            time.sleep(0.1)

        gainers = sorted(quotes.values(),
                         key=lambda x: x.get("change_pct", 0),
                         reverse=True)[:5]
        losers  = sorted(quotes.values(),
                         key=lambda x: x.get("change_pct", 0))[:5]

        return {
            "quotes":    quotes,
            "gainers":   gainers,
            "losers":    losers,
            "timestamp": datetime.utcnow().isoformat(),
        }


# ── Singleton instance for use across app.py ────────────────
aggregator = DataAggregator()
