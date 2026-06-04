// ============================================================
//  Service Records — global, searchable history
//  (so anyone can quickly look up a vehicle's service record)
// ============================================================
let recOffset = 0;
let recLoadedAll = false;
let recTimer = null;

function initRecordsView() { recOffset = 0; loadRecords(); }
function debounceRecords() { clearTimeout(recTimer); recTimer = setTimeout(() => { recOffset = 0; loadRecords(); }, 250); }
function clearRecordFilters() {
    ['recSearch', 'recFrom', 'recTo', 'recSite'].forEach(id => document.getElementById(id).value = '');
    recOffset = 0; loadRecords();
}

function recordQuery(limit, offset) {
    const p = new URLSearchParams();
    const q = document.getElementById('recSearch').value.trim();
    const from = document.getElementById('recFrom').value;
    const to = document.getElementById('recTo').value;
    const site = document.getElementById('recSite').value.trim();
    if (q) p.set('q', q);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (site) p.set('site', site);
    p.set('limit', limit); p.set('offset', offset);
    return '/api/services?' + p.toString();
}

async function loadRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<div class="loading">Loading…</div>';
    recOffset = 0; recLoadedAll = false;
    try {
        const data = await api(recordQuery(100, 0));
        document.getElementById('recCount').textContent = `${data.total} record${data.total === 1 ? '' : 's'}`;
        if (!data.jobs.length) { list.innerHTML = '<div class="empty-note">No matching records.</div>'; document.getElementById('recMoreBtn').style.display = 'none'; return; }
        list.innerHTML = data.jobs.map(recordRow).join('');
        recOffset = data.jobs.length;
        recLoadedAll = recOffset >= data.total;
        document.getElementById('recMoreBtn').style.display = recLoadedAll ? 'none' : 'inline-block';
    } catch (e) { list.innerHTML = '<div class="empty-note err">Error: ' + esc(e.message) + '</div>'; }
}

async function loadMoreRecords() {
    if (recLoadedAll) return;
    try {
        const data = await api(recordQuery(100, recOffset));
        document.getElementById('records-list').insertAdjacentHTML('beforeend', data.jobs.map(recordRow).join(''));
        recOffset += data.jobs.length;
        recLoadedAll = recOffset >= data.total;
        document.getElementById('recMoreBtn').style.display = recLoadedAll ? 'none' : 'inline-block';
    } catch (e) { toast('Error: ' + e.message, 'err'); }
}
