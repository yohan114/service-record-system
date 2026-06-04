// ============================================================
//  Fleet & Filter search
// ============================================================
let searchTimeout = null;
const FLEET_LIMIT = 60;

function initFleetView() {
    populateFilterDropdowns();
    const input = document.getElementById('searchInput');
    input.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(performSearch, 180); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; performSearch(); } });
}
function applyFilters() { performSearch(); }

function performSearch() {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    const query = document.getElementById('searchInput').value.trim().toUpperCase();
    const brand = document.getElementById('brandFilter').value;
    const vType = document.getElementById('typeFilter').value;

    let matched = globalData.vehicles.filter(v => {
        if (brand && (v.Brand || '').toUpperCase() !== brand) return false;
        if (vType && (v.VehicleType || '').toUpperCase() !== vType) return false;
        if (query) {
            return (v.ECNumber || '').toUpperCase().includes(query) ||
                   (v.RegistrationNo || '').toUpperCase().includes(query) ||
                   (v.Brand || '').toUpperCase().includes(query) ||
                   (v.ModelNo || '').toUpperCase().includes(query) ||
                   (v.VehicleType || '').toUpperCase().includes(query);
        }
        return true;
    });

    const countEl = document.getElementById('resultCount');
    if (!matched.length) {
        grid.innerHTML = '<div class="empty-note">No vehicles found.</div>';
        countEl.textContent = '';
        return;
    }
    const shown = matched.slice(0, FLEET_LIMIT);
    countEl.innerHTML = `Showing <strong>${shown.length}</strong> of ${matched.length}`;
    grid.innerHTML = shown.map(v => `
        <div class="card vehicle-card">
            <div class="card-header">
                <div>
                    <div class="vc-title">${esc(v.ECNumber || 'Unknown')} <span class="muted">${esc(v.VehicleType || '')}</span></div>
                    <div class="vc-sub">${esc(v.Brand || '')} ${esc(v.ModelNo || '')} · ${esc(v.RegistrationNo || '')}</div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-field-label">Capacity</div><div class="card-field-value">${esc(v.Capacity || '-')}</div>
                <div class="card-field-label">Site</div><div class="card-field-value">${esc(v.Site || '-')}</div>
            </div>
            <div class="vc-actions">
                <button class="btn btn-primary btn-block" onclick="openServiceHistory('${v.VehicleID}')">View Service History</button>
                <button class="btn btn-secondary btn-block" onclick="openNewServiceSheet('${v.VehicleID}')">+ New Service</button>
            </div>
        </div>`).join('');
}

function populateFilterDropdowns() {
    const brandSelect = document.getElementById('brandFilter');
    const typeSelect = document.getElementById('typeFilter');
    if (brandSelect.options.length > 1) return; // already populated
    Array.from(globalData.brands).sort().forEach(b => brandSelect.appendChild(new Option(b, b)));
    Array.from(globalData.types).sort().forEach(t => typeSelect.appendChild(new Option(t, t)));
}
