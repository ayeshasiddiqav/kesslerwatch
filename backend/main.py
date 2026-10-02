"""KesslerWatch API."""
from __future__ import annotations

import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import orbit

app = FastAPI(title="KesslerWatch")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_catalog: list[dict] = []
_catalog_built_at = 0.0


def get_catalog() -> list[dict]:
    """In-memory catalog, rebuilt when the 2h file cache would expire."""
    global _catalog, _catalog_built_at
    if not _catalog or time.time() - _catalog_built_at > orbit.CACHE_TTL_S:
        _catalog = orbit.build_catalog()
        _catalog_built_at = time.time()
    return _catalog


@app.get("/catalog")
def catalog() -> list[dict]:
    return get_catalog()


@app.get("/health")
def health() -> dict:
    return {"ok": True}
