// ============================================================
//  Daily Service Log — record / review services day by day
// ============================================================
function getDailyDate() { return document.getElementById('dailyDate').value; }
function setDailyToday() { document.getElementById('dailyDate').value = new Date().toISOString().slice(0, 10); loadDailyLog(); }
function shiftDay(delta) {
    const d = new Date(getDailyDate() || new Date());
    d.setDate(d.getDate() + delta);
    document.getElementById('dailyDate').value = d.toISOString().slice(0, 10);
    loadDailyLog();
}
function initDailyView() {
    if (!getDailyDate()) document.getElementById('dailyDate').value = new Date().toISOString().slice(0, 10);
    loadDailyLog();
}

async function loadDailyLog() {
    const date = getDailyDate();
    const list = document.getElementById('daily-list');
    const summary = document.getElementById('dailySummary');
    if (!date) return;
    list.innerHTML = '<div class="loading">Loading…</div>';
    try {
        const jobs = await api('/api/services/by-date/' + date);
        const total = jobs.reduce((s, j) => s + (j.GrandTotal || 0), 0);
        summary.innerHTML = `<div class="day-stat"><b>${jobs.length}</b> service${jobs.length === 1 ? '' : 's'} on ${fmtDate(date)}</div>
            ${total ? `<div class="day-stat">Day total: <b>${fmtMoney(total)}</b></div>` : ''}`;
        if (!jobs.length) { list.innerHTML = '<div class="empty-note">No services logged on this day. Use “Add Service for this day”.</div>'; return; }
        list.innerHTML = jobs.map(recordRow).join('');
    } catch (e) { list.innerHTML = '<div class="empty-note err">Error loading day.</div>'; }
}

// shared row renderer used by Daily Log and Service Records
function recordRow(job) {
    const filters = (job.filters || []).filter(f => f.FilterNo).map(f => esc(f.FilterNo)).slice(0, 4).join(', ');
    return `
    <div class="record-row" onclick="editService(${job.ServiceID})">
        <div class="rr-date">${fmtDate(job.ServiceDate)}</div>
        <div class="rr-main">
            <div class="rr-vehicle">${esc(job.DisplayName)} ${job.RegistrationNo ? '<span class="muted">· ' + esc(job.RegistrationNo) + '</span>' : ''}</div>
            <div class="rr-sub">${job.JobNo ? 'Job ' + esc(job.JobNo) + ' · ' : ''}${esc(job.SiteLocation || '')} ${job.MeterReading ? '· ' + esc(job.MeterReading) : ''}${filters ? ' · 🛢️ ' + filters : ''}</div>
        </div>
        <div class="rr-total">${job.GrandTotal ? fmtMoney(job.GrandTotal) : ''}</div>
    </div>`;
}
