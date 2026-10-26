# TradeMind AI

A full-stack stock research and virtual-trading project built with React, Spring Boot, and Python Flask. The full AI service contains experimental LSTM, XGBoost, Random Forest, and pretrained FinBERT pipelines. A separate lightweight hosted demo uses simulated data.

**Built by Sandeep More at VIT Vellore.** Placed **3rd at Hack303 by Code Catalyst** as a solo participant under the one-person team name **Lunar Tear**.

[Frontend preview (simulated data)](https://trade-mind-ai-delta-plum.vercel.app) | [Deployment guide](DEPLOYMENT.md) | [Model implementation notes](MODEL_NOTES.md)

## Explore the project

- Stock dashboard with charts, watchlists, and market information.
- JWT authentication, virtual buy/sell transactions, holdings, trade history, and leaderboard.
- Flask endpoints integrating technical indicators and financial-text sentiment.
- Data adapters for Yahoo Finance, Finnhub, NewsAPI, and Reddit, subject to provider access and credentials.
- Rule-based risk indicators using volume, price changes, social mentions, and news counts. These are anomaly heuristics, not verified fraud findings.

## Full implementation and hosted demo

**Full AI service (`ai-service/app.py`):** includes training/inference code for LSTM, XGBoost, and Random Forest, pretrained `ProsusAI/finbert` inference, and a weighted signal score. It needs Python 3.11, ML dependencies, provider access, and first-use FinBERT downloads. The score and model confidence are not measured accuracy or a calibrated profit probability. No out-of-sample accuracy or investment-return results are provided. The model notes describe known implementation limitations.

**Hosted demo (`ai-service/demo_app.py`):** uses simulated prices and moving-average calculations. It does not run trained ML models, live sentiment, live news, or fraud monitoring. Demo accounts and trades use an in-memory H2 database and reset when the service restarts. Free services may take time to wake up.

### Hosted availability check

On 26 October 2026, the frontend and AI-service health endpoint returned HTTP 200. The AI service identified itself as demo mode with no trained models. Backend health requests timed out, so complete hosted authentication and virtual-trading flows were not verified in this check. Free services may sleep, but the cause of the timeouts was not established. Treat the public link as a frontend preview until backend operation is confirmed.

## Architecture and technology

```text
React frontend -> Spring Boot REST API -> Flask service
                          |
                 MySQL for full setup
                 H2 for local/demo profiles
```

- **Frontend:** React 18, React Router, Axios, Recharts, Chart.js.
- **Backend:** Java 17, Spring Boot 3.2, Spring Security, JWT, Spring Data JPA.
- **AI/NLP:** Python, Flask, NumPy, pandas, TensorFlow/Keras, scikit-learn, XGBoost, Hugging Face Transformers.
- **Data:** MySQL, H2, Yahoo Finance, Finnhub, NewsAPI, Reddit.
- **Delivery:** GitHub Actions, Vercel, Render.

The Spring API handles accounts, portfolios, and virtual trades. Flask handles provider adapters and experimental ML/NLP processing. The original Spring configuration supports Redis; local/demo/production profiles use an in-memory cache.

## Repository layout

```text
frontend/                 React UI and API client
backend/                  Spring Boot sources and tests
ai-service/app.py         Full experimental ML/NLP service
ai-service/demo_app.py    Lightweight simulated-data service
ai-service/data_sources.py Provider integrations
ai-service/test_demo.py   Demo contract tests
database/schema.sql      MySQL schema and sample stocks
.github/workflows/        CI configuration
start-local.ps1           Windows local startup helper
```

## Run locally

Use Node.js 20+, Java 17 with Maven, and Python 3.11. Install dependencies and build the backend before starting the Windows helper:

```powershell
git clone https://github.com/Sandeep-More-1610/trade-mind-ai.git
cd trade-mind-ai
cd frontend
npm ci
cd ..
py -3.11 -m venv ai-service/.venv
.\ai-service\.venv\Scripts\Activate.ps1
python -m pip install -r ai-service/requirements.txt
cd backend
mvn --batch-mode --no-transfer-progress verify
cd ..
.\start-local.ps1
```

Open `http://localhost:3000`. The backend and Flask use ports 8080 and 5000. The helper uses the local H2 dev profile with data under `backend/.local-data/`. Sample prices and fallback responses are not live results. See [DEPLOYMENT.md](DEPLOYMENT.md) for the MySQL configuration, hosted demo, and environment variables.

Provider variables are `FINNHUB_API_KEY`, `NEWS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and `REDDIT_USER_AGENT`. Supply credentials privately. Production also needs a strong `JWT_SECRET`, database credentials, and exact frontend/API origins.

To run only the lightweight service, install `ai-service/requirements-demo.txt` in a separate environment, then run `python -m flask --app demo_app run --port 5000` from `ai-service/`. This starts Flask only; the deployment guide explains the matching backend/demo frontend configuration.

## Validation

```powershell
# From ai-service/: demo contracts, no model/provider access
python -m unittest test_demo.py
# From backend/
mvn --batch-mode --no-transfer-progress verify
# From frontend/
npm ci
npm run build
```

GitHub Actions runs the frontend build, backend tests, full AI import/health check, and demo tests. Import and health checks do not establish prediction quality or test every external provider. [MODEL_NOTES.md](MODEL_NOTES.md) records the remaining evaluation work.

The lightweight service contract suite was rerun on 26 October 2026: 2 tests passed. This local rerun did not train or benchmark the full ML models.

## Author

**Sandeep More** | B.Tech Computer Science and Engineering, VIT Vellore | Expected August 2028

[GitHub](https://github.com/Sandeep-More-1610) | [LinkedIn](https://www.linkedin.com/in/sandeep-more-a0799232a/)
