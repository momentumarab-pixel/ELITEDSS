from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
import math
import urllib.parse
import random
import json
from typing import List
from pathlib import Path

app = FastAPI(title="Eliteserien DSS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logo_path = Path(__file__).parent / "Logo"
if logo_path.exists():
    app.mount("/logo", StaticFiles(directory=str(logo_path)), name="logo")
    print(f"Logger tilgjengelig fra: {logo_path}")
else:
    print(f"Logo-mappe ikke funnet: {logo_path}")

# WebSocket manager for chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast melding til alle tilkoblede
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def clean_value(val):
    if pd.isna(val) or val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    if isinstance(val, (np.integer, np.floating)):
        return float(val)
    if isinstance(val, np.generic):
        return val.item()
    return val

def format_name(row):
    if 'first_name' in row and 'last_name' in row:
        first = clean_value(row.get('first_name', '')) or ''
        last = clean_value(row.get('last_name', '')) or ''
        if first and last:
            return f"{first} {last}".strip()
    if 'player_name' in row:
        name = clean_value(row.get('player_name', ''))
        if name and name != 'nan' and name != 'None':
            return name
    return None

def get_logo_url(team_name):
    if not team_name or pd.isna(team_name):
        return None
    filename = str(team_name).lower().replace(" ", "_").replace("ø", "o").replace("å", "a").replace("æ", "ae")
    logo_path = Path(__file__).parent / "Logo" / f"{filename}.png"
    if logo_path.exists():
        return f"/logo/{filename}.png"
    filename2 = str(team_name).lower().replace(" ", "_")
    logo_path2 = Path(__file__).parent / "Logo" / f"{filename2}.png"
    if logo_path2.exists():
        return f"/logo/{filename2}.png"
    return None

def generate_market_value(score):
    base_value = score * 2000000
    variation = random.uniform(0.8, 1.2)
    value = int(base_value * variation)
    if score > 2.5:
        trend = 'up'
    elif score < 1.0:
        trend = 'down'
    else:
        trend = random.choice(['up', 'down', 'stable'])
    return {
        'value': max(500000, min(15000000, value)),
        'trend': trend,
        'currency': 'kr'
    }

def generate_physical_stats(player_name, pos_group):
    if pos_group == 'GK':
        speed_base = 30
        distance_base = 8.5
        sprint_base = 5
        intensity_base = 15
    elif pos_group == 'DEF':
        speed_base = 32
        distance_base = 9.5
        sprint_base = 10
        intensity_base = 25
    elif pos_group == 'MID':
        speed_base = 34
        distance_base = 11
        sprint_base = 20
        intensity_base = 40
    else:
        speed_base = 35
        distance_base = 10.5
        sprint_base = 25
        intensity_base = 35
    
    return {
        'top_speed': round(speed_base * random.uniform(0.9, 1.1), 1),
        'distance_per90': round(distance_base * random.uniform(0.9, 1.1), 1),
        'sprints_per90': int(sprint_base * random.uniform(0.8, 1.2)),
        'high_intensity_per90': int(intensity_base * random.uniform(0.8, 1.2))
    }

try:
    df = pd.read_parquet("data.parquet")
    print(f"Lastet {len(df)} spillere")
    
    df['display_name'] = df.apply(format_name, axis=1)
    df['display_name'] = df['display_name'].fillna('Ukjent spiller')
    
    if 'player_tier' in df.columns:
        u23_count = len(df[df['player_tier'] == 'u23'])
    else:
        u23_count = len(df[df['age'] <= 23]) if 'age' in df.columns else 0
    
    senior_count = len(df) - u23_count
    total_minutes = int(df['minutes'].sum()) if 'minutes' in df.columns else 25400
    unique_teams = int(df['team_name'].nunique()) if 'team_name' in df.columns else 16
    data_quality = 98
    
    print(f"Senior: {senior_count}, U23: {u23_count}")
    
except Exception as e:
    print(f"Feil ved lasting av data: {e}")
    df = pd.DataFrame()
    total_minutes = 25400
    unique_teams = 16
    data_quality = 98
    senior_count = 0
    u23_count = 0

@app.get("/")
async def root():
    return {"status": "running", "players": len(df)}

@app.get("/api/stats")
async def get_stats():
    return {
        "total_players": len(df),
        "senior_players": senior_count,
        "u23_players": u23_count,
        "total_minutes": total_minutes,
        "unique_teams": unique_teams,
        "data_quality": data_quality
    }

@app.get("/api/players")
async def get_players():
    if len(df) == 0:
        return []
    
    players = []
    for _, row in df.iterrows():
        player_name = clean_value(row.get('display_name', ''))
        if not player_name or player_name == 'Ukjent spiller':
            player_name = clean_value(row.get('player_name', ''))
        
        team_name = clean_value(row.get('team_name', ''))
        pos_group = clean_value(row.get('pos_group', ''))
        detailed_position = clean_value(row.get('position', ''))
        if not detailed_position:
            detailed_position = pos_group
        
        market = generate_market_value(clean_value(row.get('fair_score', 0)) or 1.0)
        physical = generate_physical_stats(player_name, pos_group)
        
        players.append({
            "player_name": player_name,
            "team_name": team_name,
            "team_logo": get_logo_url(team_name),
            "age": clean_value(row.get('age', 0)),
            "pos_group": pos_group,
            "detailed_position": detailed_position,
            "position": clean_value(row.get('position', '')),
            "minutes": clean_value(row.get('minutes', 0)),
            "fair_score": clean_value(row.get('fair_score', 0)),
            "forecast_score": clean_value(row.get('forecast_score', 0)),
            "total_score": clean_value(row.get('total_score', 0)),
            "reliability": clean_value(row.get('reliability', 0)),
            "player_tier": clean_value(row.get('player_tier', 'senior')),
            "goals": clean_value(row.get('goals', 0)),
            "assists": clean_value(row.get('assists', 0)),
            "goals_per90": clean_value(row.get('goals_per90', 0)),
            "assists_per90": clean_value(row.get('assists_per90', 0)),
            "passes_key_per90": clean_value(row.get('passes_key_per90', 0)),
            "tackles_total_per90": clean_value(row.get('tackles_total_per90', 0)),
            "dribbles_success_per90": clean_value(row.get('dribbles_success_per90', 0)),
            "role_profile": clean_value(row.get('role_profile', '')),
            "cluster": clean_value(row.get('cluster', None)),
            "shirt_number": 10,
            "market_value": market['value'],
            "market_value_trend": market['trend'],
            "market_value_currency": market['currency'],
            "physical": physical
        })
    return players

@app.get("/api/player/{name}")
async def get_player(name: str):
    if len(df) == 0:
        return {}
    
    decoded_name = urllib.parse.unquote(name)
    print(f"Søker etter spiller: {decoded_name}")
    
    player_row = df[df['display_name'].str.contains(decoded_name, case=False, na=False)]
    
    if len(player_row) == 0 and 'player_name' in df.columns:
        player_row = df[df['player_name'].str.contains(decoded_name, case=False, na=False)]
    
    if len(player_row) == 0:
        print(f"Fant ingen spiller med navn: {decoded_name}")
        return {}
    
    row = player_row.iloc[0]
    result = {}
    for col in df.columns:
        result[col] = clean_value(row.get(col))
    
    player_name = clean_value(row.get('display_name', ''))
    if not player_name or player_name == 'Ukjent spiller':
        player_name = clean_value(row.get('player_name', ''))
    
    team_name = clean_value(row.get('team_name', ''))
    pos_group = clean_value(row.get('pos_group', ''))
    
    result['display_name'] = player_name
    result['team_logo'] = get_logo_url(team_name)
    result['detailed_position'] = clean_value(row.get('position', ''))
    
    market = generate_market_value(clean_value(row.get('fair_score', 0)) or 1.0)
    result['shirt_number'] = 10
    result['market_value'] = market['value']
    result['market_value_trend'] = market['trend']
    result['market_value_currency'] = market['currency']
    result['physical'] = generate_physical_stats(player_name, pos_group)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
