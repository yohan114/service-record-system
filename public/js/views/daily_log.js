// Daily Service Log View Logic

function initDailyLog() {
    const dateInput = document.getElementById('dl-date');
    if (!dateInput) return;

    if (!dateInput.value) {
        // Default to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Load services initially
    loadDailyLogServices();

    // Event listener for date change
    dateInput.removeEventListener('change', loadDailyLogServices);
    dateInput.addEventListener('change', loadDailyLogServices);
}

async function loadDailyLogServices() {
    const dateInput = document.getElementById('dl-date');
    const listContainer = document.getElementById('dl-services-list');
    if (!dateInput || !listContainer) return;

    const dateVal = dateInput.value;
    listContainer.innerHTML = '<div class="loading">Loading services for ' + dateVal + '...</div>';

    try {
        const response = await fetch(`/api/services/daily?date=${dateVal}`);
        const jobs = await response.json();

        if (!jobs || jobs.length === 0) {
            listContainer.innerHTML = '<div class="no-records">No service jobs recorded for ' + dateVal + '.</div>';
            return;
        }

        let html = '';
        jobs.forEach(job => {
            const ecDisplay = job.ECNumber ? `[${job.ECNumber}] ` : '';
            const regDisplay = job.RegistrationNo ? `(${job.RegistrationNo}) ` : '';
            const vehicleInfo = `${ecDisplay}${regDisplay}${job.Brand || ''} ${job.ModelNo || ''}`;
            
            let oilsTxt = job.oils.map(o => `<li><b>${o.OilName}</b> - ${o.Quantity}L</li>`).join('');
            let filtersTxt = job.filters.map(f => `<li><b>${f.FilterCategory}</b>: ${f.FilterNo}</li>`).join('');

            html += `
                <div class="job-card" onclick='viewServiceSheet(${JSON.stringify(job).replace(/'/g, "&apos;")})' style="cursor:pointer">
                    <div class="job-header">
                        <span>Job No: ${job.JobNo || '-'}</span>
                        <strong style="color:var(--accent-orange);">${formatCurrency(job.GrandTotal)}</strong>
                    </div>
                    <div class="job-body">
                        <div><b>Vehicle:</b> ${vehicleInfo}</div>
                        <div><b>Meter:</b> ${job.MeterReading || '-'} (Next: ${job.NextServiceMeter || '-'})</div>
                        <div><b>Site:</b> ${job.SiteLocation || '-'} </div>
                        <div style="display:flex; gap:16px; margin-top:12px;">
                            <div style="flex:1;">
                                <b style="color:var(--text-primary)">Oils:</b>
                                <ul style="margin:0; padding-left:15px; font-size:12px;">${oilsTxt || 'None'}</ul>
                            </div>
                            <div style="flex:1;">
                                <b style="color:var(--text-primary)">Filters:</b>
                                <ul style="margin:0; padding-left:15px; font-size:12px;">${filtersTxt || 'None'}</ul>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        listContainer.innerHTML = html;

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div style="color:var(--accent-rose)">Failed to load daily log services.</div>';
    }
}

function openNewServiceSheetFromDailyLog() {
    const dateInput = document.getElementById('dl-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    // Clear current vehicle select since user will pick one from dropdown
    currentServiceVehicleId = null;
    
    // Open sheet
    openNewServiceSheet();

    // Override date with the selected date from daily log
    document.getElementById('ns-date').value = selectedDate;
}
