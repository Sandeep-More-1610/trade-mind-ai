# ⬡ TradeMind AI — Full-Stack Stock Intelligence Platform

> **HACK303 · CODE CATALYST · Team Lunar Tear · VIT**
> An all-in-one AI platform for retail investors — LSTM predictions, NLP sentiment, virtual trading & fraud detection.

---

## 🏗️ Architecture

```
┌─────────────────┐     JWT      ┌──────────────────────┐     REST     ┌─────────────────────┐
│  React Frontend │ ──────────▶  │  Spring Boot Backend │ ──────────▶  │  Python AI Service  │
│  (Vercel)       │  ◀────────── │  (Render / port 8080)│  ◀────────── │  (Render / port 5000│
└─────────────────┘              └──────────────────────┘              └─────────────────────┘
                                          │                                       │
                               ┌──────────┴──────────┐               ┌───────────┴──────────┐
                               │  MySQL  +  Redis     │               │  Yahoo Finance API   │
                               │  (Database + Cache)  │               │  Finnhub · NewsAPI   │
                               └─────────────────────┘               └──────────────────────┘
```

## 📁 Project Structure

```
trademind/
├── frontend/                    ← React.js (Recharts, Chart.js, JWT Auth)
│   ├── src/
│   │   ├── App.jsx              ← Router + Sidebar layout
│   │   ├── services/api.js      ← Axios calls to Spring Boot
│   │   ├── hooks/hooks.js       ← useAuth, useStocks, usePortfolio
│   │   └── pages/
│   │       ├── LoginPage.jsx    ← JWT register / login
│   │       ├── DashboardPage.jsx← Live charts, watchlist
│   │       ├── PredictionPage.jsx← AI Brain Score (LSTM + XGBoost + RF)
│   │       ├── SimulatorPage.jsx← Virtual trading (₹10L)
│   │       ├── SentimentPage.jsx← FinBERT NLP sentiment
│   │       ├── FraudPage.jsx    ← Pump & dump detection
│   │       └── LeaderboardPage.jsx
│   └── package.json
│
├── backend/                     ← Java Spring Boot (REST APIs, Microservices)
│   ├── pom.xml                  ← All Maven dependencies
│   └── src/main/java/com/trademind/
│       ├── TradeMindApplication.java   ← Entry + Security + JWT config
│       ├── controller/Controllers.java ← Auth, Stock, Predict, Trade, Portfolio, Fraud
│       ├── service/Services.java       ← Business logic + scheduled jobs
│       ├── model/Models.java           ← JPA Entities (User, Stock, Trade…)
│       └── repository/Repositories.java← Spring Data JPA queries
│
├── ai-service/                  ← Python Flask (LSTM · XGBoost · FinBERT)
│   ├── app.py                   ← All ML routes
│   └── requirements.txt
│
├── database/
│   └── schema.sql               ← MySQL tables + seed data
│
└── .github/workflows/cicd.yml   ← CI/CD → Vercel + Render
```

---

## Run locally on this Windows computer

The local `dev` profile uses a separate H2 database in `backend/.local-data/` and an in-memory cache. It leaves the MySQL configuration unchanged and starts with the sample stock prices from `database/schema.sql`.

After dependencies are installed and the backend is built, run `./start-local.ps1` from PowerShell, then open http://localhost:3000. The frontend, backend, and AI service use ports 3000, 8080, and 5000. Startup logs are saved in `.local-run/`.

Register a local account to use the dashboard. Live provider features require your own Finnhub, NewsAPI, and Reddit environment variables. Sample prices and fallback predictions are not live market results.

## 🚀 Local Setup

### Prerequisites
- Node.js 20+, Java 17+, Python 3.11+, MySQL 8, Redis 7

### 1️⃣ Database
```bash
mysql -u root -p < database/schema.sql
```

### 2️⃣ Python AI Service
```bash
cd ai-service
pip install -r requirements.txt
export NEWS_API_KEY=your_key
python app.py
# Running on http://localhost:5000
```

### 3️⃣ Spring Boot Backend
```bash
cd backend
# Edit src/main/resources/application.properties:
#   spring.datasource.password=YOUR_MYSQL_PASSWORD
#   finnhub.api.key=YOUR_FINNHUB_KEY
mvn spring-boot:run
# Running on http://localhost:8080
```

### 4️⃣ React Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8080/api" > .env
npm start
# Running on http://localhost:3000
```

---

## 🔑 API Keys Needed

| Service       | Get Free Key At                        | Used For                    |
|---------------|----------------------------------------|-----------------------------|
| Finnhub       | https://finnhub.io                     | Live stock quotes           |
| NewsAPI       | https://newsapi.org                    | News headlines for NLP      |
| Yahoo Finance | Built into `yfinance` library — free  | Historical OHLCV data       |

---

## 🌐 REST API Reference

### Auth
| Method | Endpoint             | Description            |
|--------|----------------------|------------------------|
| POST   | `/api/auth/register` | Register + get JWT     |
| POST   | `/api/auth/login`    | Login + get JWT        |

### Stocks
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | `/api/stocks`                   | All stocks               |
| GET    | `/api/stocks/{symbol}`          | Live quote (Finnhub)     |
| GET    | `/api/stocks/{symbol}/history`  | OHLCV history            |
| GET    | `/api/stocks/market/gainers`    | Top 5 gainers            |

### AI Predictions
| Method | Endpoint                    | Description                   |
|--------|-----------------------------|-------------------------------|
| GET    | `/api/predict/{symbol}`     | BUY/SELL/HOLD + AI score      |
| GET    | `/api/predict/{symbol}/score` | Detailed AI Brain Score     |

### Virtual Trading
| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| POST   | `/api/trade/buy`     | Buy shares (virtual ₹)   |
| POST   | `/api/trade/sell`    | Sell shares              |
| GET    | `/api/trade/history` | Trade history            |
| GET    | `/api/portfolio`     | Holdings with P&L        |
| GET    | `/api/portfolio/summary` | Balance + total worth |

### Sentiment & Fraud
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/sentiment/{symbol}`      | NLP sentiment per stock  |
| GET    | `/api/sentiment/market/overview` | Fear/Greed index       |
| GET    | `/api/fraud/alerts`            | Active fraud alerts      |
| GET    | `/api/fraud/{symbol}`          | Risk score for a stock   |
| GET    | `/api/leaderboard`             | Virtual trading rankings |

---

## 🧠 AI Models

| Model         | Library         | Purpose                        | Weight |
|---------------|-----------------|--------------------------------|--------|
| LSTM          | TensorFlow/Keras| 60-day sequence price forecast | 30%    |
| XGBoost       | xgboost         | Feature-based classifier       | 25%    |
| Random Forest | scikit-learn    | Ensemble signal                | 20%    |
| FinBERT NLP   | HuggingFace     | News & social sentiment        | 25%    |

Combined into one **AI Market Brain Score (0–100)** → BUY / HOLD / SELL

---

## ☁️ Deployment

| Layer      | Platform | URL                              |
|------------|----------|----------------------------------|
| Frontend   | Vercel   | https://trademind.vercel.app     |
| Backend    | Render   | https://trademind-api.onrender.com |
| AI Service | Render   | https://trademind-ai.onrender.com  |
| Database   | PlanetScale / Railway (MySQL)        |
| Cache      | Upstash (Redis)                      |

Push to `main` → GitHub Actions builds the frontend and runs backend and AI health tests. Deployments run only after all checks pass and the corresponding Vercel or Render secrets are configured. Without deployment credentials, the deployment jobs are skipped.

The AI CI job uses CPU-only PyTorch wheels from the official PyTorch index and disables pip caching to avoid filling the runner with unused CUDA libraries. The backend integration test uses an isolated in-memory H2 database; it does not need MySQL, Redis, or API credentials.

---

## 👤 Team

**Team Lunar Tear** · Sandeep Namdevrao More · VIT Vellore

Built for **HACK303 — CODE CATALYST Hackathon**
