from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="EnviCheck API", description="Environmental data checker application")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse('static/index.html')

# Environment data endpoint
@app.get("/api/environment")
async def get_environment_data(lat: float, lon: float):
    # Input validation
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    
    # Initialize result structure
    result = {
        "location": {
            "name": "Unknown location",
            "display_name": "Unknown location",
            "coordinates": {"lat": lat, "lon": lon}
        },
        "air_quality": {
            "aqi": None,
            "category": "Data not available"
        },
        "weather": None,
        "image": None,
        "status": "success"
    }
    
    # Get location name from Nominatim
    try:
        nominatim_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        headers = {"User-Agent": "EnviCheck/1.0"}
        response = requests.get(nominatim_url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if 'display_name' in data:
            result["location"]["display_name"] = data["display_name"]
        if 'name' in data:
            result["location"]["name"] = data["name"]
        elif 'address' in data and 'city' in data['address']:
            result["location"]["name"] = data['address']['city']
        elif 'address' in data and 'town' in data['address']:
            result["location"]["name"] = data['address']['town']
        elif 'address' in data and 'village' in data['address']:
            result["location"]["name"] = data['address']['village']
        elif 'address' in data and 'county' in data['address']:
            result["location"]["name"] = data['address']['county']
    except Exception as e:
        print(f"Error getting location name: {e}")
        # Continue with other data even if location name fails

    # Get air quality data from WAQI
    try:
        waqi_token = os.getenv("WAQI_TOKEN")
        if waqi_token:
            waqi_url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={waqi_token}"
            response = requests.get(waqi_url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data["status"] == "ok" and "data" in data and "aqi" in data["data"]:
                result["air_quality"]["aqi"] = data["data"]["aqi"]
                result["air_quality"]["category"] = get_aqi_category(data["data"]["aqi"])
        else:
            print("WAQI_TOKEN not found in environment variables")
    except Exception as e:
        print(f"Error getting AQI data: {e}")
        # Continue with other data even if AQI data fails

    # Get weather data from OpenWeatherMap
    try:
        openweathermap_api_key = os.getenv("OPENWEATHERMAP_API_KEY")
        if openweathermap_api_key:
            weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={openweathermap_api_key}"
            response = requests.get(weather_url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if "main" in data and "weather" in data and len(data["weather"]) > 0:
                result["weather"] = {
                    "temperature": {
                        "current": data["main"]["temp"],
                        "feels_like": data["main"]["feels_like"],
                        "min": data["main"]["temp_min"],
                        "max": data["main"]["temp_max"],
                        "unit": "°C"
                    },
                    "humidity": data["main"]["humidity"],
                    "pressure": data["main"]["pressure"],
                    "description": data["weather"][0]["description"],
                    "icon": f"https://openweathermap.org/img/wn/{data['weather'][0]['icon']}@2x.png"
                }
                
                # Add wind data if available
                if "wind" in data:
                    result["weather"]["wind"] = {
                        "speed": data["wind"]["speed"],
                        "unit": "m/s"
                    }
                    if "deg" in data["wind"]:
                        result["weather"]["wind"]["direction"] = data["wind"]["deg"]
        else:
            print("OPENWEATHERMAP_API_KEY not found in environment variables")
    except Exception as e:
        print(f"Error getting weather data: {e}")
        # Continue with other data even if weather data fails

    # Get a representative image from Unsplash
    try:
        unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
        if unsplash_access_key:
            # Try to get an image based on location name first
            query = result["location"]["name"]
            if query == "Unknown location":
                # If location is unknown, try using the nearest feature
                query = "landscape"
            
            unsplash_url = f"https://api.unsplash.com/search/photos?query={query}&per_page=1&client_id={unsplash_access_key}"
            response = requests.get(unsplash_url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if "results" in data and len(data["results"]) > 0:
                result["image"] = {
                    "url": data["results"][0]["urls"]["small"],
                    "credit": {
                        "name": data["results"][0]["user"]["name"],
                        "username": data["results"][0]["user"]["username"],
                        "link": data["results"][0]["user"]["links"]["html"]
                    }
                }
        else:
            print("UNSPLASH_ACCESS_KEY not found in environment variables")
    except Exception as e:
        print(f"Error getting image: {e}")
        # Continue without image if it fails

    return result

def get_aqi_category(aqi):
    """Convert AQI numeric value to descriptive category."""
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

# Add health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}