package com.ai.monitoring.service;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Instant;

@Service
public class InfluxDbService {

    @Value("${influxdb.url}")
    private String url;

    @Value("${influxdb.token}")
    private String token;

    @Value("${influxdb.org}")
    private String org;

    @Value("${influxdb.bucket}")
    private String bucket;

    private InfluxDBClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        client = InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
    }

    @PreDestroy
    public void cleanup() {
        if (client != null) {
            client.close();
        }
    }

    public void writeMetric(String jsonMsg) {
        try {
            JsonNode node = mapper.readTree(jsonMsg);
            String machineId = node.get("machine_id").asText();
            double cpu = node.get("cpu_usage_percent").asDouble();
            double ramPercent = node.get("ram_usage").get("percent").asDouble();
            Instant timestamp = Instant.parse(node.get("timestamp").asText());

            Point point = Point.measurement("system_metrics")
                    .addTag("machine_id", machineId)
                    .addField("cpu_usage_percent", cpu)
                    .addField("ram_usage_percent", ramPercent)
                    .time(timestamp, WritePrecision.MS);

            WriteApiBlocking writeApi = client.getWriteApiBlocking();
            writeApi.writePoint(point);
            
        } catch (Exception e) {
            System.err.println("Failed to write to InfluxDB: " + e.getMessage());
        }
    }
}
