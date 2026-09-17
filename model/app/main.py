from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Config
from app.services.model_loader import ModelLoader
from app.routes.hello_route import hello_router
from app.routes.predict_route import predict_router


class AppFactory:
    # Builds the FastAPI application with routes and middleware.

    @staticmethod
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Do NOT load the model here — Render's port scanner needs
        # the port open immediately. Model loads lazily on first request.
        yield

    @classmethod
    def create(cls) -> FastAPI:
        app = FastAPI(
            title=Config.APP_NAME,
            version=Config.APP_VERSION,
            description=Config.APP_DESCRIPTION,
            lifespan=cls.lifespan,
        )

        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        app.include_router(hello_router, tags=["Welcome"])
        app.include_router(predict_router, tags=["Prediction"])

        return app


app = AppFactory.create()