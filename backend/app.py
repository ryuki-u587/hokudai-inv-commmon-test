# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
from typing import Dict, Optional, Tuple


from schemes import SCHEMES, SCHEME_MAX


app = FastAPI(title="共通テスト換算 API", version="1.0.0")


# CORS（ローカル開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConvertRequest(BaseModel):
    scheme_key: str
    scores: Dict[str, float] # 例: {"国語": 150, "数学": 180, ...}
    bases: Optional[Dict[str, int]] = None # 例: {"地理歴史": 100} → 満点上書き


class ConvertResponse(BaseModel):
    scheme_key: str
    total: float
    breakdown: Dict[str, float]
    max_total: int




def _convert(raw: Dict[str, float], scheme_key: str, base_override: Optional[Dict[str, int]] = None) -> Tuple[float, Dict[str, float]]:
    if scheme_key not in SCHEMES:
        raise HTTPException(status_code=404, detail=f"未知のスキーム: {scheme_key}")


    scheme = SCHEMES[scheme_key]
    breakdown: Dict[str, float] = {}
    total = 0.0


    for subj, (points, base) in scheme.items():
        base = base_override.get(subj, base) if base_override else base
        score = float(raw.get(subj, 0.0))
        # 0〜満点でクリップ
        if base <= 0:
            raise HTTPException(status_code=400, detail=f"{subj} の満点が不正です")
        score = max(0.0, min(score, float(base)))
        conv = (score / float(base)) * points
        conv = round(conv, 2)
        breakdown[subj] = conv
        total += conv


    return round(total, 2), breakdown




@app.get("/", include_in_schema=False)
def index():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}




@app.get("/schemes")
def list_schemes():
    """スキーム一覧と定義を返す"""
    return {
        "schemes": [
            {
                "key": key,
                "max_total": SCHEME_MAX[key],
                "subjects": {subj: {"points": pt, "base": base} for subj, (pt, base) in subjects.items()},
            }
            for key, subjects in SCHEMES.items()
        ]
    }

@app.get("/schemes/{key}")
def get_scheme(key: str):
    if key not in SCHEMES:
        raise HTTPException(status_code=404, detail="スキームが見つかりません")
    subjects = SCHEMES[key]
    return {
        "key": key,
        "max_total": SCHEME_MAX[key],
        "subjects": {subj: {"points": pt, "base": base} for subj, (pt, base) in subjects.items()},
    }

@app.post("/convert", response_model=ConvertResponse)
def convert(req: ConvertRequest):
    total, breakdown = _convert(req.scores, req.scheme_key, req.bases)
    return ConvertResponse(
        scheme_key=req.scheme_key,
        total=total,
        breakdown=breakdown,
        max_total=SCHEME_MAX.get(req.scheme_key, 0),
    )

