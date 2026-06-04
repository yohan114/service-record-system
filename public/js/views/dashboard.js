// ============================================================
//  Dashboard: stats, recent activity, services-per-month
// ============================================================
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function loadDashboard() {
    try {
        const stats = await api('/api/stats');
        document.getElementById('statVehicles').textContent = stats.vehicles;
        document.getElementById('statServices').textContent = stats.services;
        document.getElementById('statMonth').textContent = stats.thisMonth;
        document.getElementById('statFilters').textContent = stats.filters;
        renderMonthly(stats.monthly || []);
    } catch (e) { console.error(e); }
    loadRecentServices();
}

function renderMonthly(rows) {
    const years = [...new Set(rows.map(r => r.yr))].sort();
    const grid = {}; // grid[mo][yr] = count
    rows.forEach(r => { (grid[r.mo] = grid[r.mo] || {})[r.yr] = r.c; });
    const totals = {}; years.forEach(y => totals[y] = 0);
    let html = `<table class="data-table"><thead><tr><th>Month</th>${years.map(y => `<th>${y}</th>`).join('')}</tr></thead><tbody>`;
    for (let m = 1; m <= 12; m++) {
        const mo = String(m).padStart(2, '0');
        html += `<tr><td>${MONTHS[m-1]}</td>` + years.map(y => {
            const c = (grid[mo] && grid[mo][y]) || 0; totals[y] += c;
            return `<td>${c || ''}</td>`;
        }).join('') + '</tr>';
    }
    html += `<tr class="total-row"><td>Total</td>${years.map(y => `<td>${totals[y]}</td>`).join('')}</tr>`;
    html += '</tbody></table>';
    document.getElementById('monthly-table').innerHTML = years.length ? html : '<div class="empty-note">No dated services yet.</div>';
}

async function loadRecentServices() {
    const el = document.getElementById('recent-services-list');
    el.innerHTML = '<div class="loading">Loading…</div>';
    try {
        const jobs = await api('/api/services/recent');
        if (!jobs.length) { el.innerHTML = '<div class="empty-note">No recent service jobs.</div>'; return; }
        el.innerHTML = jobs.slice(0, 20).map(job => `
            <div class="recent-item" onclick="editService(${job.ServiceID})">
                <div class="recent-date">${fmtDate(job.ServiceDate)}</div>
                <div class="recent-vehicle">${esc(job.DisplayName)}${job.SiteLocation ? ' · <span class="muted">' + esc(job.SiteLocation) + '</span>' : ''}</div>
                <div class="recent-job">${job.GrandTotal ? fmtMoney(job.GrandTotal) : (job.JobNo ? 'Job ' + esc(job.JobNo) : '')}</div>
            </div>`).join('');
    } catch (err) { el.innerHTML = '<div class="empty-note err">Error loading recent services.</div>'; }
}
