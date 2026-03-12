"""
EliteserenDSS — Backend API v5.1
FastAPI + Pandas | data.parquet

ROBUST: Bygger automatisk alle manglende kolonner ved oppstart.
Fungerer med alle versjoner av data.parquet (161 eller 170 kolonner).
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import os
import math
from datetime import datetime

# ─────────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────────
app = FastAPI(title="EliteserenDSS API", version="5.1.0", docs_url="/docs", redoc_url="/redoc")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ─────────────────────────────────────────────────────────────────
# DATA
# ─────────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data_v4.parquet")
df = pd.read_parquet(DATA_PATH)
_STARTED_AT = datetime.utcnow().isoformat()
print(f"✅ data.parquet lastet: {len(df)} rader, {len(df.columns)} kolonner")

# ─────────────────────────────────────────────────────────────────
# _ensure_columns — bygger alle manglende kolonner automatisk
# ─────────────────────────────────────────────────────────────────
def _ensure_columns():
    global df
    senior_mask = df["player_tier"] == "senior"

    # Z-scores all-liga
    Z_ALL = [
        "goals_per90","assists_per90","passes_key_per90","tackles_total_per90",
        "duels_won_per90","intensity_per90","shot_efficiency","duel_efficiency",
        "pass_efficiency","interceptions_per90","shots_total_per90","dribble_efficiency",
        "fouls_committed_per90","yellow_per90","risk_rate",
    ]
    for col in Z_ALL:
        z = f"z_{col}_all"
        if col in df.columns and z not in df.columns:
            mu  = float(df[senior_mask][col].mean())
            std = float(df[senior_mask][col].std())
            df[z] = ((df[col] - mu) / std).clip(-3, 3).fillna(0) if std > 0 else 0.0

    # Z-scores posisjon
    Z_POS = [
        "goals_per90","assists_per90","passes_key_per90","tackles_total_per90",
        "duels_won_per90","intensity_per90","shot_efficiency","duel_efficiency",
        "pass_efficiency","dribble_efficiency","interceptions_per90","shots_total_per90",
    ]
    for col in Z_POS:
        z = f"z_{col}_pos"
        if col in df.columns and z not in df.columns:
            res = pd.Series(0.0, index=df.index)
            for pos in df["pos_group"].dropna().unique():
                mask = df["pos_group"] == pos
                grp  = df.loc[mask, col]
                mu, std = float(grp.mean()), float(grp.std())
                if std > 0:
                    res[mask] = ((grp - mu) / std).clip(-3, 3)
            df[z] = res.fillna(0)

    # Pct-kolonner
    PCT_COLS = [
        "goals_per90","assists_per90","passes_key_per90","tackles_total_per90",
        "duels_won_per90","intensity_per90","shot_efficiency","duel_efficiency",
        "pass_efficiency","dribble_efficiency","interceptions_per90","shots_total_per90",
        "fouls_committed_per90","yellow_per90","risk_rate","shots_on_per90",
    ]
    for col in PCT_COLS:
        if col not in df.columns:
            continue
        # pct_*_all
        pct_all = f"pct_{col}_all"
        if pct_all not in df.columns:
            arr = df[col].fillna(0).values
            df[pct_all] = (df[col].fillna(0)
                           .apply(lambda v: float(np.sum(arr <= v)) / len(arr) * 100)
                           .clip(1, 99).round(1))
        # pct_*_pos
        pct_pos = f"pct_{col}_pos"
        if pct_pos not in df.columns:
            res = pd.Series(50.0, index=df.index)
            for pos in df["pos_group"].dropna().unique():
                mask = df["pos_group"] == pos
                arr  = df.loc[mask, col].fillna(0).values
                res[mask] = (df.loc[mask, col].fillna(0)
                             .apply(lambda v: float(np.sum(arr <= v)) / len(arr) * 100)
                             .clip(1, 99))
            df[pct_pos] = res.round(1)

    # Tematiske indekser
    for name, cols in {
        "offensive_index": ["z_goals_per90_all","z_shots_total_per90_all","z_assists_per90_all","z_shot_efficiency_all"],
        "defensive_index": ["z_tackles_total_per90_all","z_interceptions_per90_all","z_duels_won_per90_all","z_duel_efficiency_all"],
        "control_index":   ["z_passes_key_per90_all","z_pass_efficiency_all"],
        "physical_index":  ["z_intensity_per90_all","z_duels_won_per90_all","z_dribble_efficiency_all"],
    }.items():
        if name not in df.columns:
            avail = [c for c in cols if c in df.columns]
            df[name] = df[avail].mean(axis=1).fillna(0).clip(-3, 3) if avail else 0.0

    # Percentile_pos / _all
    if "percentile_pos" not in df.columns:
        df["percentile_pos"] = df.groupby("pos_group")["fair_score"].rank(pct=True).fillna(0.5)
    if "percentile_all" not in df.columns:
        df["percentile_all"] = df["fair_score"].rank(pct=True).fillna(0.5)

    # value_tier
    if "value_tier" not in df.columns:
        def _vt(p):
            if p >= 0.85: return "Elite"
            if p >= 0.67: return "Over snitt"
            if p >= 0.34: return "Rundt snitt"
            return "Under snitt"
        df["value_tier"] = df["percentile_pos"].apply(_vt)
        print("  ✅ value_tier bygget")

    # roi_index
    if "roi_index" not in df.columns:
        df["roi_index"] = (df["forecast_score"] / df["age"].clip(lower=18)).fillna(0)
        print("  ✅ roi_index bygget")

    # scout_priority
    if "scout_priority" not in df.columns:
        def _norm(s):
            mn, mx = s.min(), s.max()
            return (s - mn) / (mx - mn) if mx > mn else pd.Series(0.5, index=s.index)
        df["scout_priority"] = (
            0.45 * _norm(df["forecast_score"]) +
            0.30 * _norm(df["reliability"]) +
            0.25 * _norm(df["roi_index"])
        ).fillna(0)
        print("  ✅ scout_priority bygget")

    if "value_for_money" not in df.columns:
        df["value_for_money"] = (df["forecast_score"] * df["age_factor"]).fillna(0)

    # upside_gap_best
    ROLES = ["playmaker","ballwinner","finisher","pressplayer"]
    if "upside_gap_best" not in df.columns:
        gaps = []
        for role in ROLES:
            col = f"upside_gap_{role}"
            vs  = f"value_score_{role}"
            if col not in df.columns and vs in df.columns:
                pos_avg = df[senior_mask].groupby("pos_group")[vs].mean()
                df[col] = df[vs] - df["pos_group"].map(pos_avg)
            if col in df.columns:
                gaps.append(col)
        df["upside_gap_best"] = df[gaps].max(axis=1).fillna(0) if gaps else 0.0
        print("  ✅ upside_gap_best bygget")

    # risk_upside_segment
    if "risk_upside_segment" not in df.columns:
        fm = float(df[senior_mask]["fair_score"].median())
        um = float(df[senior_mask]["upside_gap_best"].median())
        def _seg(r):
            hf = r["fair_score"]    >= fm
            hu = r["upside_gap_best"] >= um
            if hf and hu:      return "Sikker_Vinner"
            if hf:             return "Sikker_Middels"
            if hu:             return "Risiko_Høy_Oppside"
            return "Risiko_Lav_Oppside"
        df["risk_upside_segment"] = df.apply(_seg, axis=1)
        print("  ✅ risk_upside_segment bygget")

    # Fallbacks
    ROLE_NO = {"playmaker":"Kreativ playmaker","ballwinner":"Defensiv ballvinner",
               "finisher":"Avslutter","pressplayer":"Presspiller"}
    if "best_role_no" not in df.columns:
        df["best_role_no"] = df["best_role"].map(ROLE_NO) if "best_role" in df.columns else "Ukjent"
    if "cluster_label" not in df.columns:
        df["cluster_label"] = df["pos_group"].fillna("Ukjent")

    missing = [c for c in ["value_tier","scout_priority","roi_index",
                            "percentile_pos","risk_upside_segment","upside_gap_best"]
               if c not in df.columns]
    if missing:
        print(f"  ⚠️  Fortsatt manglende: {missing}")
    else:
        print(f"  ✅ Alle nøkkelkolonner OK | Totalt: {len(df.columns)} kolonner")

print("🔧 Bygger manglende kolonner...")
_ensure_columns()

# Benchmark
_bench_path = os.path.join(os.path.dirname(DATA_PATH), "benchmarks_v4.parquet")
try:
    benchmark_df = pd.read_parquet(_bench_path)
    print(f"✅ Benchmark-tabell lastet: {len(benchmark_df)} rader")
except Exception:
    benchmark_df = pd.DataFrame()
    print("⚠️  benchmarks.parquet ikke funnet — bruker live-beregning")

senior_mask = df["player_tier"] == "senior"

# ─────────────────────────────────────────────────────────────────
# HJELPEFUNKSJONER
# ─────────────────────────────────────────────────────────────────
def safe(val):
    if val is None: return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)): return None
    if isinstance(val, np.integer): return int(val)
    if isinstance(val, np.floating):
        return None if (math.isnan(float(val)) or math.isinf(float(val))) else float(val)
    if isinstance(val, np.bool_): return bool(val)
    return val

def row_to_dict(row): return {k: safe(v) for k, v in row.items()}
def clean_df(frame): return [row_to_dict(row) for _, row in frame.iterrows()]

def find_player(name: str):
    m = df[df["player_name"].str.lower() == name.lower()]
    if m.empty: m = df[df["player_name"].str.lower().str.contains(name.lower(), na=False)]
    if m.empty: raise HTTPException(404, detail=f"Spiller ikke funnet: '{name}'")
    return m.iloc[0]

def pct_from_z(z):
    if z is None or (isinstance(z, float) and math.isnan(z)): return 50
    t = 1.0 / (1.0 + 0.2316419 * abs(z))
    d = 0.3989423 * math.exp(-0.5 * z * z)
    poly = t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.8212560+t*1.3302744))))
    cdf = 1.0 - d*poly if z >= 0 else d*poly
    return max(1, min(99, round(cdf * 100)))

def pct_label(p):
    if p >= 85: return "Toppnivå"
    if p >= 67: return "Over snitt"
    if p >= 34: return "Rundt snitt"
    return "Under snitt"

# ─────────────────────────────────────────────────────────────────
# FELTLISTER
# ─────────────────────────────────────────────────────────────────
LIST_FIELDS = [f for f in [
    "player_id","player_name","first_name","last_name","age","nationality",
    "team_name","pos_group","role_raw","player_tier","games","starts","minutes","rating",
    "goals","assists","goals_per90","assists_per90","passes_key_per90",
    "tackles_total_per90","duels_won_per90","intensity_per90","duel_efficiency",
    "shot_efficiency","pass_efficiency","dribble_efficiency","risk_rate","shots_total_per90",
    "interceptions_per90","fair_score","forecast_score","reliability","age_factor",
    "shrunk_score","projected_score","total_score","percentile_pos","percentile_all",
    "best_role","best_role_no","cluster","cluster_label","risk_upside_segment",
    "upside_gap_best","roi_index","value_for_money","value_tier","scout_priority",
    "raw_score_playmaker","raw_score_ballwinner","raw_score_finisher","raw_score_pressplayer",
    "value_score_playmaker","value_score_ballwinner","value_score_finisher","value_score_pressplayer",
    "upside_gap_playmaker","upside_gap_ballwinner","upside_gap_finisher","upside_gap_pressplayer",
] if f in df.columns]

RADAR_FIELDS = [f for f in [
    "z_goals_per90_pos","z_assists_per90_pos","z_passes_key_per90_pos",
    "z_tackles_total_per90_pos","z_duels_won_per90_pos","z_intensity_per90_pos",
    "z_shot_efficiency_pos","z_duel_efficiency_pos","z_pass_efficiency_pos",
    "z_dribble_efficiency_pos","z_interceptions_per90_pos","z_shots_total_per90_pos",
] if f in df.columns]

RADAR_LABELS = {
    "z_goals_per90_pos":"Mål/90","z_assists_per90_pos":"Assist/90",
    "z_passes_key_per90_pos":"Nøkkelpass","z_tackles_total_per90_pos":"Taklinger",
    "z_duels_won_per90_pos":"Dueller","z_intensity_per90_pos":"Intensitet",
    "z_shot_efficiency_pos":"Skuddeff.","z_duel_efficiency_pos":"Duelleff.",
    "z_pass_efficiency_pos":"Pasningseff.","z_dribble_efficiency_pos":"Driblinger",
    "z_interceptions_per90_pos":"Avskjæringer","z_shots_total_per90_pos":"Skudd/90",
}

SEG_LABEL_NO = {
    "Sikker_Vinner":"Trygg toppspiller","Risiko_Høy_Oppside":"Høyt potensial",
    "Sikker_Middels":"Stabil middels","Risiko_Lav_Oppside":"Under forventning",
}

Z_ALL_COLS = [
    "goals_per90","assists_per90","passes_key_per90","tackles_total_per90",
    "duels_won_per90","intensity_per90","shot_efficiency","duel_efficiency",
    "pass_efficiency","interceptions_per90","shots_total_per90","dribble_efficiency",
    "fouls_committed_per90","yellow_per90","risk_rate",
]

# ─────────────────────────────────────────────────────────────────
# ENDEPUNKTER
# ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status":"ok","version":"5.1.0","started_at":_STARTED_AT,
        "spillere":int(len(df)),"kolonner":int(len(df.columns)),
        "senior":int((df["player_tier"]=="senior").sum()),
        "u23_prospect":int((df["player_tier"]=="u23_prospect").sum()),
        "lag":int(df["team_name"].nunique()),
        "posisjoner":list(df["pos_group"].dropna().unique()),
        "z_all_cols":len([c for c in df.columns if c.endswith("_all") and c.startswith("z_")]),
        "z_pos_cols":len([c for c in df.columns if c.endswith("_pos") and c.startswith("z_")]),
        "pct_cols":len([c for c in df.columns if c.startswith("pct_")]),
        "value_tier":"value_tier" in df.columns,
        "scout_priority":"scout_priority" in df.columns,
        "tematiske_indekser":[c for c in ["offensive_index","defensive_index","control_index","physical_index"] if c in df.columns],
        "benchmark_lastet":not benchmark_df.empty,
        "benchmark_rader":int(len(benchmark_df)),
    }


@app.get("/api/stats")
def get_stats():
    return {
        "total_players":   int(len(df)),
        "senior_players":  int((df["player_tier"]=="senior").sum()),
        "u23_players":     int((df["player_tier"]=="u23_prospect").sum()),
        "total_goals":     int(df["goals"].sum()) if "goals" in df.columns else 0,
        "total_assists":   int(df["assists"].sum()) if "assists" in df.columns else 0,
        "avg_age":         round(float(df["age"].mean()),1),
        "avg_fair_score":  round(float(df["fair_score"].mean()),3),
        "avg_reliability": round(float(df["reliability"].mean()),3),
        "elite_count":     int((df["value_tier"]=="Elite").sum()) if "value_tier" in df.columns else 0,
        "top_scorer": {
            "name":  df.loc[df["goals"].idxmax(),"player_name"],
            "goals": int(df["goals"].max()),
            "team":  df.loc[df["goals"].idxmax(),"team_name"],
        } if "goals" in df.columns else {},
        "top_assister": {
            "name":    df.loc[df["assists"].idxmax(),"player_name"],
            "assists": int(df["assists"].max()),
            "team":    df.loc[df["assists"].idxmax(),"team_name"],
        } if "assists" in df.columns else {},
        "top_fair_score": {
            "name":       df.loc[df["fair_score"].idxmax(),"player_name"],
            "fair_score": round(float(df["fair_score"].max()),3),
            "team":       df.loc[df["fair_score"].idxmax(),"team_name"],
        },
        "top_scout": {
            "name":           df.loc[df["scout_priority"].idxmax(),"player_name"],
            "scout_priority": round(float(df["scout_priority"].max()),3),
            "tier":           df.loc[df["scout_priority"].idxmax(),"player_tier"],
        } if "scout_priority" in df.columns else {},
        "positions": {pos: int((df["pos_group"]==pos).sum()) for pos in ["GK","DEF","MID","ATT"]},
        "risk_upside_segments": {
            seg: int((df["risk_upside_segment"]==seg).sum())
            for seg in ["Sikker_Vinner","Sikker_Middels","Risiko_Høy_Oppside","Risiko_Lav_Oppside"]
        } if "risk_upside_segment" in df.columns else {},
    }


@app.get("/api/players")
def get_players(
    pos:str|None=Query(None), tier:str|None=Query(None),
    role:str|None=Query(None), cluster:str|None=Query(None),
    segment:str|None=Query(None), v_tier:str|None=Query(None),
    search:str|None=Query(None), min_min:int=Query(0),
    min_age:int=Query(0), max_age:int=Query(99),
    sort_by:str=Query("fair_score"), asc:bool=Query(False), limit:int=Query(300),
):
    r = df.copy()
    if pos:     r = r[r["pos_group"]==pos.upper()]
    if tier:    r = r[r["player_tier"]==tier]
    if role and "best_role_no" in r.columns:    r = r[r["best_role_no"]==role]
    if cluster and "cluster_label" in r.columns: r = r[r["cluster_label"]==cluster]
    if segment and "risk_upside_segment" in r.columns: r = r[r["risk_upside_segment"]==segment]
    if v_tier and "value_tier" in r.columns:    r = r[r["value_tier"]==v_tier]
    if min_min: r = r[r["minutes"]>=min_min]
    if search:  r = r[r["player_name"].str.lower().str.contains(search.lower(),na=False)]
    r = r[(r["age"]>=min_age)&(r["age"]<=max_age)]
    if sort_by in r.columns: r = r.sort_values(sort_by, ascending=asc)
    return clean_df(r[[f for f in LIST_FIELDS if f in r.columns]].head(limit))


@app.get("/api/search")
def search_players(q:str=Query(...,min_length=2), limit:int=Query(10)):
    r = df[df["player_name"].str.lower().str.contains(q.lower(),na=False)]
    fields = [f for f in ["player_name","team_name","pos_group","age","player_tier","fair_score","best_role_no"] if f in df.columns]
    return clean_df(r[fields].head(limit))


@app.get("/api/player/{name}")
def get_player(name:str):
    return row_to_dict(find_player(name))


@app.get("/api/player/{name}/report")
def get_player_report(name:str):
    p = find_player(name)
    def pct(zk):
        z = safe(p.get(zk))
        if z is None: return {"percentile":None,"label":"—","z":None}
        pv = pct_from_z(z)
        return {"percentile":pv,"label":pct_label(pv),"z":round(z,3)}

    p_vec    = np.array([safe(p.get(f)) or 0.0 for f in RADAR_FIELDS])
    all_vecs = df[RADAR_FIELDS].fillna(0).values
    dists    = np.sqrt(((all_vecs - p_vec)**2).sum(axis=1))
    df_d     = df.copy(); df_d["_dist"] = dists
    sim_flds = [f for f in ["player_name","team_name","pos_group","age","fair_score","best_role_no"] if f in df_d.columns]
    similar  = df_d[df_d["player_name"]!=p["player_name"]].nsmallest(4,"_dist")[sim_flds+["_dist"]]

    return {
        "meta":{"generated_at":datetime.utcnow().isoformat(),"player_name":p["player_name"],
                "team_name":p["team_name"],"pos_group":p["pos_group"],"age":safe(p.get("age")),
                "nationality":safe(p.get("nationality")),"player_tier":safe(p.get("player_tier")),
                "minutes":safe(p.get("minutes")),"reliability":safe(p.get("reliability"))},
        "scores":{"fair_score":safe(p.get("fair_score")),"forecast_score":safe(p.get("forecast_score")),
                  "scout_priority":safe(p.get("scout_priority")),"roi_index":safe(p.get("roi_index")),
                  "value_tier":safe(p.get("value_tier")),
                  "segment":SEG_LABEL_NO.get(str(safe(p.get("risk_upside_segment")) or ""),"—"),
                  "best_role":safe(p.get("best_role_no")),"cluster":safe(p.get("cluster_label")),
                  "percentile_pos":safe(p.get("percentile_pos"))},
        "percentiles":{
            "mål_per90":pct("z_goals_per90_pos"),"assist_per90":pct("z_assists_per90_pos"),
            "nøkkelpass_per90":pct("z_passes_key_per90_pos"),"skudd_per90":pct("z_shots_total_per90_pos"),
            "taklinger_per90":pct("z_tackles_total_per90_pos"),"dueller_per90":pct("z_duels_won_per90_pos"),
            "duelleff":pct("z_duel_efficiency_pos"),"pasningseff":pct("z_pass_efficiency_pos"),
            "skuddeff":pct("z_shot_efficiency_pos"),"intensitet_per90":pct("z_intensity_per90_pos"),
        },
        "raw_stats":{k:safe(p.get(k)) for k in [
            "goals_per90","assists_per90","passes_key_per90","shots_total_per90",
            "tackles_total_per90","duels_won_per90","duel_efficiency","pass_efficiency",
            "shot_efficiency","intensity_per90","passes_accuracy","goals","assists","games","starts",
        ] if k in df.columns},
        "roles":{k:safe(p.get(k)) for k in [
            "raw_score_playmaker","raw_score_ballwinner","raw_score_finisher","raw_score_pressplayer",
            "value_score_playmaker","value_score_ballwinner","value_score_finisher","value_score_pressplayer",
        ] if k in df.columns},
        "similar_players":[{**{k:safe(r.get(k)) for k in sim_flds},
                            "similarity_distance":round(safe(r.get("_dist")) or 0,3)}
                           for _,r in similar.iterrows()],
        "methodology":{"percentile_system":"Z-score → Abramowitz & Stegun CDF → percentil 1–99",
                       "fair_score":"WSM vektet sum per-90 statistikker",
                       "forecast_score":"fair_score × age_factor",
                       "scout_priority":"Normert: 0.45×forecast + 0.30×reliability + 0.25×roi",
                       "reliability":"minutter / sesongsnitt","clustering":"K-means per posisjon"},
    }


@app.get("/api/duell")
def get_duell(player_a:str=Query(...), player_b:str=Query(...)):
    a, b = find_player(player_a), find_player(player_b)
    z_all_fields = [f"z_{c}_all" for c in Z_ALL_COLS if f"z_{c}_all" in df.columns]
    fields = [f for f in [
        "player_name","team_name","pos_group","age","minutes","player_tier",
        "goals","assists","goals_per90","assists_per90","passes_key_per90",
        "tackles_total_per90","duels_won_per90","intensity_per90","shot_efficiency",
        "duel_efficiency","pass_efficiency","dribble_efficiency","risk_rate",
        "shots_total_per90","interceptions_per90","fair_score","forecast_score",
        "reliability","age_factor","roi_index","scout_priority","best_role_no",
        "cluster_label","value_tier","risk_upside_segment","upside_gap_best",
        "percentile_pos","percentile_all","offensive_index","defensive_index",
        "control_index","physical_index",
        # Z-scores posisjon
        "z_goals_per90_pos","z_assists_per90_pos","z_passes_key_per90_pos",
        "z_tackles_total_per90_pos","z_duels_won_per90_pos","z_intensity_per90_pos",
        "z_shot_efficiency_pos","z_duel_efficiency_pos","z_pass_efficiency_pos",
        "z_dribble_efficiency_pos","z_interceptions_per90_pos","z_shots_total_per90_pos",
        # Pct _pos
        "pct_goals_per90_pos","pct_assists_per90_pos","pct_passes_key_per90_pos",
        "pct_tackles_total_per90_pos","pct_duels_won_per90_pos","pct_intensity_per90_pos",
        "pct_shot_efficiency_pos","pct_duel_efficiency_pos","pct_pass_efficiency_pos",
        "pct_dribble_efficiency_pos","pct_interceptions_per90_pos","pct_shots_total_per90_pos",
        # Pct _all
        "pct_goals_per90_all","pct_assists_per90_all","pct_passes_key_per90_all",
        "pct_tackles_total_per90_all","pct_duels_won_per90_all","pct_intensity_per90_all",
        "pct_shot_efficiency_all","pct_duel_efficiency_all","pct_pass_efficiency_all",
        "pct_dribble_efficiency_all","pct_interceptions_per90_all","pct_shots_total_per90_all",
        # Pct _radar — pipeline v4, bakt inn logikk (offensiv=_all, defensiv=_pos)
        "pct_goals_per90_radar","pct_assists_per90_radar","pct_shots_total_per90_radar",
        "pct_passes_key_per90_radar","pct_duels_won_per90_radar","pct_tackles_total_per90_radar",
        "pct_interceptions_per90_radar","pct_intensity_per90_radar",
        "pct_duel_efficiency_radar","pct_pass_efficiency_radar",
        # Pct _role — vs spillere med samme best_role
        "pct_goals_per90_role","pct_assists_per90_role","pct_passes_key_per90_role",
        "pct_tackles_total_per90_role","pct_duels_won_per90_role","pct_intensity_per90_role",
        "pct_shot_efficiency_role","pct_duel_efficiency_role","pct_pass_efficiency_role",
        "pct_dribble_efficiency_role","pct_interceptions_per90_role","pct_shots_total_per90_role",
        # Role confidence og youth bonus
        "role_confidence","youth_bonus",
    ] + z_all_fields if f in df.columns]

    def pos_bench(pos):
        if benchmark_df.empty: return {}
        rows = benchmark_df[benchmark_df["pos_group"]==pos]
        return {r["variable"]:{"mean":r["mean"],"p75":r["p75"]} for _,r in rows.iterrows()}

    return {
        "player_a":    {f:safe(a[f]) for f in fields},
        "player_b":    {f:safe(b[f]) for f in fields},
        "bench_a_pos": pos_bench(str(safe(a["pos_group"]) or "ALL")),
        "bench_b_pos": pos_bench(str(safe(b["pos_group"]) or "ALL")),
        "bench_all":   pos_bench("ALL"),
    }


@app.get("/api/benchmarks")
def get_benchmarks():
    if not benchmark_df.empty:
        table = benchmark_df.to_dict(orient="records")
        summary: dict = {}
        for row in table:
            pos, var = row["pos_group"], row["variable"]
            if pos not in summary: summary[pos] = {}
            summary[pos][var] = {k:row[k] for k in ["mean","median","p25","p75","p90","std","n"] if k in row}
        return {"table":table,"summary":summary}

    kpi_cols = [c for c in [
        "goals_per90","assists_per90","passes_key_per90","shots_total_per90",
        "tackles_total_per90","duels_won_per90","duel_efficiency","pass_efficiency",
        "shot_efficiency","intensity_per90","interceptions_per90","dribble_efficiency",
        "offensive_index","defensive_index","control_index","physical_index",
        "fair_score","forecast_score","scout_priority",
    ] if c in df.columns]

    summary = {}
    for pos in ["GK","DEF","MID","ATT","ALL"]:
        grp = df if pos=="ALL" else df[df["pos_group"]==pos]
        if len(grp)==0: continue
        summary[pos] = {col:{"mean":round(float(grp[col].mean()),4),"median":round(float(grp[col].median()),4),
                              "p25":round(float(grp[col].quantile(0.25)),4),"p75":round(float(grp[col].quantile(0.75)),4),
                              "p90":round(float(grp[col].quantile(0.90)),4),"std":round(float(grp[col].std()),4),
                              "n":int(len(grp))} for col in kpi_cols}
    return {"table":[],"summary":summary}


@app.get("/api/top-performers")
def get_top_performers(pos:str|None=Query(None), limit:int=Query(5)):
    kpis = {"Scoutprioritet":"scout_priority","Nåværende nivå":"fair_score",
            "Predikert nivå":"forecast_score","Mål per 90":"goals_per90",
            "Assist per 90":"assists_per90","Duelleffektivitet":"duel_efficiency",
            "Pasningseffektivitet":"pass_efficiency","Intensitet per 90":"intensity_per90",
            "ROI-indeks":"roi_index"}
    base = df.copy()
    if pos: base = base[base["pos_group"]==pos.upper()]
    fields = [f for f in ["player_name","team_name","pos_group","age","player_tier","fair_score"] if f in df.columns]
    result = {}
    for label, col in kpis.items():
        if col not in base.columns: continue
        top = base.nlargest(limit, col)[fields+[col]]
        result[label] = {"metric":col,"players":clean_df(top)}
    return result


@app.get("/api/scout")
def get_scout(tier:str|None=Query(None), pos:str|None=Query(None),
              segment:str|None=Query(None), v_tier:str|None=Query(None),
              limit:int=Query(50)):
    r = df.copy()
    if tier:    r = r[r["player_tier"]==tier]
    if pos:     r = r[r["pos_group"]==pos.upper()]
    if segment and "risk_upside_segment" in r.columns: r = r[r["risk_upside_segment"]==segment]
    if v_tier and "value_tier" in r.columns:           r = r[r["value_tier"]==v_tier]
    if "scout_priority" in r.columns: r = r.sort_values("scout_priority", ascending=False)
    fields = [f for f in [
        "player_id","player_name","age","team_name","pos_group","player_tier",
        "minutes","reliability","fair_score","forecast_score","scout_priority",
        "roi_index","value_for_money","value_tier","risk_upside_segment","upside_gap_best",
        "best_role_no","cluster_label","age_factor",
        "whatif_900min_playmaker","whatif_900min_ballwinner",
        "whatif_900min_finisher","whatif_900min_pressplayer",
    ] if f in r.columns]
    return clean_df(r[fields].head(limit))


@app.get("/api/risk-upside")
def get_risk_upside(pos:str|None=Query(None), tier:str|None=Query(None)):
    r = df.copy()
    if pos:  r = r[r["pos_group"]==pos.upper()]
    if tier: r = r[r["player_tier"]==tier]
    fields = [f for f in [
        "player_name","team_name","pos_group","age","player_tier","reliability",
        "forecast_score","fair_score","risk_upside_segment","upside_gap_best",
        "roi_index","value_tier","best_role_no","scout_priority",
    ] if f in r.columns]
    seg_sum = (r.groupby("risk_upside_segment")
               .agg(count=("player_name","count"),avg_forecast=("forecast_score","mean"),avg_rel=("reliability","mean"))
               .round(3).reset_index()) if "risk_upside_segment" in r.columns else pd.DataFrame()
    return {"players":clean_df(r[fields]),"segment_summary":clean_df(seg_sum),
            "metadata":{"rel_median":round(float(df["reliability"].median()),3),
                        "forecast_median":round(float(df["forecast_score"].median()),3)}}


@app.get("/api/clusters")
def get_clusters(pos:str|None=Query(None)):
    r = df.copy()
    if pos: r = r[r["pos_group"]==pos.upper()]
    if "cluster_label" not in r.columns: return {"overview":[],"cluster_players":{}}
    overview = (r.groupby(["pos_group","cluster_label"])
                .agg(count=("player_name","count"),avg_fair_score=("fair_score","mean"),
                     avg_age=("age","mean"),avg_minutes=("minutes","mean"))
                .round(3).reset_index())
    cluster_players = {}
    for label in r["cluster_label"].dropna().unique():
        grp = r[r["cluster_label"]==label].sort_values("fair_score", ascending=False)
        flds = [f for f in ["player_name","team_name","age","pos_group","fair_score","forecast_score","best_role_no","minutes"] if f in grp.columns]
        cluster_players[str(label)] = clean_df(grp[flds].head(20))
    return {"overview":clean_df(overview),"cluster_players":cluster_players}


@app.get("/api/radar/{name}")
def get_radar(name:str):
    p = find_player(name)
    vals = [safe(p.get(f)) or 0.0 for f in RADAR_FIELDS]
    return {
        "player_name":p["player_name"],"team_name":p["team_name"],"pos_group":p["pos_group"],
        "labels":[RADAR_LABELS.get(f,f) for f in RADAR_FIELDS],
        "player_z":vals,"player_pct":[pct_from_z(v) for v in vals],
        "avg_vals":[0.0]*len(RADAR_FIELDS),
        "best_role_no":safe(p.get("best_role_no")),"fair_score":safe(p.get("fair_score")),
        "forecast_score":safe(p.get("forecast_score")),"reliability":safe(p.get("reliability")),
        "value_tier":safe(p.get("value_tier")),
    }


@app.get("/api/similar/{name}")
def get_similar(name:str, limit:int=Query(5)):
    p = find_player(name)
    p_vec    = np.array([safe(p.get(f)) or 0.0 for f in RADAR_FIELDS])
    all_vecs = df[RADAR_FIELDS].fillna(0).values
    dists    = np.sqrt(((all_vecs - p_vec)**2).sum(axis=1))
    df_d = df.copy(); df_d["_dist"] = dists
    sim = df_d[df_d["player_name"]!=p["player_name"]].nsmallest(limit,"_dist")
    flds = [f for f in ["player_name","team_name","pos_group","age","fair_score","best_role_no","cluster_label","_dist"] if f in sim.columns]
    result = clean_df(sim[flds])
    for r in result: r["similarity_distance"] = round(r.pop("_dist",0) or 0, 3)
    return {"reference_player":p["player_name"],"similar_players":result}


@app.get("/api/leaderboard/{metric}")
def get_leaderboard(metric:str, pos:str|None=Query(None), tier:str|None=Query(None), limit:int=Query(20)):
    if metric not in df.columns:
        raise HTTPException(400, detail={"error":f"'{metric}' finnes ikke",
                                          "tilgjengelige":sorted(list(df.select_dtypes("number").columns))})
    r = df.copy()
    if pos:  r = r[r["pos_group"]==pos.upper()]
    if tier: r = r[r["player_tier"]==tier]
    r = r.dropna(subset=[metric]).sort_values(metric, ascending=False)
    flds = [f for f in ["player_name","team_name","pos_group","age","player_tier",metric,"fair_score","best_role_no"] if f in r.columns]
    return clean_df(r[flds].head(limit))


@app.get("/api/teams")
def get_teams():
    teams = (df.groupby("team_name")
             .agg(player_count=("player_name","count"),avg_age=("age","mean"),
                  avg_fair_score=("fair_score","mean"),avg_forecast=("forecast_score","mean"),
                  avg_reliability=("reliability","mean"),total_goals=("goals","sum"),
                  total_assists=("assists","sum"),
                  u23_count=("player_tier",lambda x:(x=="u23_prospect").sum()))
             .round(3).reset_index().sort_values("avg_fair_score", ascending=False))
    top = (df.sort_values("fair_score",ascending=False).groupby("team_name").first()
           [["player_name","fair_score"]].rename(columns={"player_name":"top_player","fair_score":"top_score"}))
    return clean_df(teams.join(top, on="team_name"))


@app.get("/api/team/{team}/squad")
def get_team_squad(team:str):
    m = df[df["team_name"].str.lower()==team.lower()]
    if m.empty: m = df[df["team_name"].str.lower().str.contains(team.lower(),na=False)]
    if m.empty: raise HTTPException(404, detail={"error":f"Lag ikke funnet: '{team}'",
                                                  "tilgjengelige":sorted(df["team_name"].dropna().unique().tolist())})
    squad  = m.sort_values("fair_score", ascending=False)
    fields = [f for f in ["player_name","first_name","last_name","age","nationality","pos_group",
                           "role_raw","best_role_no","player_tier","games","starts","minutes",
                           "goals","assists","fair_score","forecast_score","scout_priority",
                           "reliability","value_tier","cluster_label"] if f in squad.columns]
    return {"team_name":squad.iloc[0]["team_name"],"player_count":int(len(squad)),
            "pos_breakdown":{pos:int((squad["pos_group"]==pos).sum()) for pos in ["GK","DEF","MID","ATT"]},
            "avg_age":round(float(squad["age"].mean()),1),
            "avg_fair_score":round(float(squad["fair_score"].mean()),3),
            "players":clean_df(squad[fields])}


@app.get("/api/value-tiers")
def get_value_tiers(pos:str|None=Query(None)):
    if "value_tier" not in df.columns: return []
    r = df.copy()
    if pos: r = r[r["pos_group"]==pos.upper()]
    colors = {"Elite":"#6366f1","Over snitt":"#22c55e","Rundt snitt":"#f59e0b","Under snitt":"#ef4444"}
    summary = []
    for tier in r["value_tier"].dropna().unique():
        grp = r[r["value_tier"]==tier]
        if len(grp)==0: continue
        top3 = grp.sort_values("value_for_money",ascending=False).head(3)["player_name"].tolist() if "value_for_money" in grp.columns else []
        summary.append({"tier":tier,"count":int(len(grp)),"pct":round(len(grp)/len(r)*100,1),
                        "avg_forecast":round(float(grp["forecast_score"].mean()),3),
                        "avg_reliability":round(float(grp["reliability"].mean()),3),
                        "color":colors.get(tier,"#888"),"top3":top3})
    summary.sort(key=lambda x: x["count"], reverse=True)
    return summary


@app.get("/api/positions")
def get_positions():
    colors = {"GK":"#fbbf24","DEF":"#60a5fa","MID":"#a78bfa","ATT":"#f87171"}
    result = []
    for pos in ["GK","DEF","MID","ATT"]:
        grp = df[df["pos_group"]==pos]
        if len(grp)==0: continue
        result.append({"pos_group":pos,"count":int(len(grp)),
                       "pct":round(len(grp)/len(df)*100,1),
                       "avg_fair_score":round(float(grp["fair_score"].mean()),3),
                       "avg_age":round(float(grp["age"].mean()),1),
                       "avg_minutes":round(float(grp["minutes"].mean()),0),
                       "avg_goals_per90":round(float(grp["goals_per90"].mean()),3) if "goals_per90" in grp.columns else 0,
                       "color":colors.get(pos,"#888"),
                       "top_player":grp.loc[grp["fair_score"].idxmax(),"player_name"],
                       "cluster_labels":grp["cluster_label"].dropna().unique().tolist() if "cluster_label" in grp.columns else []})
    return result


@app.get("/api/age-groups")
def get_age_groups():
    groups = [{"range":"17-20","label":"Ung","color":"#6366f1","min":17,"max":20},
              {"range":"21-23","label":"Talent","color":"#22c55e","min":21,"max":23},
              {"range":"24-26","label":"Etablert","color":"#f59e0b","min":24,"max":26},
              {"range":"27-29","label":"Prime","color":"#a855f7","min":27,"max":29},
              {"range":"30-32","label":"Erfaren","color":"#ec4899","min":30,"max":32},
              {"range":"33+","label":"Veteran","color":"#ef4444","min":33,"max":99}]
    return [{**g,"count":int(len(grp:=df[(df["age"]>=g["min"])&(df["age"]<=g["max"])])),
             "avg_fair_score":round(float(grp["fair_score"].mean()),3) if len(grp) else 0,
             "avg_forecast":round(float(grp["forecast_score"].mean()),3) if len(grp) else 0,
             "u23_count":int((grp["player_tier"]=="u23_prospect").sum())} for g in groups]


@app.get("/api/nationality")
def get_nationality(limit:int=Query(15)):
    counts = (df["nationality"].value_counts().head(limit).reset_index()
              .rename(columns={"nationality":"country","count":"count"}))
    return clean_df(counts)


@app.get("/api/physical/top")
def get_physical_top(limit:int=Query(10)):
    cats = {"intensity":"intensity_per90","duels_won":"duels_won_per90",
            "tackles":"tackles_total_per90","interceptions":"interceptions_per90","duel_eff":"duel_efficiency"}
    result = {}
    for key, col in cats.items():
        if col not in df.columns: continue
        top = df.nlargest(limit, col)[[f for f in ["player_name","team_name","pos_group",col,"fair_score"] if f in df.columns]]
        result[key] = clean_df(top)
    return result


@app.get("/api/physical/position/{pos_group}")
def get_physical_by_position(pos_group:str):
    pos_df = df[df["pos_group"]==pos_group.upper()]
    if pos_df.empty: raise HTTPException(404, f"Posisjon ikke funnet: {pos_group}")
    cols = [c for c in ["intensity_per90","duels_total_per90","duels_won_per90",
                         "tackles_total_per90","interceptions_per90","duel_efficiency","pass_efficiency"] if c in pos_df.columns]
    return {"pos_group":pos_group.upper(),"player_count":int(len(pos_df)),
            "averages":{k:safe(v) for k,v in pos_df[cols].mean().round(3).items()}}