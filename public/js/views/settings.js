// ============================================================
//  Settings — labour / sundry rates and company details
// ============================================================
async function loadSettingsView() {
    const panel = document.getElementById('settings-panel');
    panel.innerHTML = '<div class="loading">Loading…</div>';
    try {
        const { settings } = await api('/api/settings');
        panel.innerHTML = `
        <h2>Charge Rates</h2>
        <p class="muted small">Labour is charged as a percentage of the parts subtotal (oils + filters + other costs).
           A lower rate applies once the parts subtotal goes above the threshold. Sundry is a flat percentage of the parts subtotal.</p>
        <div class="form-grid">
            <label>Labour % at / below threshold</label>
            <input type="number" step="0.1" id="set-low" value="${esc(settings.labour_rate_low)}">
            <label>Labour % above threshold</label>
            <input type="number" step="0.1" id="set-high" value="${esc(settings.labour_rate_high)}">
            <label>Threshold (Rs)</label>
            <input type="number" step="1" id="set-thr" value="${esc(settings.labour_threshold)}">
            <label>Sundry %</label>
            <input type="number" step="0.1" id="set-sundry" value="${esc(settings.sundry_rate)}">
        </div>
        <h2 style="margin-top:24px">Company</h2>
        <div class="form-grid">
            <label>Company name</label>
            <input type="text" id="set-company" value="${esc(settings.company_name)}">
            <label>Form title</label>
            <input type="text" id="set-formtitle" value="${esc(settings.form_title)}">
            <label>Currency symbol</label>
            <input type="text" id="set-currency" value="${esc(settings.currency)}">
        </div>
        <div class="settings-preview" id="set-preview"></div>
        <div style="margin-top:20px"><button class="btn btn-primary" onclick="saveSettings()">Save Settings</button></div>`;
        ['set-low','set-high','set-thr','set-sundry'].forEach(id => document.getElementById(id).addEventListener('input', settingsPreview));
        settingsPreview();
    } catch (e) { panel.innerHTML = '<div class="empty-note err">Error: ' + esc(e.message) + '</div>'; }
}

function settingsPreview() {
    const low = parseFloat(document.getElementById('set-low').value) || 0;
    const high = parseFloat(document.getElementById('set-high').value) || 0;
    const thr = parseFloat(document.getElementById('set-thr').value) || 0;
    const sundry = parseFloat(document.getElementById('set-sundry').value) || 0;
    const ex = (parts) => {
        const rate = parts > thr ? high : low;
        const labour = Math.round(parts * rate) / 100;
        const sun = Math.round(parts * sundry) / 100;
        return `Parts ${fmtMoney(parts)} → Labour ${rate}% = ${fmtMoney(labour)}, Sundry ${sundry}% = ${fmtMoney(sun)}, <b>Total ${fmtMoney(parts + labour + sun)}</b>`;
    };
    document.getElementById('set-preview').innerHTML =
        `<div class="muted small">Examples:</div><div class="small">${ex(8000)}</div><div class="small">${ex(25000)}</div>`;
}

async function saveSettings() {
    const body = {
        labour_rate_low: document.getElementById('set-low').value,
        labour_rate_high: document.getElementById('set-high').value,
        labour_threshold: document.getElementById('set-thr').value,
        sundry_rate: document.getElementById('set-sundry').value,
        company_name: document.getElementById('set-company').value,
        form_title: document.getElementById('set-formtitle').value,
        currency: document.getElementById('set-currency').value
    };
    try {
        const res = await api('/api/settings', 'PUT', body);
        globalData.rates = res.rates;
        globalData.settings = res.settings;
        toast('Settings saved');
    } catch (e) { toast('Save failed: ' + e.message, 'err'); }
}
