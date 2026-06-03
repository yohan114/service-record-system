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
    
    // Add button visibility (only for Filters)
    document.getElementById('btn-add-price-item').style.display = tab === 'filters' ? 'block' : 'none';

    if (tab === 'oils') {
        renderOilsPriceList();
    } else {
        renderFiltersPriceList();
    }
}

function renderOilsPriceList() {
    const tbody = document.getElementById('pl-oils-tbody');
    if (!tbody) return;

    let html = '';
    // Oils list is exactly the 19 categories we support
    oilList.forEach((name, i) => {
        // Find existing record in database
        const match = globalData.oilsList.find(o => o.OilName && o.OilName.toUpperCase().trim() === name.toUpperCase().trim()) || {};
        
        html += `
            <tr>
                <td style="font-weight:600; color:var(--text-primary); padding: 12px 8px;">
                    ${name}
                    <input type="hidden" name="oil-name-${i}" value="${name}">
                </td>
                <td>
                    <input type="text" id="pl-oil-type-${i}" value="${match.OilType || ''}" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-card); color:var(--text-primary)">
                </td>
                <td>
                    <input type="number" id="pl-oil-price-${i}" value="${match.Price || ''}" step="0.01" min="0" placeholder="0.00" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-card); color:var(--text-primary)">
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

async function saveOilsPriceList(e) {
    e.preventDefault();
    
    const payload = [];
    oilList.forEach((_, i) => {
        const name = document.querySelector(`input[name="oil-name-${i}"]`).value;
        const type = document.getElementById(`pl-oil-type-${i}`).value;
        const price = parseFloat(document.getElementById(`pl-pl-oil-price-${i}`) ? document.getElementById(`pl-pl-oil-price-${i}`).value : document.getElementById(`pl-oil-price-${i}`).value) || 0.0;
        
        payload.push({
            OilName: name,
            OilType: type,
            Price: price
        });
    });

    try {
        const res = await fetch('/api/oils', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Oils Price List saved successfully!');
            // Re-fetch catalog to update frontend cache
            const catRes = await fetch('/api/catalog');
            const catData = await catRes.json();
            globalData.oilsList = catData.oilsList;
        } else {
            alert('Failed to save Oils Price List: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error saving Oils Price List.');
    }
}

function renderFiltersPriceList() {
    const tbody = document.getElementById('pl-filters-tbody');
    const searchVal = document.getElementById('pl-search').value.trim().toUpperCase();
    if (!tbody) return;

    let items = globalData.filtersList;
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
    if (currentPriceTab === 'filters') {
        renderFiltersPriceList();
    }
}

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
