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
let isViewMode = false;

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
                <div class="matrix-cell"><input type="number" id="oil-l-${i}" step="0.1" min="0"></div>
                <div class="matrix-cell"><input type="number" id="oil-price-${i}" step="0.01" min="0"></div>
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
                <div class="matrix-cell"><input type="number" id="flt-price-${i}" step="0.01" min="0"></div>
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

    // Attach form input listener for live calculation
    const form = document.getElementById('serviceForm');
    form.addEventListener('input', (e) => {
        // If they edit rate or qty, auto-calculate cost amount
        if (e.target.id && (e.target.id.startsWith('cost-rate-') || e.target.id.startsWith('cost-qty-'))) {
            const idx = e.target.id.split('-')[2];
            const rate = parseFloat(document.getElementById(`cost-rate-${idx}`).value) || 0;
            const qty = parseFloat(document.getElementById(`cost-qty-${idx}`).value) || 0;
            if (rate || qty) {
                document.getElementById(`cost-amt-${idx}`).value = (rate * qty).toFixed(2);
            }
        }
        calculateServiceSheetMath();
    });

    // Auto-complete Setup
    setupVehicleSearch();
}

function calculateServiceSheetMath() {
    if (isViewMode) return; // Math remains frozen in view mode

    let partsSubtotal = 0;
    
    // Calculate Oils
    oilList.forEach((_, i) => {
        const qty = parseFloat(document.getElementById(`oil-l-${i}`).value) || 0;
        const price = parseFloat(document.getElementById(`oil-price-${i}`).value) || 0;
        partsSubtotal += qty * price;
    });

    // Calculate Filters
    filterList.forEach((_, i) => {
        const price = parseFloat(document.getElementById(`flt-price-${i}`).value) || 0;
        partsSubtotal += price;
    });

    // Calculate Additional Costs
    for (let i = 1; i <= 5; i++) {
        const amt = parseFloat(document.getElementById(`cost-amt-${i}`).value) || 0;
        partsSubtotal += amt;
    }

    // Get settings
    const settings = globalData.settings;
    const threshold = parseFloat(settings.labour_threshold) || 10000;
    const rateUnder = parseFloat(settings.labour_rate_under_threshold) || 20;
    const rateOver = parseFloat(settings.labour_rate_over_threshold) || 15;
    const sundryPercent = parseFloat(settings.sundry_rate) || 5;

    const labourRate = partsSubtotal <= threshold ? rateUnder : rateOver;
    const labourCharge = partsSubtotal * (labourRate / 100);
    const sundryCharge = partsSubtotal * (sundryPercent / 100);
    const grandTotal = partsSubtotal + labourCharge + sundryCharge;

    document.getElementById('ns-parts-subtotal').textContent = formatCurrency(partsSubtotal);
    document.getElementById('ns-labour-rate').textContent = labourRate.toFixed(1);
    document.getElementById('ns-labour-charge').textContent = formatCurrency(labourCharge);
    document.getElementById('ns-sundry-rate').textContent = sundryPercent.toFixed(1);
    document.getElementById('ns-sundry-charge').textContent = formatCurrency(sundryCharge);
    document.getElementById('ns-grand-total').textContent = formatCurrency(grandTotal);
}

function setupVehicleSearch() {
    const searchInput = document.getElementById('ns-vehicle-search');
    const suggestionsBox = document.getElementById('ns-vehicle-suggestions');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toUpperCase();
        suggestionsBox.innerHTML = '';
        if (!query) return;

        const matches = globalData.vehicles.filter(v => 
            (v.ECNumber && v.ECNumber.toUpperCase().includes(query)) ||
            (v.RegistrationNo && v.RegistrationNo.toUpperCase().includes(query)) ||
            (v.Brand && v.Brand.toUpperCase().includes(query)) ||
            (v.ModelNo && v.ModelNo.toUpperCase().includes(query))
        ).slice(0, 10);

        matches.forEach(v => {
            const div = document.createElement('div');
            const ecDisplay = v.ECNumber ? `[${v.ECNumber}] ` : '';
            const regDisplay = v.RegistrationNo ? `(${v.RegistrationNo}) ` : '';
            div.textContent = `${ecDisplay}${regDisplay}${v.Brand || ''} ${v.ModelNo || ''}`;
            div.addEventListener('click', () => {
                selectVehicleForForm(v.VehicleID);
                suggestionsBox.innerHTML = '';
                searchInput.value = div.textContent;
            });
            suggestionsBox.appendChild(div);
        });
    });

    // Close suggestions on clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            suggestionsBox.innerHTML = '';
        }
    });
}

function selectVehicleForForm(vehicleId) {
    currentServiceVehicleId = vehicleId;
    const v = globalData.vehicles.find(x => x.VehicleID == vehicleId);
    if (!v) return;

    document.getElementById('ns-regid').value = v.SequenceNo || '';
    document.getElementById('ns-eccode').value = v.ECNumber || '';
    document.getElementById('ns-model').value = (v.Brand + ' ' + (v.ModelNo || v.VehicleType || '')).substring(0, 30);

    // Auto-populate filter logic based on fetched catalog
    filterList.forEach((_, idx) => {
        document.getElementById(`flt-no-${idx}`).value = '';
        document.getElementById(`flt-price-${idx}`).value = '';
    });

    if (globalData.links && globalData.filters) {
        const myLinks = globalData.links.filter(l => l.MatchedVehicleID == vehicleId || l.VehicleID == vehicleId);
        const myFilters = myLinks.map(l => globalData.filters.find(f => f.FilterID == l.FilterID)).filter(Boolean);
        
        myFilters.forEach(f => {
            const i = filterList.findIndex(name => name.toUpperCase() === (f.FilterCategory || '').toUpperCase());
            if (i >= 0) {
                const partNo = f.OEMPartNumber || f.HIFIPartNumber || '';
                document.getElementById(`flt-no-${i}`).value = partNo;
                
                // Lookup default price in filters price list
                let defaultPrice = 0;
                if (globalData.filtersList) {
                    const priceListMatch = globalData.filtersList.find(p => p.FilterNo && partNo && p.FilterNo.toUpperCase().trim() === partNo.toUpperCase().trim());
                    if (priceListMatch) defaultPrice = priceListMatch.Price;
                }
                
                // Fallback to Excel pricing catalog
                if (!defaultPrice && globalData.prices) {
                    const priceMatch = globalData.prices.find(p => p.SupplierFilterCode && partNo && (
                        p.SupplierFilterCode.toUpperCase().includes(partNo.toUpperCase()) ||
                        partNo.toUpperCase().includes(p.SupplierFilterCode.toUpperCase())
                    ));
                    if (priceMatch && priceMatch.UnitPriceLKR) {
                        defaultPrice = priceMatch.UnitPriceLKR;
                    }
                }
                
                if (defaultPrice) {
                    document.getElementById(`flt-price-${i}`).value = defaultPrice;
                }
            }
        });
    }

    // Auto-populate Oils prices from default price list
    oilList.forEach((name, i) => {
        const oilMatch = globalData.oilsList.find(o => o.OilName && o.OilName.toUpperCase().trim() === name.toUpperCase().trim());
        if (oilMatch && oilMatch.Price) {
            document.getElementById(`oil-price-${i}`).value = oilMatch.Price;
            document.getElementById(`oil-type-${i}`).value = oilMatch.OilType || '';
        } else {
            document.getElementById(`oil-price-${i}`).value = '';
            document.getElementById(`oil-type-${i}`).value = '';
        }
    });

    calculateServiceSheetMath();
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
            let oilsTxt = job.oils.map(o => `<li><b>${o.OilName}</b> (${o.OilType}) - ${o.ActionType} ${o.Quantity}L @ ${formatCurrency(o.Price)}</li>`).join('');
            let filtersTxt = job.filters.map(f => `<li><b>${f.FilterCategory}</b>: ${f.FilterNo} (${f.ActionType}) @ ${formatCurrency(f.Price)}</li>`).join('');
            
            html += `
            <div class="job-card" onclick='viewServiceSheet(${JSON.stringify(job).replace(/'/g, "&apos;")})' style="cursor:pointer">
                <div class="job-header">
                    <span>Date: ${job.ServiceDate}</span>
                    <span>Job No: ${job.JobNo || '-'}</span>
                </div>
                <div class="job-body">
                    <div><b>Meter:</b> ${job.MeterReading || '-'} (Next: ${job.NextServiceMeter || '-'})</div>
                    <div><b>Site:</b> ${job.SiteLocation || '-'} </div>
                    <div><b>Total Cost:</b> <strong style="color:var(--accent-orange);">${formatCurrency(job.GrandTotal)}</strong></div>
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

function setFormInputsState(disabled) {
    const inputs = document.getElementById('serviceForm').querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.id !== 'ns-vehicle-search') {
            input.disabled = disabled;
        }
    });
}

function openNewServiceSheet() {
    isViewMode = false;
    document.getElementById('serviceForm').reset();
    
    // Enable form fields
    setFormInputsState(false);

    // Hide print button, show save button
    document.getElementById('btn-print-invoice').style.display = 'none';
    document.getElementById('btn-save-job').style.display = 'block';

    // Prepopulate date
    document.getElementById('ns-date').valueAsDate = new Date();

    // Toggle vehicle search UI (if vehicle is locked, hide search)
    const pickerContainer = document.getElementById('ns-vehicle-picker-container');
    if (currentServiceVehicleId) {
        pickerContainer.style.display = 'none';
        selectVehicleForForm(currentServiceVehicleId);
    } else {
        pickerContainer.style.display = 'block';
        document.getElementById('ns-vehicle-search').value = '';
    }

    // Reset math display
    document.getElementById('ns-parts-subtotal').textContent = 'Rs 0.00';
    document.getElementById('ns-labour-rate').textContent = '-';
    document.getElementById('ns-labour-charge').textContent = 'Rs 0.00';
    document.getElementById('ns-sundry-rate').textContent = '-';
    document.getElementById('ns-sundry-charge').textContent = 'Rs 0.00';
    document.getElementById('ns-grand-total').textContent = 'Rs 0.00';

    openModal('newServiceModal');
}

function viewServiceSheet(job) {
    isViewMode = true;
    document.getElementById('serviceForm').reset();
    
    // Disable inputs
    setFormInputsState(true);

    // Show print button, hide save button
    document.getElementById('btn-print-invoice').style.display = 'block';
    document.getElementById('btn-save-job').style.display = 'none';

    // Hide vehicle picker container
    document.getElementById('ns-vehicle-picker-container').style.display = 'none';

    // Populate header info
    document.getElementById('ns-date').value = job.ServiceDate;
    document.getElementById('ns-jobno').value = job.JobNo || '';
    document.getElementById('ns-meter').value = job.MeterReading || '';
    document.getElementById('ns-nextmeter').value = job.NextServiceMeter || '';
    document.getElementById('ns-type').value = job.ServiceType || '';
    document.getElementById('ns-site').value = job.SiteLocation || '';
    document.getElementById('ns-repair').value = job.RepairDetails || '';
    
    const upkeepRadio = document.querySelector(`input[name="ns-upkeep"][value="${job.UpkeepingStatus}"]`);
    if (upkeepRadio) upkeepRadio.checked = true;

    // Fill Vehicle code details
    const v = globalData.vehicles.find(x => x.VehicleID == job.VehicleID);
    if (v) {
        document.getElementById('ns-regid').value = v.SequenceNo || '';
        document.getElementById('ns-eccode').value = v.ECNumber || '';
        document.getElementById('ns-model').value = (v.Brand + ' ' + (v.ModelNo || v.VehicleType || '')).substring(0, 30);
    }

    // Populate Oils rows
    oilList.forEach((name, i) => {
        const o = job.oils.find(oil => oil.OilName === name);
        if (o) {
            document.getElementById(`oil-type-${i}`).value = o.OilType || '';
            document.getElementById(`oil-cv-${i}`).value = o.ActionType || '';
            document.getElementById(`oil-l-${i}`).value = o.Quantity || '';
            document.getElementById(`oil-price-${i}`).value = o.Price || '';
        }
    });

    // Populate Filters rows
    filterList.forEach((category, i) => {
        const f = job.filters.find(filt => filt.FilterCategory === category);
        if (f) {
            document.getElementById(`flt-no-${i}`).value = f.FilterNo || '';
            document.getElementById(`flt-xe-${i}`).value = f.ActionType || '';
            document.getElementById(`flt-price-${i}`).value = f.Price || '';
        }
    });

    // Populate costs rows
    for (let i = 1; i <= 5; i++) {
        const c = job.costs[i - 1];
        if (c) {
            document.getElementById(`cost-desc-${i}`).value = c.CostDescription || '';
            document.getElementById(`cost-unit-${i}`).value = c.Unit || '';
            document.getElementById(`cost-rate-${i}`).value = c.Rate || '';
            document.getElementById(`cost-qty-${i}`).value = c.Qty || '';
            document.getElementById(`cost-amt-${i}`).value = c.Amount || '';
        }
    }

    // Populate math calculations from DB snapshot
    document.getElementById('ns-parts-subtotal').textContent = formatCurrency(job.PartsSubtotal || 0);
    document.getElementById('ns-labour-rate').textContent = (job.LabourRate || 0).toFixed(1);
    document.getElementById('ns-labour-charge').textContent = formatCurrency(job.LabourCharge || 0);
    document.getElementById('ns-sundry-rate').textContent = (job.SundryRate || 0).toFixed(1);
    document.getElementById('ns-sundry-charge').textContent = formatCurrency(job.SundryCharge || 0);
    document.getElementById('ns-grand-total').textContent = formatCurrency(job.GrandTotal || 0);

    openModal('newServiceModal');
}

async function submitServiceJob(e) {
    e.preventDefault();
    if (isViewMode) return;

    if (!currentServiceVehicleId) {
        alert('Please select a vehicle first.');
        return;
    }
    
    // Live calculation snapshot
    const partsSubtotal = parseFloat(document.getElementById('ns-parts-subtotal').textContent.replace(/[^\d.]/g, '')) || 0;
    const labourRate = parseFloat(document.getElementById('ns-labour-rate').textContent) || 0;
    const labourCharge = parseFloat(document.getElementById('ns-labour-charge').textContent.replace(/[^\d.]/g, '')) || 0;
    const sundryRate = parseFloat(document.getElementById('ns-sundry-rate').textContent) || 0;
    const sundryCharge = parseFloat(document.getElementById('ns-sundry-charge').textContent.replace(/[^\d.]/g, '')) || 0;
    const grandTotal = parseFloat(document.getElementById('ns-grand-total').textContent.replace(/[^\d.]/g, '')) || 0;

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
        costs: [],
        partsSubtotal,
        labourRate,
        labourCharge,
        sundryRate,
        sundryCharge,
        grandTotal
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
            
            // Refresh views if they are open
            if (window.location.hash === '#/daily-log' && typeof loadDailyLogServices === 'function') {
                loadDailyLogServices();
            } else if (window.location.hash === '#/service-records' && typeof searchServiceRecords === 'function') {
                searchServiceRecords();
            } else if (currentServiceVehicleId) {
                openServiceHistory(currentServiceVehicleId);
            }
            
            if (typeof loadRecentServices === 'function') {
                loadRecentServices();
            }
        } else {
            alert('Failed to save: ' + result.error);
        }
    } catch(err) {
        console.error(err);
        alert('Server error saving service job!');
    }
}

function printInvoice() {
    window.print();
}
