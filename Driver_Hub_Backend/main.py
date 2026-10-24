from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import admin, applications, auth, jobs, profiles


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Driver Hub API",
        version="1.0.0",
        description="Driver recruitment portal API",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth.router)
    application.include_router(jobs.router)
    application.include_router(profiles.router)
    application.include_router(applications.router)
    application.include_router(admin.router)

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Mount Driver_Hub_Frontend for unified production hosting (e.g. Render)
    frontend_dir = Path(__file__).resolve().parent.parent / "Driver_Hub_Frontend"
    if not frontend_dir.exists():
        frontend_dir = Path(__file__).resolve().parent / "Driver_Hub_Frontend"

    if frontend_dir.exists() and (frontend_dir / "index.html").exists():
        application.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
    else:
        @application.get("/")
        def root() -> dict[str, str]:
            return {"message": "Driver Hub API is running", "docs": "/docs"}

    return application


app = create_app()
