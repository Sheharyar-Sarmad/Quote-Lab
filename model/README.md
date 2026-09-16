# QuoteLab — Model

FastAPI backend that serves LSTM next-word predictions.

Loads a TFLite model + tokenizer at startup and exposes `POST /predict`.

## Stack

- FastAPI
- TensorFlow / Keras (TFLite inference)
- Uvicorn

## Run

```bash
pip install -r requirements.txt
python server.py
Runs on http://127.0.0.1:10000.
```

# Endpoint
**POST /predict**

```json
{ "prompt": "the best way to", "top_k": 5 }
```