from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import inspiration, entities, chat, genesis

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inspiration.router, prefix=f"{settings.API_V1_STR}", tags=["inspiration"])
app.include_router(entities.router, prefix=f"{settings.API_V1_STR}", tags=["entities"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(genesis.router, prefix=f"{settings.API_V1_STR}/genesis", tags=["genesis"])
from app.routers import projects, chapters
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}", tags=["projects"])
app.include_router(chapters.router, prefix=f"{settings.API_V1_STR}", tags=["chapters"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Novel Writing Assistant API"}
