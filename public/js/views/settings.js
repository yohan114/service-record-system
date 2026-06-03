// Settings View Logic

function initSettingsView() {
    // Populate form with current cached settings
    const settings = globalData.settings;
    
    document.getElementById('set-labour-under').value = settings.labour_rate_under_threshold || '20';
    document.getElementById('set-labour-over').value = settings.labour_rate_over_threshold || '15';
    document.getElementById('set-labour-threshold').value = settings.labour_threshold || '10000';
    document.getElementById('set-sundry-rate').value = settings.sundry_rate || '5';
}

async function saveSettings(e) {
    e.preventDefault();
    
    const payload = {
        labour_rate_under_threshold: document.getElementById('set-labour-under').value,
        labour_rate_over_threshold: document.getElementById('set-labour-over').value,
        labour_threshold: document.getElementById('set-labour-threshold').value,
        sundry_rate: document.getElementById('set-sundry-rate').value
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Settings updated successfully!');
            // Update local cache
            globalData.settings = { ...globalData.settings, ...payload };
        } else {
            alert('Failed to save settings: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Server error saving settings.');
    }
}
