from pydantic import BaseModel, Field
from typing import List


class PredictRequest(BaseModel):
    # Request schema for the prediction endpoint
    prompt: str = Field(..., min_length=1, max_length=500, description="Text prompt to complete.")
    top_k: int = Field(5, ge=1, le=10, description="Number of predictions to return.")


class Prediction(BaseModel):
    # Single predicted word with its probability
    word: str
    probability: float


class PredictResponse(BaseModel):
    # Response schema for the prediction endpoint
    prompt: str
    predictions: List[Prediction]


class WelcomeResponse(BaseModel):
    # Response schema for the welcome endpoint
    message: str
    author: str
    version: str


class HealthResponse(BaseModel):
    # Response schema for the health check endpoint
    status: str
    model_loaded: bool