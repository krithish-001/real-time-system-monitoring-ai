import os
import time
import json
import random
import redis
from datetime import datetime, timezone
from kafka import KafkaProducer

# Config
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
PREDICTION_TOPIC = os.getenv("KAFKA_PREDICTION_TOPIC", "system-predictions")

def build_mock_prediction(last_metrics):
    """
    Simulates an LSTM model predicting the next 5 points based on the last 50 points.
    Returns simulated predictions and an anomaly flag.
    """
    if not last_metrics:
        # Default fallback
        base_cpu = 50.0
        machine_id = "server-01"
    else:
        latest = json.loads(last_metrics[0])
        base_cpu = latest.get("cpu_usage_percent", 50.0)
        machine_id = latest.get("machine_id", "server-01")

    predictions = []
    # Predict next 5 intervals
    current_trend = base_cpu
    for i in range(5):
        # Add random walk to mimic CPU load spikes
        current_trend += random.uniform(-5.0, 5.5) 
        current_trend = max(0.0, min(100.0, current_trend))
        predictions.append(round(current_trend, 2))

    # Simple rule-based anomaly detection for mock
    is_anomaly = any(p > 90.0 for p in predictions)
    
    return {
        "machine_id": machine_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "predicted_cpu_next_5_ticks": predictions,
        "anomaly_detected": is_anomaly
    }

def main():
    print(f"Starting Predictor connecting to Redis={REDIS_HOST} and Kafka={KAFKA_BROKER}")
    
    # Try connecting to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    
    producer = None
    for i in range(10):
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print("Connected to Kafka.")
            break
        except Exception as e:
            print(f"Waiting for Kafka... {e}")
            time.sleep(5)

    if not producer:
        print("Failed to start Predictor.")
        return

    try:
        while True:
            # We predict for any key matching metrics:*
            # Note: For production, we'd use SCAN instead of KEYS
            keys = r.keys("metrics:*")
            for k in keys:
                # get last 50 metrics
                metrics = r.lrange(k, 0, 49)
                
                # run 'inference'
                pred = build_mock_prediction(metrics)
                
                # send prediction back to Kafka
                producer.send(PREDICTION_TOPIC, pred)
                print(f"[{datetime.now().time()}] Inferred for {pred['machine_id']}: {pred['predicted_cpu_next_5_ticks']} | Anomaly: {pred['anomaly_detected']}")

            producer.flush()
            time.sleep(5)  # Run inference every 5 seconds
    except KeyboardInterrupt:
        pass
    finally:
        if producer:
            producer.close()

if __name__ == "__main__":
    main()
