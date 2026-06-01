let webGisLayers = {};

function initSatelliteLayer(mapInstance) {
    if (!mapInstance) return;

    if (!mapInstance.getPane('collectionPane')) {
        let collPane = mapInstance.createPane('collectionPane');
        collPane.style.zIndex = 250;
        collPane.style.pointerEvents = 'none';
    }

    webGisLayers['esri_satellite'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri', maxZoom: 19, pane: 'collectionPane'
    });

    webGisLayers['google_hybrid'] = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: 'Google', maxZoom: 20, pane: 'collectionPane'
    });

    webGisLayers['opentopo'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenTopoMap', maxZoom: 17, pane: 'collectionPane'
    });

    webGisLayers['usgs_topo'] = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'USGS', maxZoom: 16, pane: 'collectionPane'
    });

    const thematicGroupContainer = document.getElementById('group-thematic-list');
    if (thematicGroupContainer) {
        const layerManager = thematicGroupContainer.closest('.layer-group-container').parentNode;
        if (!document.getElementById('layer-group-collection')) {
            const collectionContainer = document.createElement('div');
            collectionContainer.className = 'layer-group-container';
            collectionContainer.id = 'layer-group-collection';
            collectionContainer.style.borderLeft = "3px solid #eab308";
            
            collectionContainer.innerHTML = `
                <div class="layer-group-title" style="color: #eab308;">
                    <i class="fa-solid fa-layer-group"></i> Galeri Citra & Topografi
                </div>
                <div class="layer-item" style="padding: 10px; margin-bottom: 0;">
                    <div class="form-row" style="margin-bottom: 10px;">
                        <label style="color: var(--text-muted); font-size: 11px;">Pilih Lapisan Peta:</label>
                        <select id="basemap-collection-select" onchange="switchCollectionLayer(this.value)" style="border-color: #eab308;">
                            <option value="none">-- Sembunyikan Lapisan Tambahan --</option>
                            <option value="esri_satellite">Esri World Imagery</option>
                            <option value="google_hybrid">Google Hybrid</option>
                            <option value="opentopo">OpenTopoMap</option>
                            <option value="usgs_topo">USGS Topo Map</option>
                        </select>
                    </div>
                    <div id="collection-opacity-box" style="display: none;">
                        <label style="font-size: 10px; color: var(--text-muted); display: block; margin-bottom: 2px;">Transparansi Lapisan:</label>
                        <input type="range" id="collection-opacity-range" min="0" max="1" step="0.1" value="1" style="width: 100%; accent-color: #eab308;" oninput="changeCollectionOpacity(this.value)">
                    </div>
                </div>
            `;
            layerManager.insertBefore(collectionContainer, layerManager.firstChild);
        }
    }
}

function switchCollectionLayer(layerKey) {
    const currentMap = map || window.map;
    if (!currentMap) return;

    for (let key in webGisLayers) {
        if (currentMap.hasLayer(webGisLayers[key])) {
            currentMap.removeLayer(webGisLayers[key]);
        }
    }

    const opacityBox = document.getElementById('collection-opacity-box');
    const opacityRange = document.getElementById('collection-opacity-range');

    if (layerKey !== 'none' && webGisLayers[layerKey]) {
        opacityRange.value = 1;
        webGisLayers[layerKey].setOpacity(1);
        webGisLayers[layerKey].addTo(currentMap);
        if (opacityBox) opacityBox.style.display = 'block';
    } else {
        if (opacityBox) opacityBox.style.display = 'none';
    }
}

function changeCollectionOpacity(value) {
    const activeKey = document.getElementById('basemap-collection-select').value;
    if (activeKey !== 'none' && webGisLayers[activeKey]) {
        webGisLayers[activeKey].setOpacity(parseFloat(value));
    }
}