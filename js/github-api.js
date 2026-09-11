// ===== GitHub API Module =====
const GitHubAPI = {
    // Base headers for GitHub API requests
    getHeaders() {
        return {
            'Authorization': `token ${Config.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    },
    
    // Check if we're connected
    isConnected() {
        return !!(Config.githubToken && Config.repoOwner && Config.repoName);
    },
    
    // Get file content from GitHub repo
    async getFile(path) {
        try {
            const response = await fetch(`${Config.API_BASE}/repos/${Config.repoPath}/contents/${path}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                if (response.status === 401) {
                    throw new Error('Your GitHub token is invalid or has expired. Create a new token and log in again.');
                }
                if (response.status === 403) {
                    throw new Error('Your GitHub token does not have access to this repository. Your token needs the "repo" scope.');
                }
                throw new Error(`Failed to fetch ${path}: ${response.status}`);
            }
            
            const data = await response.json();
            const content = atob(data.content.replace(/\n/g, ''));
            return {
                sha: data.sha,
                content: content
            };
        } catch (error) {
            console.error(`Error fetching ${path}:`, error);
            throw error;
        }
    },
    
    // Save file content to GitHub repo
    async saveFile(path, content, message = 'Update file') {
        try {
            // Check if file exists
            const existing = await this.getFile(path);
            
            const body = {
                message: `${message} - ${new Date().toISOString()}`,
                content: btoa(unescape(encodeURIComponent(content)))
            };
            
            if (existing && existing.sha) {
                body.sha = existing.sha;
            }
            
            const response = await fetch(`${Config.API_BASE}/repos/${Config.repoPath}/contents/${path}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to save ${path}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error saving ${path}:`, error);
            throw error;
        }
    },
    
    // Read assets from GitHub
    async loadAssets() {
        const file = await this.getFile(Config.DATA_FILE);
        if (!file) {
            throw new Error('No data file found. Please run the initial setup.');
        }
        return JSON.parse(file.content);
    },
    
    // Save assets to GitHub
    async saveAssets(data, message = 'Update assets') {
        return await this.saveFile(Config.DATA_FILE, JSON.stringify(data, null, 2), message);
    },
    
    // Read schools from GitHub
    async loadSchools() {
        const file = await this.getFile(Config.SCHOOLS_FILE);
        if (!file) {
            // Return default schools if no file exists
            return [
                { id: 'school-1', name: 'School 1', code: '', address: '', contact: '', email: '' }
            ];
        }
        return JSON.parse(file.content);
    },
    
    // Save schools to GitHub
    async saveSchools(data, message = 'Update schools') {
        return await this.saveFile(Config.SCHOOLS_FILE, JSON.stringify(data, null, 2), message);
    },
    
    // Check if data directory exists
    async ensureDataDirectory() {
        try {
            await this.getFile('data');
        } catch (error) {
            console.log('Data directory check:', error);
        }
    }
};