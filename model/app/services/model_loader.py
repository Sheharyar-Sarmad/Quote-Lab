import pickle
from typing import Optional, Dict
from app.config import Config

try:
    from tflite_runtime.interpreter import Interpreter
except ImportError:
    from tensorflow.lite.python.interpreter import Interpreter


class ModelLoader:
    #Loads and holds the TFLite model, tokenizer, and reverse index

    _interpreter: Optional[Interpreter] = None
    _tokenizer = None
    _index_to_word: Optional[Dict[int, str]] = None
    _loaded: bool = False

    @classmethod
    def load(cls) -> None:
        if cls._loaded:
            return

        cls._interpreter = Interpreter(model_path=Config.MODEL_PATH)
        cls._interpreter.allocate_tensors()

        with open(Config.TOKENIZER_PATH, "rb") as f:
            cls._tokenizer = pickle.load(f)

        cls._index_to_word = {v: k for k, v in cls._tokenizer.word_index.items()}
        cls._index_to_word[Config.PAD_TOKEN_INDEX] = "<PAD>"
        cls._loaded = True

    @classmethod
    def get_interpreter(cls) -> Interpreter:
        return cls._interpreter

    @classmethod
    def get_tokenizer(cls):
        return cls._tokenizer

    @classmethod
    def get_index_to_word(cls) -> Dict[int, str]:
        return cls._index_to_word

    @classmethod
    def is_loaded(cls) -> bool:
        return cls._loaded