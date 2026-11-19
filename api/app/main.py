"""FastAPI entrypoint. Every route lives under /api/v1."""

from fastapi import APIRouter, FastAPI

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by uptime monitors and CI smoke tests."""
    return {"status": "ok"}


app = FastAPI(title="LitLens API", version="0.1.0")
app.include_router(router)
