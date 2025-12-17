from app.core.config import Settings
import uvicorn

def main():
    s = Settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=s.SERVER_PORT,
        reload=True,
        log_config=None,   # <-- clave para no pisar structlog/handlers
        access_log=True,
    )

if __name__ == "__main__":
    main()
