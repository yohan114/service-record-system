// Price Lists Editor View Logic

let currentPriceTab = 'oils';

function initPriceLists() {
    document.getElementById('pl-search').value = '';
    switchPriceTab('oils');
}

function switchPriceTab(tab) {
    currentPriceTab = tab;
    
    // Toggle active classes on tab buttons
    document.getElementById('btn-tab-oils').classList.toggle('active', tab === 'oils');
    document.getElementById('btn-tab-filters').classList.toggle('active', tab === 'filters');
    
    // Toggle containers
    document.getElementById('pl-oils-container').style.display = tab === 'oils' ? 'block' : 'none';
    document.getElementById('pl-filters-container').style.display = tab === 'filters' ? 'block' : 'none';
    
    // Add button visibility
    document.getElementById('btn-add-oil-item').style.display = tab === 'oils' ? 'block' : 'none';
    document.getElementById('btn-add-price-item').style.display = tab === 'filters' ? 'block' : 'none';

    filterPriceList();
}

function renderOilsPriceList() {
    const tbody = document.getElementById('pl-oils-tbody');
    const searchVal = document.getElementById('pl-search').value.trim().toUpperCase();
    if (!tbody) return;

    let items = globalData.oilsList || [];
    if (searchVal) {
        items = items.filter(o => 
            (o.OilName && o.OilName.toUpperCase().includes(searchVal)) ||
            (o.OilType && o.OilType.toUpperCase().includes(searchVal))
        );
    }

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No oils match your search.</td></tr>';
        return;
    }

    let html = '';
    items.forEach(o => {
        html += `
            <tr>
                <td style="font-weight:600; color:var(--text-primary); padding:10px 8px;">${o.OilName || '-'}</td>
                <td style="padding:10px 8px;">${o.OilType || '-'}</td>
                <td style="padding:10px 8px;">${formatCurrency(o.Price)}</td>
                <td style="text-align:center; padding:10px 8px;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button class="btn btn-secondary" onclick='openEditOilPriceItem(${JSON.stringify(o).replace(/'/g, "&apos;")})' style="padding:4px 8px; font-size:12px;">Edit</button>
                        <button class="btn btn-secondary" onclick="deleteOilPriceItem(${o.OilID})" style="padding:4px 8px; font-size:12px; border-color:var(--accent-rose); color:var(--accent-rose);">Delete</button>
                    </div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function renderFiltersPriceList() {
    const tbody = document.getElementById('pl-filters-tbody');
    const searchVal = document.getElementById('pl-search').value.trim().toUpperCase();
    if (!tbody) return;

    let items = globalData.filtersList || [];
    if (searchVal) {
        items = items.filter(f => 
            (f.FilterCategory && f.FilterCategory.toUpperCase().includes(searchVal)) ||
            (f.FilterNo && f.FilterNo.toUpperCase().includes(searchVal))
        );
    }

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No filter prices match your search.</td></tr>';
        return;
    }

    let html = '';
    items.forEach(f => {
        html += `
            <tr>
                <td style="padding:10px 8px;">${f.FilterCategory || '-'}</td>
                <td style="font-weight:600; color:var(--text-primary); padding:10px 8px;">${f.FilterNo || '-'}</td>
                <td style="padding:10px 8px;">${formatCurrency(f.Price)}</td>
                <td style="text-align:center; padding:10px 8px;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button class="btn btn-secondary" onclick='openEditPriceItem(${JSON.stringify(f).replace(/'/g, "&apos;")})' style="padding:4px 8px; font-size:12px;">Edit</button>
                        <button class="btn btn-secondary" onclick="deleteFilterPriceItem(${f.FilterID})" style="padding:4px 8px; font-size:12px; border-color:var(--accent-rose); color:var(--accent-rose);">Delete</button>
                    </div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function filterPriceList() {
    if (currentPriceTab === 'oils') {
        renderOilsPriceList();
    } else {
        renderFiltersPriceList();
    }
}

// Oils CRUD Modals & Actions
function openAddOilItemModal() {
    document.getElementById('oilItemForm').reset();
    document.getElementById('oil-modal-title').textContent = 'Add Oil Price';
    document.getElementById('oi-id').value = '';
    openModal('oilItemModal');
}

function openEditOilPriceItem(item) {
    document.getElementById('oil-modal-title').textContent = 'Edit Oil Price';
    document.getElementById('oi-id').value = item.OilID;
    document.getElementById('oi-name').value = item.OilName || '';
    document.getElementById('oi-type').value = item.OilType || '';
    document.getElementById('oi-price').value = item.Price || '';
    openModal('oilItemModal');
}

async function saveOilPriceItem(e) {
    e.preventDefault();
    
    const payload = {
        OilID: document.getElementById('oi-id').value ? parseInt(document.getElementById('oi-id').value) : null,
        OilName: document.getElementById('oi-name').value.trim(),
        OilType: document.getElementById('oi-type').value.trim(),
        Price: parseFloat(document.getElementById('oi-price').value) || 0.0
    };

    try {
        const res = await fetch('/api/oils', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Oil Price item saved successfully!');
            closeModal('oilItemModal');
            
            // Re-fetch catalog to update cache
            const catRes = await fetch('/api/catalog');
            const catData = await catRes.json();
            globalData.oilsList = catData.oilsList;
            
            renderOilsPriceList();
        } else {
            alert('Failed to save: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error saving oil price item.');
    }
}

async function deleteOilPriceItem(id) {
    if (!confirm('Are you sure you want to delete this oil price?')) return;
    
    try {
        const res = await fetch(`/api/oils/${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Oil Price item deleted!');
            
            // Re-fetch catalog to update cache
            const catRes = await fetch('/api/catalog');
            const catData = await catRes.json();
            globalData.oilsList = catData.oilsList;
            
            renderOilsPriceList();
        } else {
            alert('Failed to delete: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error deleting oil price item.');
    }
}

// Filters CRUD Modals & Actions
function openAddPriceItemModal() {
    document.getElementById('priceItemForm').reset();
    document.getElementById('price-modal-title').textContent = 'Add Filter Price';
    document.getElementById('pi-id').value = '';
    openModal('priceItemModal');
}

function openEditPriceItem(item) {
    document.getElementById('price-modal-title').textContent = 'Edit Filter Price';
    document.getElementById('pi-id').value = item.FilterID;
    document.getElementById('pi-category').value = item.FilterCategory || '';
    document.getElementById('pi-no').value = item.FilterNo || '';
    document.getElementById('pi-price').value = item.Price || '';
    openModal('priceItemModal');
}

async function saveFilterPriceItem(e) {
    e.preventDefault();
    
    const payload = {
        FilterID: document.getElementById('pi-id').value ? parseInt(document.getElementById('pi-id').value) : null,
        FilterCategory: document.getElementById('pi-category').value.trim(),
        FilterNo: document.getElementById('pi-no').value.trim(),
        Price: parseFloat(document.getElementById('pi-price').value) || 0.0
    };

    try {
        const res = await fetch('/api/filters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Filter Price item saved successfully!');
            closeModal('priceItemModal');
            
            // Re-fetch catalog to update cache
            const catRes = await fetch('/api/catalog');
            const catData = await catRes.json();
            globalData.filtersList = catData.filtersList;
            
            renderFiltersPriceList();
        } else {
            alert('Failed to save: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error saving filter price item.');
    }
}

async function deleteFilterPriceItem(id) {
    if (!confirm('Are you sure you want to delete this filter price?')) return;
    
    try {
        const res = await fetch(`/api/filters/${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Filter Price item deleted!');
            
            // Re-fetch catalog to update cache
            const catRes = await fetch('/api/catalog');
            const catData = await catRes.json();
            globalData.filtersList = catData.filtersList;
            
            renderFiltersPriceList();
        } else {
            alert('Failed to delete: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error deleting filter price item.');
    }
}
