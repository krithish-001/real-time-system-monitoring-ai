import os
import time
import json
import psutil
from datetime import datetime, timezone
from kafka import KafkaProducer

# Configuration via environment variables
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "system-metrics")
MACHINE_ID = os.getenv("MACHINE_ID", "server-01")

def get_system_metrics():
    """Collects CPU, RAM, and Disk I/O metrics conforming to our JSON Schema."""
    
    # We sample disk IO with a slight delay using the cpu_percent interval
    disk_io_1 = psutil.disk_io_counters()
    cpu_percent = psutil.cpu_percent(interval=1.0) # Blocks for 1.0 second to get accurate reading
    disk_io_2 = psutil.disk_io_counters()

    ram = psutil.virtual_memory()

    # Calculate actual bytes read/written over the 1 second interval
    read_bytes_sec = disk_io_2.read_bytes - disk_io_1.read_bytes
    write_bytes_sec = disk_io_2.write_bytes - disk_io_1.write_bytes

    timestamp = datetime.now(timezone.utc).isoformat()

    metric = {
        "timestamp": timestamp,
        "machine_id": MACHINE_ID,
        "cpu_usage_percent": round(cpu_percent, 2),
        "ram_usage": {
            "used_mb": round(ram.used / (1024 * 1024), 2),
            "total_mb": round(ram.total / (1024 * 1024), 2),
            "percent": ram.percent
        },
        "disk_io": {
            "read_bytes_sec": read_bytes_sec,
            "write_bytes_sec": write_bytes_sec
        }
    }
    return metric

def main():
    print(f"Starting Sensor for {MACHINE_ID}.")
    print(f"Connecting to Kafka at {KAFKA_BROKER}...")
    
    # Retry connection for docker network startup timing
    producer = None
    for i in range(10):
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print("Connected successfully to Kafka. Beginning metric stream...")
            break
        except Exception as e:
            print(f"Connection failed, retrying in 5 seconds... ({e})")
            time.sleep(5)
            
    if not producer:
        print("Failed to connect to Kafka. Exiting...")
        return

    try:
        while True:
            metric = get_system_metrics()
            producer.send(TOPIC, metric)
            # Flush periodically or rely on default batching, but for real-time monitoring immediate send is preferred
            producer.flush() 
            print(f"[{datetime.now().time()}] Sent metric: CPU: {metric['cpu_usage_percent']}% | RAM: {metric['ram_usage']['percent']}%")
            time.sleep(2)
    except KeyboardInterrupt:
        print("Sensor stopped.")
    finally:
        if producer:
            producer.close()

if __name__ == "__main__":
    main()
