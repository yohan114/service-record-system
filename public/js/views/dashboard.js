// Dashboard View Logic

async function loadRecentServices() {
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
            const dateStr = new Date(job.ServiceDate).toLocaleDateString();
            const vehName = v.ECNumber ? `${v.ECNumber} - ${v.VehicleType}` : `Vehicle ID: ${job.VehicleID}`;

            html += `
            <div class="recent-item" onclick="openServiceHistory('${v.VehicleID}', '${v.ECNumber}', '${v.Brand}', '${v.ModelNo}', '${v.RegistrationNo}')">
                <div class="recent-date">${dateStr}</div>
                <div class="recent-vehicle">${vehName}</div>
                <div class="recent-job">Job No: ${job.JobNo || '-'}</div>
            </div>`;
        });

        listEl.innerHTML = html;
    } catch(err) {
        console.error(err);
        listEl.innerHTML = `<div style="color:var(--accent-rose)">Error loading recent services.</div>`;
    }
}
