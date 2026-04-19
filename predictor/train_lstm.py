import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

def create_lstm_model(sequence_length=50, features=1):
    """
    Creates an LSTM model suitable for time-series forecasting.
    """
    model = Sequential([
        LSTM(64, activation='relu', input_shape=(sequence_length, features), return_sequences=True),
        LSTM(32, activation='relu'),
        Dense(1) # Predicting the next CPU percentage
    ])
    
    model.compile(optimizer='adam', loss='mse')
    return model

def train_model(X_train, y_train, epochs=10, batch_size=32):
    """
    Trains the LSTM model with historical data.
    X_train: shape (samples, 50, 1) -> 50 past steps
    y_train: shape (samples, 1) -> target next step
    """
    model = create_lstm_model()
    print("Training LSTM model...")
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)
    
    model.save('system_cpu_predictor.h5')
    print("Model saved to system_cpu_predictor.h5")
    return model

if __name__ == "__main__":
    # Example Mock Data Generation for template purposes
    # In production, this data would be queried from InfluxDB using InfluxDBClient
    samples = 1000
    seq_length = 50
    
    print("Generating mock data...")
    # Random realistic CPU waves (Sine wave + noise)
    time = np.arange(0, samples + seq_length)
    cpu_data = 50 + 20 * np.sin(0.1 * time) + np.random.normal(0, 2, len(time))
    
    X = []
    y = []
    for i in range(len(cpu_data) - seq_length):
        X.append(cpu_data[i:(i + seq_length)])
        y.append(cpu_data[i + seq_length])
        
    X_train = np.array(X).reshape(-1, seq_length, 1)
    y_train = np.array(y)
    
    train_model(X_train, y_train)
