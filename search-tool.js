/**
 * GeoPortal Map Search Tool Module - FIXED VERSION
 * Menyediakan fitur pencarian lokasi dengan parsing data Nominatim OSM yang valid
 */

let searchControl = null;
let searchMarker = null;

function initSearchTool(mapInstance) {
    if (!mapInstance) {
        console.error("Map instance tidak ditemukan untuk menginisialisasi Search Tool.");
        return;
    }

    // Inisialisasi Kontrol Pencarian dengan penyesuaian parameter Nominatim OSM
    searchControl = new L.Control.Search({
        url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
        jsonpParam: 'json_callback',
        propertyName: 'display_name',
        propertyLoc: ['lat', 'lon'],
        marker: false, // Menggunakan custom marker di bawah
        autoCollapse: true,
        autoType: false,
        minLength: 2,
        zoom: 15,
        textPlaceholder: 'Cari kota, jalan, atau daerah...',
        
        // Fungsi filter khusus untuk membaca struktur data dari Nominatim OSM
        filterData: function(text, records) {
            return records;
        }
    });

    // EVENT: Ketika lokasi berhasil ditemukan
    searchControl.on('search:locationfound', function(e) {
        // Hapus marker pencarian sebelumnya jika ada
        if (searchMarker && mapInstance.hasLayer(searchMarker)) {
            mapInstance.removeLayer(searchMarker);
        }

        // Ambil data koordinat langsung dari objek hasil pencarian
        const lat = parseFloat(e.sourceTarget._recordsCache[e.text].lat);
        const lon = parseFloat(e.sourceTarget._recordsCache[e.text].lon);
        const targetLatLng = L.latLng(lat, lon);

        // Buat penanda baru berwarna biru terang di lokasi hasil pencarian
        searchMarker = L.circleMarker(targetLatLng, {
            radius: 10,
            color: '#2563eb',
            fillColor: '#38bdf8',
            fillOpacity: 0.9,
            weight: 3
        }).addTo(mapInstance);

        // Potong teks nama lokasi agar pop-up tidak terlalu panjang di layar
        let shortName = e.text.split(',').slice(0, 3).join(',');

        searchMarker.bindPopup(`
            <div style="font-weight:bold; color:#38bdf8; margin-bottom:4px;">
                <i class="fa-solid fa-location-dot"></i> Lokasi Ditemukan
            </div>
            <div style="font-size:11px; color:#fff; line-height:1.4;">${shortName}</div>
        `).openPopup();

        // Arahkan kamera peta ke lokasi tujuan
        mapInstance.setView(targetLatLng, 15);
    });

    // EVENT: Ketika kolom pencarian dihapus atau ditutup
    searchControl.on('search:collapsed', function() {
        if (searchMarker && mapInstance.hasLayer(searchMarker)) {
            mapInstance.removeLayer(searchMarker);
            searchMarker = null;
        }
    });

    // Tempelkan tombol pencarian ke peta
    mapInstance.addControl(searchControl);
}