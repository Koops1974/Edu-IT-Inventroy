// ===== Authentication Module =====
const Auth = {
    sessionKey: 'edu-it-session',
    
    // Check if user is logged in
    isLoggedIn() {
        // Session is valid if we have stored credentials (config)
        return Config.isConnected();
    },
    
    // Login with GitHub token and password
    async login(githubToken, repoOwner, repoName, password) {
        try {
            // Validate password
            if (password !== Config.ACCESS_PASSWORD) {
                throw new Error('Incorrect access password');
            }
            
            // Save config
            Config.save(githubToken, repoOwner, repoName);
            
            // Test GitHub connection
            UI.showLoading('Connecting to GitHub...');
            const response = await fetch(`${Config.API_BASE}/repos/${Config.repoPath}`, {
                headers: GitHubAPI.getHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid GitHub token. Check your token permissions.');
                }
                if (response.status === 404) {
                    throw new Error('Repository not found. Check owner and repository name.');
                }
                throw new Error(`GitHub connection failed: ${response.status}`);
            }
            
            // Create session
            const session = {
                githubToken: githubToken,
                repoOwner: repoOwner,
                repoName: repoName,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            return true;
        } catch (error) {
            Config.clear();
            throw error;
        } finally {
            UI.hideLoading();
        }
    },
    
    // Logout
    logout() {
        localStorage.removeItem(this.sessionKey);
        Config.clear();
        location.reload();
    }
};