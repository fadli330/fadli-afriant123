/**
 * GeoPortal WebGIS - Print, Export, & Compass Module
 * Menambahkan fungsi instrumen kompas pada peta, serta logika cetak peta dan ekspor GeoJSON.
 */

function initPrintAndCompass(mapInstance) {
    if (!mapInstance) return;

    // 1. TAMBAHKAN KONTROL ARAH MATA ANGIN (COMPASS) PADA PETA
    const CompassControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control compass-control');
            container.style.cssText = `
                background: #1e1e1e; 
                border: 1px solid #2d2d2d; 
                width: 34px; 
                height: 34px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            `;
            container.innerHTML = `
                <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-compass" style="font-size: 24px; color: #f59e0b;"></i>
                    <span style="position: absolute; top: -10px; font-size: 9px; font-weight: bold; color: #fff; background: #000; padding: 0 2px; border-radius: 2px;">U</span>
                </div>
            `;
            return container;
        }
    });
    mapInstance.addControl(new CompassControl());

    // Perbarui pilihan dropdown layer ekspor saat pertama kali dimuat
    window.updateExportDropdown();
}

// Fungsi Trigger Windows Browser Print untuk Cetak Peta
function triggerMapPrint() {
    const judul = document.getElementById('print-title').value || "Peta WebGIS";
    const mapContainer = document.getElementById('map');
    
    if (!mapContainer) {
        alert("Elemen peta tidak ditemukan.");
        return;
    }
    
    const mapHTML = mapContainer.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    printWindow.document.write(`
        <html>
        <head>
            <title>Cetak - ${judul}</title>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; padding: 0; color: #000; background: #fff; }
                .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                #map-print-area { width: 100%; height: 500px; border: 1px solid #000; position: relative; }
                .print-footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; }
                .leaflet-control-zoom, .leaflet-control-draw, .leaflet-control-search, .compass-control { display: none !important; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h2>${judul.toUpperCase()}</h2>
                <p>Dicetak secara otomatis melalui sistem GeoPortal pada: ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <div id="map-print-area">${mapHTML}</div>
            <div class="print-footer">
                <span>Sumber Data: Hasil Analisis Spasial GeoPortal</span>
                <span>Skala Kualitatif: Menyesuaikan Resolusi Layar</span>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); window.close(); }, 800);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Fungsi Ekspor Data Layer Aktif ke format berkas Berbasis GeoJSON (.geojson)
function exportLayerToGeoJSON() {
    const layerId = document.getElementById('export-layer-select').value;
    const currentLayers = window.layersData || {};
    
    if (!layerId || !currentLayers[layerId]) {
        alert("Silakan pilih lapisan layer yang valid terlebih dahulu.");
        return;
    }
    
    const layerData = currentLayers[layerId];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layerData.geojson));
    const downloadAnchor = document.createElement('a');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${layerData.name}_export.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Tambahkan ke fungsi manajemen pembaruan dropdown global
window.updateExportDropdown = function() {
    const select = document.getElementById('export-layer-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Layer --</option>';
    const currentLayers = window.layersData || {};
    for (let id in currentLayers) {
        select.innerHTML += `<option value="${id}">${currentLayers[id].name}</option>`;
    }
};

// Mengintersepsi fungsi pembaruan dropdown bawaan aplikasi webgis agar dropdown ekspor ikut terupdate
const originalUpdateDropdowns = window.updateAnalysisDropdowns;
window.updateAnalysisDropdowns = function() {
    if (typeof originalUpdateDropdowns === 'function') originalUpdateDropdowns();
    if (typeof window.updateExportDropdown === 'function') window.updateExportDropdown();
};