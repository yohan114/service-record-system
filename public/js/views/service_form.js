// ============================================================
//  Service Sheet (create + edit) and per-vehicle history
// ============================================================

let currentServiceVehicleId = null;   // selected vehicle (may be null for free-text)
let currentServiceId = null;          // set when editing an existing job
let oilDefs = null;                   // cached /api/oils
let filterCatDefs = null;             // cached /api/filter-categories
let priceCodeMap = null;              // FilterPrices code -> unit price

async function loadFormDefs() {
    if (oilDefs && filterCatDefs) return;
    const [oils, cats] = await Promise.all([api('/api/oils'), api('/api/filter-categories')]);
    oilDefs = oils; filterCatDefs = cats;
    priceCodeMap = (globalData.prices || []).map(p => ({
        code: (p.SupplierFilterCode || '').toUpperCase(), price: p.UnitPriceLKR || p.TotalPriceLKR || 0
    })).filter(x => x.code);
}

function lookupFilterPrice(no) {
    if (!no || !priceCodeMap) return null;
    const key = no.toUpperCase().trim();
    let hit = priceCodeMap.find(x => x.code === key);
    if (!hit) hit = priceCodeMap.find(x => x.code.includes(key) || key.includes(x.code));
    return hit ? hit.price : null;
}

function renderFormMatrices() {
    // Oils
    const oc = document.getElementById('ns-oils-container');
    oc.innerHTML = oilDefs.map((o, i) => `
        <div class="matrix-row">
            <div class="matrix-cell" title="${esc(o.Name)}">${esc(o.Name)}</div>
            <div class="matrix-cell"><input type="text" id="oil-type-${i}"></div>
            <div class="matrix-cell"><input type="text" id="oil-cv-${i}" class="upper" placeholder="C/V"></div>
            <div class="matrix-cell"><input type="number" id="oil-l-${i}" step="0.1" data-unit="${o.UnitPrice || 0}" oninput="oilQtyChanged(${i})"></div>
            <div class="matrix-cell"><input type="number" id="oil-price-${i}" step="0.01" oninput="recalcTotals()"></div>
        </div>`).join('');

    // Filters
    const fc = document.getElementById('ns-filters-container');
    fc.innerHTML = filterCatDefs.map((f, i) => `
        <div class="matrix-row">
            <div class="matrix-cell" title="${esc(f.Name)}">${esc(f.Name)}</div>
            <div class="matrix-cell"><input type="text" id="flt-no-${i}" list="filterCodes" data-default="${f.UnitPrice || 0}" oninput="filterNoChanged(${i})"></div>
            <div class="matrix-cell"><input type="text" id="flt-xe-${i}" class="upper" placeholder="X/E"></div>
            <div class="matrix-cell"><input type="number" id="flt-price-${i}" step="0.01" oninput="recalcTotals()"></div>
        </div>`).join('');

    // datalist of filter codes (once)
    if (!document.getElementById('filterCodes')) {
        const dl = document.createElement('datalist');
        dl.id = 'filterCodes';
        dl.innerHTML = (globalData.prices || []).slice(0, 1000)
            .map(p => `<option value="${esc(p.SupplierFilterCode)}">`).join('');
        document.body.appendChild(dl);
    }

    // Other costs (5 rows)
    const cc = document.getElementById('ns-costs-container');
    cc.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        cc.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${i}</td>
                <td><input type="text" id="cost-desc-${i}"></td>
                <td><input type="text" id="cost-unit-${i}"></td>
                <td><input type="number" id="cost-rate-${i}" step="0.01" oninput="costChanged(${i})"></td>
                <td><input type="number" id="cost-qty-${i}" step="0.1" oninput="costChanged(${i})"></td>
                <td><input type="number" id="cost-amt-${i}" step="0.01" oninput="recalcTotals()"></td>
            </tr>`);
    }
}

function oilQtyChanged(i) {
    const qEl = document.getElementById(`oil-l-${i}`);
    const unit = parseFloat(qEl.dataset.unit) || 0;
    const qty = parseFloat(qEl.value) || 0;
    if (unit > 0 && qty > 0) document.getElementById(`oil-price-${i}`).value = Math.round(qty * unit * 100) / 100;
    recalcTotals();
}
function filterNoChanged(i) {
    const no = document.getElementById(`flt-no-${i}`).value;
    const priceEl = document.getElementById(`flt-price-${i}`);
    const found = lookupFilterPrice(no);
    if (found != null && found > 0) priceEl.value = found;
    else { const d = parseFloat(document.getElementById(`flt-no-${i}`).dataset.default) || 0; if (d > 0 && !priceEl.value) priceEl.value = d; }
    recalcTotals();
}
function costChanged(i) {
    const rate = parseFloat(document.getElementById(`cost-rate-${i}`).value) || 0;
    const qty = parseFloat(document.getElementById(`cost-qty-${i}`).value) || 0;
    if (rate && qty) document.getElementById(`cost-amt-${i}`).value = Math.round(rate * qty * 100) / 100;
    recalcTotals();
}

function recalcTotals() {
    let parts = 0;
    oilDefs.forEach((o, i) => parts += parseFloat(document.getElementById(`oil-price-${i}`).value) || 0);
    filterCatDefs.forEach((f, i) => parts += parseFloat(document.getElementById(`flt-price-${i}`).value) || 0);
    for (let i = 1; i <= 5; i++) parts += parseFloat(document.getElementById(`cost-amt-${i}`).value) || 0;

    const t = computeTotals(parts);
    document.getElementById('tot-parts').textContent = fmtMoney(t.partsSubtotal);
    document.getElementById('tot-labour').textContent = fmtMoney(t.labourCharge);
    document.getElementById('tot-sundry').textContent = fmtMoney(t.sundryAmount);
    document.getElementById('tot-grand').textContent = fmtMoney(t.grandTotal);
    const thr = globalData.rates.labourThreshold.toLocaleString('en-US');
    document.getElementById('tot-labour-rate').textContent =
        `(${t.labourRate}% — parts ${t.partsSubtotal > globalData.rates.labourThreshold ? '>' : '≤'} Rs ${thr})`;
    document.getElementById('tot-sundry-rate').textContent = `(${t.sundryRate}%)`;
}

// ---------------- Vehicle picker (combobox) ----------------
function setPickedVehicle(v) {
    currentServiceVehicleId = v ? v.VehicleID : null;
    document.getElementById('ns-vehsearch').value = v ? vehicleLabel(v) : '';
    document.getElementById('ns-regid').value = v ? (v.RegistrationNo || '') : '';
    document.getElementById('ns-eccode').value = v ? (v.ECNumber || '') : '';
    document.getElementById('ns-model').value = v ? `${v.Brand || ''} ${v.ModelNo || v.VehicleType || ''}`.trim() : '';
    document.getElementById('ns-vehlist').classList.remove('open');
}
function filterVehiclePicker() {
    const q = document.getElementById('ns-vehsearch').value.trim().toUpperCase();
    const list = document.getElementById('ns-vehlist');
    if (!q) { list.classList.remove('open'); return; }
    const matches = globalData.vehicles.filter(v =>
        (v.ECNumber || '').toUpperCase().includes(q) ||
        (v.RegistrationNo || '').toUpperCase().includes(q) ||
        (v.Brand || '').toUpperCase().includes(q) ||
        (v.ModelNo || '').toUpperCase().includes(q)).slice(0, 30);
    list.innerHTML = matches.length
        ? matches.map(v => `<div class="combo-item" onclick="pickVehicleById('${v.VehicleID}')">
              <b>${esc(v.ECNumber || '—')}</b> ${esc(v.Brand || '')} ${esc(v.ModelNo || v.VehicleType || '')}
              <span class="muted">${esc(v.RegistrationNo || '')}</span></div>`).join('')
        : '<div class="combo-item muted">No vehicle found — record will be saved under the typed name.</div>';
    list.classList.add('open');
}
function pickVehicleById(id) { setPickedVehicle(globalData.vehicleById.get(String(id))); }

// ---------------- Open / edit ----------------
async function openNewServiceSheet(vehicleId, presetDate, job) {
    await loadFormDefs();
    renderFormMatrices();

    document.getElementById('serviceForm').reset();
    currentServiceId = job ? job.ServiceID : null;
    document.getElementById('ns-company').textContent = globalData.settings.company_name || 'Edward and Christie (Pvt) Ltd';
    document.getElementById('ns-formtitle').textContent = globalData.settings.form_title || 'Vehicle/ Machinery Service Details';
    document.getElementById('ns-save').textContent = currentServiceId ? 'Update Service Job' : 'Save Service Job';
    document.getElementById('ns-delete').style.display = currentServiceId ? 'inline-block' : 'none';

    const v = vehicleId ? globalData.vehicleById.get(String(vehicleId)) : null;
    setPickedVehicle(v);
    document.getElementById('ns-date').value = presetDate || (job ? (job.ServiceDate || '') : new Date().toISOString().slice(0, 10));

    if (job) fillFormFromJob(job);
    else recalcTotals();

    openModal('newServiceModal');
    document.getElementById('serviceSheet').scrollTop = 0;
}

function fillFormFromJob(job) {
    if (job.VehicleLabel && !currentServiceVehicleId) document.getElementById('ns-vehsearch').value = job.VehicleLabel;
    document.getElementById('ns-jobno').value = job.JobNo || '';
    document.getElementById('ns-meter').value = job.MeterReading || '';
    document.getElementById('ns-nextmeter').value = job.NextServiceMeter || '';
    document.getElementById('ns-type').value = job.ServiceType || '';
    document.getElementById('ns-site').value = job.SiteLocation || '';
    document.getElementById('ns-repair').value = job.RepairDetails || '';
    if (job.UpkeepingStatus) {
        const r = document.querySelector(`input[name="ns-upkeep"][value="${job.UpkeepingStatus}"]`);
        if (r) r.checked = true;
    }
    // oils by name
    (job.oils || []).forEach(o => {
        const i = oilDefs.findIndex(d => d.Name.toUpperCase() === (o.OilName || '').toUpperCase());
        if (i >= 0) {
            document.getElementById(`oil-type-${i}`).value = o.OilType || '';
            document.getElementById(`oil-cv-${i}`).value = o.ActionType || '';
            document.getElementById(`oil-l-${i}`).value = o.Quantity || '';
            document.getElementById(`oil-price-${i}`).value = o.Price || '';
        }
    });
    // filters by category
    (job.filters || []).forEach(f => {
        const i = filterCatDefs.findIndex(d => d.Name.toUpperCase() === (f.FilterCategory || '').toUpperCase());
        if (i >= 0) {
            document.getElementById(`flt-no-${i}`).value = f.FilterNo || '';
            document.getElementById(`flt-xe-${i}`).value = f.ActionType || '';
            document.getElementById(`flt-price-${i}`).value = f.Price || '';
        }
    });
    (job.costs || []).forEach((c, idx) => {
        const i = idx + 1; if (i > 5) return;
        document.getElementById(`cost-desc-${i}`).value = c.CostDescription || '';
        document.getElementById(`cost-unit-${i}`).value = c.Unit || '';
        document.getElementById(`cost-rate-${i}`).value = c.Rate || '';
        document.getElementById(`cost-qty-${i}`).value = c.Qty || '';
        document.getElementById(`cost-amt-${i}`).value = c.Amount || '';
    });
    recalcTotals();
}

function gatherPayload() {
    const payload = {
        vehicleId: currentServiceVehicleId,
        vehicleLabel: document.getElementById('ns-vehsearch').value.trim(),
        date: document.getElementById('ns-date').value,
        jobNo: document.getElementById('ns-jobno').value,
        meter: document.getElementById('ns-meter').value,
        nextMeter: document.getElementById('ns-nextmeter').value,
        serviceType: document.getElementById('ns-type').value,
        site: document.getElementById('ns-site').value,
        upkeep: (document.querySelector('input[name="ns-upkeep"]:checked') || {}).value || '',
        repairDetails: document.getElementById('ns-repair').value,
        oils: [], filters: [], costs: []
    };
    oilDefs.forEach((o, i) => {
        const type = document.getElementById(`oil-type-${i}`).value;
        const action = document.getElementById(`oil-cv-${i}`).value;
        const qty = parseFloat(document.getElementById(`oil-l-${i}`).value);
        const price = parseFloat(document.getElementById(`oil-price-${i}`).value);
        if (type || action || qty || price) payload.oils.push({ name: o.Name, type, action, quantity: qty || 0, price: price || 0 });
    });
    filterCatDefs.forEach((f, i) => {
        const no = document.getElementById(`flt-no-${i}`).value;
        const action = document.getElementById(`flt-xe-${i}`).value;
        const price = parseFloat(document.getElementById(`flt-price-${i}`).value);
        if (no || action || price) payload.filters.push({ category: f.Name, no, action, price: price || 0 });
    });
    for (let i = 1; i <= 5; i++) {
        const desc = document.getElementById(`cost-desc-${i}`).value;
        const unit = document.getElementById(`cost-unit-${i}`).value;
        const rate = parseFloat(document.getElementById(`cost-rate-${i}`).value);
        const qty = parseFloat(document.getElementById(`cost-qty-${i}`).value);
        const amount = parseFloat(document.getElementById(`cost-amt-${i}`).value);
        if (desc || amount) payload.costs.push({ desc, unit, rate: rate || 0, qty: qty || 0, amount: amount || 0 });
    }
    return payload;
}

async function submitServiceJob(e) {
    e.preventDefault();
    const payload = gatherPayload();
    if (!payload.date) { toast('Please pick a date', 'err'); return; }
    try {
        if (currentServiceId) {
            await api('/api/services/' + currentServiceId, 'PUT', payload);
            toast('Service updated');
        } else {
            await api('/api/services', 'POST', payload);
            toast('Service saved');
        }
        closeModal('newServiceModal');
        refreshAfterSave();
    } catch (err) { toast('Save failed: ' + err.message, 'err'); }
}

async function deleteCurrentService() {
    if (!currentServiceId || !confirm('Delete this service record? This cannot be undone.')) return;
    try {
        await api('/api/services/' + currentServiceId, 'DELETE');
        toast('Service deleted');
        closeModal('newServiceModal');
        refreshAfterSave();
    } catch (err) { toast('Delete failed: ' + err.message, 'err'); }
}

function refreshAfterSave() {
    const hash = window.location.hash || '#/dashboard';
    if (document.getElementById('serviceHistoryModal').classList.contains('visible') && currentServiceVehicleId)
        openServiceHistory(currentServiceVehicleId);
    if (ROUTES[hash]) try { ROUTES[hash].init(); } catch (e) {}
}

// close combobox on outside click
document.addEventListener('click', e => {
    if (!e.target.closest('.combo')) document.getElementById('ns-vehlist')?.classList.remove('open');
});

// ---------------- Per-vehicle history ----------------
async function openServiceHistory(vehicleId) {
    currentServiceVehicleId = vehicleId;
    const v = globalData.vehicleById.get(String(vehicleId));
    document.getElementById('sh-vehicle-name').textContent = v ? vehicleLabel(v) : ('Vehicle #' + vehicleId);
    openModal('serviceHistoryModal');
    const list = document.getElementById('sh-history-list');
    list.innerHTML = '<div class="loading">Loading history…</div>';
    try {
        const history = await api('/api/vehicles/' + vehicleId + '/history');
        list.innerHTML = history.length ? history.map(renderJobCard).join('')
            : '<div class="empty-note">No service history recorded for this vehicle yet.</div>';
    } catch (e) {
        list.innerHTML = '<div class="empty-note err">Error loading history.</div>';
    }
}

function renderJobCard(job) {
    const oils = (job.oils || []).filter(o => o.Quantity || o.Price || o.ActionType)
        .map(o => `<li>${esc(o.OilName)} ${o.OilType ? '(' + esc(o.OilType) + ')' : ''} ${o.ActionType || ''} ${o.Quantity ? o.Quantity + 'L' : ''} ${o.Price ? '· ' + fmtMoney(o.Price) : ''}</li>`).join('');
    const filters = (job.filters || []).filter(f => f.FilterNo || f.Price)
        .map(f => `<li><b>${esc(f.FilterCategory)}</b>: ${esc(f.FilterNo || '-')} ${f.ActionType ? '(' + f.ActionType + ')' : ''} ${f.Price ? '· ' + fmtMoney(f.Price) : ''}</li>`).join('');
    return `
    <div class="job-card">
        <div class="job-header">
            <span>📅 ${fmtDate(job.ServiceDate)} ${job.JobNo ? '· Job ' + esc(job.JobNo) : ''}</span>
            <span class="job-actions">
                ${job.GrandTotal ? '<span class="pill">' + fmtMoney(job.GrandTotal) + '</span>' : ''}
                <button class="btn btn-mini" onclick='editService(${job.ServiceID})'>Edit</button>
            </span>
        </div>
        <div class="job-body">
            <div class="job-meta">
                <span><b>Meter:</b> ${esc(job.MeterReading || '-')} → ${esc(job.NextServiceMeter || '-')}</span>
                <span><b>Site:</b> ${esc(job.SiteLocation || '-')}</span>
                <span><b>Upkeep:</b> ${esc(job.UpkeepingStatus || '-')}</span>
            </div>
            <div class="job-cols">
                <div><b>Oils</b><ul>${oils || '<li class="muted">None</li>'}</ul></div>
                <div><b>Filters</b><ul>${filters || '<li class="muted">None</li>'}</ul></div>
            </div>
            ${job.RepairDetails ? `<div class="job-repair"><b>Repairs:</b> ${esc(job.RepairDetails)}</div>` : ''}
            ${job.GrandTotal ? `<div class="job-money">Parts ${fmtMoney(job.PartsSubtotal)} · Labour ${fmtMoney(job.LabourCharge)} (${job.LabourRate}%) · Sundry ${fmtMoney(job.SundryAmount)} · <b>Total ${fmtMoney(job.GrandTotal)}</b></div>` : ''}
        </div>
    </div>`;
}

async function editService(id) {
    try {
        const job = await api('/api/services/' + id);
        await openNewServiceSheet(job.VehicleID, null, job);
    } catch (e) { toast('Could not load record: ' + e.message, 'err'); }
}
