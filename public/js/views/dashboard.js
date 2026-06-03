// Dashboard View Logic

async function loadRecentServices() {
    // 1. Load summary
    loadMonthlySummary();
    
    // 2. Load recent
    const listEl = document.getElementById('recent-services-list');
    listEl.innerHTML = '<div class="loading">Loading recent services...</div>';
    
    try {
        const res = await fetch('/api/services/recent');
        const jobs = await res.json();
        
        if (jobs.length === 0) {
            listEl.innerHTML = '<div style="color:var(--text-muted)">No recent service jobs found.</div>';
            return;
        }

        let html = '';
        jobs.forEach(job => {
            // Find the vehicle info
            const v = globalData.vehicles.find(v => v.VehicleID == job.VehicleID) || {};
            const dateStr = job.ServiceDate;
            const vehName = v.ECNumber ? `${v.ECNumber} - ${v.VehicleType}` : `Vehicle ID: ${job.VehicleID}`;

            html += `
            <div class="recent-item" onclick="openServiceHistory('${v.VehicleID}', '${v.ECNumber}', '${v.Brand}', '${v.ModelNo}', '${v.RegistrationNo}')">
                <div class="recent-date">${dateStr}</div>
                <div class="recent-vehicle">${vehName}</div>
                <div class="recent-job">Job No: ${job.JobNo || '-'} | <span style="color:var(--accent-orange); font-weight:600;">${formatCurrency(job.GrandTotal)}</span></div>
            </div>`;
        });

        listEl.innerHTML = html;
    } catch(err) {
        console.error(err);
        listEl.innerHTML = `<div style="color:var(--accent-rose)">Error loading recent services.</div>`;
    }
}

async function loadMonthlySummary() {
    const listEl = document.getElementById('monthly-summary-list');
    if (!listEl) return;
    
    try {
        const res = await fetch('/api/services/summary');
        const summary = await res.json();
        
        if (summary.length === 0) {
            listEl.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--text-muted)">No service records found.</td></tr>';
            return;
        }

        let html = '';
        summary.forEach(row => {
            let displayMonth = row.MonthVal;
            try {
                const parts = row.MonthVal.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                displayMonth = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            } catch (e) {}

            html += `
            <tr>
                <td style="padding:10px 8px; font-weight:600; color:var(--text-primary);">${displayMonth}</td>
                <td style="padding:10px 8px; font-weight:600; color:var(--accent-orange);">${row.Count}</td>
            </tr>`;
        });

        listEl.innerHTML = html;
    } catch(err) {
        console.error(err);
        listEl.innerHTML = `<tr><td colspan="2" style="color:var(--accent-rose)">Error loading summary.</td></tr>`;
    }
}
