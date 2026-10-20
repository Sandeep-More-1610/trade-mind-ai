# Hosting setup

The deployment files are prepared; creating hosting services and configuring credentials still requires access to your Vercel and Render accounts. No hosting resources are provisioned by these files alone.

## Render AI service

Create a Docker web service from this repository, with root directory `ai-service`. The Dockerfile installs CPU-only PyTorch and serves Flask through Gunicorn. Use `/health` as its health check. Review memory needs and costs before selecting a plan: loading the ML libraries alone can exceed 512 MB. Configure `FINNHUB_API_KEY`, `NEWS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and `REDDIT_USER_AGENT` for the providers you use. FinBERT downloads its model on first use.

## Render backend

Create a Docker web service with root directory `backend` and `/actuator/health` as its health check. The image activates the production profile and uses Render's `PORT`. It requires an existing MySQL database initialized with `database/schema.sql`.

Set the following environment variables on the backend:

- `JDBC_DATABASE_URL`: the MySQL JDBC connection URL, including provider-required TLS settings.
- `DATABASE_USERNAME` and `DATABASE_PASSWORD`: the database credentials.
- `JWT_SECRET`: a generated random signing secret of at least 32 bytes; never use the source-code development default.
- `AI_SERVICE_URL`: the AI service URL, without a trailing slash.
- `FRONTEND_URL`: the exact HTTPS Vercel frontend origin. Comma-separated origins are supported.
- `FINNHUB_API_KEY` and `NEWS_API_KEY`: optional provider keys.

The production profile validates the schema, uses an in-memory cache, and does not require Redis. Use a managed database with persistence for real accounts and virtual trades.

## Vercel frontend

Import the repository with root directory `frontend`. `vercel.json` configures the React build and browser-route rewrites. Set the production environment variable `REACT_APP_API_URL` to the backend's HTTPS URL followed by `/api`. Redeploy after changing this build-time value.

## GitHub Actions secrets

Configure repository secrets under Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- `REACT_APP_API_URL`: backend HTTPS URL ending in `/api`.
- `RENDER_DEPLOY_HOOK_URL`: backend deploy-hook URL.
- `RENDER_AI_DEPLOY_HOOK`: AI deploy-hook URL.

Treat tokens, database passwords, and deploy-hook URLs as secrets. Do not commit them or paste them into chat. Hosting-account sign-in and any new permissions or paid services must be resolved before provisioning. Once configured, push to `main` to run all checks and the enabled deployment jobs. For Render services, disable duplicate automatic deployments if GitHub Actions is intended to control releases.

## Approved free demo

The free hosted demonstration uses `demo_app:app` with `requirements-demo.txt` for the AI service and the Spring `demo` profile for the backend. It has no provider keys, persistent database, or trained ML models. Market histories and prices are simulated and clearly marked; indicator scores are calculations on those samples. No live news, sentiment, Reddit, or fraud monitoring is provided. The full ML implementation remains in `ai-service/app.py`.

Configure the AI service as Python 3.11, root `ai-service`, build `pip install -r requirements-demo.txt`, start `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 demo_app:app`, and Free compute. Configure the backend as Docker with root `backend`, Free compute, `SPRING_PROFILES_ACTIVE=demo`, a generated `JWT_SECRET`, `AI_SERVICE_URL`, `FRONTEND_URL`, and `JAVA_TOOL_OPTIONS=-Xmx192m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=32m -Xss512k -XX:ActiveProcessorCount=2`.

On Vercel, use root `frontend` and set `REACT_APP_DEMO_MODE=true` and `REACT_APP_API_URL` to the hosted backend plus `/api`. Free Render services can sleep after inactivity; initial requests may take a minute. Accounts and trades reset on service restart or redeployment, and both services share the workspace's free instance-hour allowance. Do not add a payment method or enable paid resources for this free demo.
