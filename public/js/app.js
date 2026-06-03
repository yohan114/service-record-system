let globalData = {
    vehicles: [],
    filters: [],
    links: [],
    prices: [],
    genuine: [],
    categories: new Set(),
    brands: new Set(),
    types: new Set()
};

// Simple Hash Router
function handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (hash === '#/fleet') {
        document.getElementById('view-fleet').style.display = 'block';
        document.getElementById('nav-fleet').classList.add('active');
        if (typeof renderResults === 'function') renderResults();
    } else {
        document.getElementById('view-dashboard').style.display = 'block';
        document.getElementById('nav-dashboard').classList.add('active');
        loadRecentServices();
    }
}

window.addEventListener('hashchange', handleRoute);

async function initApp() {
    try {
        const response = await fetch('/api/catalog');
        const db = await response.json();
        
        globalData.vehicles = db.vehicles;
        globalData.filters = db.filters || [];
        globalData.links = db.links || [];
        globalData.prices = db.prices || [];
        globalData.genuine = db.genuine || [];
        
        db.vehicles.forEach(v => {
            if(v.VehicleType) globalData.types.add(v.VehicleType.trim().toUpperCase());
            if(v.Brand) globalData.brands.add(v.Brand.trim().toUpperCase());
        });
        
        // Extract filter categories from geMap logic dynamically
        globalData.filters.forEach(link => {
            if(link.FilterCategory) globalData.categories.add(link.FilterCategory.trim().toUpperCase());
        });

        document.getElementById('statVehicles').textContent = globalData.vehicles.length;
        document.getElementById('statFilters').textContent = db.filters.length;
        
        // Init Fleet View logic if exists
        if (typeof initFleetView === 'function') {
            initFleetView();
        }

        // Init Form Matrix logic if exists
        if (typeof renderFormMatrices === 'function') {
            renderFormMatrices();
        }

        handleRoute(); // initial route

    } catch (err) {
        console.error("Error loading data:", err);
        document.getElementById('loadingState').innerHTML = `<div style="color:red">Failed to connect to database.<br>${err.message}</div>`;
    }
}

// Utility: Format Currency
function formatCurrency(num) {
    if(!num || num == '0') return '-';
    return "Rs " + parseFloat(num).toLocaleString('en-US', {minimumFractionDigits: 2});
}

function closeModal(id) {
    document.getElementById(id).classList.remove('visible');
}
function openModal(id) {
    document.getElementById(id).classList.add('visible');
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);
