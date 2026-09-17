from typing import List, Dict
import numpy as np
from app.config import Config
from app.services.model_loader import ModelLoader


class Predictor:
    # Performs next-word prediction using the loaded TFLite model

    @staticmethod
    def _pad_sequence(seq: List[int]) -> np.ndarray:
        """Applies pre-padding to match Config.MAX_LEN."""
        if len(seq) >= Config.MAX_LEN:
            seq = seq[-Config.MAX_LEN:]
        else:
            seq = [Config.PAD_TOKEN_INDEX] * (Config.MAX_LEN - len(seq)) + seq
        return np.array([seq], dtype=np.int32)

    @classmethod
    def predict(cls, prompt: str, top_k: int = Config.DEFAULT_TOP_K) -> List[Dict]:
        interpreter = ModelLoader.get_interpreter()
        tokenizer = ModelLoader.get_tokenizer()
        index_to_word = ModelLoader.get_index_to_word()

        seq = tokenizer.texts_to_sequences([prompt])[0]
        padded = cls._pad_sequence(seq)

        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        interpreter.set_tensor(input_details[0]["index"], padded)
        interpreter.invoke()

        probs = interpreter.get_tensor(output_details[0]["index"])[0]
        top_indices = np.argsort(probs)[-top_k:][::-1]

        return [
            {
                "word": index_to_word.get(int(i), Config.UNK_TOKEN),
                "probability": float(probs[i]),
            }
            for i in top_indices
        ]