package com.trademind.controller;

import com.trademind.model.Prediction;
import com.trademind.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    // GET /api/predict/{symbol}  — Run AI prediction for a stock
    @GetMapping("/{symbol}")
    public ResponseEntity<?> predict(@PathVariable String symbol) {
        Prediction prediction = predictionService.getPrediction(symbol);
        return ResponseEntity.ok(prediction);
    }

    // GET /api/predict/{symbol}/score  — Get AI Market Brain Score
    @GetMapping("/{symbol}/score")
    public ResponseEntity<?> getAiScore(@PathVariable String symbol) {
        return ResponseEntity.ok(predictionService.getAiScore(symbol));
    }
}


// ============================================================
//  controller/SentimentController.java  — /api/sentiment
// ============================================================
