"""
FastAPI application entry point for SD City Nature Challenge backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import API_PREFIX, CORS_ORIGINS
from app.routers import exploratory, hotspots, comparison, strategy
from app.services.data_loader import DataLoader

# Initialize FastAPI app
app = FastAPI(
    title="SD City Nature Challenge API",
    description="Backend API for biodiversity observation analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(exploratory.router, prefix=API_PREFIX)
app.include_router(hotspots.router, prefix=API_PREFIX)
app.include_router(comparison.router, prefix=API_PREFIX)
app.include_router(strategy.router, prefix=API_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Load and cache data on application startup"""
    print("Loading observation data into cache...")
    DataLoader.load_data()
    print("Data cache initialized successfully")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "SD City Nature Challenge API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
