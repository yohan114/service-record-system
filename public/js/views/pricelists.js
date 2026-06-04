// ============================================================
//  Price Lists — editable Oils, Filter Types, Filter Price Book
// ============================================================
let currentPriceTab = 'oils';

const PRICE_TABS = {
    oils: {
        route: 'oils', idCol: 'OilID', label: 'Oil',
        cols: [
            { key: 'Name', label: 'Oil Name', type: 'text', w: '34%' },
            { key: 'UnitPrice', label: 'Unit Price', type: 'number', w: '20%' },
            { key: 'Unit', label: 'Unit', type: 'text', w: '12%' },
            { key: 'SortOrder', label: 'Order', type: 'number', w: '12%' }
        ],
        defaults: { Name: '', UnitPrice: 0, Unit: 'L', SortOrder: 99, Active: 1 }
    },
    filtercats: {
        route: 'filter-categories', idCol: 'CategoryID', label: 'Filter Type',
        cols: [
            { key: 'Name', label: 'Filter Type', type: 'text', w: '46%' },
            { key: 'UnitPrice', label: 'Default Price', type: 'number', w: '24%' },
            { key: 'SortOrder', label: 'Order', type: 'number', w: '12%' }
        ],
        defaults: { Name: '', UnitPrice: 0, SortOrder: 99, Active: 1 }
    },
    filterbook: {
        route: 'filter-prices', idCol: 'PriceID', label: 'Filter Price', searchable: true,
        cols: [
            { key: 'SupplierFilterCode', label: 'Filter Code', type: 'text', w: '26%' },
            { key: 'Description', label: 'Description', type: 'text', w: '30%' },
            { key: 'QuotedQty', label: 'Qty', type: 'number', w: '10%' },
            { key: 'UnitPriceLKR', label: 'Unit Price', type: 'number', w: '16%' },
            { key: 'TotalPriceLKR', label: 'Total', type: 'number', w: '16%' }
        ],
        defaults: { SupplierFilterCode: '', Description: '', QuotedQty: 1, UnitPriceLKR: 0, TotalPriceLKR: 0 }
    }
};

function switchPriceTab(tab) {
    currentPriceTab = tab;
    document.querySelectorAll('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === tab));
    initPriceLists();
}
function initPriceLists() { renderPriceTab(); }

async function renderPriceTab(q) {
    const cfg = PRICE_TABS[currentPriceTab];
    const panel = document.getElementById('price-panel');
    panel.innerHTML = '<div class="loading">Loading…</div>';
    try {
        const rows = await api('/api/' + cfg.route + (q ? '?q=' + encodeURIComponent(q) : ''));
        const headCols = cfg.cols.map(c => `<th style="width:${c.w}">${c.label}</th>`).join('');
        const searchBar = cfg.searchable
            ? `<div class="pl-search"><input type="text" class="search-input slim" placeholder="🔍 Search code or description…" value="${esc(q || '')}" oninput="priceSearch(this.value)"><span class="muted">${rows.length} shown</span></div>` : '';
        const addRow = `
            <tr class="add-row">
                ${cfg.cols.map(c => `<td><input data-new="${c.key}" type="${c.type}" ${c.type === 'number' ? 'step="0.01"' : ''} placeholder="${c.label}"></td>`).join('')}
                <td><button class="btn btn-mini btn-success" onclick="addPriceRow()">+ Add</button></td>
            </tr>`;
        panel.innerHTML = `
            ${searchBar}
            <div class="card panel pad0">
            <table class="data-table editable">
                <thead><tr>${headCols}<th style="width:120px">Actions</th></tr></thead>
                <tbody>
                    ${addRow}
                    ${rows.map(r => priceRowHtml(cfg, r)).join('')}
                </tbody>
            </table></div>`;
    } catch (e) { panel.innerHTML = '<div class="empty-note err">Error: ' + esc(e.message) + '</div>'; }
}

function priceRowHtml(cfg, r) {
    const id = r[cfg.idCol];
    const cells = cfg.cols.map(c =>
        `<td><input data-id="${id}" data-key="${c.key}" type="${c.type}" ${c.type === 'number' ? 'step="0.01"' : ''} value="${esc(r[c.key] ?? '')}"></td>`).join('');
    return `<tr data-row="${id}">${cells}
        <td>
            <button class="btn btn-mini" onclick="savePriceRow('${id}')">Save</button>
            <button class="btn btn-mini btn-danger" onclick="deletePriceRow('${id}')">✕</button>
        </td></tr>`;
}

let priceSearchTimer = null;
function priceSearch(v) { clearTimeout(priceSearchTimer); priceSearchTimer = setTimeout(() => renderPriceTab(v), 250); }

async function savePriceRow(id) {
    const cfg = PRICE_TABS[currentPriceTab];
    const body = { ...cfg.defaults };
    document.querySelectorAll(`input[data-id="${id}"]`).forEach(inp => {
        body[inp.dataset.key] = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value;
    });
    try { await api('/api/' + cfg.route + '/' + id, 'PUT', body); toast('Saved'); await reloadCatalogIfPrices(); }
    catch (e) { toast('Save failed: ' + e.message, 'err'); }
}

async function addPriceRow() {
    const cfg = PRICE_TABS[currentPriceTab];
    const body = { ...cfg.defaults };
    let has = false;
    document.querySelectorAll('input[data-new]').forEach(inp => {
        if (inp.value) has = true;
        body[inp.dataset.new] = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value;
    });
    if (!has) { toast('Enter a value first', 'err'); return; }
    try { await api('/api/' + cfg.route, 'POST', body); toast('Added'); renderPriceTab(); await reloadCatalogIfPrices(); }
    catch (e) { toast('Add failed: ' + e.message, 'err'); }
}

async function deletePriceRow(id) {
    const cfg = PRICE_TABS[currentPriceTab];
    if (!confirm('Delete this ' + cfg.label + '?')) return;
    try { await api('/api/' + cfg.route + '/' + id, 'DELETE'); document.querySelector(`tr[data-row="${id}"]`)?.remove(); toast('Deleted'); await reloadCatalogIfPrices(); }
    catch (e) { toast('Delete failed: ' + e.message, 'err'); }
}

// Filter price book feeds the service-form auto-fill, so refresh the cached catalog
async function reloadCatalogIfPrices() {
    if (currentPriceTab !== 'filterbook') { oilDefs = filterCatDefs = null; return; }
    try { const db = await api('/api/catalog'); globalData.prices = db.prices || []; priceCodeMap = null; oilDefs = filterCatDefs = null; } catch (e) {}
}
