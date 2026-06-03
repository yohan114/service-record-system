// Service Form and History Logic

const oilList = [
    "Engine Oil", "Gear Box Oil", "Differential Oil", "Transmission Oil", "Hydraulic Oil",
    "Torque Con. Oil", "Power Steering Oil", "Brake Oil", "Swing Motor Oil", "Travelling Motor Oil",
    "Rear Axel Case Oil", "Front Axel Case Oil", "Circle Gear Case Oil", "Tandem Drive Oil",
    "Compressor Oil", "Petrol & Kerosene Oil", "Grease", "Battery water", "Coolant"
];

const filterList = [
    "Engine Oil Filter", "Air Filter", "Air Filter Inner", "Air Filter Outer", "Trans: Filter",
    "Water Separator", "Fuel Sedimentary", "Hydraulic Filter - S", "Line Filter", "Coolant Filter",
    "Power Steering Filter", "Air Dryer Filter", "Air Breather Filter", "Fuel Tank Filter",
    "Primary Fuel Filter", "Engine fuel Filter - S", "Engine Oil Filter - S", "Engine Air Filter - S"
];

let currentServiceVehicleId = null;

function renderFormMatrices() {
    const oilsContainer = document.getElementById('ns-oils-container');
    if (!oilsContainer) return;
    
    let oilsHtml = '';
    oilList.forEach((oil, i) => {
        oilsHtml += `
            <div class="matrix-row">
                <div class="matrix-cell">${oil}</div>
                <div class="matrix-cell"><input type="text" id="oil-type-${i}"></div>
                <div class="matrix-cell"><input type="text" id="oil-cv-${i}" placeholder="C/V" style="text-transform:uppercase; text-align:center;"></div>
                <div class="matrix-cell"><input type="number" id="oil-l-${i}" step="0.1"></div>
                <div class="matrix-cell"><input type="number" id="oil-price-${i}" step="0.01"></div>
            </div>`;
    });
    oilsContainer.innerHTML = oilsHtml;

    const filtersContainer = document.getElementById('ns-filters-container');
    let filtersHtml = '';
    filterList.forEach((filter, i) => {
        filtersHtml += `
            <div class="matrix-row">
                <div class="matrix-cell">${filter}</div>
                <div class="matrix-cell"><input type="text" id="flt-no-${i}"></div>
                <div class="matrix-cell"><input type="text" id="flt-xe-${i}" placeholder="X/E" style="text-transform:uppercase; text-align:center;"></div>
                <div class="matrix-cell"><input type="number" id="flt-price-${i}" step="0.01"></div>
            </div>`;
    });
    filtersContainer.innerHTML = filtersHtml;

    const costsContainer = document.getElementById('ns-costs-container');
    let costsHtml = '';
    for(let i=1; i<=5; i++) {
        costsHtml += `
            <tr>
                <td>${i}</td>
                <td><input type="text" id="cost-desc-${i}" style="width:100%; border:none; padding:2px;"></td>
                <td><input type="text" id="cost-unit-${i}" style="width:100%; border:none; padding:2px;"></td>
                <td><input type="number" id="cost-rate-${i}" step="0.01" style="width:100%; border:none; padding:2px;"></td>
                <td><input type="number" id="cost-qty-${i}" step="0.1" style="width:100%; border:none; padding:2px;"></td>
                <td><input type="number" id="cost-amt-${i}" step="0.01" style="width:100%; border:none; padding:2px;"></td>
            </tr>`;
    }
    costsContainer.innerHTML = costsHtml;
}

async function openServiceHistory(vehicleId, ec, brand, model, reg) {
    currentServiceVehicleId = vehicleId;
    document.getElementById('sh-vehicle-name').innerText = `${ec ? '['+ec+'] ' : ''} ${brand || ''} ${model || ''}`;
    openModal('serviceHistoryModal');
    
    const list = document.getElementById('sh-history-list');
    list.innerHTML = '<i>Loading history...</i>';

    try {
        const res = await fetch('/api/vehicles/' + vehicleId + '/history');
        const history = await res.json();
        
        if (history.length === 0) {
            list.innerHTML = '<i>No service history recorded for this vehicle.</i>';
            return;
        }

        let html = '';
        history.forEach(job => {
            let oilsTxt = job.oils.map(o => `<li><b>${o.OilName}</b> (${o.OilType}) - ${o.ActionType} ${o.Quantity}L</li>`).join('');
            let filtersTxt = job.filters.map(f => `<li><b>${f.FilterCategory}</b>: ${f.FilterNo} (${f.ActionType})</li>`).join('');
            
            html += `
            <div class="job-card">
                <div class="job-header">
                    <span>Date: ${new Date(job.ServiceDate).toLocaleDateString()}</span>
                    <span>Job No: ${job.JobNo || '-'}</span>
                </div>
                <div class="job-body">
                    <div><b>Meter:</b> ${job.MeterReading || '-'} (Next: ${job.NextServiceMeter || '-'})</div>
                    <div><b>Site:</b> ${job.SiteLocation || '-'} </div>
                    <div><b>Upkeep:</b> ${job.UpkeepingStatus || '-'}</div>
                    <div style="display:flex; gap:16px; margin-top:12px;">
                        <div style="flex:1;">
                            <b style="color:var(--text-primary)">Oils:</b>
                            <ul style="margin:0; padding-left:15px;">${oilsTxt || 'None'}</ul>
                        </div>
                        <div style="flex:1;">
                            <b style="color:var(--text-primary)">Filters:</b>
                            <ul style="margin:0; padding-left:15px;">${filtersTxt || 'None'}</ul>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        list.innerHTML = html;

    } catch (e) {
        list.innerHTML = '<span style="color:var(--accent-rose)">Error loading history</span>';
    }
}

function openNewServiceSheet() {
    const v = globalData.vehicles.find(x => x.VehicleID == currentServiceVehicleId);
    if(!v) return;

    document.getElementById('serviceForm').reset();
    
    document.getElementById('ns-date').valueAsDate = new Date();
    document.getElementById('ns-regid').value = v.SequenceNo || '';
    document.getElementById('ns-eccode').value = v.ECNumber || '';
    document.getElementById('ns-model').value = (v.Brand + ' ' + (v.ModelNo || v.VehicleType)).substring(0, 30);

    // Auto-populate filter logic based on fetched catalog
    if (globalData.links && globalData.filters) {
        const myLinks = globalData.links.filter(l => l.VehicleID == currentServiceVehicleId);
        const myFilters = myLinks.map(l => globalData.filters.find(f => f.FilterID == l.FilterID)).filter(Boolean);
        
        myFilters.forEach(f => {
            const i = filterList.findIndex(name => name.toUpperCase() === (f.FilterCategory || '').toUpperCase());
            if (i >= 0) {
                document.getElementById(`flt-no-${i}`).value = f.OEMPartNo || f.HIFICode || '';
                
                if (globalData.prices) {
                    const priceMatch = globalData.prices.find(p => p.FilterCode && (
                        (f.OEMPartNo && p.FilterCode.toUpperCase().includes(f.OEMPartNo.toUpperCase())) ||
                        (f.HIFICode && p.FilterCode.toUpperCase().includes(f.HIFICode.toUpperCase()))
                    ));
                    if (priceMatch && priceMatch.UnitPrice) {
                        document.getElementById(`flt-price-${i}`).value = priceMatch.UnitPrice;
                    }
                }
            }
        });
    }

    openModal('newServiceModal');
}

async function submitServiceJob(e) {
    e.preventDefault();
    
    const payload = {
        vehicleId: currentServiceVehicleId,
        date: document.getElementById('ns-date').value,
        jobNo: document.getElementById('ns-jobno').value,
        meter: document.getElementById('ns-meter').value,
        nextMeter: document.getElementById('ns-nextmeter').value,
        serviceType: document.getElementById('ns-type').value,
        site: document.getElementById('ns-site').value,
        upkeep: document.querySelector('input[name="ns-upkeep"]:checked').value,
        repairDetails: document.getElementById('ns-repair').value,
        oils: [],
        filters: [],
        costs: []
    };

    oilList.forEach((name, i) => {
        const type = document.getElementById(`oil-type-${i}`).value;
        const action = document.getElementById(`oil-cv-${i}`).value;
        const qty = parseFloat(document.getElementById(`oil-l-${i}`).value);
        const price = parseFloat(document.getElementById(`oil-price-${i}`).value);
        if(type || action || qty || price) {
            payload.oils.push({ name, type, action, quantity: qty||0, price: price||0 });
        }
    });

    filterList.forEach((category, i) => {
        const no = document.getElementById(`flt-no-${i}`).value;
        const action = document.getElementById(`flt-xe-${i}`).value;
        const price = parseFloat(document.getElementById(`flt-price-${i}`).value);
        if(no || action || price) {
            payload.filters.push({ category, no, action, price: price||0 });
        }
    });

    for(let i=1; i<=5; i++) {
        const desc = document.getElementById(`cost-desc-${i}`).value;
        const unit = document.getElementById(`cost-unit-${i}`).value;
        const rate = parseFloat(document.getElementById(`cost-rate-${i}`).value);
        const qty = parseFloat(document.getElementById(`cost-qty-${i}`).value);
        const amount = parseFloat(document.getElementById(`cost-amt-${i}`).value);
        if(desc || amount) {
            payload.costs.push({ desc, unit, rate: rate||0, qty: qty||0, amount: amount||0 });
        }
    }

    try {
        const res = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if(result.success) {
            alert('Service Job saved successfully!');
            closeModal('newServiceModal');
            openServiceHistory(currentServiceVehicleId);
            
            if (typeof loadRecentServices === 'function') {
                loadRecentServices(); // Refresh dashboard if needed
            }
        } else {
            alert('Failed to save: ' + result.error);
        }
    } catch(err) {
        console.error(err);
        alert('Server error saving service job!');
    }
}
