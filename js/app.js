// ===== Main UI Module =====
const UI = {
    init() {
        // Load config from localStorage
        Config.load();
        
        // Bind login form
        document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
        
        // Check if already logged in
        if (Auth.isLoggedIn()) {
            this.showDashboard();
            this.loadData();
        }
        
        // Bind navigation
        this.bindNavigation();
        this.bindModals();
        this.bindOtherEvents();
    },
    
    // Show loading overlay
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loading');
        document.getElementById('loading-text').textContent = text;
        overlay.style.display = 'flex';
    },
    
    // Hide loading overlay
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    },
    
    // Show toast notification
    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },
    
    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const token = document.getElementById('github-token').value.trim();
        const owner = document.getElementById('repo-owner').value.trim();
        const name = document.getElementById('repo-name').value.trim();
        const password = document.getElementById('access-password').value;
        
        try {
            const success = await Auth.login(token, owner, name, password);
            if (success) {
                this.showDashboard();
                await this.loadData();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },
    
    // Show dashboard screen
    showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
    },
    
    // Load all data
    async loadData() {
        const success = await AssetManager.loadAll();
        if (!success) {
            // Try to load schools for dropdowns even if assets fail
            if (AssetManager.schools.length === 0) {
                AssetManager.schools = [{ id: 'school-1', name: 'School 1', code: '', address: '', contact: '', email: '' }];
            }
            this.renderSchools();
            this.updateSchoolSelects();
        }
    },
    
    // Bind navigation events
    bindNavigation() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.section);
            });
        });
        
        // Menu toggle for mobile
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
        
        // School selector change
        document.getElementById('current-school').addEventListener('change', () => {
            AssetManager.applyFilters();
            this.renderAssets();
        });
        
        // Sync button
        document.getElementById('sync-btn').addEventListener('click', async () => {
            const success = await AssetManager.loadAll();
            if (success) {
                this.showToast('Data synced with GitHub', 'success');
            }
        });
    },
    
    // Navigate to a section
    navigateTo(section) {
        // Update nav active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Show section
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.toggle('active', sec.id === 'section-' + section);
        });
        
        // Special cases
        if (section === 'assets') {
            this.renderAssets();
        } else if (section === 'dashboard') {
            this.renderDashboard();
        } else if (section === 'add-asset') {
            this.resetAssetForm();
        } else if (section === 'schools') {
            this.renderSchools();
        } else if (section === 'csv-upload') {
            this.resetCsvUpload();
        }
        
        // Close sidebar for mobile
        document.querySelector('.sidebar').classList.remove('open');
    },
    
    // Update all UI after data changes
    updateUI() {
        this.updateSchoolSelects();
        this.renderStats();
        this.renderDashboard();
        this.renderAssets();
        this.renderLocationFilter();
        UI.updateLastSync();
    },
    
    // Update last sync time
    updateLastSync() {
        const now = new Date();
        document.getElementById('last-sync').textContent = `Synced: ${now.toLocaleTimeString()}`;
    },
    
    // ===== School Selects =====
    updateSchoolSelects() {
        // Update school selector in topbar
        const select = document.getElementById('current-school');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="all">All Schools</option>';
        AssetManager.schools.forEach(school => {
            const option = document.createElement('option');
            option.value = school.id;
            option.textContent = school.name;
            select.appendChild(option);
        });
        
        if (currentValue && Array.from(select.options).some(o => o.value === currentValue)) {
            select.value = currentValue;
        }
        
        // Update school dropdown in asset form
        const formSchool = document.getElementById('asset-school');
        formSchool.innerHTML = '';
        AssetManager.schools.forEach(school => {
            const option = document.createElement('option');
            option.value = school.id;
            option.textContent = school.name;
            formSchool.appendChild(option);
        });
    },
    
    // ===== Dashboard =====
    renderStats() {
        const total = AssetManager.assets.length;
        const available = AssetManager.assets.filter(a => a.status === 'available').length;
        const inUse = AssetManager.assets.filter(a => a.status === 'in-use').length;
        const repair = AssetManager.assets.filter(a => a.status === 'repair').length;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-available').textContent = available;
        document.getElementById('stat-in-use').textContent = inUse;
        document.getElementById('stat-repair').textContent = repair;
    },
    
    renderDashboard() {
        // Assets by type
        const typeCounts = {};
        const locationCounts = {};
        
        AssetManager.assets.forEach(asset => {
            const type = asset.type || 'other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            
            const location = asset.location || 'Unknown';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });
        
        this.renderChart('chart-types', typeCounts, 'type');
        this.renderChart('chart-locations', locationCounts, 'location');
        
        // Recently updated
        this.renderRecent();
    },
    
    renderChart(elementId, counts, type) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const max = Math.max(...sorted.map(item => item[1]), 1);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
            return;
        }
        
        sorted.forEach(([key, value]) => {
            const item = document.createElement('div');
            item.className = 'chart-item';
            
            const label = document.createElement('span');
            label.className = 'chart-label';
            
            if (type === 'type') {
                label.textContent = AssetManager.ASSET_TYPES[key] ? AssetManager.ASSET_TYPES[key].label : key;
            } else {
                label.textContent = key;
            }
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            
            const fill = document.createElement('div');
            fill.className = 'chart-bar-fill';
            fill.style.width = `${(value / max) * 100}%`;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'chart-value';
            valueSpan.textContent = value;
            
            bar.appendChild(fill);
            item.appendChild(label);
            item.appendChild(bar);
            item.appendChild(valueSpan);
            container.appendChild(item);
        });
    },
    
    renderRecent() {
        const container = document.getElementById('recent-assets');
        container.innerHTML = '';
        
        const sorted = [...AssetManager.assets].sort((a, b) => {
            return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        }).slice(0, 8);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No assets yet</p></div>';
            return;
        }
        
        sorted.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            
            const icon = document.createElement('div');
            icon.className = 'recent-icon';
            icon.innerHTML = `<i class="fas ${AssetManager.ASSET_TYPES[asset.type] ? AssetManager.ASSET_TYPES[asset.type].icon : 'fa-box'}"></i>`;
            
            const info = document.createElement('div');
            info.className = 'recent-info';
            const h4 = document.createElement('h4');
            h4.textContent = asset.name;
            const p = document.createElement('p');
            p.textContent = `${AssetManager.ASSET_TYPES[asset.type] ? AssetManager.ASSET_TYPES[asset.type].label : asset.type} • ${this.getStatusLabel(asset.status)}`;
            info.appendChild(h4);
            info.appendChild(p);
            
            const time = document.createElement('span');
            time.className = 'recent-time';
            time.textContent = this.timeAgo(asset.lastUpdated);
            
            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(time);
            container.appendChild(item);
        });
    },
    
    // ===== Assets Table =====
    renderAssets() {
        const tbody = document.getElementById('assets-tbody');
        tbody.innerHTML = '';
        
        const items = AssetManager.getCurrentPageItems();
        
        if (items.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 9;
            td.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No assets found</h3><p>Try adjusting your filters or add a new asset</p></div>';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            items.forEach(asset => {
                const tr = document.createElement('tr');
                
                // Name
                const tdName = document.createElement('td');
                tdName.innerHTML = `<span class="type-icon"><i class="fas ${this.getTypeIcon(asset.type)}"></i> <strong>${this.escapeHtml(asset.name)}</strong></span>`;
                
                // Type
                const tdType = document.createElement('td');
                tdType.textContent = this.getTypeLabel(asset.type);
                
                // Serial
                const tdSerial = document.createElement('td');
                tdSerial.textContent = asset.serial || '-';
                
                // Model
                const tdModel = document.createElement('td');
                tdModel.textContent = asset.model || '-';
                
                // School
                const tdSchool = document.createElement('td');
                tdSchool.textContent = AssetManager.getSchoolName(asset.schoolId);
                
                // Location
                const tdLocation = document.createElement('td');
                tdLocation.textContent = asset.location || '-';
                
                // Status
                const tdStatus = document.createElement('td');
                tdStatus.innerHTML = `<span class="status-badge status-${asset.status}">${this.getStatusLabel(asset.status)}</span>`;
                
                // Assigned
                const tdAssigned = document.createElement('td');
                tdAssigned.textContent = asset.assignedTo || '-';
                
                // Actions
                const tdActions = document.createElement('td');
                tdActions.innerHTML = `
                    <div class="action-btns">
                        <button class="action-btn edit-asset" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete delete-asset" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                tdActions.querySelector('.edit-asset').addEventListener('click', () => this.editAsset(asset));
                tdActions.querySelector('.delete-asset').addEventListener('click', () => this.deleteAsset(asset));
                
                tr.appendChild(tdName);
                tr.appendChild(tdType);
                tr.appendChild(tdSerial);
                tr.appendChild(tdModel);
                tr.appendChild(tdSchool);
                tr.appendChild(tdLocation);
                tr.appendChild(tdStatus);
                tr.appendChild(tdAssigned);
                tr.appendChild(tdActions);
                
                tbody.appendChild(tr);
            });
        }
        
        this.renderPagination();
    },
    
    renderPagination() {
        const container = document.getElementById('pagination');
        container.innerHTML = '';
        
        const totalPages = Math.ceil(AssetManager.filteredAssets.length / AssetManager.pageSize);
        
        if (totalPages <= 1) return;
        
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === AssetManager.currentPage ? 'active' : '';
            btn.addEventListener('click', () => {
                AssetManager.currentPage = i;
                this.renderAssets();
            });
            container.appendChild(btn);
        }
    },
    
    renderLocationFilter() {
        const select = document.getElementById('filter-location');
        select.innerHTML = '<option value="">All Locations</option>';
        
        AssetManager.getUniqueLocations().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            select.appendChild(option);
        });
    },
    
    // ===== Asset Form =====
    resetAssetForm() {
        document.getElementById('asset-form').reset();
        document.getElementById('asset-id').value = '';
        document.getElementById('form-title').textContent = 'Add New Asset';
        document.getElementById('asset-status').value = 'available';
        
        const schoolSelect = document.getElementById('asset-school');
        if (AssetManager.schools.length > 0) {
            schoolSelect.value = AssetManager.schools[0].id;
        }
    },
    
    editAsset(asset) {
        // Navigate to form
        this.navigateTo('add-asset');
        
        document.getElementById('form-title').textContent = 'Edit Asset';
        document.getElementById('asset-id').value = asset.id;
        document.getElementById('asset-name').value = asset.name || '';
        document.getElementById('asset-type').value = asset.type || '';
        document.getElementById('asset-serial').value = asset.serial || '';
        document.getElementById('asset-model').value = asset.model || '';
        document.getElementById('asset-manufacturer').value = asset.manufacturer || '';
        document.getElementById('asset-purchase-date').value = asset.purchaseDate || '';
        document.getElementById('asset-school').value = asset.schoolId || '';
        document.getElementById('asset-location').value = asset.location || '';
        document.getElementById('asset-status').value = asset.status || 'available';
        document.getElementById('asset-assigned').value = asset.assignedTo || '';
        document.getElementById('asset-ip').value = asset.ipAddress || '';
        document.getElementById('asset-warranty').value = asset.warrantyExpiry || '';
        document.getElementById('asset-notes').value = asset.notes || '';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    async deleteAsset(asset) {
        // Show delete modal
        document.getElementById('delete-asset-name').textContent = asset.name;
        document.getElementById('delete-modal').classList.add('active');
        
        document.getElementById('confirm-delete').onclick = async () => {
            document.getElementById('delete-modal').classList.remove('active');
            await AssetManager.deleteAsset(asset.id);
            this.showToast('Asset deleted', 'success');
        };
        
        document.getElementById('cancel-delete').onclick = () => {
            document.getElementById('delete-modal').classList.remove('active');
        };
    },
    
    // ===== Schools =====
    renderSchools() {
        const grid = document.getElementById('schools-list');
        grid.innerHTML = '';
        
        if (AssetManager.schools.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No schools configured yet</p></div>';
            return;
        }
        
        AssetManager.schools.forEach(school => {
            const card = document.createElement('div');
            card.className = 'school-card';
            card.innerHTML = `
                <div class="school-card-header">
                    <div>
                        <h3>${this.escapeHtml(school.name)}</h3>
                        ${school.code ? `<span class="code">${this.escapeHtml(school.code)}</span>` : ''}
                    </div>
                    <div class="action-btns">
                        <button class="action-btn edit-school" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete delete-school" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                ${school.address ? `<p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(school.address)}</p>` : ''}
                ${school.contact ? `<p><i class="fas fa-user"></i> ${this.escapeHtml(school.contact)}</p>` : ''}
                ${school.email ? `<p><i class="fas fa-envelope"></i> ${this.escapeHtml(school.email)}</p>` : ''}
                <span class="asset-count">${AssetManager.getSchoolAssetCount(school.id)} assets</span>
            `;
            
            card.querySelector('.edit-school').addEventListener('click', () => this.editSchool(school));
            card.querySelector('.delete-school').addEventListener('click', () => this.deleteSchool(school));
            
            grid.appendChild(card);
        });
    },
    
    editSchool(school) {
        document.getElementById('school-modal-title').textContent = 'Edit School';
        document.getElementById('school-id').value = school.id;
        document.getElementById('school-name').value = school.name;
        document.getElementById('school-code').value = school.code || '';
        document.getElementById('school-address').value = school.address || '';
        document.getElementById('school-contact').value = school.contact || '';
        document.getElementById('school-email').value = school.email || '';
        document.getElementById('school-modal').classList.add('active');
    },
    
    async deleteSchool(school) {
        document.querySelector('#delete-modal .modal-body p strong').textContent = school.name;
        document.getElementById('delete-modal').classList.add('active');
        
        document.getElementById('confirm-delete').onclick = async () => {
            document.getElementById('delete-modal').classList.remove('active');
            
            // Check if school has assets
            const hasAssets = AssetManager.assets.some(a => a.schoolId === school.id);
            if (hasAssets) {
                this.showToast('Cannot delete school with assets', 'error');
                return;
            }
            
            UI.showLoading('Deleting school...');
            try {
                AssetManager.schools = AssetManager.schools.filter(s => s.id !== school.id);
                await GitHubAPI.saveSchools(AssetManager.schools, 'Delete school: ' + school.name);
                this.renderSchools();
                this.updateSchoolSelects();
                UI.hideLoading();
                this.showToast('School deleted', 'success');
            } catch (error) {
                UI.hideLoading();
                this.showToast(error.message, 'error');
            }
        };
    },
    
    // ===== CSV Upload =====
    resetCsvUpload() {
        document.getElementById('csv-preview').style.display = 'none';
        document.getElementById('csv-file').value = '';
        CSVModule.csvData = null;
        CSVModule.headers = [];
        CSVModule.rows = [];
    },
    
    // ===== Modal Binding =====
    bindModals() {
        // Close modals on X
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('active');
            });
        });
        
        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // School modal save
        document.getElementById('save-school').addEventListener('click', this.saveSchool.bind(this));
        document.getElementById('cancel-school').addEventListener('click', () => {
            document.getElementById('school-modal').classList.remove('active');
        });
        
        // Add school button
        document.getElementById('add-school-btn').addEventListener('click', () => {
            document.getElementById('school-modal-title').textContent = 'Add School';
            document.getElementById('school-form').reset();
            document.getElementById('school-modal').classList.add('active');
        });
    },
    
    async saveSchool() {
        const form = document.getElementById('school-form');
        const school = {
            id: document.getElementById('school-id').value,
            name: document.getElementById('school-name').value.trim(),
            code: document.getElementById('school-code').value.trim(),
            address: document.getElementById('school-address').value.trim(),
            contact: document.getElementById('school-contact').value.trim(),
            email: document.getElementById('school-email').value.trim()
        };
        
        if (!school.name) {
            this.showToast('School name is required', 'error');
            return;
        }
        
        if (!school.id) {
            school.id = 'school_' + Date.now();
            AssetManager.schools.push(school);
        } else {
            const index = AssetManager.schools.findIndex(s => s.id === school.id);
            if (index !== -1) {
                AssetManager.schools[index] = school;
            }
        }
        
        UI.showLoading('Saving school...');
        try {
            await GitHubAPI.saveSchools(AssetManager.schools, 'Save school: ' + school.name);
            document.getElementById('school-modal').classList.remove('active');
            this.renderSchools();
            this.updateSchoolSelects();
            UI.hideLoading();
            this.showToast('School saved successfully', 'success');
        } catch (error) {
            UI.hideLoading();
            this.showToast(error.message, 'error');
        }
    },
    
    // ===== Other Events =====
    bindOtherEvents() {
        // Add asset button
        document.getElementById('add-asset-btn').addEventListener('click', () => {
            this.navigateTo('add-asset');
        });
        
        // Asset form submit
        document.getElementById('asset-form').addEventListener('submit', this.handleAssetSubmit.bind(this));
        
        // Cancel edit
        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.navigateTo('assets');
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            Auth.logout();
        });
        
        // Sort table headers
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (AssetManager.sortField === field) {
                    AssetManager.sortDirection = AssetManager.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    AssetManager.sortField = field;
                    AssetManager.sortDirection = 'asc';
                }
                AssetManager.applyFilters();
                this.renderAssets();
            });
        });
        
        // Filters
        document.getElementById('search-input').addEventListener('input', (e) => {
            AssetManager.filters.search = e.target.value;
            AssetManager.applyFilters();
            this.renderAssets();
        });
        
        document.getElementById('filter-type').addEventListener('change', (e) => {
            AssetManager.filters.type = e.target.value;
            AssetManager.applyFilters();
            this.renderAssets();
        });
        
        document.getElementById('filter-status').addEventListener('change', (e) => {
            AssetManager.filters.status = e.target.value;
            AssetManager.applyFilters();
            this.renderAssets();
        });
        
        document.getElementById('filter-location').addEventListener('change', (e) => {
            AssetManager.filters.location = e.target.value;
            AssetManager.applyFilters();
            this.renderAssets();
        });
        
        // CSV upload events
        this.bindCsvEvents();
    },
    
    bindCsvEvents() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('csv-file');
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleCsvFile(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleCsvFile(e.target.files[0]);
            }
        });
        
        // Import button
        document.getElementById('import-csv').addEventListener('click', this.handleCsvImport.bind(this));
        
        // Cancel button
        document.getElementById('cancel-csv').addEventListener('click', () => {
            this.resetCsvUpload();
        });
        
        // Download template
        document.getElementById('download-template').addEventListener('click', () => {
            CSVModule.downloadTemplate();
        });
    },
    
    handleCsvFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('Please select a CSV file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = CSVModule.parseCSV(e.target.result);
                if (result.headers.length === 0) {
                    this.showToast('CSV file appears to be empty', 'error');
                    return;
                }
                
                // Show preview
                document.getElementById('csv-filename').textContent = `File: ${file.name}`;
                document.getElementById('csv-count').textContent = `${result.rows.length} rows found`;
                
                // Populate mapping dropdowns
                this.populateMappingSelects(result.headers);
                
                // Show data preview
                const previewContainer = document.getElementById('csv-table-preview');
                previewContainer.innerHTML = '';
                previewContainer.appendChild(CSVModule.previewData(result.headers, result.rows));
                
                // Auto-map columns
                this.autoMapColumns(result.headers);
                
                document.getElementById('csv-preview').style.display = 'block';
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        };
        reader.readAsText(file);
    },
    
    // Populate mapping dropdowns
    populateMappingSelects(headers) {
        const selectIds = ['map-name', 'map-type', 'map-serial', 'map-model', 'map-location', 'map-status', 'map-school', 'map-assigned'];
        
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">-- Not Mapped --</option>';
            headers.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                select.appendChild(option);
            });
        });
    },
    
    // Auto-map columns based on common names
    autoMapColumns(headers) {
        const mappings = {
            'map-name': ['name', 'assetname', 'itemname', 'assetcname', 'asset.name', 'asset name', 'equipment', 'item'],
            'map-type': ['type', 'category', 'assettype', 'asset.type', 'asset type'],
            'map-serial': ['serial', 'serialnumber', 'serial no', 'serial no.', 'sn', 'serial #'],
            'map-model': ['model', 'modelnumber', 'model number'],
            'map-location': ['location', 'room', 'roomnumber', 'room number', 'building', 'site', 'station'],
            'map-status': ['status', 'condition', 'state', 'assetstatus'],
            'map-school': ['school', 'schoolname', 'school name', 'site'],
            'map-assigned': ['assignedto', 'assigned', 'assignedto', 'owner', 'user', 'staff', 'person', 'employee']
        };
        
        const headerLower = headers.map(h => h.toLowerCase());
        
        for (const [selectId, names] of Object.entries(mappings)) {
            const select = document.getElementById(selectId);
            
            // Try to find matching column
            for (const name of names) {
                const index = headerLower.indexOf(name);
                if (index !== -1) {
                    select.value = headers[index];
                    break;
                }
            }
            
            // Also try partial matching
            if (!select.value) {
                for (let i = 0; i < headerLower.length; i++) {
                    const header = headerLower[i];
                    for (const name of names) {
                        if (header.includes(name) || name.includes(header)) {
                            select.value = headers[i];
                            break;
                        }
                    }
                    if (select.value) break;
                }
            }
        }
    },
    
    async handleCsvImport() {
        const mapping = {
            'name': document.getElementById('map-name').value,
            'type': document.getElementById('map-type').value,
            'serial': document.getElementById('map-serial').value,
            'model': document.getElementById('map-model').value,
            'location': document.getElementById('map-location').value,
            'status': document.getElementById('map-status').value,
            'school': document.getElementById('map-school').value,
            'assignedTo': document.getElementById('map-assigned').value
        };
        
        if (!mapping.name) {
            this.showToast('Please map the Name column', 'error');
            return;
        }
        
        if (!mapping.type) {
            this.showToast('Please map the Type column', 'error');
            return;
        }
        
        const mappedAssets = CSVModule.createAssetsFromMapping(mapping);
        
        if (mappedAssets.length === 0) {
            this.showToast('No data to import', 'error');
            return;
        }
        
        if (!confirm(`Import ${mappedAssets.length} assets to GitHub?`)) {
            return;
        }
        
        const result = await AssetManager.importAssets(mappedAssets);
        
        if (result.added > 0) {
            this.resetCsvUpload();
        }
    },
    
    // ===== Asset Form Submit =====
    async handleAssetSubmit(e) {
        e.preventDefault();
        
        const asset = {
            id: document.getElementById('asset-id').value,
            name: document.getElementById('asset-name').value.trim(),
            type: document.getElementById('asset-type').value,
            serial: document.getElementById('asset-serial').value.trim(),
            model: document.getElementById('asset-model').value.trim(),
            manufacturer: document.getElementById('asset-manufacturer').value.trim(),
            purchaseDate: document.getElementById('asset-purchase-date').value,
            schoolId: document.getElementById('asset-school').value,
            location: document.getElementById('asset-location').value.trim(),
            status: document.getElementById('asset-status').value,
            assignedTo: document.getElementById('asset-assigned').value.trim(),
            ipAddress: document.getElementById('asset-ip').value.trim(),
            warrantyExpiry: document.getElementById('asset-warranty').value,
            notes: document.getElementById('asset-notes').value.trim()
        };
        
        let success = false;
        if (asset.id) {
            success = await AssetManager.updateAsset(asset);
        } else {
            delete asset.id;
            success = await AssetManager.addAsset(asset);
        }
        
        if (success) {
            this.showToast('Asset saved successfully', 'success');
            this.navigateTo('assets');
        }
    },
    
    // ===== Utility Methods =====
    getTypeLabel(type) {
        return AssetManager.ASSET_TYPES[type] ? AssetManager.ASSET_TYPES[type].label : type;
    },
    
    getTypeIcon(type) {
        return AssetManager.ASSET_TYPES[type] ? AssetManager.ASSET_TYPES[type].icon : 'fa-box';
    },
    
    getStatusLabel(status) {
        return AssetManager.STATUS_LIST[status] || status;
    },
    
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        const years = Math.floor(months / 12);
        return `${years}y ago`;
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});