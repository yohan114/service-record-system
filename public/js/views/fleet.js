// Fleet & Filter Search View Logic

let currentMode = 'vehicle';
let searchTimeout = null;

function initFleetView() {
    populateFilterDropdowns();
    document.getElementById('searchInput').addEventListener('input', debounceSearch);
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('searchInput').value = '';
            performSearch();
        }
    });
    showEmptyState();
}

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const input = document.getElementById('searchInput');
    const filterBar = document.getElementById('filterBar');

    switch(mode) {
        case 'vehicle':
            input.placeholder = 'Enter E&C number (e.g. LB-01) or registration...';
            filterBar.style.display = 'flex';
            break;
        case 'filter':
            input.placeholder = 'Enter OEM part number or HIFI code...';
            filterBar.style.display = 'flex';
            break;
        case 'category':
            input.placeholder = 'Search within category...';
            filterBar.style.display = 'flex';
            break;
        case 'price':
            input.placeholder = 'Search for pricing... (Coming Soon)';
            filterBar.style.display = 'none';
            break;
    }
    performSearch();
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 200);
}

function applyFilters() {
    performSearch();
}

function showEmptyState() {
    const grid = document.getElementById('resultsGrid');
    document.getElementById('resultCount').innerHTML = '';
    grid.innerHTML = `<div class="empty-state" style="text-align:center; padding: 40px; color: #64748b;">
        <div style="font-size: 40px; margin-bottom:10px;">🔍</div>
        <div style="font-size: 18px; font-weight: bold;">Start your search</div>
        <div>Select a tab and start typing to find fleet data.</div>
    </div>`;
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toUpperCase();
    const cat = document.getElementById('categoryFilter').value;
    const brand = document.getElementById('brandFilter').value;
    const vType = document.getElementById('typeFilter').value;

    if (!query && !cat && !brand && !vType) {
        showEmptyState();
        return;
    }

    let results = [];

    if (currentMode === 'vehicle') {
        let matchedVehicles = globalData.vehicles.filter(v => {
            let match = true;
            if (query) {
                match = (v.ECNumber && v.ECNumber.toUpperCase().includes(query)) ||
                        (v.RegistrationNo && v.RegistrationNo.toUpperCase().includes(query)) ||
                        (v.Brand && v.Brand.toUpperCase().includes(query)) ||
                        (v.ModelNo && v.ModelNo.toUpperCase().includes(query));
            }
            if (brand && v.Brand !== brand) match = false;
            if (vType && v.VehicleType !== vType) match = false;
            return match;
        });
        results = matchedVehicles.map(v => ({ type: 'vehicle-detail', vehicle: v }));
    } else {
        // Simple fallback for other modes for now
        results = [];
    }

    renderResults(results);
}

function renderResults(results) {
    const grid = document.getElementById('resultsGrid');
    const countEl = document.getElementById('resultCount');

    if (!results || results.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding: 40px; color: #64748b;">No results found.</div>`;
        countEl.innerHTML = '';
        return;
    }

    let html = '';
    results.forEach((r) => {
        if (r.type === 'vehicle-detail') {
            const v = r.vehicle;
            html += `
            <div class="card vehicle-card">
                <div class="card-header">
                    <div>
                        <div style="font-size:16px; font-weight:bold; color:var(--text-primary)">${v.ECNumber || 'Unknown'} — ${v.VehicleType || ''}</div>
                        <div style="font-size:12px; color:var(--text-muted)">${v.Brand || ''} ${v.ModelNo || ''} • ${v.RegistrationNo || ''}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-field-label">Capacity</div><div class="card-field-value">${v.Capacity || '-'}</div>
                    <div class="card-field-label">Site</div><div class="card-field-value">${v.Site || '-'}</div>
                </div>
                <div style="margin-top: 16px;">
                    <button class="btn btn-primary" style="width:100%" onclick="openServiceHistory('${v.VehicleID}', '${v.ECNumber}', '${v.Brand}', '${v.ModelNo}', '${v.RegistrationNo}')">View Service History</button>
                </div>
            </div>`;
        }
    });

    grid.innerHTML = html;
    countEl.innerHTML = `Showing <strong>${results.length}</strong> results`;
}

function populateFilterDropdowns() {
    const catSelect = document.getElementById('categoryFilter');
    const brandSelect = document.getElementById('brandFilter');
    const typeSelect = document.getElementById('typeFilter');

    Array.from(globalData.categories).sort().forEach(c => {
        catSelect.appendChild(new Option(c, c));
    });
    Array.from(globalData.brands).sort().forEach(b => {
        brandSelect.appendChild(new Option(b, b));
    });
    Array.from(globalData.types).sort().forEach(t => {
        typeSelect.appendChild(new Option(t, t));
    });
}
