#!/usr/bin/env python3
"""
Launcher script for the Satellite Orbit Monitoring & Anomaly Detection System.
Runs FastAPI backend + WebSocket server + Three.js frontend on http://localhost:8000.
"""

import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("🛰️  SATELLITE ORBIT MONITORING & ANOMALY DETECTION SYSTEM")
    print("=" * 70)
    print("Server running at: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    print("Press Ctrl+C to terminate.")
    print("=" * 70)
    
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
