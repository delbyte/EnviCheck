var map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

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
    fetch(`/info?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                var popupContent = `
                    <div>
                        <h3>${data.location}</h3>
                        <p>AQI: ${data.aqi ? data.aqi + ' - ' + data.category : 'N/A'}</p>
                        ${data.photo_url ? `<img src="${data.photo_url}" alt="Photo of ${data.location}" style="width:100%;">` : ''}
                    </div>
                `;
                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(popupContent)
                    .openOn(map);
            }
        });
});

map.on('geosearch/showlocation', function(e) {
    var lat = e.location.y;
    var lon = e.location.x;
    fetch(`/info?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                var popupContent = `
                    <div>
                        <h3>${data.location}</h3>
                        <p>AQI: ${data.aqi ? data.aqi + ' - ' + data.category : 'N/A'}</p>
                        ${data.photo_url ? `<img src="${data.photo_url}" alt="Photo of ${data.location}" style="width:100%;">` : ''}
                    </div>
                `;
                e.marker.bindPopup(popupContent).openPopup();
            }
        });
});