from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import os
import math

# ─────────────────────────────────────────────
# OPPSETT
# ─────────────────────────────────────────────
app = FastAPI(
    title="EliteserenDSS API",
    description="Data-drevet spilleranalyseverktøy for Eliteserien",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# LAST INN DATA
# ─────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data.parquet")
df = pd.read_parquet(DATA_PATH)

# ─────────────────────────────────────────────
# HJELPEFUNKSJONER
# ─────────────────────────────────────────────

def safe(val):
    """Konverter NaN/inf/numpy-typer til JSON-sikre Python-typer."""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return None if (math.isnan(val) or math.isinf(val)) else float(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    return val

def row_to_dict(row: pd.Series) -> dict:
    return {k: safe(v) for k, v in row.items()}

def clean_df(frame: pd.DataFrame) -> list:
    return [row_to_dict(row) for _, row in frame.iterrows()]

def find_player(name: str) -> pd.Series:
    match = df[df["player_name"].str.lower() == name.lower()]
    if match.empty:
        match = df[df["player_name"].str.lower().str.contains(name.lower(), na=False)]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Spiller ikke funnet: {name}")
    return match.iloc[0]

# ─────────────────────────────────────────────
# FELTLISTER
# ─────────────────────────────────────────────

LIST_FIELDS = [f for f in [
    "player_id", "player_name", "first_name", "last_name", "age",
    "nationality", "team_name", "pos_group", "role_raw", "player_tier",
    "games", "starts", "minutes", "rating",
    "goals", "assists", "goals_per90", "assists_per90",
    "passes_key_per90", "tackles_total_per90", "duels_won_per90",
    "intensity_per90", "duel_efficiency", "shot_efficiency",
    "pass_efficiency", "dribble_efficiency", "risk_rate",
    "fair_score", "forecast_score", "reliability", "age_factor",
    "shrunk_score", "projected_score", "total_score", "percentile_pos",
    "best_role", "best_role_no", "cluster", "cluster_label",
    "risk_upside_segment", "upside_gap_best", "roi_index",
    "value_for_money", "value_tier", "scout_priority",
    "raw_score_playmaker", "raw_score_ballwinner",
    "raw_score_finisher", "raw_score_pressplayer",
    "value_score_playmaker", "value_score_ballwinner",
    "value_score_finisher", "value_score_pressplayer",
    "upside_gap_playmaker", "upside_gap_ballwinner",
    "upside_gap_finisher", "upside_gap_pressplayer",
] if f in df.columns]

RADAR_FIELDS = [f for f in [
    "z_goals_per90_pos", "z_assists_per90_pos",
    "z_passes_key_per90_pos", "z_tackles_total_per90_pos",
    "z_duels_won_per90_pos", "z_intensity_per90_pos",
    "z_shot_efficiency_pos", "z_duel_efficiency_pos",
    "z_pass_efficiency_pos", "z_dribble_efficiency_pos",
] if f in df.columns]

RADAR_LABELS = {
    "z_goals_per90_pos":         "Mål/90",
    "z_assists_per90_pos":       "Assist/90",
    "z_passes_key_per90_pos":    "Nøkkelpas",
    "z_tackles_total_per90_pos": "Taklinger",
    "z_duels_won_per90_pos":     "Dueller",
    "z_intensity_per90_pos":     "Intensitet",
    "z_shot_efficiency_pos":     "Skuddeff.",
    "z_duel_efficiency_pos":     "Duelleff.",
    "z_pass_efficiency_pos":     "Passeff.",
    "z_dribble_efficiency_pos":  "Driblings",
}

# ─────────────────────────────────────────────
# ENDEPUNKTER
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status":       "ok",
        "spillere":     int(len(df)),
        "kolonner":     int(len(df.columns)),
        "senior":       int((df["player_tier"] == "senior").sum()),
        "u23_prospect": int((df["player_tier"] == "u23_prospect").sum()),
    }


@app.get("/api/stats")
def get_stats():
    """Ligaoversikt nøkkeltall for dashboard-header."""
    return {
        "total_players":   int(len(df)),
        "senior_players":  int((df["player_tier"] == "senior").sum()),
        "u23_players":     int((df["player_tier"] == "u23_prospect").sum()),
        "total_goals":     int(df["goals"].sum()),
        "total_assists":   int(df["assists"].sum()),
        "avg_age":         round(float(df["age"].mean()), 1),
        "avg_fair_score":  round(float(df["fair_score"].mean()), 3),
        "avg_reliability": round(float(df["reliability"].mean()), 3),
        "elite_count":     int((df["value_tier"] == "Elite").sum()),
        "top_scorer": {
            "name":  df.loc[df["goals"].idxmax(), "player_name"],
            "goals": int(df["goals"].max()),
            "team":  df.loc[df["goals"].idxmax(), "team_name"],
        },
        "top_assister": {
            "name":    df.loc[df["assists"].idxmax(), "player_name"],
            "assists": int(df["assists"].max()),
            "team":    df.loc[df["assists"].idxmax(), "team_name"],
        },
        "top_fair_score": {
            "name":       df.loc[df["fair_score"].idxmax(), "player_name"],
            "fair_score": round(float(df["fair_score"].max()), 3),
            "team":       df.loc[df["fair_score"].idxmax(), "team_name"],
        },
        "top_scout": {
            "name":           df.loc[df["scout_priority"].idxmax(), "player_name"],
            "scout_priority": round(float(df["scout_priority"].max()), 3),
            "tier":           df.loc[df["scout_priority"].idxmax(), "player_tier"],
        },
        "positions": {
            pos: int((df["pos_group"] == pos).sum())
            for pos in ["GK", "DEF", "MID", "ATT"]
        },
        "risk_upside_segments": {
            seg: int((df["risk_upside_segment"] == seg).sum())
            for seg in ["Sikker_Vinner", "Sikker_Middels", "Risiko_Høy_Oppside", "Risiko_Lav_Oppside"]
            if seg in df["risk_upside_segment"].values
        },
    }


@app.get("/api/players")
def get_players(
    pos:     str | None = Query(None),
    tier:    str | None = Query(None),
    role:    str | None = Query(None, description="best_role_no"),
    cluster: str | None = Query(None, description="cluster_label"),
    segment: str | None = Query(None, description="risk_upside_segment"),
    v_tier:  str | None = Query(None, description="value_tier"),
    min_min: int        = Query(0),
    min_age: int        = Query(0),
    max_age: int        = Query(99),
    sort_by: str        = Query("fair_score"),
    limit:   int        = Query(300),
):
    """Alle spillere med valgfrie filtre."""
    result = df.copy()
    if pos:     result = result[result["pos_group"] == pos]
    if tier:    result = result[result["player_tier"] == tier]
    if role:    result = result[result["best_role_no"] == role]
    if cluster: result = result[result["cluster_label"] == cluster]
    if segment: result = result[result["risk_upside_segment"] == segment]
    if v_tier:  result = result[result["value_tier"] == v_tier]
    if min_min: result = result[result["minutes"] >= min_min]
    result = result[(result["age"] >= min_age) & (result["age"] <= max_age)]
    if sort_by in result.columns:
        result = result.sort_values(sort_by, ascending=False)
    return clean_df(result[LIST_FIELDS].head(limit))


@app.get("/api/player/{name}")
def get_player(name: str):
    """Én spiller — alle 115 kolonner."""
    return row_to_dict(find_player(name))


@app.get("/api/duell")
def get_duell(
    player_a: str = Query(...),
    player_b: str = Query(...),
):
    """Head-to-head sammenligning."""
    a = find_player(player_a)
    b = find_player(player_b)
    fields = [f for f in [
        "player_name", "team_name", "pos_group", "age", "minutes",
        "goals", "assists", "goals_per90", "assists_per90",
        "passes_key_per90", "tackles_total_per90", "duels_won_per90",
        "intensity_per90", "shot_efficiency", "duel_efficiency",
        "pass_efficiency", "dribble_efficiency", "risk_rate",
        "fair_score", "forecast_score", "reliability", "age_factor",
        "roi_index", "scout_priority", "best_role_no",
        "cluster_label", "value_tier", "risk_upside_segment",
        "raw_score_playmaker", "raw_score_ballwinner",
        "raw_score_finisher", "raw_score_pressplayer",
        "upside_gap_best", "percentile_pos",
    ] if f in df.columns]
    return {
        "player_a": {f: safe(a[f]) for f in fields},
        "player_b": {f: safe(b[f]) for f in fields},
    }


@app.get("/api/physical/top")
def get_physical_top(limit: int = Query(10)):
    cats = {
        "intensity":     "intensity_per90",
        "duels_won":     "duels_won_per90",
        "tackles":       "tackles_total_per90",
        "interceptions": "interceptions_per90",
        "duel_eff":      "duel_efficiency",
    }
    result = {}
    for key, col in cats.items():
        if col not in df.columns:
            continue
        top = df.nlargest(limit, col)[
            ["player_name", "team_name", "pos_group", col, "fair_score"]
        ]
        result[key] = clean_df(top)
    return result


@app.get("/api/physical/position/{pos_group}")
def get_physical_by_position(pos_group: str):
    pos_df = df[df["pos_group"] == pos_group.upper()]
    if pos_df.empty:
        raise HTTPException(404, f"Posisjon ikke funnet: {pos_group}")
    cols = [c for c in [
        "intensity_per90", "duels_total_per90", "duels_won_per90",
        "tackles_total_per90", "interceptions_per90", "blocks_per90",
        "duel_efficiency", "pass_efficiency",
    ] if c in pos_df.columns]
    return {
        "pos_group":    pos_group.upper(),
        "player_count": int(len(pos_df)),
        "averages":     {k: safe(v) for k, v in pos_df[cols].mean().round(3).items()},
    }


@app.get("/api/scout")
def get_scout(
    tier:    str | None = Query(None),
    pos:     str | None = Query(None),
    segment: str | None = Query(None),
    v_tier:  str | None = Query(None),
    limit:   int        = Query(50),
):
    """Prioritert scoutliste sortert på scout_priority."""
    result = df.copy()
    if tier:    result = result[result["player_tier"] == tier]
    if pos:     result = result[result["pos_group"] == pos]
    if segment: result = result[result["risk_upside_segment"] == segment]
    if v_tier:  result = result[result["value_tier"] == v_tier]
    result = result.sort_values("scout_priority", ascending=False)
    fields = [f for f in [
        "player_id", "player_name", "age", "team_name", "pos_group",
        "player_tier", "minutes", "reliability",
        "fair_score", "forecast_score", "scout_priority",
        "roi_index", "value_for_money", "value_tier",
        "risk_upside_segment", "upside_gap_best",
        "best_role_no", "cluster_label", "age_factor",
        "whatif_900min_playmaker", "whatif_900min_ballwinner",
        "whatif_900min_finisher", "whatif_900min_pressplayer",
    ] if f in result.columns]
    return clean_df(result[fields].head(limit))


@app.get("/api/risk-upside")
def get_risk_upside(
    pos:  str | None = Query(None),
    tier: str | None = Query(None),
):
    """Risk-Upside frontier: x=reliability, y=forecast_score."""
    result = df.copy()
    if pos:  result = result[result["pos_group"] == pos]
    if tier: result = result[result["player_tier"] == tier]

    fields = [f for f in [
        "player_name", "team_name", "pos_group", "age", "player_tier",
        "reliability", "forecast_score", "fair_score",
        "risk_upside_segment", "upside_gap_best",
        "roi_index", "value_tier", "best_role_no", "scout_priority",
    ] if f in result.columns]

    segment_summary = (
        result.groupby("risk_upside_segment")
        .agg(
            count=("player_name", "count"),
            avg_forecast=("forecast_score", "mean"),
            avg_reliability=("reliability", "mean"),
        )
        .round(3).reset_index()
    )

    return {
        "players":         clean_df(result[fields]),
        "segment_summary": clean_df(segment_summary),
        "metadata": {
            "rel_median":      round(float(df["reliability"].median()), 3),
            "forecast_median": round(float(df["forecast_score"].median()), 3),
        },
    }


@app.get("/api/clusters")
def get_clusters(pos: str | None = Query(None)):
    """K-means clustering oversikt per posisjon."""
    result = df.copy()
    if pos:
        result = result[result["pos_group"] == pos.upper()]

    overview = (
        result.groupby(["pos_group", "cluster_label"])
        .agg(
            count=("player_name", "count"),
            avg_fair_score=("fair_score", "mean"),
            avg_age=("age", "mean"),
            avg_minutes=("minutes", "mean"),
            silhouette=("silhouette", "first"),
        )
        .round(3).reset_index()
    )

    cluster_players = {}
    for label in result["cluster_label"].dropna().unique():
        grp = result[result["cluster_label"] == label].sort_values("fair_score", ascending=False)
        fields = [f for f in [
            "player_name", "team_name", "age", "pos_group",
            "fair_score", "forecast_score", "best_role_no", "minutes",
        ] if f in grp.columns]
        cluster_players[str(label)] = clean_df(grp[fields].head(20))

    return {
        "overview":        clean_df(overview),
        "cluster_players": cluster_players,
    }


@app.get("/api/teams")
def get_teams():
    """Lagstatistikk — snitt og topp per lag."""
    teams = (
        df.groupby("team_name")
        .agg(
            player_count=("player_name", "count"),
            avg_age=("age", "mean"),
            avg_fair_score=("fair_score", "mean"),
            avg_forecast=("forecast_score", "mean"),
            avg_reliability=("reliability", "mean"),
            total_goals=("goals", "sum"),
            total_assists=("assists", "sum"),
            u23_count=("player_tier", lambda x: (x == "u23_prospect").sum()),
        )
        .round(3).reset_index()
        .sort_values("avg_fair_score", ascending=False)
    )
    top_players = (
        df.sort_values("fair_score", ascending=False)
        .groupby("team_name").first()[["player_name", "fair_score"]]
        .rename(columns={"player_name": "top_player", "fair_score": "top_score"})
    )
    teams = teams.join(top_players, on="team_name")
    return clean_df(teams)


@app.get("/api/leaderboard/{metric}")
def get_leaderboard(
    metric: str,
    pos:    str | None = Query(None),
    tier:   str | None = Query(None),
    limit:  int        = Query(20),
):
    """Toppliste for vilkårlig numerisk kolonne."""
    if metric not in df.columns:
        numeric_cols = list(df.select_dtypes("number").columns)
        raise HTTPException(400, f"Kolonne '{metric}' finnes ikke. Tilgjengelige numeriske kolonner: {numeric_cols}")

    result = df.copy()
    if pos:  result = result[result["pos_group"] == pos]
    if tier: result = result[result["player_tier"] == tier]
    result = result.dropna(subset=[metric]).sort_values(metric, ascending=False)

    fields = [f for f in [
        "player_name", "team_name", "pos_group", "age",
        "player_tier", metric, "fair_score", "best_role_no",
    ] if f in result.columns]
    return clean_df(result[fields].head(limit))


@app.get("/api/similar/{name}")
def get_similar(
    name:  str,
    limit: int = Query(5),
):
    """Nærmeste naboer basert på z-score euklidisk avstand."""
    player   = find_player(name)
    feats    = RADAR_FIELDS
    p_vec    = np.array([safe(player.get(f)) or 0.0 for f in feats])
    all_vecs = df[feats].fillna(0).values
    dists    = np.sqrt(((all_vecs - p_vec) ** 2).sum(axis=1))

    df_d = df.copy()
    df_d["_dist"] = dists
    similar = (
        df_d[df_d["player_name"] != player["player_name"]]
        .nsmallest(limit, "_dist")
    )
    fields = [f for f in [
        "player_name", "team_name", "pos_group", "age",
        "fair_score", "best_role_no", "cluster_label", "_dist",
    ] if f in similar.columns]
    result = clean_df(similar[fields])
    for r in result:
        r["similarity_distance"] = r.pop("_dist", None)
    return {
        "reference_player": player["player_name"],
        "similar_players":  result,
    }


@app.get("/api/radar/{name}")
def get_radar(name: str):
    """Radardata: z-scorer for spiller vs. posisjonsgjennomsnitt (=0)."""
    player = find_player(name)
    feats  = RADAR_FIELDS
    return {
        "player_name":  player["player_name"],
        "team_name":    player["team_name"],
        "pos_group":    player["pos_group"],
        "labels":       [RADAR_LABELS.get(f, f) for f in feats],
        "player_vals":  [safe(player.get(f)) or 0.0 for f in feats],
        "avg_vals":     [0.0] * len(feats),
        "best_role_no": safe(player.get("best_role_no")),
        "fair_score":   safe(player.get("fair_score")),
        "forecast_score": safe(player.get("forecast_score")),
        "reliability":  safe(player.get("reliability")),
        "value_tier":   safe(player.get("value_tier")),
    }


@app.get("/api/value-tiers")
def get_value_tiers(pos: str | None = Query(None)):
    """Fordeling av value_tier."""
    result = df.copy()
    if pos:
        result = result[result["pos_group"] == pos.upper()]

    tier_colors = {
        "Elite":              "#6366f1",
        "God":                "#22c55e",
        "Gjennomsnitt":       "#f59e0b",
        "Under_Gjennomsnitt": "#ef4444",
    }
    summary = []
    for tier in ["Elite", "God", "Gjennomsnitt", "Under_Gjennomsnitt"]:
        grp = result[result["value_tier"] == tier]
        if len(grp) == 0:
            continue
        top3 = (grp.sort_values("value_for_money", ascending=False)
                .head(3)["player_name"].tolist())
        summary.append({
            "tier":            tier,
            "count":           int(len(grp)),
            "pct":             round(len(grp) / len(result) * 100, 1),
            "avg_forecast":    round(float(grp["forecast_score"].mean()), 3),
            "avg_reliability": round(float(grp["reliability"].mean()), 3),
            "color":           tier_colors[tier],
            "top3":            top3,
        })
    return summary


@app.get("/api/positions")
def get_positions():
    """Posisjonsfordeling med nøkkelstats."""
    pos_colors = {"GK": "#f59e0b", "DEF": "#6366f1", "MID": "#22c55e", "ATT": "#ef4444"}
    result = []
    for pos in ["GK", "DEF", "MID", "ATT"]:
        grp = df[df["pos_group"] == pos]
        if len(grp) == 0:
            continue
        result.append({
            "pos_group":       pos,
            "count":           int(len(grp)),
            "pct":             round(len(grp) / len(df) * 100, 1),
            "avg_fair_score":  round(float(grp["fair_score"].mean()), 3),
            "avg_age":         round(float(grp["age"].mean()), 1),
            "avg_minutes":     round(float(grp["minutes"].mean()), 0),
            "avg_goals_per90": round(float(grp["goals_per90"].mean()), 3),
            "color":           pos_colors.get(pos, "#888"),
            "top_player":      grp.loc[grp["fair_score"].idxmax(), "player_name"],
            "cluster_labels":  grp["cluster_label"].dropna().unique().tolist(),
        })
    return result


@app.get("/api/age-groups")
def get_age_groups():
    """Aldersfordeling med stats per gruppe."""
    groups = [
        {"range": "17-20", "label": "Ung",      "color": "#6366f1", "min": 17, "max": 20},
        {"range": "21-23", "label": "Talent",   "color": "#22c55e", "min": 21, "max": 23},
        {"range": "24-26", "label": "Etablert", "color": "#f59e0b", "min": 24, "max": 26},
        {"range": "27-29", "label": "Prime",    "color": "#a855f7", "min": 27, "max": 29},
        {"range": "30-32", "label": "Erfaren",  "color": "#ec4899", "min": 30, "max": 32},
        {"range": "33+",   "label": "Veteran",  "color": "#ef4444", "min": 33, "max": 99},
    ]
    result = []
    for g in groups:
        grp = df[(df["age"] >= g["min"]) & (df["age"] <= g["max"])]
        result.append({
            **g,
            "count":          int(len(grp)),
            "avg_fair_score": round(float(grp["fair_score"].mean()), 3) if len(grp) else 0,
            "avg_forecast":   round(float(grp["forecast_score"].mean()), 3) if len(grp) else 0,
            "u23_count":      int((grp["player_tier"] == "u23_prospect").sum()),
        })
    return result


@app.get("/api/nationality")
def get_nationality(limit: int = Query(15)):
    """Nasjonalitetsfordeling."""
    counts = (
        df["nationality"].value_counts()
        .head(limit).reset_index()
        .rename(columns={"nationality": "country", "count": "count"})
    )
    return clean_df(counts)