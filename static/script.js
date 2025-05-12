document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing map...');
    
    // Initialize map
    var map = L.map('map').setView([0, 0], 2);
    
    // Define base layers
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    var stamenTerrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
        attribution: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
    });
    
    // Layer control
    var baseLayers = {
        "OpenStreetMap": osm,
        "Terrain": stamenTerrain
    };
    L.control.layers(baseLayers).addTo(map);
    
    // Initialize the search provider
    const provider = new GeoSearch.OpenStreetMapProvider();
    
    // Initialize search control with specific options
    const searchControl = new GeoSearch.GeoSearchControl({
        provider: provider,
        style: 'bar',
        showMarker: true,
        showPopup: false,
        autoClose: true,
        searchLabel: 'Enter location...',
        keepResult: true
    });
    
    // Add search control to map
    map.addControl(searchControl);
    console.log('Search control added to map');
    
    // Detect search result selection - primary event listener
    map.on('geosearch/showlocation', function(result) {
        console.log('geosearch/showlocation event triggered:', result);
        if (result && result.location) {
            const { x: lng, y: lat } = result.location;
            map.setView([lat, lng], 13);
            
            // If there's a marker, use it, otherwise create one
            let marker = result.marker;
            if (!marker) {
                marker = L.marker([lat, lng]).addTo(map);
            }
            
            // Show loading popup
            marker.bindPopup('Loading environmental data...').openPopup();
            
            // Fetch environmental data
            fetchEnvironmentalData(lat, lng, marker);
        }
    });
    
    // Alternative event listener for search completion
    map.on('geosearch/searchlocation', function(result) {
        console.log('geosearch/searchlocation event triggered:', result);
    });
    
    // Handle map click event
    map.on('click', function(e) {
        console.log('Map clicked at:', e.latlng);
        const { lat, lng } = e.latlng;
        
        // Create marker and popup
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup('Loading environmental data...').openPopup();
        
        // Fetch environmental data
        fetchEnvironmentalData(lat, lng, marker);
    });
    
    // Function to fetch environmental data
    function fetchEnvironmentalData(lat, lng, marker) {
        console.log(`Fetching data for lat=${lat}, lng=${lng}`);
        
        fetch(`/info?lat=${lat}&lon=${lng}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Environmental data received:', data);
                
                // Create popup content
                const popupContent = `
                    <div>
                        <h3>${data.location || 'Unknown location'}</h3>
                        <p>AQI: ${data.aqi ? data.aqi + ' - ' + data.category : 'N/A'}</p>
                        ${data.weather ? `
                            <p>Temperature: ${data.weather.temp}°C</p>
                            <p>Weather: ${data.weather.description}</p>
                            <p>Humidity: ${data.weather.humidity}%</p>
                        ` : '<p>Weather data not available</p>'}
                        ${data.photo_url ? `<img src="${data.photo_url}" alt="Photo of ${data.location}" style="width:100%;">` : ''}
                    </div>
                `;
                
                // Update popup content
                marker.setPopupContent(popupContent);
            })
            .catch(error => {
                console.error('Error fetching environmental data:', error);
                marker.setPopupContent(`Error: ${error.message}`);
            });
    }
    
    console.log('Map initialization complete');
});