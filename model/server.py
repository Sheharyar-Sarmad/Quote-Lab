import os
import uvicorn

class Server:
    # Runs the Uvicorn server, Render-compatible.
    # Render injects a PORT env var — we fall back to 10000 for local dev.

    APP_PATH: str = "app.main:app"

    @classmethod
    def get_host(cls) -> str:
        # Render requires binding to 0.0.0.0 to accept external traffic
        return os.getenv("HOST", "0.0.0.0")

    @classmethod
    def get_port(cls) -> int:
        # Render provides PORT; local dev defaults to 10000
        return int(os.getenv("PORT", "10000"))

    @classmethod
    def is_production(cls) -> bool:
        # Render sets RENDER=true automatically
        return os.getenv("RENDER", "").lower() == "true"

    @classmethod
    def run(cls) -> None:
        is_prod = cls.is_production()
        uvicorn.run(
            cls.APP_PATH,
            host=cls.get_host(),
            port=cls.get_port(),
            reload=not is_prod,          # auto-reload only in local dev
            access_log=not is_prod,      # quieter logs in production
            log_level="info",
        )


if __name__ == "__main__":
    Server.run()