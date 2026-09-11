// ===== GitHub API Configuration =====
const Config = {
    API_BASE: 'https://api.github.com',
    DATA_FILE: 'data/assets.json',
    SCHOOLS_FILE: 'data/schools.json',
    ACCESS_PASSWORD: 'admin123', // Change this in production
    
    // Load config from localStorage
    load() {
        const saved = localStorage.getItem('edu-it-config');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.githubToken = parsed.githubToken || '';
            this.repoOwner = parsed.repoOwner || '';
            this.repoName = parsed.repoName || '';
        }
    },
    
    // Save config to localStorage
    save(token, owner, name) {
        this.githubToken = token;
        this.repoOwner = owner;
        this.repoName = name;
        localStorage.setItem('edu-it-config', JSON.stringify({
            githubToken: token,
            repoOwner: owner,
            repoName: name
        }));
    },
    
    // Clear config
    clear() {
        this.githubToken = '';
        this.repoOwner = '';
        this.repoName = '';
        localStorage.removeItem('edu-it-config');
        localStorage.removeItem('edu-it-session');
    },
    
    // Get full repo path
    get repoPath() {
        return `${this.repoOwner}/${this.repoName}`;
    }
};
