import os


class Config:
    # Central configuration for the application

    APP_NAME: str = "Quote Completion API"
    APP_AUTHOR: str = "Sheharyar Sarmad"
    APP_DESCRIPTION: str = "Next-word prediction API powered by an LSTM trained on famous quotes."
    APP_VERSION: str = "1.0.0"

    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")

    MODEL_PATH: str = os.path.join(DATA_DIR, "lstm_model_fixed.tflite")   # ← changed
    TOKENIZER_PATH: str = os.path.join(DATA_DIR, "tokenizer.pkl")

    MAX_LEN: int = 50
    VOCAB_SIZE: int = 10000
    DEFAULT_TOP_K: int = 5
    PAD_TOKEN_INDEX: int = 0
    UNK_TOKEN: str = "<UNK>"