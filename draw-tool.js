let drawnItems;
let drawControl;

function initDrawTools(mapInstance, appsScriptUrl) {
    if (!mapInstance) return;

    drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, remove: true },
        draw: {
            polyline: { shapeOptions: { color: '#f59e0b', weight: 4 } },
            polygon: { shapeOptions: { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.4 } },
            circlemarker: { radius: 6, className: 'custom-draw-point', color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8 },
            circle: false, rectangle: false, marker: false
        }
    });

    mapInstance.addControl(drawControl);

    mapInstance.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        let keterangan = prompt("Masukkan nama atau deskripsi objek data baru ini:", "Objek Hasil Digitasi");
        if (keterangan === null) return;

        layer.feature = layer.feature || {};
        layer.feature.type = "Feature";
        layer.feature.properties = layer.feature.properties || {};
        layer.feature.properties["Nama_Objek"] = keterangan;
        layer.feature.properties["Waktu_Dibuat"] = new Date().toLocaleString();

        drawnItems.addLayer(layer);

        let popupContent = `
            <div style="font-weight:bold; border-bottom:1px solid #444; padding-bottom:4px; margin-bottom:6px; color:#fff;">Digitasi Baru</div>
            <table style="width:100%; font-size:11px; color:#fff;">
                <tr><td style="color:#a0aec0;">Nama:</td><td>${keterangan}</td></tr>
                <tr><td style="color:#a0aec0;">Tipe Spasial:</td><td>${e.layerType}</td></tr>
            </table>
        `;
        layer.bindPopup(popupContent).openPopup();
        backupDigitizedDataToDrive(layer.toGeoJSON(), e.layerType, keterangan, appsScriptUrl);
    });
}

function backupDigitizedDataToDrive(geoJsonData, layerType, description, urlEndpoint) {
    if (!urlEndpoint || urlEndpoint.includes("AKfycbz...")) return;
    
    const fileName = `Digitasi_${layerType.toUpperCase()}_${description.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.geojson`;
    const stringData = JSON.stringify(geoJsonData, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(stringData)));

    const payload = {
        action: "uploadShp",
        fileName: fileName,
        contentType: "application/json",
        base64Data: base64Content
    };

    fetch(urlEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Backup gagal:", err));
}