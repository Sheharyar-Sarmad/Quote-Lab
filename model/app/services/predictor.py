from fastapi import APIRouter, HTTPException
from app.schemas import PredictRequest, PredictResponse, Prediction
from app.services.predictor import Predictor
from app.services.model_loader import ModelLoader


class PredictRouter:
    # Next-word prediction endpoint

    def __init__(self) -> None:
        self.router = APIRouter()
        self.router.add_api_route(
            "/predict",
            self.predict,
            methods=["POST"],
            response_model=PredictResponse,
        )

    def predict(self, request: PredictRequest) -> PredictResponse:
        try:
            # Lazy-load the model on first real request
            if not ModelLoader.is_loaded():
                ModelLoader.load()

            raw = Predictor.predict(request.prompt, top_k=request.top_k)
            predictions = [Prediction(**p) for p in raw]
            return PredictResponse(prompt=request.prompt, predictions=predictions)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


predict_router = PredictRouter().router