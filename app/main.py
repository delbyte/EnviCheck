from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse('static/index.html')

# Get info endpoint
@app.get("/info")
async def get_info(lat: float, lon: float):
    # Get location name from Nominatim
    nominatim_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {"User-Agent": "EnviCheck/1.0"}
    response = requests.get(nominatim_url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        location = data.get("display_name", "Unknown location")
    else:
        location = "Unknown location"

    # Get air quality data from WAQI
    waqi_token = os.getenv("WAQI_TOKEN")
    waqi_url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={waqi_token}"
    response = requests.get(waqi_url)
    aqi = None
    category = "Data not available"
    if response.status_code == 200:
        data = response.json()
        if data["status"] == "ok":
            aqi = data["data"]["aqi"]
            category = get_aqi_category(aqi)

    # Get photo from Unsplash
    unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    keyword = location.split(",")[0]
    unsplash_url = f"https://api.unsplash.com/search/photos?query={keyword}&client_id={unsplash_access_key}"
    photo_url = None
    response = requests.get(unsplash_url)
    if response.status_code == 200:
        data = response.json()
        if data["results"]:
            photo_url = data["results"][0]["urls"]["small"]

    return {
        "location": location,
        "aqi": aqi,
        "category": category,
        "photo_url": photo_url
    }

def get_aqi_category(aqi):
    if aqi is None:
        return "Data not available"
    elif aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"
