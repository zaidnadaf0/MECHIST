"""
MECHIST ML - Phase 6 Dataset Generator (SEED=42)
Candidate-level: ONE REQUEST + ONE CANDIDATE MECHANIC per row.
Target `suitability` is a noisy proxy, NOT a copy of any feature.
"""
import random, hashlib, math, csv
from pathlib import Path
SEED = 42
random.seed(SEED)
try:
    import numpy as np
    np.random.seed(SEED)
except ImportError:
    np = None
OUT_CSV = Path("ml/data/mechist_recommendation_dataset.csv")
OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
BASE_LAT, BASE_LNG = 12.9716, 77.5946
NUM_REQUESTS = 500
CANDIDATES_MIN, CANDIDATES_MAX = 3, 5
NUM_MECHANICS_POOL = 180
PROBLEM_CATEGORIES = ["flat-tyre", "battery", "engine", "tow", "other"]
PROBLEM_WEIGHTS    = [0.28, 0.22, 0.20, 0.15, 0.15]
VEHICLE_TYPES = ["Hatchback","Sedan","SUV","Pickup / Truck","Motorbike / Scooter","EV (electric)","Tempo / Van","Commercial fleet"]
URGENCIES = ["low","medium","high","critical"]
URGENCY_WEIGHTS = [0.20, 0.40, 0.25, 0.15]
SPECIALTIES_POOL = ["Battery / jump start","Flat-tyre change","Towing","Lockout","Engine diagnostics","Brakes","Fuel delivery (petrol / diesel)","Electrical / wiring","Two-wheeler repair","EV charging support"]
SPECIALTY_MAP = {
    "flat-tyre": ["flat-tyre","tyre","tire","wheels","brakes","two-wheeler"],
    "battery":   ["battery","electrical","ev charging","electrical / wiring"],
    "engine":    ["engine diagnostics","fuel delivery","electrical / wiring","ev charging"],
    "tow":       ["towing","recovery"],
    "other":     ["lockout","general"],
}
def haversine_km(lat1, lng1, lat2, lng2):
    R=6371.0
    dlat=math.radians(lat2-lat1); dlng=math.radians(lng2-lng1)
    a=math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return 2*R*math.asin(math.sqrt(a))
def specialty_match(problem_category, specialties_str):
    specs=[s.strip().lower() for s in specialties_str.split(";")]
    keywords=[k.lower() for k in SPECIALTY_MAP.get(problem_category, [])]
    for kw in keywords:
        for s in specs:
            if kw in s or s in kw: return 1
    return 0
def sample_rating():
    v=random.gauss(4.2,0.55); return round(max(2.8,min(5.0,v)),2)
def sample_review_count():
    v=int(random.paretovariate(1.6)*8); return max(0,min(600,v))
def sample_service_radius():
    v=random.gammavariate(3,6)+5; return round(max(5,min(50,v)),1)
def sample_customer_coords():
    lat=random.gauss(BASE_LAT,0.13); lng=random.gauss(BASE_LNG,0.13)
    return round(max(12.55,min(13.35,lat)),5), round(max(77.15,min(77.95,lng)),5)
def sample_mechanic_base():
    lat=random.gauss(BASE_LAT,0.18); lng=random.gauss(BASE_LNG,0.18)
    return round(max(12.50,min(13.40,lat)),5), round(max(77.10,min(78.00,lng)),5)
mechanics=[]
for i in range(NUM_MECHANICS_POOL):
    mid=f"mech-{i:04d}"; mlat,mlng=sample_mechanic_base()
    n_specs=random.randint(1,4); specs=random.sample(SPECIALTIES_POOL,n_specs)
    n_vtypes=random.randint(1,4); vtypes=random.sample(VEHICLE_TYPES,n_vtypes)
    mechanics.append({"mechanic_id":mid,"mechanic_lat":mlat,"mechanic_lng":mlng,"service_radius_km":sample_service_radius(),"specialties":";".join(specs),"vehicle_types":";".join(vtypes),"rating":sample_rating(),"review_count":sample_review_count(),"experience_years":random.randint(1,28),"availability":random.choices(["available","busy"],weights=[0.72,0.28])[0],"active_jobs":max(0,min(5,int(random.gauss(1.1,1.0)))),"completion_rate":round(max(0.62,min(0.99,random.gauss(0.88,0.07))),3)})
rows=[]
for ri in range(NUM_REQUESTS):
    req_id=f"req-{ri:04d}"; c_lat,c_lng=sample_customer_coords()
    prob_cat=random.choices(PROBLEM_CATEGORIES,weights=PROBLEM_WEIGHTS)[0]
    veh_type=random.choice(VEHICLE_TYPES); urgency=random.choices(URGENCIES,weights=URGENCY_WEIGHTS)[0]
    n_cands=random.randint(CANDIDATES_MIN,CANDIDATES_MAX); cands=random.sample(mechanics,n_cands)
    scored=[]
    for mech in cands:
        dist=round(haversine_km(c_lat,c_lng,mech["mechanic_lat"],mech["mechanic_lng"]),3)
        s_match=specialty_match(prob_cat,mech["specialties"])
        v_match=1 if veh_type in mech["vehicle_types"].split(";") else 0
        within=1 if dist <= mech["service_radius_km"] else 0
        eta=max(1,round(dist/35*60+random.gauss(0,1.2)))
        avail_bonus=1.4 if mech["availability"]=="available" else 0
        score=(-dist*0.32 + s_match*4.2 + v_match*2.4 + within*1.8 + mech["rating"]*0.75 + min(mech["review_count"],80)/80*1.0 + mech["experience_years"]/28*0.9 + mech["completion_rate"]*2.2 - mech["active_jobs"]*0.85 + avail_bonus + random.gauss(0,0.85))
        scored.append((mech,dist,s_match,v_match,within,eta,score))
    scored.sort(key=lambda x: x[6], reverse=True)
    positives={scored[0][0]["mechanic_id"]}
    if len(scored)>2 and abs(scored[0][6]-scored[1][6])<0.6 and random.random()<0.35:
        positives.add(scored[1][0]["mechanic_id"])
    for mech,dist,s_match,v_match,within,eta,score in scored:
        suitability=1 if mech["mechanic_id"] in positives else 0
        rows.append({"request_id":req_id,"customer_lat":c_lat,"customer_lng":c_lng,"problem_category":prob_cat,"vehicle_type":veh_type,"urgency":urgency,"mechanic_id":mech["mechanic_id"],"mechanic_lat":mech["mechanic_lat"],"mechanic_lng":mech["mechanic_lng"],"service_radius_km":mech["service_radius_km"],"specialties":mech["specialties"],"vehicle_types":mech["vehicle_types"],"rating":mech["rating"],"review_count":mech["review_count"],"experience_years":mech["experience_years"],"availability":mech["availability"],"active_jobs":mech["active_jobs"],"completion_rate":mech["completion_rate"],"eta_min":eta,"distance_km":dist,"specialty_match":s_match,"vehicle_match":v_match,"within_service_radius":within,"suitability":suitability})
random.shuffle(rows)
fieldnames=["request_id","customer_lat","customer_lng","problem_category","vehicle_type","urgency","mechanic_id","mechanic_lat","mechanic_lng","service_radius_km","specialties","vehicle_types","rating","review_count","experience_years","availability","active_jobs","completion_rate","eta_min","distance_km","specialty_match","vehicle_match","within_service_radius","suitability"]
with open(OUT_CSV,"w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=fieldnames); w.writeheader(); w.writerows(rows)
h=hashlib.sha256(OUT_CSV.read_bytes()).hexdigest()
print(f"Generated {len(rows)} rows ({NUM_REQUESTS} requests, {NUM_MECHANICS_POOL} mechanics pool) -> {OUT_CSV}")
print(f"SHA256: {h}")
print(f"Positives: {sum(r['suitability'] for r in rows)} ({sum(r['suitability'] for r in rows)/len(rows):.1%})")
from collections import Counter
print("problem_category:", Counter(r["problem_category"] for r in rows))
print("urgency:", Counter(r["urgency"] for r in rows))
