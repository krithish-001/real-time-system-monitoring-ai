package com.ai.monitoring.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class KafkaConsumerService {

    private final RedisService redisService;
    private final InfluxDbService influxDbService;
    private final SseService sseService;
    private final ObjectMapper mapper = new ObjectMapper();

    public KafkaConsumerService(RedisService redisService, InfluxDbService influxDbService, SseService sseService) {
        this.redisService = redisService;
        this.influxDbService = influxDbService;
        this.sseService = sseService;
    }

    // Listener for raw metrics published by Python Sensor
    @KafkaListener(topics = "system-metrics", groupId = "backend-group")
    public void consumeMetrics(String message) {
        try {
            JsonNode node = mapper.readTree(message);
            String machineId = node.get("machine_id").asText();
            
            // 1. Maintain sliding window of 50 samples in Redis for predictor
            redisService.addMetric(machineId, message);
            
            // 2. Persist to cold storage for LSTM re-training workloads
            influxDbService.writeMetric(message);
            
            // 3. Immediately broadcast to web frontend clients via SSE
            sseService.sendSseEvent("metric", message);
            
        } catch (Exception e) {
            System.err.println("Metric consume error: " + e.getMessage());
        }
    }
    
    // Listener for AI prediction projections published by Python Predictor
    @KafkaListener(topics = "system-predictions", groupId = "backend-group")
    public void consumePredictions(String message) {
         try {
            JsonNode node = mapper.readTree(message);
            String machineId = node.get("machine_id").asText();
            
            // Save state so if users refresh they can catch the latest AI insight
            redisService.addPrediction(machineId, message);
            
            // Broadcast prediction insight live overlay
            sseService.sendSseEvent("prediction", message);
         } catch (Exception e) {
             System.err.println("Prediction consume error: " + e.getMessage());
         }
    }
}
