from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, patients, census, ingest, narratives, safety, audit

# Create database tables (standard SQLAlchemy SQLite setup)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medico Agent Clinical AI API", version="2.0.0")

# CORS Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow connections from Vite react dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(census.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(narratives.router, prefix="/api")
app.include_router(safety.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "OK", "service": "Medico Agent FastAPI Service"}
