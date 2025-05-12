// EnviCheck Application JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let map, currentMarker;
    const API_ENDPOINT = '/api/environment';
    
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const dataPanel = document.getElementById('data-panel');
    const closePanel = document.getElementById('close-panel');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    const closeToast = document.getElementById('close-toast');
    
    // Initialize the application
    function init() {
        initMap();
        initSearch();
    }
    
    // Initialize map
    function initMap() {
        // Create map instance
        map = L.map('map', {
            center: [20, 0],  // Center of the world
            zoom: 2,
            minZoom: 2,
            maxBounds: [
                [-90, -180],  // Southwest corner
                [90, 180]     // Northeast corner
            ],
            maxBoundsViscosity: 1.0
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add terrain layer as an option
        const terrainLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.jpg', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            minZoom: 0,
            maxZoom: 18
        });
        
        // Add layer control
        const baseLayers = {
            "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map),
            "Terrain": terrainLayer
        };
        
        L.control.layers(baseLayers).addTo(map);
        
        // Add scale control
        L.control.scale({imperial: false}).addTo(map);
        
        // Map click event listener
        map.on('click', (e) => {
            handleLocationSelection(e.latlng.lat, e.latlng.lng);
        });
    }
    
    // Initialize the search functionality
    function initSearch() {
        // Search button click event
        searchButton.addEventListener('click', handleSearch);
        
        // Search input enter key event
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Close panel button event
        closePanel.addEventListener('click', () => {
            dataPanel.classList.add('hidden');
        });
        
        // Close error toast event
        closeToast.addEventListener('click', () => {
            errorToast.classList.add('hidden');
        });
    }
    
    // Handle search
    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        showLoading();
        
        try {
            // Use OpenStreetMap Nominatim API to geocode the search query
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                // Center map on result and zoom in
                map.setView([lat, lon], 12);
                
                // Get environmental data for the location
                handleLocationSelection(lat, lon);
            } else {
                showError("Location not found. Please try a different search term.");
            }
        } catch (error) {
            console.error("Search error:", error);
            showError("An error occurred while searching. Please try again.");
        } finally {
            hideLoading();
        }
    }
    
    // Handle location selection from map click or search
    async function handleLocationSelection(lat, lng) {
        showLoading();
        
        try {
            // Get environmental data from our API endpoint
            const environmentData = await fetchEnvironmentData(lat, lng);
            
            // Extract location info from the API response
            const locationInfo = {
                name: environmentData.location.name,
                fullName: environmentData.location.display_name,
                lat: lat,
                lng: lng
            };
            
            // Update marker position on map
            updateMarker(lat, lng, locationInfo.name);
            
            // Update UI with fetched data
            updateDataPanel(locationInfo, environmentData);
            
            // Show the data panel
            dataPanel.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching location data:", error);
            showError("Failed to fetch environmental data for this location.");
        } finally {
            hideLoading();
        }
    }
    
    // Update marker on map
    function updateMarker(lat, lng, title) {
        // Remove existing marker if any
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        // Create new marker
        currentMarker = L.marker([lat, lng]).addTo(map);
        
        // Add popup
        currentMarker.bindPopup(`
            <h3>${title}</h3>
            <p>Latitude: ${lat.toFixed(6)}</p>
            <p>Longitude: ${lng.toFixed(6)}</p>
        `).openPopup();
    }
    
    // Fetch environmental data from API
    async function fetchEnvironmentData(lat, lng) {
        const response = await fetch(`${API_ENDPOINT}?lat=${lat}&lon=${lng}`);
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // Update data panel with environmental information
    function updateDataPanel(locationInfo, environmentData) {
        // Update location information
        document.getElementById('location-name').textContent = locationInfo.name;
        document.getElementById('location-full').textContent = locationInfo.fullName;
        document.getElementById('location-coords').textContent = `Lat: ${locationInfo.lat.toFixed(6)}, Lng: ${locationInfo.lng.toFixed(6)}`;
        
        // Update air quality information
        const airQualitySection = document.getElementById('air-quality');
        const aqiValue = document.getElementById('aqi-value');
        const aqiCategory = document.getElementById('aqi-category');
        
        if (environmentData.air_quality && environmentData.air_quality.aqi) {
            const aqi = environmentData.air_quality.aqi;
            aqiValue.textContent = aqi;
            
            // Determine AQI category and color
            const aqiInfo = getAQIInfo(aqi);
            aqiCategory.textContent = aqiInfo.category;
            
            // Remove all existing AQI classes
            const aqiClasses = ['aqi-good', 'aqi-moderate', 'aqi-unhealthy-sensitive', 'aqi-unhealthy', 'aqi-very-unhealthy', 'aqi-hazardous'];
            aqiCategory.classList.remove(...aqiClasses);
            
            // Add appropriate class
            aqiCategory.classList.add(aqiInfo.class);
        } else {
            aqiValue.textContent = '--';
            aqiCategory.textContent = 'Unknown';
            aqiCategory.className = 'aqi-category';
        }
        
        // Update weather information
        const weatherSection = document.getElementById('weather');
        const weatherTemp = document.getElementById('weather-temp');
        const weatherDesc = document.getElementById('weather-desc');
        const weatherIcon = document.getElementById('weather-icon');
        const weatherFeelsLike = document.getElementById('weather-feels-like');
        const weatherHumidity = document.getElementById('weather-humidity');
        const weatherWind = document.getElementById('weather-wind');
        
        if (environmentData.weather) {
            const weather = environmentData.weather;
            
            weatherTemp.textContent = `${Math.round(weather.temperature.current)}°C`;
            weatherDesc.textContent = weather.description;
            weatherIcon.src = weather.icon;
            weatherFeelsLike.textContent = `${Math.round(weather.temperature.feels_like)}°C`;
            weatherHumidity.textContent = `${weather.humidity}%`;
            weatherWind.textContent = `${weather.wind ? weather.wind.speed : 0} m/s`;
        } else {
            weatherTemp.textContent = '--°C';
            weatherDesc.textContent = 'Unknown';
            weatherIcon.src = '';
            weatherFeelsLike.textContent = '--°C';
            weatherHumidity.textContent = '--%';
            weatherWind.textContent = '-- m/s';
        }
        
        // Update image
        const imageContainer = document.getElementById('location-image');
        const placeImage = document.getElementById('place-image');
        const imageCredit = document.getElementById('image-credit-link');
        
        if (environmentData.image) {
            placeImage.src = environmentData.image.url;
            imageCredit.textContent = environmentData.image.credit.name;
            imageCredit.href = environmentData.image.credit.link;
            imageContainer.classList.remove('hidden');
        } else {
            // Hide the container if no image is available
            imageContainer.classList.add('hidden');
        }
    }
    
    // Get AQI category information based on AQI value
    function getAQIInfo(aqi) {
        if (aqi <= 50) {
            return {
                category: 'Good',
                class: 'aqi-good',
                description: 'Air quality is satisfactory, and air pollution poses little or no risk.'
            };
        } else if (aqi <= 100) {
            return {
                category: 'Moderate',
                class: 'aqi-moderate',
                description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.'
            };
        } else if (aqi <= 150) {
            return {
                category: 'Unhealthy for Sensitive Groups',
                class: 'aqi-unhealthy-sensitive',
                description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.'
            };
        } else if (aqi <= 200) {
            return {
                category: 'Unhealthy',
                class: 'aqi-unhealthy',
                description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
            };
        } else if (aqi <= 300) {
            return {
                category: 'Very Unhealthy',
                class: 'aqi-very-unhealthy',
                description: 'Health alert: The risk of health effects is increased for everyone.'
            };
        } else {
            return {
                category: 'Hazardous',
                class: 'aqi-hazardous',
                description: 'Health warning of emergency conditions: everyone is more likely to be affected.'
            };
        }
    }
    
    // Show loading indicator
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
    }
    
    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }
    
    // Show error toast
    function showError(message) {
        errorMessage.textContent = message;
        errorToast.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorToast.classList.add('hidden');
        }, 5000);
    }
    
    // Start the application
    init();
});