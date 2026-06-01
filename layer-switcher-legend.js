/**
 * GeoPortal WebGIS - Layer Switcher & Dynamic Legend Module
 * Mengelola visibilitas, opasitas, dan legenda interaktif secara otomatis.
 */

// Inisialisasi utama yang dipanggil setelah peta dimuat
function initLayerSwitcherLegend(mapInstance) {
    if (!mapInstance) {
        console.error("Map instance tidak ditemukan untuk menginisialisasi Layer Switcher & Legend.");
        return;
    }
    
    // Melakukan render awal jika sudah ada data bawaan
    updateLayerSwitcherAndLegend();
}

/**
 * Fungsi Utama untuk Memperbarui UI Pemilih Lapisan dan Legenda Spasial
 * Menggantikan fungsi renderLayerManagerUI bawaan agar terintegrasi dengan Legenda
 */
function updateLayerSwitcherAndLegend() {
    // Ambil referensi kontainer dari DOM webgis.html
    const containers = {
        base: document.getElementById('custom-basemap-list'),
        thematic: document.getElementById('group-thematic-list'),
        analysis: document.getElementById('group-analysis-list')
    };
    
    // Reset isi kontainer lama
    for (let key in containers) {
        if (containers[key]) containers[key].innerHTML = '';
    }
    
    // Ambil basis data layer dari objek global `layersData`
    const currentLayers = window.layersData || {};
    lethasData = { base: false, thematic: false, analysis: false };

    for (let id in currentLayers) {
        let layerObj = currentLayers[id];
        let targetContainer = containers[layerObj.type];
        
        if (!targetContainer) continue;
        hasData[layerObj.type] = true;

        // Ambil tipe simbol geometri untuk legenda pintas
        let legendIcon = generateDynamicLegendIcon(layerObj);

        // Buat elemen item layer baru
        let layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.style.cssText = "background: #242424; margin-bottom: 8px; padding: 10px; border-radius: 6px; border: 1px solid #333;";
        
        layerItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 75%;">
                    ${legendIcon}
                    <span style="font-size: 12px; font-weight: 600; color: #fff;">${layerObj.name}</span>
                </div>
                <input type="checkbox" ${layerObj.visible ? 'checked' : ''} 
                       style="cursor:pointer; width:15px; height:15px; accent-color:#2563eb;"
                       onchange="toggleLayerSwitcherVisibility('${id}', this.checked)">
            </div>
            
            <div style="margin: 6px 0; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; color: #a0aec0; min-width: 60px;">Transparansi:</span>
                <input type="range" min="0" max="1" step="0.1" value="${layerObj.layer.options.fillOpacity || 0.4}" 
                       style="flex: 1; height: 4px; accent-color: #10b981; cursor: pointer;"
                       oninput="changeLayerSwitcherOpacity('${id}', this.value)">
            </div>

            <div class="layer-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 4px; border-top: 1px solid #2d2d2d;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 10px; color: #a0aec0;">Warna:</span>
                    <input type="color" value="${layerObj.color || '#38bdf8'}" 
                           style="border: none; width: 20px; height: 20px; cursor: pointer; background: none; padding: 0;"
                           onchange="changeLayerSwitcherColor('${id}', this.value)">
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="openDatabase('${id}')" class="btn btn-db" style="padding: 3px 6px; font-size: 10px;"><i class="fa-solid fa-database"></i> DB</button>
                    <button onclick="deleteLayerSwitcherItem('${id}')" class="btn btn-del" style="padding: 3px 6px; font-size: 10px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        
        targetContainer.appendChild(layerItem);
    }

    // Berikan teks placeholder jika kelompok dokumen kosong
    for (let key in containers) {
        if (!hasData[key] && containers[key]) {
            let labelText = key === 'base' ? 'Belum ada peta dasar tambahan' : key === 'thematic' ? 'Belum ada data SHP Tematik' : 'Belum ada hasil analisa';
            containers[key].innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 11px; margin: 5px 0;">${labelText}</p>`;
        }
    }
}

/**
 * Menganalisis Tipe Fitur GeoJSON untuk Membuat Simbol Legenda yang Sesuai
 */
function generateDynamicLegendIcon(layerObj) {
    let color = layerObj.color || '#2563eb';
    let geomType = "Polygon"; // Default fallback

    try {
        if (layerObj.geojson && layerObj.geojson.features && layerObj.geojson.features.length > 0) {
            geomType = layerObj.geojson.features[0].geometry.type;
        } else if (layerObj.geojson && layerObj.geojson.type === "Feature") {
            geomType = layerObj.geojson.geometry.type;
        }
    } catch (e) {
        console.log("Gagal membaca tipe geometri, menggunakan fallback Polygon");
    }

    // Pembuatan representasi SVG Legenda berdasarkan tipe data spasial asli
    if (geomType.includes("Point") || geomType.includes("MultiPoint")) {
        return `<svg width="14" height="14" style="vertical-align: middle;"><circle cx="7" cy="7" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
    } else if (geomType.includes("Line") || geomType.includes("MultiLine")) {
        return `<svg width="14" height="14" style="vertical-align: middle;"><line x1="1" y1="7" x2="13" y2="7" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`;
    } else {
        // Polygons atau MultiPolygons
        return `<svg width="14" height="14" style="vertical-align: middle;"><rect x="1" y="1" width="12" height="12" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="1.5" rx="1"/></svg>`;
    }
}

/**
 * INTERSEPSI FUNGSI KONTROL UTAMA
 * Menghubungkan interaksi UI komponen ke core map engine Leaflet
 */
function toggleLayerSwitcherVisibility(id, isChecked) {
    if (!window.layersData || !window.layersData[id]) return;
    window.layersData[id].visible = isChecked;
    
    const mapInstance = window.map;
    if (isChecked) {
        mapInstance.addLayer(window.layersData[id].layer);
    } else {
        mapInstance.removeLayer(window.layersData[id].layer);
    }
}

function changeLayerSwitcherOpacity(id, opacityValue) {
    if (!window.layersData || !window.layersData[id]) return;
    let targetLayer = window.layersData[id].layer;
    let numericOpacity = parseFloat(opacityValue);

    targetLayer.setStyle({
        fillOpacity: numericOpacity,
        opacity: numericOpacity >= 0.2 ? numericOpacity + 0.2 : numericOpacity // Pastikan garis luar tetap terlihat rapi
    });
}

function changeLayerSwitcherColor(id, hexColor) {
    if (!window.layersData || !window.layersData[id]) return;
    window.layersData[id].color = hexColor;
    window.layersData[id].layer.setStyle({ color: hexColor });
    
    // Segera refresh UI untuk memperbarui kotak legenda simbol warna terbaru
    updateLayerSwitcherAndLegend();
}

function deleteLayerSwitcherItem(id) {
    if (!window.layersData || !window.layersData[id]) return;
    
    const mapInstance = window.map;
    mapInstance.removeLayer(window.layersData[id].layer);
    delete window.layersData[id];
    
    // Refresh UI & dropdown analisis
    updateLayerSwitcherAndLegend();
    if (typeof window.updateAnalysisDropdowns === 'function') {
        window.updateAnalysisDropdowns();
    }
}

// override fungsi bawaan webgis.html agar otomatis me-redirect alur kerja ke berkas ini
window.renderLayerManagerUI = updateLayerSwitcherAndLegend;