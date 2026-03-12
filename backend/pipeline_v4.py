"""
EliteserenDSS — Master Data Pipeline v4.0
==========================================
Produserer data_v4.parquet og benchmarks_v4.parquet.

Forbedringer fra v3.1 → v4.0:
  ✅ Youth development bonus (U23 ekstra oppside-boost)
  ✅ Opportunity adjustment (normaliserer for lagkontekst)
  ✅ Role confidence (stabilitet basert på minutter)
  ✅ pct_*_rolle kolonner (percentile mot spillere i samme rolle)
  ✅ Radarkart logikk: offensiv → _all, defensiv/eff → _pos (bakt inn i data)
  ✅ Stabilitetsvekter i WSM (v3.1)
  ✅ Sample size stabilisering på fair_score (v3.1)
  ✅ Robust per-90 mot minutter=0 (v3.1)
  ✅ Robust normalize() mot inf/nan (v3.1)
  ✅ percentileofscore(kind="mean") — unngår 0% og 100% ekstremer

Akademiske referanser:
  - Percentile rank (Hays 1973)
  - James-Stein shrinkage (Efron & Morris 1977)
  - WSM (Fishburn 1967, Triantaphyllou 2000)
  - Peak age 25-27 (Dendir 2016, Schuckers & Curro 2013)
  - K-means + Silhouette (MacQueen 1967, Rousseeuw 1987)
  - Opportunity adjustment (Decroos et al. 2019, StatsBomb)
  - Youth projection bonus (Hughes et al. 2012)
"""

import os
import warnings
import numpy as np
import pandas as pd
from scipy.stats import percentileofscore
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════════════
# KONFIG
# ══════════════════════════════════════════════════════════════════
BASE        = "/Users/kulmiyearab/Documents"
SENIOR_XLSX = f"{BASE}/Eliteserien 2025.xlsx"
U23_XLSX    = f"{BASE}/Eliteserien_U23.xlsx"
OUT_DATA    = f"{BASE}/eliteserien_saas/backend/data_v4.parquet"
OUT_BENCH   = f"{BASE}/eliteserien_saas/backend/benchmarks_v4.parquet"

K_SHRINKAGE = 600   # Empirisk Bayes konstant (≈7 kamper × 90 min)

# ── Stabilitetsvekter per feature ────────────────────────────────
# Lav vekt = høy varians/tilfeldighet (mål, skuddeff.)
# Høy vekt = stabil over sesongen (pass%, takl., int.)
STABILITY = {
    "z_goals_per90_pos":          0.70,
    "z_assists_per90_pos":        0.80,
    "z_shot_efficiency_pos":      0.65,
    "z_shots_on_per90_pos":       0.90,
    "z_dribble_efficiency_pos":   0.85,
    "z_pass_efficiency_pos":      0.95,
    "z_duel_efficiency_pos":      0.90,
    "z_passes_key_per90_pos":     1.00,
    "z_passes_total_per90_pos":   1.00,
    "z_tackles_total_per90_pos":  1.00,
    "z_duels_won_per90_pos":      1.00,
    "z_duels_total_per90_pos":    0.95,
    "z_interceptions_per90_pos":  1.00,
    "z_intensity_per90_pos":      1.00,
    "z_fouls_drawn_per90_pos":    0.90,
}

# ══════════════════════════════════════════════════════════════════
# 1. LAST INN DATA
# ══════════════════════════════════════════════════════════════════
print("1. Laster inn data...")
senior_raw = pd.read_excel(SENIOR_XLSX)
u23_raw    = pd.read_excel(U23_XLSX)
print(f"   Senior rådata: {len(senior_raw)} rader")
print(f"   U23 rådata:    {len(u23_raw)} rader")

# ══════════════════════════════════════════════════════════════════
# 2. KOLONNE-MAPPING
# ══════════════════════════════════════════════════════════════════
COL_MAP = {
    "Spiller id":           "player_id",
    "Spillernavn":          "player_name",
    "Fornavn":              "first_name",
    "Etternavn":            "last_name",
    "Alder":                "age",
    "Nasjonalitet":         "nationality",
    "Lag id":               "team_id",
    "Lag navn":             "team_name",
    "Posisjonslinje":       "position_line",
    "Rolle":                "role_raw",
    "Kamper":               "games",
    "Starter":              "starts",
    "Minutter":             "minutes",
    "Rating":               "rating",
    "Mål":                  "goals",
    "Målgivende":           "assists",
    "Skudd totalt":         "shots_total",
    "Skudd på mål":         "shots_on",
    "Pasninger totalt":     "passes_total",
    "Nøkkelpasninger":      "passes_key",
    "Pasningspresisjon":    "passes_accuracy",
    "Taklinger":            "tackles_total",
    "Blokkeringer":         "blocks",
    "Brudd":                "interceptions",
    "Dueller totalt":       "duels_total",
    "Dueller vunnet":       "duels_won",
    "Driblinger forsøk":    "dribbles_attempts",
    "Driblinger vellykket": "dribbles_success",
    "Frispark fått":        "fouls_drawn",
    "Frispark gjort":       "fouls_committed",
    "Gule kort":            "yellow",
    "Røde kort":            "red",
}
senior_raw.rename(columns=COL_MAP, inplace=True)
u23_raw.rename(columns=COL_MAP, inplace=True)

# Fullt navn: "Gustav Valsvik" i stedet for "G. Valsvik"
for frame in [senior_raw, u23_raw]:
    frame["player_name"] = (frame["first_name"].str.strip() + " " + frame["last_name"].str.strip()).str.strip()

# ══════════════════════════════════════════════════════════════════
# 3. NORMALISERE ROLLE- OG POSISJONSNAVN
# ══════════════════════════════════════════════════════════════════
ROLE_NORM = {
    "Goalkeeper": "Keeper", "Keeper": "Keeper",
    "Stopper": "Stopper", "Back": "Back",
    "Sentral midt": "Sentral midtbane",
    "Sentral midtbane": "Sentral midtbane",
    "Offensiv midtbane": "Offensiv midtbane",
    "Kant": "Kant", "Spiss": "Spiss",
}
POS_NORM = {
    "Goalkeeper": "GK", "Keeper": "GK",
    "Defender": "DEF", "Forsvar": "DEF",
    "Midfielder": "MID", "Midtbane": "MID",
    "Attacker": "ATT", "Angrep": "ATT", "Forward": "ATT",
}
for frame in [senior_raw, u23_raw]:
    frame["role_raw"]  = frame["role_raw"].map(ROLE_NORM).fillna(frame["role_raw"])
    frame["pos_group"] = frame["position_line"].map(POS_NORM).fillna("MID")

# ══════════════════════════════════════════════════════════════════
# 4. MERGE
# ══════════════════════════════════════════════════════════════════
print("\n2. Merger datasett...")
senior_ids = set(senior_raw["player_id"])
u23_only   = u23_raw[~u23_raw["player_id"].isin(senior_ids)].copy()
senior_raw["player_tier"] = "senior"
u23_only["player_tier"]   = "u23_prospect"

df = pd.concat([senior_raw, u23_only], ignore_index=True)
df["age"] = pd.to_numeric(df["age"], errors="coerce")

print(f"   Senior:  {len(senior_raw)}")
print(f"   U23:     {len(u23_only)}")
print(f"   Totalt:  {len(df)}")

senior_mask = df["player_tier"] == "senior"

# ══════════════════════════════════════════════════════════════════
# 5. DATAVASK
# ══════════════════════════════════════════════════════════════════
print("\n3. Datavask...")

# GK: null → 0 for felter de naturlig ikke har
GK_ZERO = ["shots_total","shots_on","passes_key","blocks",
           "interceptions","dribbles_attempts","dribbles_success",
           "fouls_committed","tackles_total"]
gk_mask = df["pos_group"] == "GK"
for col in GK_ZERO:
    if col in df.columns:
        df.loc[gk_mask, col] = df.loc[gk_mask, col].fillna(0)

# Øvrige: median per posisjon
IMPUTE_COLS = ["shots_total","shots_on","passes_key","tackles_total",
               "blocks","interceptions","dribbles_attempts",
               "dribbles_success","fouls_committed","fouls_drawn"]
for col in IMPUTE_COLS:
    if col in df.columns:
        df[col] = df.groupby("pos_group")[col].transform(
            lambda x: x.fillna(x.median())
        )
print(f"   NaN igjen: {df[IMPUTE_COLS].isnull().sum().sum()}")

# ══════════════════════════════════════════════════════════════════
# 6. PER-90 NORMALISERING
# Robust mot minutter = 0
# ══════════════════════════════════════════════════════════════════
print("\n4. Per-90 normalisering...")

minutes_safe = df["minutes"].replace(0, np.nan)

RAW_COLS = ["goals","assists","shots_total","shots_on","passes_total",
            "passes_key","tackles_total","blocks","interceptions",
            "duels_total","duels_won","dribbles_attempts","dribbles_success",
            "fouls_committed","fouls_drawn","yellow"]
for col in RAW_COLS:
    if col in df.columns:
        df[f"{col}_per90"] = (
            (df[col] / minutes_safe * 90)
            .replace([np.inf, -np.inf], np.nan)
            .fillna(0)
        )

# ── Opportunity Adjustment ────────────────────────────────────────
# Normaliserer passes_key og shots_total for lagkontekst.
# Proxy: lagets gjennomsnittlige pasninger per 90 (ball possession).
# Kilde: Decroos et al. (2019), StatsBomb oppurtunity metrics.
# Effekt: en kantspiller på et svakt lag straffes ikke for færre
# nøkkelpass bare fordi laget har lite ball.
team_pass_avg = df.groupby("team_name")["passes_total_per90"].transform("mean")
league_pass_avg = float(df["passes_total_per90"].mean())

# Unngå divisjon på null/nan
team_pass_safe = team_pass_avg.replace(0, np.nan).fillna(league_pass_avg)
opp_factor = (league_pass_avg / team_pass_safe).clip(0.7, 1.5)  # maks ±50% justering

df["passes_key_adj"]  = (df["passes_key_per90"]   * opp_factor).fillna(df["passes_key_per90"])
df["shots_total_adj"] = (df["shots_total_per90"]  * opp_factor).fillna(df["shots_total_per90"])

print("   ✅ Opportunity adjustment beregnet")

# ══════════════════════════════════════════════════════════════════
# 7. EFFICIENCY-INDEKSER
# ══════════════════════════════════════════════════════════════════
print("\n5. Efficiency-indekser...")

df["shot_efficiency"]    = np.where(df["shots_total"] > 0, df["goals"] / df["shots_total"], 0)
df["duel_efficiency"]    = np.where(df["duels_total"] > 0, df["duels_won"] / df["duels_total"], 0)
df["pass_efficiency"]    = df["passes_accuracy"].fillna(0) / 100
df["dribble_efficiency"] = np.where(
    df["dribbles_attempts"] > 0,
    df["dribbles_success"] / df["dribbles_attempts"],
    0
)
df["risk_rate"]       = (df["yellow_per90"] + df["fouls_committed_per90"]).fillna(0)
df["intensity_per90"] = (df["duels_total_per90"] + df["interceptions_per90"]).fillna(0)

# ══════════════════════════════════════════════════════════════════
# 8. Z-SCORES
# Baseline = KUN senior-spillere (212 stk).
# U23-spillere rankes MOT senior-baseline.
# ══════════════════════════════════════════════════════════════════
print("\n6. Z-scores...")

Z_VARS = [
    "goals_per90","assists_per90","shots_total_per90","shots_on_per90",
    "passes_total_per90","passes_key_per90","tackles_total_per90",
    "blocks_per90","interceptions_per90","duels_total_per90",
    "duels_won_per90","dribbles_attempts_per90","dribbles_success_per90",
    "fouls_committed_per90","fouls_drawn_per90","yellow_per90",
    "passes_accuracy","shot_efficiency","duel_efficiency",
    "pass_efficiency","dribble_efficiency","risk_rate","intensity_per90",
    "passes_key_adj","shots_total_adj",
]

# ── 8a. z_*_pos — posisjonsbasert ────────────────────────────────
for var in Z_VARS:
    if var not in df.columns:
        continue
    col_name = f"z_{var}_pos"
    stats = (df[senior_mask].groupby("pos_group")[var]
             .agg(["mean","std"])
             .rename(columns={"mean":"_mu","std":"_sd"}))
    df["_mu"] = df["pos_group"].map(stats["_mu"])
    df["_sd"] = df["pos_group"].map(stats["_sd"])
    df[col_name] = (df[var] - df["_mu"]) / df["_sd"].replace(0, np.nan)
    df[col_name] = df[col_name].fillna(0).clip(-3, 3)
    df.drop(columns=["_mu","_sd"], inplace=True)

# ── 8b. z_*_all — ligabasert ─────────────────────────────────────
Z_ALL_VARS = [
    "goals_per90","assists_per90","shots_total_per90","shots_on_per90",
    "passes_key_per90","tackles_total_per90","interceptions_per90",
    "duels_won_per90","duel_efficiency","pass_efficiency",
    "shot_efficiency","dribble_efficiency","intensity_per90",
    "fouls_committed_per90","yellow_per90","risk_rate",
]
for var in Z_ALL_VARS:
    if var not in df.columns:
        continue
    mu  = float(df[senior_mask][var].mean())
    std = float(df[senior_mask][var].std())
    col = f"z_{var}_all"
    df[col] = ((df[var] - mu) / std).clip(-3, 3) if std > 0 else 0.0
    df[col] = df[col].fillna(0)

print(f"   ✅ z_*_pos: {len(Z_VARS)} var | z_*_all: {len(Z_ALL_VARS)} var")

# ── 8c. pct_*_pos og pct_*_all ───────────────────────────────────
# kind="mean": unngår at to spillere med lik verdi får hhv. 0% og 100%.
# Kilde: Hays (1973) "Statistics for the Social Sciences"
print("   Beregner percentile rank (pct_*_pos, pct_*_all)...")

for var in Z_ALL_VARS:
    if var not in df.columns:
        continue

    # pct_*_pos
    col_pos = f"pct_{var}_pos"
    df[col_pos] = 50.0
    for pos in ["GK","DEF","MID","ATT"]:
        ref = df[senior_mask & (df["pos_group"] == pos)][var].dropna().values
        if len(ref) < 5:
            continue
        idx = df["pos_group"] == pos
        df.loc[idx, col_pos] = df.loc[idx, var].apply(
            lambda v, rv=ref: round(percentileofscore(rv, v, kind="mean"), 1)
            if pd.notna(v) else 50.0
        )
    df[col_pos] = df[col_pos].clip(1, 99)

    # pct_*_all
    col_all = f"pct_{var}_all"
    ref_all = df[senior_mask][var].dropna().values
    if len(ref_all) >= 5:
        df[col_all] = df[var].apply(
            lambda v, rv=ref_all: round(percentileofscore(rv, v, kind="mean"), 1)
            if pd.notna(v) else 50.0
        )
        df[col_all] = df[col_all].clip(1, 99)
    else:
        df[col_all] = 50.0

print(f"   ✅ pct_*_pos + pct_*_all: {len(Z_ALL_VARS)} × 2 = {len(Z_ALL_VARS)*2} kolonner")

# ── 8d. pct_*_rolle ──────────────────────────────────────────────
# NY I v4.0: percentile mot spillere i SAMME best_role.
# Beregnes ETTER at best_role er satt (steg 15).
# Lagres som pct_*_role kolonner.
# Brukes i radarkart og duell for rolle-kontekstuell sammenligning.
# Kilde: Hughes et al. (2012) — role-based benchmarking.
# NB: Fylles inn i steg 15b nedenfor.

# ══════════════════════════════════════════════════════════════════
# 9. TEMATISKE INDEKSER
# Gjennomsnitt av z_*_all — skala: 0=ligasnitt, ±2=toppnivå/bunn
# ══════════════════════════════════════════════════════════════════
def make_index(df, cols, name):
    avail = [c for c in cols if c in df.columns]
    df[name] = df[avail].mean(axis=1).clip(-3, 3) if avail else 0.0

make_index(df, ["z_goals_per90_all","z_shots_total_per90_all",
                "z_assists_per90_all","z_shot_efficiency_all"],       "offensive_index")
make_index(df, ["z_tackles_total_per90_all","z_interceptions_per90_all",
                "z_duels_won_per90_all","z_duel_efficiency_all"],      "defensive_index")
make_index(df, ["z_passes_key_per90_all","z_pass_efficiency_all",
                "z_shots_on_per90_all"],                               "control_index")
make_index(df, ["z_intensity_per90_all","z_duels_won_per90_all",
                "z_dribble_efficiency_all"],                           "physical_index")
print("\n7. Tematiske indekser ✅")

# ══════════════════════════════════════════════════════════════════
# 10. ROLLEBASERTE SCORE-MODELLER (WSM)
# Vektet sum med stabilitetsvekter.
# Kilde: Fishburn (1967), Triantaphyllou (2000)
# ══════════════════════════════════════════════════════════════════
print("\n8. WSM rollescore-modeller...")

ROLE_WEIGHTS = {
    "playmaker": {
        "z_passes_key_per90_pos":   0.30,
        "z_assists_per90_pos":      0.25,
        "z_pass_efficiency_pos":    0.20,
        "z_dribble_efficiency_pos": 0.10,
        "z_goals_per90_pos":        0.10,
        "z_passes_total_per90_pos": 0.05,
    },
    "ballwinner": {
        "z_tackles_total_per90_pos": 0.30,
        "z_duels_won_per90_pos":     0.30,
        "z_interceptions_per90_pos": 0.25,
        "z_duel_efficiency_pos":     0.10,
        "z_intensity_per90_pos":     0.05,
    },
    "finisher": {
        "z_goals_per90_pos":         0.35,
        "z_shots_on_per90_pos":      0.25,
        "z_shot_efficiency_pos":     0.25,
        "z_assists_per90_pos":       0.10,
        "z_dribble_efficiency_pos":  0.05,
    },
    "pressplayer": {
        "z_intensity_per90_pos":     0.30,
        "z_duels_total_per90_pos":   0.25,
        "z_fouls_drawn_per90_pos":   0.20,
        "z_dribble_efficiency_pos":  0.15,
        "z_tackles_total_per90_pos": 0.10,
    },
}

for role, weights in ROLE_WEIGHTS.items():
    score = pd.Series(0.0, index=df.index)
    for col, w in weights.items():
        if col in df.columns:
            stab = STABILITY.get(col, 1.0)
            score += df[col].fillna(0) * w * stab
    df[f"raw_score_{role}"] = score

# ══════════════════════════════════════════════════════════════════
# 11. FAIR_SCORE
# Posisjonstilpasset totalvurdering + sample size stabilisering
# ══════════════════════════════════════════════════════════════════
print("\n9. Fair score...")

POS_ROLE_BLEND = {
    "GK":  {"ballwinner": 0.5, "pressplayer": 0.5},
    "DEF": {"ballwinner": 0.5, "pressplayer": 0.3, "playmaker":  0.2},
    "MID": {"playmaker":  0.4, "ballwinner":  0.3, "pressplayer": 0.2, "finisher": 0.1},
    "ATT": {"finisher":   0.5, "playmaker":   0.3, "pressplayer": 0.2},
}

def compute_fair_score(row):
    blend = POS_ROLE_BLEND.get(row["pos_group"], {"playmaker": 0.5, "ballwinner": 0.5})
    return sum(row.get(f"raw_score_{role}", 0) * w for role, w in blend.items())

df["fair_score"] = df.apply(compute_fair_score, axis=1)

# Sample size stabilisering — unngår blåsing ved få kamper
# Referanse: Tango et al. "The Book" (2006)
sample_factor = np.sqrt(df["minutes"] / (df["minutes"] + 900))
df["fair_score"] = df["fair_score"] * sample_factor

# ══════════════════════════════════════════════════════════════════
# 12. EMPIRISK BAYES SHRINKAGE
# Kilde: Efron & Morris (1977)
# ══════════════════════════════════════════════════════════════════
print("\n10. Empirisk Bayes shrinkage...")

pos_avg_fair  = df[senior_mask].groupby("pos_group")["fair_score"].mean()
df["pos_avg_fair"] = df["pos_group"].map(pos_avg_fair)
df["reliability"]  = df["minutes"] / (df["minutes"] + K_SHRINKAGE)
df["shrunk_score"] = (
    df["reliability"] * df["fair_score"] +
    (1 - df["reliability"]) * df["pos_avg_fair"]
)

# ══════════════════════════════════════════════════════════════════
# 13. AGE FACTOR
# Peak age 25-27 (Dendir 2016, Schuckers & Curro 2013)
# ══════════════════════════════════════════════════════════════════
print("\n11. Aldersjustering...")

def age_factor_fn(age):
    if pd.isna(age): return 1.0
    if age <= 18:    return 1.40
    if age <= 20:    return 1.30
    if age <= 22:    return 1.18
    if age <= 23:    return 1.10
    if age <= 25:    return 1.05
    if age <= 27:    return 1.00   # peak
    if age <= 29:    return 0.95
    if age <= 31:    return 0.88
    return 0.80

df["age_factor"] = df["age"].apply(age_factor_fn)

# ══════════════════════════════════════════════════════════════════
# 14. FORECAST_SCORE + YOUTH DEVELOPMENT BONUS
# U23: shrunk_score × age_factor × (1 + youth_bonus)
# Senior: fair_score
# Youth bonus: unge spillere med mange minutter har større oppside.
# Kilde: Hughes et al. (2012) "Relative Age Effect and Football"
# ══════════════════════════════════════════════════════════════════
print("\n12. Forecast score + youth bonus...")

# Youth bonus: maks +30% for spillere ≤ 20 år, lineært ned til 0 ved 23 år
df["youth_bonus"] = np.where(
    df["player_tier"] == "u23_prospect",
    ((23 - df["age"]) / 10).clip(0, 0.30),
    0.0
)
df["youth_bonus"] = df["youth_bonus"].fillna(0)

df["forecast_score"] = np.where(
    df["player_tier"] == "u23_prospect",
    df["shrunk_score"] * df["age_factor"] * (1 + df["youth_bonus"]),
    df["fair_score"]
)

# ══════════════════════════════════════════════════════════════════
# 15. VALUE SCORES PER ROLLE + BEST_ROLE
# ══════════════════════════════════════════════════════════════════
print("\n13. Value scores og best_role...")

ROLE_NO = {
    "playmaker":   "Kreativ playmaker",
    "ballwinner":  "Defensiv ballvinner",
    "finisher":    "Avslutter",
    "pressplayer": "Presspiller",
}

for role in ROLE_WEIGHTS:
    raw = f"raw_score_{role}"
    df[f"value_score_{role}"] = np.where(
        df["player_tier"] == "u23_prospect",
        df[raw] * df["age_factor"],
        df[raw]
    )

role_score_cols   = [f"value_score_{r}" for r in ROLE_WEIGHTS]
df["best_role"]    = df[role_score_cols].idxmax(axis=1).str.replace("value_score_", "", regex=False)
df["best_role_no"] = df["best_role"].map(ROLE_NO)

# ── Role confidence ───────────────────────────────────────────────
# Stabilitet i rolle-klassifiseringen basert på minutter.
# Lav confidence = for få kamper til å fastslå rolle sikkert.
# Kilde: Principal statistikk — sample size og estimatunsikkerhet.
df["role_confidence"] = df["minutes"].clip(upper=2000) / 2000
df["role_confidence"] = df["role_confidence"].clip(0.4, 1.0)

# ── 15b. pct_*_rolle — NY I v4.0 ─────────────────────────────────
# Percentile rank mot spillere MED SAMME best_role.
# Gir den mest meningsfulle sammenligningen:
# En ballwinner sammenlignes mot andre ballwinnere — uavhengig av posisjon.
# En forsvarsspiller som scorer mål er ikke god som finisher bare fordi
# han scorer mer enn andre forsvarere (pct_pos ville gitt 99%).
# Med pct_role får han lav % fordi han sammenlignes mot ekte finishers.
print("   Beregner pct_*_role (rolle-kontekstuell percentile)...")

ROLLE_VARS = [
    "goals_per90","assists_per90","shots_total_per90","passes_key_per90",
    "tackles_total_per90","duels_won_per90","intensity_per90",
    "shot_efficiency","duel_efficiency","pass_efficiency",
    "dribble_efficiency","interceptions_per90",
]

for var in ROLLE_VARS:
    if var not in df.columns:
        continue
    col_role = f"pct_{var}_role"
    df[col_role] = 50.0
    for role in ROLE_WEIGHTS:
        role_mask = df["best_role"] == role
        ref = df[senior_mask & role_mask][var].dropna().values
        if len(ref) < 5:
            continue
        df.loc[role_mask, col_role] = df.loc[role_mask, var].apply(
            lambda v, rv=ref: round(percentileofscore(rv, v, kind="mean"), 1)
            if pd.notna(v) else 50.0
        )
    df[col_role] = df[col_role].clip(1, 99)

print(f"   ✅ pct_*_role: {len(ROLLE_VARS)} kolonner")

# ── Radar-klar kolonne: pct_*_radar ──────────────────────────────
# Frontend trenger ikke velge mellom _all, _pos, _role.
# Vi baker inn logikken her en gang:
#   Offensiv (mål, assist, skudd, nøkkelpass) → _all  (rettferdig på tvers av pos.)
#   Defensiv (taklinger, avskjæringer, dueller, intensitet) → _pos (rolle i posisjon)
#   Effektivitet (duel_eff, pass_eff) → _pos
# Kilde: StatsBomb radar design philosophy (Robberechts et al. 2021)
RADAR_MAP = {
    "goals_per90":          "pct_goals_per90_all",
    "assists_per90":        "pct_assists_per90_all",
    "shots_total_per90":    "pct_shots_total_per90_all",
    "passes_key_per90":     "pct_passes_key_per90_all",
    "duels_won_per90":      "pct_duels_won_per90_pos",
    "tackles_total_per90":  "pct_tackles_total_per90_pos",
    "interceptions_per90":  "pct_interceptions_per90_pos",
    "intensity_per90":      "pct_intensity_per90_pos",
    "duel_efficiency":      "pct_duel_efficiency_pos",
    "pass_efficiency":      "pct_pass_efficiency_pos",
}
for stat, source_col in RADAR_MAP.items():
    radar_col = f"pct_{stat}_radar"
    if source_col in df.columns:
        df[radar_col] = df[source_col]
    else:
        df[radar_col] = 50.0

print("   ✅ pct_*_radar kolonner (bakt inn logikk for frontend)")

# ══════════════════════════════════════════════════════════════════
# 16. UPSIDE GAP & WHAT-IF 900 MIN
# ══════════════════════════════════════════════════════════════════
print("\n14. Upside gap og what-if 900 min...")

rel_900 = 900 / (900 + K_SHRINKAGE)

for role in ROLE_WEIGHTS:
    pos_avg = df[senior_mask].groupby("pos_group")[f"raw_score_{role}"].mean()
    df[f"pos_avg_{role}"] = df["pos_group"].map(pos_avg)
    df[f"upside_gap_{role}"] = df[f"value_score_{role}"] - df[f"pos_avg_{role}"]
    df[f"whatif_900min_{role}"] = np.where(
        df["player_tier"] == "u23_prospect",
        (rel_900 * df[f"raw_score_{role}"] +
         (1 - rel_900) * df[f"pos_avg_{role}"]) * df["age_factor"] * (1 + df["youth_bonus"]),
        np.nan
    )

df["upside_gap_best"] = df[[f"upside_gap_{r}" for r in ROLE_WEIGHTS]].max(axis=1)

# ══════════════════════════════════════════════════════════════════
# 17. RISK/UPSIDE SEGMENTERING
# BCG Growth-Share Matrix, tilpasset sport (Henderson 1970)
# ══════════════════════════════════════════════════════════════════
print("\n15. Risk/upside segmentering...")

fair_median   = float(df[senior_mask]["fair_score"].median())
upside_median = float(df[senior_mask]["upside_gap_best"].median())

def risk_segment(row):
    hf = row["fair_score"]      >= fair_median
    hu = row["upside_gap_best"] >= upside_median
    if hf and hu:      return "Sikker_Vinner"
    if hf and not hu:  return "Sikker_Middels"
    if not hf and hu:  return "Risiko_Høy_Oppside"
    return "Risiko_Lav_Oppside"

df["risk_upside_segment"] = df.apply(risk_segment, axis=1)

# ══════════════════════════════════════════════════════════════════
# 18. VALUE_TIER
# Basert på percentil innen posisjon
# ══════════════════════════════════════════════════════════════════
print("\n16. Value tiers...")

df["percentile_pos"] = df.groupby("pos_group")["fair_score"].rank(pct=True)
df["percentile_all"] = df["fair_score"].rank(pct=True)

def value_tier(pct):
    if pct >= 0.85: return "Elite"
    if pct >= 0.67: return "Over snitt"
    if pct >= 0.34: return "Rundt snitt"
    return "Under snitt"

df["value_tier"] = df["percentile_pos"].apply(value_tier)

# ══════════════════════════════════════════════════════════════════
# 19. ROI_INDEX OG SCOUT_PRIORITY
# ══════════════════════════════════════════════════════════════════
print("\n17. ROI og scout_priority...")

df["roi_index"] = df["forecast_score"] / df["age"].clip(lower=18)

def normalize(s):
    s = pd.Series(s).replace([np.inf, -np.inf], np.nan).fillna(0)
    mn, mx = s.min(), s.max()
    return (s - mn) / (mx - mn) if mx > mn else pd.Series(0.5, index=s.index)

df["scout_priority"] = (
    0.45 * normalize(df["forecast_score"]) +
    0.30 * normalize(df["reliability"]) +
    0.25 * normalize(df["roi_index"])
)

df["value_for_money"] = df["forecast_score"] * df["age_factor"]

# ══════════════════════════════════════════════════════════════════
# 20. K-MEANS CLUSTERING PER POSISJON
# Elbow + Silhouette validering, maks k=4
# Kilde: MacQueen (1967), Rousseeuw (1987)
# ══════════════════════════════════════════════════════════════════
print("\n18. K-means clustering...")

CLUSTER_FEATURES = {
    "DEF": ["z_tackles_total_per90_pos","z_duels_won_per90_pos",
            "z_interceptions_per90_pos","z_passes_key_per90_pos",
            "z_duel_efficiency_pos","z_pass_efficiency_pos"],
    "MID": ["z_passes_key_per90_pos","z_assists_per90_pos",
            "z_tackles_total_per90_pos","z_duels_won_per90_pos",
            "z_goals_per90_pos","z_intensity_per90_pos"],
    "ATT": ["z_goals_per90_pos","z_shots_on_per90_pos",
            "z_shot_efficiency_pos","z_assists_per90_pos",
            "z_dribble_efficiency_pos","z_passes_key_per90_pos"],
}
CLUSTER_LABELS = {
    "DEF": {0: "Ballvinnende stopper", 1: "Byggende back",     2: "Allsidig forsvarer"},
    "MID": {0: "Kreativ playmaker",    1: "Defensiv midtbane", 2: "Boks-til-boks"},
    "ATT": {0: "Avslutter",            1: "Kreativ spiss",     2: "Pressjeger"},
}

df["cluster"]       = pd.Series(dtype="object")
df["cluster_label"] = pd.Series(dtype="object")

for pos, feats in CLUSTER_FEATURES.items():
    pos_idx = df.index[df["pos_group"] == pos]
    pos_df  = df.loc[pos_idx, [f for f in feats if f in df.columns]].fillna(0)
    if len(pos_df) < 9:
        continue

    X = StandardScaler().fit_transform(pos_df)

    sil = {}
    for k in range(2, min(6, len(pos_df) // 3)):
        labs = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(X)
        if len(set(labs)) > 1:
            sil[k] = silhouette_score(X, labs)

    best_k     = min(max(sil, key=sil.get) if sil else 3, 4)
    labs_final = KMeans(n_clusters=best_k, random_state=42, n_init=20).fit_predict(X)

    print(f"   {pos}: k={best_k}, silhouette={sil.get(best_k,0):.3f} (n={len(pos_df)})")

    df.loc[pos_idx, "cluster"]       = labs_final
    df.loc[pos_idx, "cluster_label"] = (
        pd.Series(labs_final, index=pos_idx)
        .map(CLUSTER_LABELS.get(pos, {}))
        .fillna("Uspesifisert")
    )

df.loc[df["pos_group"] == "GK", "cluster_label"] = "Keeper"

# ══════════════════════════════════════════════════════════════════
# 21. TOTAL_SCORE OG PROJECTED_SCORE
# ══════════════════════════════════════════════════════════════════
df["total_score"]     = df["fair_score"]
df["projected_score"] = np.where(
    df["player_tier"] == "u23_prospect",
    df["shrunk_score"],
    df["fair_score"]
)

for role in ROLE_WEIGHTS:
    df[f"projected_score_{role}"] = np.where(
        df["player_tier"] == "u23_prospect",
        (rel_900 * df[f"raw_score_{role}"] +
         (1 - rel_900) * df[f"pos_avg_{role}"]) * df["age_factor"] * (1 + df["youth_bonus"]),
        df[f"raw_score_{role}"]
    )

# ══════════════════════════════════════════════════════════════════
# 22. RYDD OPP HJELPKOLONNER
# ══════════════════════════════════════════════════════════════════
DROP = ["pos_avg_fair"] + [f"pos_avg_{r}" for r in ROLE_WEIGHTS]
df.drop(columns=[c for c in DROP if c in df.columns], inplace=True)

# ══════════════════════════════════════════════════════════════════
# 23. VALIDERING
# ══════════════════════════════════════════════════════════════════
print("\n=== VALIDERING ===")

REQUIRED_COLS = [
    "fair_score","forecast_score","reliability","best_role","best_role_no",
    "cluster_label","age_factor","value_tier","scout_priority","roi_index",
    "value_for_money","risk_upside_segment","upside_gap_best","percentile_pos",
    "percentile_all","offensive_index","defensive_index","control_index","physical_index",
    "role_confidence","youth_bonus",
    "pct_goals_per90_radar","pct_tackles_total_per90_radar",
]

missing = [c for c in REQUIRED_COLS if c not in df.columns]
if missing:
    print(f"⚠️  MANGLENDE KOLONNER: {missing}")
else:
    print("✅ Alle påkrevde kolonner er tilstede")

null_check = {c: int(df[c].isnull().sum()) for c in REQUIRED_COLS if c in df.columns}
bad = {k: v for k, v in null_check.items() if v > 0}
if bad:
    print(f"⚠️  NaN i kolonner: {bad}")
else:
    print("✅ Ingen NaN i nøkkelkolonner")

print(f"\nSpillere:  {len(df)} (senior: {senior_mask.sum()}, u23: {(~senior_mask).sum()})")
print(f"Kolonner:  {len(df.columns)}")
print(f"z_*_pos:   {len([c for c in df.columns if c.startswith('z_') and c.endswith('_pos')])}")
print(f"z_*_all:   {len([c for c in df.columns if c.startswith('z_') and c.endswith('_all')])}")
print(f"pct_*_pos: {len([c for c in df.columns if c.startswith('pct_') and c.endswith('_pos')])}")
print(f"pct_*_all: {len([c for c in df.columns if c.startswith('pct_') and c.endswith('_all')])}")
print(f"pct_*_role:{len([c for c in df.columns if c.startswith('pct_') and c.endswith('_role')])}")
print(f"pct_*_radar:{len([c for c in df.columns if c.startswith('pct_') and c.endswith('_radar')])}")

print("\nValue tier fordeling:")
print(df.groupby(["pos_group","value_tier"]).size().unstack(fill_value=0).to_string())

print("\nTop 5 scout_priority:")
top5 = df.nlargest(5,"scout_priority")[["player_name","team_name","pos_group","scout_priority","value_tier","best_role_no","role_confidence"]]
print(top5.to_string(index=False))

print("\nTest Okeke (MID):")
okeke = df[df["player_name"].str.contains("Okeke", case=False, na=False)]
if not okeke.empty:
    o = okeke.iloc[0]
    print(f"  goals_per90={o.get('goals_per90',0):.3f}")
    print(f"  pct_all={o.get('pct_goals_per90_all',0):.1f}%  (vs hele liga)")
    print(f"  pct_pos={o.get('pct_goals_per90_pos',0):.1f}%  (vs MID)")
    print(f"  pct_role={o.get('pct_goals_per90_role',0):.1f}% (vs {o.get('best_role_no','')})")
    print(f"  pct_radar={o.get('pct_goals_per90_radar',0):.1f}% (radarkart-verdi)")

print("\nTest Kabini (DEF) — skal ha lav % på mål via radar:")
kabini = df[df["player_name"].str.contains("Kabini", case=False, na=False)]
if not kabini.empty:
    k = kabini.iloc[0]
    print(f"  goals_per90={k.get('goals_per90',0):.3f}")
    print(f"  pct_goals_radar={k.get('pct_goals_per90_radar',0):.1f}%  ← skal være lav")
    print(f"  pct_tackles_radar={k.get('pct_tackles_total_per90_radar',0):.1f}%  ← skal være høy")
    print(f"  best_role={k.get('best_role_no','')}, role_confidence={k.get('role_confidence',0):.2f}")

# ══════════════════════════════════════════════════════════════════
# 24. LAGRE DATA.PARQUET
# ══════════════════════════════════════════════════════════════════
df.to_parquet(OUT_DATA, index=False)
size_kb = os.path.getsize(OUT_DATA) / 1024
print(f"\n💾 Lagret: {OUT_DATA}  ({size_kb:.1f} KB)")

# ══════════════════════════════════════════════════════════════════
# 25. BENCHMARK-TABELL
# ══════════════════════════════════════════════════════════════════
print("\n19. Bygger benchmark-tabell...")

BENCH_VARS = [
    "goals_per90","assists_per90","shots_total_per90","passes_key_per90",
    "tackles_total_per90","interceptions_per90","duels_won_per90",
    "duel_efficiency","pass_efficiency","shot_efficiency",
    "dribble_efficiency","intensity_per90","risk_rate",
    "fair_score","forecast_score",
    "offensive_index","defensive_index","control_index","physical_index",
]

rows = []
for pos in ["ALL","GK","DEF","MID","ATT"]:
    grp = df[senior_mask] if pos == "ALL" else df[senior_mask & (df["pos_group"] == pos)]
    for var in BENCH_VARS:
        if var not in df.columns or len(grp) == 0:
            continue
        s = grp[var].dropna()
        if len(s) == 0:
            continue
        rows.append({
            "pos_group": pos, "variable": var,
            "mean":   round(float(s.mean()),   4),
            "median": round(float(s.median()), 4),
            "p25":    round(float(s.quantile(0.25)), 4),
            "p75":    round(float(s.quantile(0.75)), 4),
            "p90":    round(float(s.quantile(0.90)), 4),
            "std":    round(float(s.std()),    4),
            "n":      int(len(s)),
        })

# Benchmark per rolle også
for role in ROLE_WEIGHTS:
    role_mask_sr = senior_mask & (df["best_role"] == role)
    grp = df[role_mask_sr]
    for var in BENCH_VARS:
        if var not in df.columns or len(grp) == 0:
            continue
        s = grp[var].dropna()
        if len(s) == 0:
            continue
        rows.append({
            "pos_group": f"ROLE_{role}", "variable": var,
            "mean":   round(float(s.mean()),   4),
            "median": round(float(s.median()), 4),
            "p25":    round(float(s.quantile(0.25)), 4),
            "p75":    round(float(s.quantile(0.75)), 4),
            "p90":    round(float(s.quantile(0.90)), 4),
            "std":    round(float(s.std()),    4),
            "n":      int(len(s)),
        })

bench_df = pd.DataFrame(rows)
bench_df.to_parquet(OUT_BENCH, index=False)
print(f"   ✅ Benchmark: {len(bench_df)} rader → {OUT_BENCH}")

print("\n🏁 PIPELINE v4.0 FERDIG!\n")
print("Neste steg:")
print("  1. Oppdater main.py: DATA_PATH → data_v4.parquet, benchmarks → benchmarks_v4.parquet")
print("  2. Oppdater duell-side: bruk pct_*_radar kolonnene direkte")
print("  3. Restart uvicorn")
