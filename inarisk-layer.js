let inariskLayers = {};

function initInariskLayers(mapInstance) {
    if (!mapInstance) return;

    if (!mapInstance.getPane('inariskPane')) {
        let riskPane = mapInstance.createPane('inariskPane');
        riskPane.style.zIndex = 300;
        riskPane.style.pointerEvents = 'none'; 
    }

    const inariskWmsUrl = "https://service1.inarisk.bnpb.go.id/arcgis/services/inarisk/ahp_ancaman/MapServer/WMSServer";

    const paths = { bencana_banjir: '0', bencana_gempa: '1', bencana_longsor: '2', bencana_tsunami: '3', bencana_kekeringan: '4' };

    for (let key in paths) {
        inariskLayers[key] = L.tileLayer.wms(inariskWmsUrl, {
            layers: paths[key], format: 'image/png', transparent: true,
            version: '1.3.0', opacity: 0.65, pane: 'inariskPane', attribution: '&copy; InaRISK BNPB'
        });
    }

    const thematicGroupContainer = document.getElementById('group-thematic-list');
    if (thematicGroupContainer) {
        const layerManager = thematicGroupContainer.closest('.layer-group-container').parentNode;
        
        if (!document.getElementById('layer-group-inarisk')) {
            const riskContainer = document.createElement('div');
            riskContainer.className = 'layer-group-container';
            riskContainer.id = 'layer-group-inarisk';
            riskContainer.style.borderLeft = "3px solid #ef4444"; 
            
            riskContainer.innerHTML = `
                <div class="layer-group-title" style="color: #ef4444;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Peta Rawan Bencana (InaRISK)
                </div>
                <div class="layer-item" style="padding: 10px; margin-bottom: 0;">
                    <div class="form-row" style="margin-bottom: 10px;">
                        <select id="inarisk-layer-select" onchange="switchInariskLayer(this.value)" style="border-color: #ef4444;">
                            <option value="none">-- Sembunyikan Peta Bencana --</option>
                            <option value="bencana_banjir">Kawasan Rawan Banjir</option>
                            <option value="bencana_gempa">Kawasan Rawan Gempa Bumi</option>
                            <option value="bencana_longsor">Kawasan Rawan Tanah Longsor</option>
                            <option value="bencana_tsunami">Kawasan Rawan Tsunami</option>
                            <option value="bencana_kekeringan">Kawasan Rawan Kekeringan</option>
                        </select>
                    </div>
                    <div id="inarisk-opacity-box" style="display: none;">
                        <label style="font-size: 10px; color: var(--text-muted); display: block; margin-bottom: 2px;">Transparansi Overlay Bencana:</label>
                        <input type="range" id="inarisk-opacity-range" min="0.1" max="1" step="0.1" value="0.65" style="width: 100%; accent-color: #ef4444;" oninput="changeInariskOpacity(this.value)">
                    </div>
                </div>
            `;
            
            const galleryGroup = document.getElementById('layer-group-collection');
            if (galleryGroup) {
                layerManager.insertBefore(riskContainer, galleryGroup.nextSibling);
            } else {
                layerManager.insertBefore(riskContainer, layerManager.firstChild);
            }
        }
    }
}

function switchInariskLayer(selectedKey) {
    const currentMap = map || window.map;
    if (!currentMap) return;

    for (let key in inariskLayers) {
        if (currentMap.hasLayer(inariskLayers[key])) {
            currentMap.removeLayer(inariskLayers[key]);
        }
    }

    const opacityBox = document.getElementById('inarisk-opacity-box');
    const opacityRange = document.getElementById('inarisk-opacity-range');

    if (selectedKey !== 'none' && inariskLayers[selectedKey]) {
        opacityRange.value = 0.65;
        inariskLayers[selectedKey].setOpacity(0.65);
        inariskLayers[selectedKey].addTo(currentMap);
        if (opacityBox) opacityBox.style.display = 'block';
    } else {
        if (opacityBox) opacityBox.style.display = 'none';
    }
}

function changeInariskOpacity(value) {
    const activeKey = document.getElementById('inarisk-layer-select').value;
    if (activeKey !== 'none' && inariskLayers[activeKey]) {
        inariskLayers[activeKey].setOpacity(parseFloat(value));
    }
}