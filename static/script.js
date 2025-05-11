var map = L.map('map').setView([0, 0], 2);

// Define base layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

var stamenTerrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
    attribution: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
});

// Add default layer to map
osm.addTo(map);

// Layer control
var baseLayers = {
    "OpenStreetMap": osm,
    "Terrain": stamenTerrain
};
L.control.layers(baseLayers).addTo(map);

const search = new GeoSearch.GeoSearchControl({
    provider: new GeoSearch.OpenStreetMapProvider(),
    style: 'bar',
    showMarker: true,
    showPopup: false,
});
map.addControl(search);

map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lon = e.latlng.lng;
    var popup = L.popup()
        .setLatLng(e.latlng)
        .setContent('Loading...')
        .openOn(map);
    fetch(`/info?lat=${lat}&lon=${lon}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            var popupContent = `
                <div>
                    <h3>${data.location || 'Unknown location'}</h3>
                    <p>AQI: ${data.aqi ? data.aqi + ' - ' + data.category : 'N/A'}</p>
                    ${data.weather ? `
                        <p>Temperature: ${data.weather.temp}°C</p>
                        <p>Weather: ${data.weather.description}</p>
                        <p>UV Index: ${data.weather.uvi}</p>
                        <p>Humidity: ${data.weather.humidity}%</p>
                    ` : ''}
                    ${data.photo_url ? `<img src="${data.photo_url}" alt="Photo of ${data.location}" style="width:100%;">` : ''}
                </div>
            `;
            popup.setContent(popupContent);
        })
        .catch(error => {
            popup.setContent('Error: ' + error.message);
        });
});

map.on('geosearch/showlocation', function(e) {
    var lat = e.location.y;
    var lon = e.location.x;
    map.setView([lat, lon], 13);
    e.marker.bindPopup('Loading...').openPopup();
    fetch(`/info?lat=${lat}&lon=${lon}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            var popupContent = `
                <div>
                    <h3>${data.location || 'Unknown location'}</h3>
                    <p>AQI: ${data.aqi ? data.aqi + ' - ' + data.category : 'N/A'}</p>
                    ${data.weather ? `
                        <p>Temperature: ${data.weather.temp}°C</p>
                        <p>Weather: ${data.weather.description}</p>
                        <p>UV Index: ${data.weather.uvi}</p>
                        <p>Humidity: ${data.weather.humidity}%</p>
                    ` : ''}
                    ${data.photo_url ? `<img src="${data.photo_url}" alt="Photo of ${data.location}" style="width:100%;">` : ''}
                </div>
            `;
            e.marker.setPopupContent(popupContent);
        })
        .catch(error => {
            e.marker.setPopupContent('Error: ' + error.message);
        });
});