/**
 * GeoPortal Advanced Spatial Analysis Module
 * Menyediakan fungsi: Buffer, Overlay (Intersect/Union/Erase), Proximity (Nearest), dan Query Atribut.
 */

/**
 * Fungsi sinkronisasi untuk memperbarui semua dropdown pilihan layer di menu analisis
 */
function updateAnalysisDropdowns() {
    // Mengambil data layer dari scope window/global
    const layers = window.layersData || {};
    
    // Daftar ID elemen select yang perlu diperbarui jika tersedia di UI
    const selectors = [
        'buffer-layer-select',
        'overlay-layer1',
        'overlay-layer2',
        'proximity-source',
        'proximity-target',
        'query-layer'
    ];
    
    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        // Simpan nilai terpilih sebelumnya agar tidak ter-reset
        const currentVal = select.value;
        
        select.innerHTML = '<option value="">-- Pilih Layer --</option>';
        for (let key in layers) {
            select.innerHTML += `<option value="${key}">${layers[key].name}</option>`;
        }
        
        // Kembalikan nilai terpilih jika layer tersebut masih ada
        if (layers[currentVal]) {
            select.value = currentVal;
        }
    });
}

/**
 * 1. ANALISIS BUFFER (Penyangga Spasial)
 */
function runBufferAnalysis() {
    const layerId = document.getElementById('buffer-layer-select').value;
    const radius = parseFloat(document.getElementById('buffer-radius').value);
    const unit = document.getElementById('buffer-unit').value;

    if (!layerId || isNaN(radius)) {
        alert("Silakan pilih layer target dan tentukan nilai radius buffer yang valid.");
        return;
    }

    const targetLayer = window.layersData[layerId];
    let bufferedFeatures = [];

    targetLayer.geojson.features.forEach(f => {
        try { 
            // Eksekusi pembuatan buffer per-fitur menggunakan Turf.js
            let b = turf.buffer(f, radius, { units: unit }); 
            if (b) {
                // Warisi properti asli ditambah keterangan hasil analisis
                b.properties = { 
                    ...f.properties, 
                    analysis_type: "Buffer", 
                    buffer_radius: radius, 
                    buffer_unit: unit 
                };
                bufferedFeatures.push(b); 
            }
        } catch (e) {
            console.error("Gagal memproses buffer pada fitur:", e);
        }
    });

    if (bufferedFeatures.length === 0) {
        alert("Analisis selesai: Tidak ada buffer koordinat yang berhasil dibentuk.");
        return;
    }

    let resultGeoJson = { type: "FeatureCollection", features: bufferedFeatures };
    const newId = 'buffer_' + Date.now();
    const newName = `${targetLayer.name} (Buffer ${radius} ${unit === 'kilometers' ? 'Km' : 'Meter'})`;
    
    // Kembalikan hasil ke fungsi render utama yang ada di webgis.html
    window.processAndRenderLayer(resultGeoJson, newId, newName, 'analysis');
}

/**
 * 2. ANALISIS OVERLAY (Tumpang Susun Spasial)
 */
function runOverlayAnalysis() {
    const l1Id = document.getElementById('overlay-layer1').value;
    const l2Id = document.getElementById('overlay-layer2').value;
    const type = document.getElementById('overlay-type').value;

    if (!l1Id || !l2Id) {
        alert("Silakan pilih kedua layer yang akan dioverlay.");
        return;
    }
    if (l1Id === l2Id) {
        alert("Kedua layer target analisis tidak boleh sama.");
        return;
    }

    const layer1 = window.layersData[l1Id];
    const layer2 = window.layersData[l2Id];
    let resultFeatures = [];

    // Proses silang antar fitur polygon dari kedua layer terpilih
    layer1.geojson.features.forEach(f1 => {
        layer2.geojson.features.forEach(f2 => {
            try {
                if (type === 'intersect') {
                    let intersection = turf.intersect(turf.featureCollection([f1, f2]));
                    if (intersection) {
                        intersection.properties = { ...f1.properties, ...f2.properties, overlay_result: "Intersect" };
                        resultFeatures.push(intersection);
                    }
                } else if (type === 'union') {
                    let union = turf.union(turf.featureCollection([f1, f2]));
                    if (union) {
                        union.properties = { ...f1.properties, ...f2.properties, overlay_result: "Union" };
                        resultFeatures.push(union);
                    }
                } else if (type === 'difference') {
                    let diff = turf.difference(turf.featureCollection([f1, f2]));
                    if (diff) {
                        diff.properties = { ...f1.properties, overlay_result: "Erase" };
                        resultFeatures.push(diff);
                    }
                }
            } catch (e) {
                console.error("Gagal memproses fitur overlay:", e);
            }
        });
    });

    if (resultFeatures.length === 0) {
        alert("Analisis selesai: Overlay tidak menghasilkan irisan atau objek spasial baru.");
        return;
    }

    let resultGeoJson = { type: "FeatureCollection", features: resultFeatures };
    const newId = 'overlay_' + Date.now();
    const newName = `Hasil ${type.toUpperCase()} (${layer1.name} & ${layer2.name})`;
    
    window.processAndRenderLayer(resultGeoJson, newId, newName, 'analysis');
}

/**
 * 3. ANALISIS PROXIMITY (Objek Terdekat / Nearest Neighbor)
 */
function runProximityAnalysis() {
    const sourceId = document.getElementById('proximity-source').value;
    const targetId = document.getElementById('proximity-target').value;

    if (!sourceId || !targetId) {
        alert("Silakan tentukan Layer Asal dan Layer Target Objek.");
        return;
    }

    const sourceLayer = window.layersData[sourceId];
    const targetLayer = window.layersData[targetId];

    // Ekstrak centroid/titik tengah objek pembanding target
    let targetPoints = [];
    targetLayer.geojson.features.forEach(f => {
        let centerPoint = turf.centroid(f);
        centerPoint.properties = f.properties;
        targetPoints.push(centerPoint);
    });

    if (targetPoints.length === 0) {
        alert("Layer target tidak memiliki data titik/koordinat spasial valid.");
        return;
    }

    let targetCollection = turf.featureCollection(targetPoints);
    let nearestFeatures = [];

    // Cari titik terdekat untuk setiap entitas di Layer Asal
    sourceLayer.geojson.features.forEach(f => {
        try {
            let sourceCenter = turf.centroid(f);
            let nearest = turf.nearestPoint(sourceCenter, targetCollection);
            
            if (nearest) {
                let distance = turf.distance(sourceCenter, nearest, { units: 'kilometers' });
                
                // Representasikan hasil berupa garis hubung linier terdekat
                let line = turf.lineString([sourceCenter.geometry.coordinates, nearest.geometry.coordinates], {
                    asal: f.properties.Nama || f.properties.Nama_Objek || "Objek Asal",
                    target_terdekat: nearest.properties.Nama || nearest.properties.Nama_Objek || "Objek Target",
                    jarak_km: distance.toFixed(3)
                });
                nearestFeatures.push(line);
            }
        } catch (e) {
            console.error(e);
        }
    });

    if (nearestFeatures.length === 0) {
        alert("Gagal memproses kedekatan linier antar objek.");
        return;
    }

    let resultGeoJson = { type: "FeatureCollection", features: nearestFeatures };
    const newId = 'proximity_' + Date.now();
    const newName = `Kedekatan Linier (${sourceLayer.name} -> ${targetLayer.name})`;
    
    window.processAndRenderLayer(resultGeoJson, newId, newName, 'analysis');
}

/**
 * 4. KALKULATOR ATRIBUT QUERY (Filter Atribut Tabel)
 */
function runAttributeQuery() {
    const layerId = document.getElementById('query-layer').value;
    const fieldName = document.getElementById('query-field').value.trim();
    const operator = document.getElementById('query-operator').value;
    const value = document.getElementById('query-value').value.trim();

    if (!layerId || !fieldName || !value) {
        alert("Lengkapi parameter query field, kriteria operator, dan nilai filter data.");
        return;
    }

    const targetLayer = window.layersData[layerId];
    let matchedFeatures = [];

    targetLayer.geojson.features.forEach(f => {
        if (!f.properties || !(fieldName in f.properties)) return;

        let attributeValue = f.properties[fieldName];
        let targetValue = isNaN(value) ? value : parseFloat(value);
        let currentAttrValue = isNaN(attributeValue) ? attributeValue : parseFloat(attributeValue);
        
        let isMatch = false;

        switch(operator) {
            case 'eq': isMatch = (currentAttrValue == targetValue); break;
            case 'gt': isMatch = (currentAttrValue > targetValue); break;
            case 'lt': isMatch = (currentAttrValue < targetValue); break;
            case 'like': 
                isMatch = String(currentAttrValue).toLowerCase().includes(String(targetValue).toLowerCase()); 
                break;
        }

        if (isMatch) {
            matchedFeatures.push(f);
        }
    });

    if (matchedFeatures.length === 0) {
        alert("Pencarian selesai: Tidak ada baris atribut yang cocok dengan kriteria filter.");
        return;
    }

    let resultGeoJson = { type: "FeatureCollection", features: matchedFeatures };
    const newId = 'query_' + Date.now();
    const newName = `Query Filter (${fieldName} ${operator} ${value})`;
    
    window.processAndRenderLayer(resultGeoJson, newId, newName, 'analysis');
}