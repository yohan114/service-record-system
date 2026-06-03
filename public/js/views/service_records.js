// Service Records Search View Logic

function initServiceRecords() {
    // Clear search and load default list on view entry
    document.getElementById('sr-search-query').value = '';
    document.getElementById('sr-start-date').value = '';
    document.getElementById('sr-end-date').value = '';
    
    searchServiceRecords();
}

async function searchServiceRecords() {
    const query = document.getElementById('sr-search-query').value.trim();
    const startDate = document.getElementById('sr-start-date').value;
    const endDate = document.getElementById('sr-end-date').value;
    
    const resultsContainer = document.getElementById('sr-results-list');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<div class="loading">Searching service records...</div>';
    
    try {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`/api/services/search?${params.toString()}`);
        const jobs = await response.json();
        
        if (!jobs || jobs.length === 0) {
            resultsContainer.innerHTML = '<div class="no-records">No service records match your search criteria.</div>';
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
                        <span>Date: ${job.ServiceDate} | Job No: ${job.JobNo || '-'}</span>
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
        resultsContainer.innerHTML = html;
        
    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = '<div style="color:var(--accent-rose)">Failed to search service records.</div>';
    }
}

function resetSearchRecords() {
    document.getElementById('sr-search-query').value = '';
    document.getElementById('sr-start-date').value = '';
    document.getElementById('sr-end-date').value = '';
    searchServiceRecords();
}
