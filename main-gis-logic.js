/**
 * GeoPortal WebGIS - Main GIS Core Application Logic
 * Memisahkan inline-script bawaan berkas HTML utama ke berkas JS eksternal
 */

const appsScriptUrl = "https://script.google.com/macros/s/AKfycbwYyY7-Gj6w7K_LwD1oExmB1LpW38_K2wV1YmU/exec";

let map, bgMapHome;
let activeBasemap;
let layersData = {}; 
window.layersData = layersData; 
let globeInterval;

document.addEventListener("DOMContentLoaded", function () {
    // 1. INISIALISASI PETA UTAMA & BACKGROUND HOME
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([-2.5, 118], 5);
    window.map = map;

    // Tambahkan kompas mata angin bawaan kustom
    const CompassControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control compass-control');
            div.style.cssText = "background:#1e1e1e; border:1px solid #2d2d2d; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.5);";
            div.innerHTML = `
                <div style="position:relative; width:24px; height:24px; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-compass" style="font-size:24px; color:#f59e0b;"></i>
                    <span style="position:absolute; top:-10px; font-size:9px; font-weight:bold; color:#fff; background:#000; padding:0 2px; border-radius:2px;">U</span>
                </div>
            `;
            return div;
        }
    });
    map.addControl(new CompassControl());

    // Set default basemap awal peta utama
    activeBasemap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
    }).addTo(map);

    // Inisialisasi Peta Bergerak Animasi Otomatis (Beranda)
    bgMapHome = L.map('home-bg-map', {
        zoomControl: false, attributionControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false
    }).setView([0, 115], 2.5);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(bgMapHome);

    let currentLng = 115;
    globeInterval = setInterval(() => {
        currentLng += 0.25;
        if (currentLng >= 180) currentLng = -180;
        bgMapHome.setView([0, currentLng], 2.5, { animate: true, duration: 0.1 });
    }, 80);

    // 2. RUN SINKRONISASI MODUL INTEGRASI EKSTERNAL
    if (typeof initSatelliteLayer === 'function') initSatelliteLayer(map);
    if (typeof initInariskLayers === 'function') initInariskLayers(map);
    if (typeof initLayerSwitcherLegend === 'function') initLayerSwitcherLegend(map);
    if (typeof initDrawTools === 'function') initDrawTools(map, appsScriptUrl);
    if (typeof initSearchTool === 'function') initSearchTool(map);
    if (typeof initPrintAndCompass === 'function') initPrintAndCompass(map);
    if (typeof initStreetView === 'function') initStreetView(map);

    // Setup input handler untuk proses unggah ZIP data spasial
    setupUploadHandler('upload-basemap', 'base', 'status-bm');
    setupUploadHandler('upload-thematic', 'thematic', 'status-thematic');
    setupUploadHandler('upload-analysis', 'analysis', 'status-analysis');

    // Trigger update UI awal
    if (typeof updateLayerSwitcherAndLegend === 'function') {
        updateLayerSwitcherAndLegend();
    }

    // Memuat data prakiraan cuaca default lokasi DKI Jakarta
    fetchWeatherData(-6.2088, 106.8456);

    // 3. EVENT LISTENER TRIGGER ELEMEN UI & KONFLIK RE-SINKRONISASI
    const bufferBtn = document.getElementById('btn-run-buffer-trigger');
    if (bufferBtn) {
        bufferBtn.addEventListener('click', function () {
            try {
                if (typeof window.runBufferAnalysis === 'function') {
                    window.runBufferAnalysis();
                }
            } catch (error) {
                console.error("Turf Error terproteksi:", error);
                alert("Analisis Spasial Gagal: Pastikan data koordinat/geometri yang Anda masukkan valid dan tidak rusak (self-intersecting).");
            }
        });
    }

    // Pembersihan bentrok event klik antara Street View vs Leaflet Draw Tool
    const drawButtons = document.querySelectorAll('.leaflet-draw-draw-polygon, .leaflet-draw-draw-polyline, #btn-draw'); 
    drawButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            if (typeof window.matikanFiturStreetView === 'function') {
                window.matikanFiturStreetView();
            } else {
                if (window.map) {
                    window.map.off('click');
                    document.getElementById('map').style.cursor = '';
                }
            }
            console.log("Alat gambar aktif, menonaktifkan mode klik Street View untuk mencegah bentrok.");
        });
    });

    // Jalankan sinkronisasi dropdown analisis 1 detik setelah sistem siap
    setTimeout(updateAnalysisDropdowns, 1000);
});

// --- FUNGSI MANAJEMEN HALAMAN NAVIGASI (PAGE ROUTER) ---
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${pageId}`);
    const targetMenu = document.getElementById(`menu-${pageId}`);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetMenu) targetMenu.classList.add('active');
    
    if (pageId === 'gis') {
        setTimeout(() => {
            map.invalidateSize();
            if (globeInterval) clearInterval(globeInterval);
        }, 200);
    }
}

// --- FUNGSI PROSES UNGGAH DATA SHAPEFILE (ZIP) KE LOCAL MEMORY ---
function setupUploadHandler(inputId, type, statusId) {
    const fileInput = document.getElementById(inputId);
    const statusDiv = document.getElementById(statusId);
    if (!fileInput) return;

    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        statusDiv.innerHTML = `<span style="color:#eab308;"><i class="fa-solid fa-spinner fa-spin"></i> Membaca Shapefile...</span>`;

        const reader = new FileReader();
        reader.onload = function (event) {
            shp(event.target.result).then(function (geojson) {
                const id = type + '_' + Date.now();
                let name = file.name.replace('.zip', '');
                let color = '#' + Math.floor(Math.random() * 16777215).toString(16);

                let leafletLayer = L.geoJSON(geojson, {
                    style: function () {
                        return { color: color, fillColor: color, fillOpacity: 0.5, weight: 2 };
                    },
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            let popupText = `<div style="max-height:200px; overflow-y:auto; color:#fff; font-size:11px;">`;
                            popupText += `<div style="font-weight:bold; border-bottom:1px solid #444; margin-bottom:5px; padding-bottom:3px; color:#38bdf8;">Tabel Atribut data SHP</div><table style='width:100%;'>`;
                            for (let k in feature.properties) {
                                popupText += `<tr><td style="color:#a0aec0; padding-right:8px;">${k}:</td><td>${feature.properties[k]}</td></tr>`;
                            }
                            popupText += `</table></div>`;
                            layer.bindPopup(popupText);
                        }
                    }
                }).addTo(map);

                // Masukkan basis data layer baru ke repositori data global
                layersData[id] = { id: id, name: name, type: type, color: color, visible: true, geojson: geojson, layer: leafletLayer };

                statusDiv.innerHTML = `<span style="color:#10b981;"><i class="fa-solid fa-circle-check"></i> Berhasil Dimuat Lokal!</span>`;
                
                // Sinkronisasikan perubahan data ke komponen UI Legenda dan Dropdown Spasial
                if (typeof updateLayerSwitcherAndLegend === 'function') updateLayerSwitcherAndLegend();
                updateAnalysisDropdowns();
                if (typeof window.updateExportDropdown === 'function') window.updateExportDropdown();

                if (geojson.features && geojson.features.length > 0) {
                    map.fitBounds(leafletLayer.getBounds());
                }
            }).catch(err => {
                console.error(err);
                statusDiv.innerHTML = `<span style="color:#ef4444;"><i class="fa-solid fa-circle-xmark"></i> Gagal parsing ZIP Shapefile!</span>`;
            });
        };
        reader.readAsArrayBuffer(file);
    });
}

// --- FUNGSI INTEGRASI LAYOUT BASEMAP BAWAAN ---
function changeBasemap(type) {
    if (activeBasemap) map.removeLayer(activeBasemap);
    if (type === 'dark') {
        activeBasemap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }).addTo(map);
    } else if (type === 'osm') {
        activeBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
    }
}

// --- FUNGSI PENYUNGTINGAN TAMPILAN DATABASE ATRIBUT DATA ---
function openDatabase(id) {
    const l = layersData[id];
    if (!l) return;
    document.getElementById('db-title').innerText = `Atribut: ${l.name}`;
    let features = l.geojson.features || [];
    if (features.length === 0) return;
    
    let props = Object.keys(features[0].properties || {});
    let html = '<table><thead><tr>';
    props.forEach(p => html += `<th>${p}</th>`);
    html += '</tr></thead><tbody>';
    
    features.forEach(f => {
        html += '<tr>';
        props.forEach(p => html += `<td>${f.properties[p]}</td>`);
        html += '</tr>';
    });
    
    document.getElementById('table-content').innerHTML = html + '</tbody></table>';
    document.getElementById('database-container').style.display = 'block';
}

function closeDatabase() {
    document.getElementById('database-container').style.display = 'none';
}

// --- FUNGSI INTERAKSI ACCORDION DAN TOGGLE SIDEBAR ---
function toggleSidebar(side) {
    if (side === 'left') {
        const sbLeft = document.getElementById('sidebar-left');
        const iconLeft = document.getElementById('toggle-left-icon');
        sbLeft.classList.toggle('collapsed');
        iconLeft.className = sbLeft.classList.contains('collapsed') ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left";
    } else if (side === 'right') {
        const sbRight = document.getElementById('sidebar-right');
        const iconRight = document.getElementById('toggle-right-icon');
        sbRight.classList.toggle('collapsed');
        iconRight.className = sbRight.classList.contains('collapsed') ? "fa-solid fa-chevron-left" : "fa-solid fa-chevron-right";
    }
    setTimeout(() => map.invalidateSize(), 300);
}

function toggleAccordion(bodyId, headerElement) {
    const body = document.getElementById(bodyId);
    if (body) {
        body.classList.toggle('hidden');
        headerElement.classList.toggle('collapsed');
    }
}

// --- FUNGSI PERGERAKAN ALAT PENGUKUR JARAK MANUAL ---
let distanceModeActive = false, distancePoints = [], distanceMarkers = [], distancePolyline = null;
function startDistanceMeasurement() {
    distanceModeActive = !distanceModeActive;
    const btn = document.getElementById('btn-distance');
    if (distanceModeActive) {
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Mode Aktif! Klik 2 Titik Peta...";
        btn.style.background = "#ef4444";
        map.on('click', handleDistanceMapClick);
    } else {
        resetDistanceMeasurement();
    }
}

function handleDistanceMapClick(e) {
    if (distancePoints.length >= 2) resetDistanceMeasurement();
    
    let m = L.circleMarker(e.latlng, { radius: 5, color: '#f59e0b' }).addTo(map);
    distanceMarkers.push(m);
    distancePoints.push([e.latlng.lng, e.latlng.lat]);
    
    if (distancePoints.length === 2) {
        let d = turf.distance(turf.point(distancePoints[0]), turf.point(distancePoints[1]));
        distancePolyline = L.polyline([
            L.latLng(distancePoints[0][1], distancePoints[0][0]), 
            L.latLng(distancePoints[1][1], distancePoints[1][0])
        ], { color: '#f59e0b', weight: 4, dashArray: '5, 10' }).addTo(map);
        
        document.getElementById('distance-result').innerText = `Jarak Lurus: ${d.toFixed(3)} Km`;
    }
}

function resetDistanceMeasurement() {
    distanceMarkers.forEach(m => map.removeLayer(m));
    if (distancePolyline) map.removeLayer(distancePolyline);
    distancePoints = [];
    distanceMarkers = [];
    distancePolyline = null;
    document.getElementById('distance-result').innerText = "";
    
    const btn = document.getElementById('btn-distance');
    if (btn) {
        btn.innerHTML = "<i class='fa-solid fa-crosshairs'></i> Aktifkan Pengukur";
        btn.style.background = "#0ea5e9";
    }
    map.off('click', handleDistanceMapClick);
    distanceModeActive = false;
}

// --- SINKRONISASI DROPDOWN GLOBAL DATA ANALISIS SPASIAL ---
function updateAnalysisDropdowns() {
    const dropdowns = ['buffer-layer-select', 'overlay-layer1', 'overlay-layer2', 'proximity-source', 'proximity-target', 'query-layer', 'export-layer-select'];
    dropdowns.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const savedVal = el.value;
        el.innerHTML = '<option value="">-- Pilih Layer --</option>';
        for (let key in layersData) {
            el.innerHTML += `<option value="${key}">${layersData[key].name}</option>`;
        }
        if (layersData[savedVal]) el.value = savedVal;
    });
}

// --- FUNGSI SINKRONISASI INTEGRASI ATRIBUT UNTUK QUERY FIELD ---
function updateQueryFieldsDropdown(layerId) {
    const fieldSelect = document.getElementById('query-field');
    if (!fieldSelect) return;
    fieldSelect.innerHTML = '<option value="">-- Pilih Kolom --</option>';
    if (!layerId || !layersData[layerId]) return;

    const features = layersData[layerId].geojson.features || [];
    if (features.length > 0 && features[0].properties) {
        Object.keys(features[0].properties).forEach(p => {
            fieldSelect.innerHTML += `<option value="${p}">${p}</option>`;
        });
    }
}

// --- METODE PENGAMBILAN DATA CUACA (OPEN METEO API) ---
function fetchWeatherData(lat, lon) {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`)
        .then(r => r.json()).then(data => {
            if (data && data.current_weather) {
                const weather = data.current_weather;
                document.getElementById('weather-temp').innerText = `${weather.temperature}°C`;
                document.getElementById('weather-desc').innerText = `Kode Status Cuaca: ${weather.weathercode}`;
                document.getElementById('weather-details').innerHTML = `
                    Kecepatan Angin: ${weather.windspeed} km/jam<br>
                    Arah Angin: ${weather.winddirection}°<br>
                    <span id='weather-location' style='color: var(--primary); font-weight: bold;'>DKI Jakarta</span>
                `;
            }
        }).catch(err => console.error("Gagal mendapatkan data API cuaca:", err));
}

// --- EVENT HANDLER FORM KUESIONER KEPUSAAN PELANGGAN ---
const fbForm = document.getElementById('feedbackForm');
if (fbForm) {
    fbForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const payload = {
            action: "submitFeedback",
            name: document.getElementById('fb-name').value,
            instansi: document.getElementById('fb-instansi').value,
            fitur: document.getElementById('fb-fitur').value,
            comments: document.getElementById('fb-comments').value
        };

        alert("Sedang mengirimkan data laporan kuesioner Anda...");
        fetch(appsScriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(() => {
            alert("Terima kasih! Feedback kuesioner Anda berhasil dikirim ke Google Sheets.");
            fbForm.reset();
        }).catch(err => {
            console.error(err);
            alert("Koneksi gagal, silakan coba beberapa saat lagi.");
        });
    });
}