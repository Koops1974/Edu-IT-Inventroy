// ===== Asset Management Module =====
const AssetManager = {
    assets: [],
    schools: [],
    filteredAssets: [],
    currentPage: 1,
    pageSize: 10,
    sortField: 'name',
    sortDirection: 'asc',
    filters: {
        search: '',
        type: '',
        status: '',
        location: ''
    },
    
    // Constants
    ASSET_TYPES: {
        laptop: { label: 'Laptop', icon: 'fa-laptop' },
        desktop: { label: 'Desktop', icon: 'fa-desktop' },
        tablet: { label: 'Tablet', icon: 'fa-tablet-alt' },
        printer: { label: 'Printer', icon: 'fa-print' },
        network: { label: 'Network', icon: 'fa-network-wired' },
        peripheral: { label: 'Peripheral', icon: 'fa-usb' },
        software: { label: 'Software', icon: 'fa-copyright' },
        other: { label: 'Other', icon: 'fa-box' }
    },
    
    STATUS_LIST: {
        available: 'Available',
        'in-use': 'In Use',
        repair: 'Needs Repair',
        retired: 'Retired'
    },
    
    // Load all data from GitHub
    async loadAll() {
        UI.showLoading('Loading data from GitHub...');
        try {
            // Load schools first (needed for asset references)
            this.schools = await GitHubAPI.loadSchools();
            
            // Load assets
            const data = await GitHubAPI.loadAssets();
            this.assets = data;
            
            this.applyFilters();
            this.updateUI();
            UI.hideLoading();
            return true;
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
            return false;
        }
    },
    
    // Add new asset
    async addAsset(asset) {
        UI.showLoading('Saving asset...');
        try {
            asset.id = this.generateId();
            asset.createdAt = new Date().toISOString();
            asset.lastUpdated = new Date().toISOString();
            
            this.assets.push(asset);
            await this.saveToGithub('Add asset: ' + asset.name);
            
            this.applyFilters();
            this.updateUI();
            UI.hideLoading();
            return true;
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
            return false;
        }
    },
    
    // Update existing asset
    async updateAsset(asset) {
        UI.showLoading('Saving changes...');
        try {
            const index = this.assets.findIndex(a => a.id === asset.id);
            if (index === -1) {
                throw new Error('Asset not found');
            }
            
            asset.lastUpdated = new Date().toISOString();
            this.assets[index] = asset;
            await this.saveToGithub('Update asset: ' + asset.name);
            
            this.applyFilters();
            this.updateUI();
            UI.hideLoading();
            return true;
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
            return false;
        }
    },
    
    // Delete asset
    async deleteAsset(id) {
        UI.showLoading('Deleting asset...');
        try {
            const asset = this.assets.find(a => a.id === id);
            this.assets = this.assets.filter(a => a.id !== id);
            await this.saveToGithub('Delete asset: ' + (asset ? asset.name : id));
            
            this.applyFilters();
            this.updateUI();
            UI.hideLoading();
            return true;
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
            return false;
        }
    },
    
    // Generate unique ID
    generateId() {
        return 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Save assets to GitHub
    async saveToGithub(message) {
        try {
            await GitHubAPI.saveAssets(this.assets, message);
            UI.updateLastSync();
        } catch (error) {
            throw error;
        }
    },
    
    // Get school name by ID
    getSchoolName(schoolId) {
        if (schoolId === 'all') return 'All Schools';
        const school = this.schools.find(s => s.id === schoolId);
        return school ? school.name : 'Unknown';
    },
    
    // Get school by ID
    getSchool(schoolId) {
        return this.schools.find(s => s.id === schoolId);
    },
    
    // Apply filters to assets
    applyFilters() {
        const { search, type, status, location } = this.filters;
        const schoolFilter = document.getElementById('current-school').value;
        
        this.filteredAssets = this.assets.filter(asset => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const searchable = `${asset.name} ${asset.serial || ''} ${asset.model || ''} ${asset.location || ''} ${asset.assignedTo || ''} ${asset.manufacturer || ''}`.toLowerCase();
                if (!searchable.includes(searchLower)) return false;
            }
            
            // Type filter
            if (type && asset.type !== type) return false;
            
            // Status filter
            if (status && asset.status !== status) return false;
            
            // Location filter
            if (location && asset.location !== location) return false;
            
            // School filter
            if (schoolFilter !== 'all' && asset.schoolId !== schoolFilter) return false;
            
            return true;
        });
        
        // Apply sorting
        this.sortAssets();
    },
    
    // Sort assets
    sortAssets() {
        const { sortField, sortDirection } = this;
        
        this.filteredAssets.sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (sortField === 'type') {
                valA = this.ASSET_TYPES[valA] ? this.ASSET_TYPES[valA].label.toLowerCase() : valA;
                valB = this.ASSET_TYPES[valB] ? this.ASSET_TYPES[valB].label.toLowerCase() : valB;
            }
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.currentPage = 1;
    },
    
    // Get current page items
    getCurrentPageItems() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredAssets.slice(start, start + this.pageSize);
    },
    
    // Get all unique locations
    getUniqueLocations() {
        const locations = new Set();
        this.assets.forEach(a => {
            if (a.location) locations.add(a.location);
        });
        return Array.from(locations).sort();
    },
    
    // Get asset count for school
    getSchoolAssetCount(schoolId) {
        return this.assets.filter(a => a.schoolId === schoolId).length;
    },
    
    // Import assets from CSV data
    async importAssets(newAssets) {
        UI.showLoading(`Importing ${newAssets.length} assets...`);
        try {
            let added = 0;
            for (const data of newAssets) {
                const asset = this.mapCsvAsset(data);
                if (asset && asset.name) {
                    asset.id = this.generateId();
                    asset.createdAt = new Date().toISOString();
                    asset.lastUpdated = new Date().toISOString();
                    this.assets.push(asset);
                    added++;
                }
            }
            
            if (added > 0) {
                await this.saveToGithub(`Import ${added} assets from CSV`);
            }
            
            this.applyFilters();
            this.updateUI();
            UI.hideLoading();
            UI.showToast(`Successfully imported ${added} assets`, 'success');
            return { added: added };
        } catch (error) {
            UI.hideLoading();
            UI.showToast(error.message, 'error');
            return { added: 0, error: error.message };
        }
    },
    
    // Map CSV data to asset object
    mapCsvAsset(data) {
        const asset = {};
        
        // Name
        if (data.name) asset.name = data.name.trim();
        if (data.assetname) asset.name = data.assetname.trim();
        if (data.itemname) asset.name = data.itemname.trim();
        
        // Type
        if (data.type) {
            const type = data.type.toLowerCase().trim();
            const typeMap = {
                'laptop': 'laptop', 'laptops': 'laptop', 'notebook': 'laptop', 'notebooks': 'laptop',
                'desktop': 'desktop', 'desktops': 'desktop', 'computer': 'desktop', 'pc': 'desktop', 'tower': 'desktop',
                'tablet': 'tablet', 'tablets': 'tablet', 'ipad': 'tablet',
                'printer': 'printer', 'printers': 'printer',
                'server': 'network', 'router': 'network', 'switch': 'network', 'network': 'network', 'switchgear': 'network',
                'monitor': 'peripheral', 'keyboard': 'peripheral', 'mouse': 'peripheral', 'peripheral': 'peripheral', 'peripherals': 'peripheral',
                'software': 'software', 'license': 'software', 'licence': 'software',
                'other': 'other'
            };
            asset.type = typeMap[type] || 'other';
        } else {
            asset.type = 'other';
        }
        
        // Serial number
        asset.serial = (data.serial || data.serialnumber || '').trim();
        
        // Model
        asset.model = (data.model || '').trim();
        
        // Manufacturer
        asset.manufacturer = (data.manufacturer || data.brand || data.make || '').trim();
        
        // Location
        asset.location = (data.location || data.room || data.roomnumber || '').trim();
        
        // Status
        if (data.status) {
            const status = data.status.toLowerCase().trim();
            const statusMap = {
                'available': 'available', 'avail': 'available', 'in stock': 'available', 'ok': 'available',
                'in use': 'in-use', 'inuse': 'in-use', 'assigned': 'in-use', 'deployed': 'in-use',
                'repair': 'repair', 'repairs': 'repair', 'faulty': 'repair', 'broken': 'repair', 'damaged': 'repair',
                'retired': 'retired', 'retire': 'retired', 'disposed': 'retired', 'disposed of': 'retired'
            };
            asset.status = statusMap[status] || 'available';
        } else {
            asset.status = 'available';
        }
        
        // School
        if (data.school) {
            const schoolName = data.school.trim();
            const school = this.schools.find(s => s.name.toLowerCase() === schoolName.toLowerCase());
            if (school) {
                asset.schoolId = school.id;
            } else {
                // Try to match by code
                const schoolByCode = this.schools.find(s => s.code && s.code.toLowerCase() === schoolName.toLowerCase());
                asset.schoolId = schoolByCode ? schoolByCode.id : (this.schools[0] ? this.schools[0].id : '');
            }
        } else {
            asset.schoolId = this.schools[0] ? this.schools[0].id : '';
        }
        
        // Assignment
        asset.assignedTo = (data.assignedto || data.assigned || data.owner || data.user || '').trim();
        
        // Dates
        if (data.purchasedate || data.purchased) {
            asset.purchaseDate = (data.purchasedate || data.purchased || '').trim();
        }
        
        // Additional fields
        asset.ipAddress = (data.ip || data.ipaddress || '').trim();
        
        // Notes
        asset.notes = (data.notes || data.comments || data.description || '').trim();
        
        // Only include assets with a name
        if (!asset.name) {
            return null;
        }
        
        return asset;
    }
};