/**
 * GeoPortal Google Street View Integration Module
 * Menyediakan fitur interaktif pencarian foto jalanan 360° Google Street View
 */

let streetViewActive = false;
let streetViewMarker = null;

function initStreetView(mapInstance) {
    if (!mapInstance) {
        console.error("Map instance tidak ditemukan untuk menginisialisasi Street View.");
        return;
    }

    // 1. Tambahkan Kontainer Box untuk jendela Google Street View di dalam Halaman Web
    // Kontainer ini tersembunyi secara default dan akan muncul di pojok kanan bawah peta saat jalan diklik
    if (!document.getElementById('streetview-panel')) {
        const svPanel = document.createElement('div');
        svPanel.id = 'streetview-panel';
        svPanel.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 380px;
            height: 260px;
            background: #1e1e1e;
            border: 2px solid #eab308;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            z-index: 1000;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;
        
        svPanel.innerHTML = `
            <div style="background: #eab308; color: #000; padding: 6px 12px; font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-street-view"></i> Google Street View</span>
                <i class="fa-solid fa-xmark" onclick="closeStreetViewPanel()" style="cursor: pointer; font-size: 14px;"></i>
            </div>
            <div id="streetview-iframe-container" style="flex: 1; background: #000;">
                </div>
        `;
        
        // Masukkan panel ke dalam pembungkus peta utama
        document.getElementById('map').appendChild(svPanel);
    }

    // 2. Bangun Antarmuka Kontrol (UI Toggle) di Sidebar
    const thematicGroupContainer = document.getElementById('group-thematic-list');
    if (thematicGroupContainer) {
        const layerManager = thematicGroupContainer.closest('.layer-group-container').parentNode;
        
        if (!document.getElementById('layer-group-streetview')) {
            const svContainer = document.createElement('div');
            svContainer.className = 'layer-group-container';
            svContainer.id = 'layer-group-streetview';
            svContainer.style.borderLeft = "3px solid #eab308"; // Menggunakan warna kuning khas Google Pegman
            
            svContainer.innerHTML = `
                <div class="layer-group-title" style="color: #eab308;">
                    <i class="fa-solid fa-road"></i> Observasi Google Street View
                </div>
                <div class="layer-item" style="padding: 10px; margin-bottom: 0;">
                    <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 10px 0; line-height: 1.4;">
                        Aktifkan tombol di bawah, lalu klik pada jalan atau lokasi mana saja di peta untuk melihat panorama pandangan jalan 360°.
                    </p>
                    <button id="btn-streetview-toggle" onclick="toggleStreetViewMode()" class="btn" style="width: 100%; justify-content: center; background: #eab308; color: #000; font-weight: bold; gap: 8px;">
                        <i class="fa-solid fa-street-view"></i> Aktifkan Fitur Street View
                    </button>
                </div>
            `;
            
            // Sisipkan secara rapi di bawah menu InaRISK
            const inariskGroup = document.getElementById('layer-group-inarisk');
            if (inariskGroup) {
                layerManager.insertBefore(svContainer, inariskGroup.nextSibling);
            } else {
                layerManager.insertBefore(svContainer, layerManager.firstChild);
            }
        }
    }

    // 3. Daftarkan Event Klik khusus pada peta untuk menangkap koordinat Street View
    mapInstance.on('click', function(e) {
        if (!streetViewActive) return;

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Berikan penanda marker sementara di lokasi yang diklik
        if (streetViewMarker) {
            mapInstance.removeLayer(streetViewMarker);
        }
        
        // Membuat marker dengan warna orange/kuning
        streetViewMarker = L.circleMarker(e.latlng, {
            radius: 8,
            color: '#eab308',
            fillColor: '#fff',
            fillOpacity: 1,
            weight: 3
        }).addTo(mapInstance);

        // Membuka Jendela Google Street View menggunakan Embed API resmi (Gratis & Tanpa API Key)
        const iframeContainer = document.getElementById('streetview-iframe-container');
        iframeContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                style="border:0" 
                src="https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=embed" 
                allowfullscreen>
            </iframe>
        `;

        // Tampilkan panel jendela di layar
        document.getElementById('streetview-panel').style.display = 'flex';
    });
}

/**
 * Mengubah status tombol mode Street View (Aktif / Nonaktif)
 */
function toggleStreetViewMode() {
    const btn = document.getElementById('btn-streetview-toggle');
    
    // Jika fitur pengukur jarak sedang aktif, matikan terlebih dahulu demi kenyamanan
    if (typeof distanceModeActive !== 'undefined' && distanceModeActive) {
        distanceModeActive = false;
        document.getElementById('btn-distance').innerHTML = "<i class='fa-solid fa-crosshairs'></i> Aktifkan Pengukur Jarak";
        document.getElementById('btn-distance').style.background = "#0ea5e9";
    }

    streetViewActive = !streetViewActive;

    if (streetViewActive) {
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Mode Aktif! Klik Jalan Di Peta...";
        btn.style.background = "#ef4444";
        btn.style.color = "#fff";
        if (map) map.getContainer().style.cursor = 'crosshair';
    } else {
        resetStreetViewStatus();
    }
}

/**
 * Menutup panel jendela tampilan jalan dan membersihkan komponen penanda
 */
function closeStreetViewPanel() {
    document.getElementById('streetview-panel').style.display = 'none';
    document.getElementById('streetview-iframe-container').innerHTML = '';
    resetStreetViewStatus();
}

/**
 * Mengembalikan elemen UI ke status awal
 */
function resetStreetViewStatus() {
    streetViewActive = false;
    const btn = document.getElementById('btn-streetview-toggle');
    if (btn) {
        btn.innerHTML = "<i class='fa-solid fa-street-view'></i> Aktifkan Fitur Street View";
        btn.style.background = "#eab308";
        btn.style.color = "#000";
    }
    if (map) {
        map.getContainer().style.cursor = '';
        if (streetViewMarker && map.hasLayer(streetViewMarker)) {
            map.removeLayer(streetViewMarker);
            streetViewMarker = null;
        }
    }
}