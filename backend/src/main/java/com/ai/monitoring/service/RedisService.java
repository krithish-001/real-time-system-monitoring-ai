package com.ai.monitoring.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisService {
    
    private final StringRedisTemplate redisTemplate;

    public RedisService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void addMetric(String machineId, String metricJson) {
        String key = "metrics:" + machineId;
        redisTemplate.opsForList().leftPush(key, metricJson);
        // Clean up immediately: maintain exactly 50 recent metrics sliding window
        redisTemplate.opsForList().trim(key, 0, 49);
    }
    
    public void addPrediction(String machineId, String predictionJson) {
        String key = "predictions:" + machineId;
        // The most recent prediction model block
        redisTemplate.opsForValue().set(key, predictionJson);
    }
}
