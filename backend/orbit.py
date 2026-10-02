"""TLE fetching/caching and basic orbital element derivation."""
from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from sgp4.api import Satrec

CACHE_DIR = Path(__file__).parent / "cache"
SAMPLE_FILE = CACHE_DIR / "sample_tles.txt"
CACHE_TTL_S = 2 * 3600
CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

GROUPS = [
    "stations",
    "cosmos-1408-debris",
    "fengyun-1c-debris",
    "iridium-33-debris",
    "cosmos-2251-debris",
]

MU_EARTH = 398600.4418  # km^3/s^2
R_EARTH = 6378.137  # km


def _parse_tle_text(text: str) -> list[tuple[str, str, str]]:
    """Parse 3-line TLE text into (name, line1, line2) tuples."""
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    out = []
    i = 0
    while i + 2 < len(lines):
        name, l1, l2 = lines[i], lines[i + 1], lines[i + 2]
        if l1.startswith("1 ") and l2.startswith("2 "):
            out.append((name.strip(), l1, l2))
            i += 3
        else:
            i += 1
    return out


def _cache_path(group: str) -> Path:
    return CACHE_DIR / f"{group}.txt"


def _fetch_group(group: str, client: httpx.Client) -> str | None:
    """Return TLE text for a group: fresh cache, else network, else stale cache."""
    path = _cache_path(group)
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_S:
        return path.read_text()
    try:
        r = client.get(CELESTRAK_URL.format(group=group))
        r.raise_for_status()
        text = r.text
        if not _parse_tle_text(text):
            raise ValueError(f"no TLEs in response for {group}")
        path.write_text(text)
        return text
    except Exception as e:  # network/ratelimit/invalid response
        print(f"[orbit] fetch failed for {group}: {e}")
        if path.exists():
            return path.read_text()  # stale cache beats nothing
        return None


def _write_sample(groups: dict[str, list[tuple[str, str, str]]]) -> None:
    """Snapshot all groups into sample_tles.txt with '# GROUP' headers."""
    parts = []
    for group, tles in groups.items():
        parts.append(f"# GROUP {group}")
        for name, l1, l2 in tles:
            parts.extend([name, l1, l2])
    SAMPLE_FILE.write_text("\n".join(parts) + "\n")


def _read_sample() -> dict[str, list[tuple[str, str, str]]]:
    groups: dict[str, list[tuple[str, str, str]]] = {}
    if not SAMPLE_FILE.exists():
        return groups
    current = "unknown"
    buf: list[str] = []

    def flush():
        if buf:
            groups.setdefault(current, []).extend(_parse_tle_text("\n".join(buf)))
            buf.clear()

    for ln in SAMPLE_FILE.read_text().splitlines():
        if ln.startswith("# GROUP "):
            flush()
            current = ln[len("# GROUP "):].strip()
        else:
            buf.append(ln)
    flush()
    return groups


def load_tles() -> dict[str, list[tuple[str, str, str]]]:
    """Load TLEs per group. Falls back to sample snapshot for missing groups."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    result: dict[str, list[tuple[str, str, str]]] = {}
    with httpx.Client(timeout=20, headers={"User-Agent": "KesslerWatch/0.1 (hackathon)"}) as client:
        for g in GROUPS:
            text = _fetch_group(g, client)
            if text:
                result[g] = _parse_tle_text(text)

    if len(result) == len(GROUPS):
        if not SAMPLE_FILE.exists():
            _write_sample(result)
    else:
        sample = _read_sample()
        for g in GROUPS:
            if g not in result and g in sample:
                print(f"[orbit] using sample snapshot for {g}")
                result[g] = sample[g]
    return result


def _epoch_utc(sat: Satrec) -> datetime:
    year = sat.epochyr + (2000 if sat.epochyr < 57 else 1900)
    return datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=sat.epochdays - 1)


def describe(name: str, l1: str, l2: str, group: str) -> dict | None:
    """Catalog entry with perigee/apogee from mean elements."""
    try:
        sat = Satrec.twoline2rv(l1, l2)
    except Exception:
        return None
    n = sat.no_kozai / 60.0  # rad/s
    if n <= 0:
        return None
    a = (MU_EARTH / n**2) ** (1 / 3)
    e = sat.ecco
    return {
        "norad": int(sat.satnum),
        "name": name,
        "group": group,
        "tle1": l1,
        "tle2": l2,
        "epoch": _epoch_utc(sat).isoformat().replace("+00:00", "Z"),
        "perigee_km": round(a * (1 - e) - R_EARTH, 1),
        "apogee_km": round(a * (1 + e) - R_EARTH, 1),
    }


def build_catalog() -> list[dict]:
    seen: set[int] = set()
    catalog = []
    for group, tles in load_tles().items():
        for name, l1, l2 in tles:
            entry = describe(name, l1, l2, group)
            if entry and entry["norad"] not in seen:
                seen.add(entry["norad"])
                catalog.append(entry)
    return catalog
