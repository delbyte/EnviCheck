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
    result = {
        "location": "Unknown location",
        "aqi": None,
        "category": "Data not available",
        "weather": None,
        "photo_url": None
    }

    # Get location name from Nominatim
    try:
        nominatim_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        headers = {"User-Agent": "EnviCheck/1.0"}
        response = requests.get(nominatim_url, headers=headers)
        response.raise_for_status()
        data = response.json()
        result["location"] = data.get("display_name", "Unknown location")
    except Exception as e:
        print(f"Error getting location name: {e}")

    # Get air quality data from WAQI
    try:
        waqi_token = os.getenv("WAQI_TOKEN")
        waqi_url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={waqi_token}"
        response = requests.get(waqi_url)
        response.raise_for_status()
        data = response.json()
        if data["status"] == "ok":
            result["aqi"] = data["data"]["aqi"]
            result["category"] = get_aqi_category(result["aqi"])
    except Exception as e:
        print(f"Error getting AQI data: {e}")

    # Get weather data from OpenWeatherMap (Current Weather Data API)
    try:
        openweathermap_api_key = os.getenv("OPENWEATHERMAP_API_KEY")
        print("OPENWEATHERMAP_API_KEY:", openweathermap_api_key)  # Debug: Print API key
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={openweathermap_api_key}"
        print("Request URL:", weather_url)  # Debug: Print full request URL
        response = requests.get(weather_url)
        response.raise_for_status()  # Raise an error for bad status codes
        data = response.json()
        print("Weather data:", data)  # Debug: Print API response
        result["weather"] = {
            "temp": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "humidity": data["main"]["humidity"]
        }
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error: {http_err}")
        print(f"Response content: {response.content}")  # Show API error message
    except Exception as e:
        print(f"Error getting weather data: {e}")

    # Get photo from Unsplash
    try:
        unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
        keyword = result["location"].split(",")[0]
        unsplash_url = f"https://api.unsplash.com/search/photos?query={keyword}&client_id={unsplash_access_key}"
        response = requests.get(unsplash_url)
        response.raise_for_status()
        data = response.json()
        if data["results"]:
            result["photo_url"] = data["results"][0]["urls"]["small"]
    except Exception as e:
        print(f"Error getting photo: {e}")

    return result

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