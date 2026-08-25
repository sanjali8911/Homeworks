"""
Main FastAPI application entrypoint.
Serves REST API, WebSocket streams, and static frontend assets.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import BASE_DIR
from backend.database.db import init_db, db_manager
from backend.satellite.tle import tle_manager
from backend.api.routes import router as api_router
from backend.api.websocket import ws_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("satellite_monitor")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    logger.info("Initializing Satellite Orbit Monitor & Anomaly Engine...")
    # Initialize database
    init_db()
    # Sync satellites catalog
    sats = tle_manager.get_satellites()
    db_manager.sync_satellites(sats)
    logger.info(f"Loaded {len(sats)} curated satellites into catalog.")
    yield
    logger.info("Shutting down Satellite Orbit Monitor...")


app = FastAPI(
    title="Orbital Anomaly Detection & Satellite Monitoring System",
    description="Real-time satellite orbital propagation, perturbation modeling, error analysis, and anomaly detection.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(api_router)
app.include_router(ws_router)

# Mount frontend static directory
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    logger.warning("Frontend directory not found. Static files not mounted.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
