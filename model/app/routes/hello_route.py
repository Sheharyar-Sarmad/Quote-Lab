from fastapi import APIRouter
from app.schemas import WelcomeResponse, HealthResponse
from app.config import Config
from app.services.model_loader import ModelLoader


class HelloRouter:
    # Welcome and health endpoints

    def __init__(self) -> None:
        self.router = APIRouter()
        self.router.add_api_route("/", self.welcome, methods=["GET"], response_model=WelcomeResponse)
        self.router.add_api_route("/health", self.health, methods=["GET"], response_model=HealthResponse)

    def welcome(self) -> WelcomeResponse:
        return WelcomeResponse(
            message=f"Welcome to the {Config.APP_NAME}, built by {Config.APP_AUTHOR}.",
            author=Config.APP_AUTHOR,
            version=Config.APP_VERSION,
        )

    def health(self) -> HealthResponse:
        return HealthResponse(status="ok", model_loaded=ModelLoader.is_loaded())


hello_router = HelloRouter().router