# Model implementation and evaluation notes

These notes describe `ai-service/app.py`, not benchmark results. This is an experimental implementation; the hosted demo runs the separate `demo_app.py` service without trained ML models.

## Implemented components

- LSTM network: 60-observation closing-price inputs, two LSTM layers, dropout, and a softmax output.
- XGBoost and Random Forest: six features (RSI, MACD, signal line, ATR, Bollinger-band width, volume ratio).
- FinBERT: pretrained `ProsusAI/finbert` inference over up to 15 texts per call. No FinBERT fine-tuning is implemented.
- Combined score: fixed weights of 30% LSTM, 25% XGBoost, 20% Random Forest, and 25% sentiment.
- Anomaly rules: volume, five-day price changes, social activity, and news thresholds; not verified fraud findings.

## Known limitations before reporting model performance

1. **Correct LSTM targets and labels.** Training supplies labels 0 (non-increasing close) and 1 (increasing close); inference maps indices to BUY, HOLD, SELL. The output has three classes although targets contain two. Consistent labels and output mapping are needed before interpreting signals.
2. **Isolate training state.** LSTM models are cached by symbol, but the scaler is shared and refitted on each request. XGBoost and Random Forest each cache one global model trained on the first symbol requested. Store/version each model with its preprocessing and intended training universe.
3. **Add chronological evaluation.** No time-based holdout, walk-forward evaluation, baseline comparison, or cost-aware backtest is reported. The scaler fits the supplied history before training. Separate fitting and evaluation periods before measuring generalization.
4. **Remove unknown future targets.** Tree-model training compares the next close and immediately converts the result to an integer. A missing future value becomes a zero label rather than being removed. Drop unlabeled observations before training.
5. **Configure early stopping.** The LSTM callback defaults to validation loss, but training passes no validation data. Add a chronological validation set and matching monitor.
6. **Expose fallback provenance.** Provider access depends on credentials and availability. The Spring backend can return a prior prediction or fixed fallback response after failure. Its fallback confidence is not model evidence; consumers should expose source and freshness.
7. **Measure performance before claiming it.** Softmax probabilities, weighted scores, and sentiment percentages are not measured prediction accuracy or profit probability. No accuracy, latency, user-count, or return claim should be made without a recorded measurement protocol.

These are documented follow-up tasks. This documentation update does not change model behavior. Demo tests validate simulated-data responses; they do not validate the full ML pipeline.
