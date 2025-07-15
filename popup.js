// popup.js - Simplified version without chart complications

class DataWireUI {
  constructor() {
    this.speedHistory = {
      upload: [],
      download: []
    };
    this.maxHistoryPoints = 30; // Keep 30 seconds of speed data
    
    console.log('DataWireUI: Starting simple initialization...');
    this.init();
  }

  async init() {
    try {
      console.log('DataWireUI: Loading initial data...');
      await this.loadInitialData();
      
      console.log('DataWireUI: Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('DataWireUI: Setting up speed visualization...');
      this.setupSpeedVisualization();
      
      console.log('DataWireUI: Starting periodic updates...');
      this.startPeriodicUpdates();
      
      // Hide loading, show content
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
      
      console.log('DataWireUI: Simple initialization complete');
    } catch (error) {
      console.error('DataWireUI: Initialization failed:', error);
      this.showFallbackUI();
    }
  }

  showFallbackUI() {
    // Show content even if initialization failed
    const loadingEl = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    
    // Set basic values
    this.updateElement('session-total', '0 B');
    this.updateElement('today-total', '0 B');
    this.updateElement('upload-speed', '0 B/s');
    this.updateElement('download-speed', '0 B/s');
    
    console.log('DataWireUI: Fallback UI shown');
  }

  async loadInitialData() {
    try {
      console.log('DataWireUI: Requesting usage data from background...');
      const response = await this.sendMessage({ action: 'getUsageData' });
      console.log('DataWireUI: Received response:', response);
      
      if (response && typeof response === 'object') {
        this.updateUI(response);
      } else {
        console.warn('DataWireUI: Invalid response, using default data');
        this.updateUI({
          currentSession: { upload: 0, download: 0, startTime: Date.now() },
          dailyUsage: {},
          siteUsage: {},
          realtimeData: [],
          todayTotal: 0
        });
      }
    } catch (error) {
      console.error('DataWireUI: Error loading initial data:', error);
      this.showFallbackUI();
    }
  }

  setupSpeedVisualization() {
    // Replace the chart container with a simple speed visualization
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div class="speed-visualization">
          <div class="speed-bars">
            <div class="speed-bar-group">
              <div class="speed-bar-label">Upload</div>
              <div class="speed-bar upload-bar">
                <div class="speed-bar-fill" id="upload-bar-fill"></div>
              </div>
              <div class="speed-bar-value" id="upload-current">0 B/s</div>
            </div>
            <div class="speed-bar-group">
              <div class="speed-bar-label">Download</div>
              <div class="speed-bar download-bar">
                <div class="speed-bar-fill" id="download-bar-fill"></div>
              </div>
              <div class="speed-bar-value" id="download-current">0 B/s</div>
            </div>
          </div>
          <div class="speed-history">
            <div class="speed-history-label">Last 30 seconds</div>
            <div class="speed-dots" id="speed-dots-container"></div>
          </div>
        </div>
      `;
      
      // Add CSS for the visualization
      this.addSpeedVisualizationCSS();
    }
  }

  addSpeedVisualizationCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .speed-visualization {
        height: 100%;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .speed-bars {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        justify-content: center;
      }
      
      .speed-bar-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .speed-bar-label {
        font-size: 10px;
        width: 50px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }
      
      .speed-bar {
        flex: 1;
        height: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        position: relative;
      }
      
      .speed-bar-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .upload-bar .speed-bar-fill {
        background: linear-gradient(90deg, #ff6b6b, #ff8e8e);
      }
      
      .download-bar .speed-bar-fill {
        background: linear-gradient(90deg, #4ecdc4, #81e6d9);
      }
      
      .speed-bar-value {
        font-size: 10px;
        width: 60px;
        text-align: right;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
      }
      
      .speed-history {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .speed-history-label {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
      }
      
      .speed-dots {
        display: flex;
        gap: 1px;
        height: 16px;
        align-items: end;
        justify-content: center;
      }
      
      .speed-dot {
        width: 3px;
        background: rgba(78, 205, 196, 0.3);
        border-radius: 1px;
        transition: all 0.3s ease;
        min-height: 2px;
      }
      
      .speed-dot.active {
        background: #4ecdc4;
      }
      
      .speed-dot.high {
        background: #81e6d9;
      }
    `;
    document.head.appendChild(style);
  }

  updateSpeedVisualization(uploadSpeed, downloadSpeed) {
    // Update speed bars
    const uploadBarFill = document.getElementById('upload-bar-fill');
    const downloadBarFill = document.getElementById('download-bar-fill');
    const uploadCurrent = document.getElementById('upload-current');
    const downloadCurrent = document.getElementById('download-current');
    
    if (uploadCurrent) uploadCurrent.textContent = this.formatBytes(uploadSpeed) + '/s';
    if (downloadCurrent) downloadCurrent.textContent = this.formatBytes(downloadSpeed) + '/s';
    
    // Calculate percentages (max 10MB/s for scaling)
    const maxSpeed = 10 * 1024 * 1024; // 10MB/s
    const uploadPercent = Math.min((uploadSpeed / maxSpeed) * 100, 100);
    const downloadPercent = Math.min((downloadSpeed / maxSpeed) * 100, 100);
    
    if (uploadBarFill) uploadBarFill.style.width = uploadPercent + '%';
    if (downloadBarFill) downloadBarFill.style.width = downloadPercent + '%';
    
    // Update speed history
    this.speedHistory.upload.push(uploadSpeed);
    this.speedHistory.download.push(downloadSpeed);
    
    // Keep only last 30 points
    if (this.speedHistory.upload.length > this.maxHistoryPoints) {
      this.speedHistory.upload.shift();
      this.speedHistory.download.shift();
    }
    
    // Update speed dots
    this.updateSpeedDots();
  }

  updateSpeedDots() {
    const dotsContainer = document.getElementById('speed-dots-container');
    if (!dotsContainer) return;
    
    // Calculate max speed for scaling
    const allSpeeds = [...this.speedHistory.upload, ...this.speedHistory.download];
    const maxSpeed = Math.max(...allSpeeds, 1024); // At least 1KB for scaling
    
    // Create dots for combined activity
    const dots = [];
    for (let i = 0; i < this.maxHistoryPoints; i++) {
      const uploadSpeed = this.speedHistory.upload[i] || 0;
      const downloadSpeed = this.speedHistory.download[i] || 0;
      const totalSpeed = uploadSpeed + downloadSpeed;
      
      const height = Math.max((totalSpeed / maxSpeed) * 14, 2); // 2px minimum, 14px max
      const isActive = totalSpeed > 0;
      const isHigh = totalSpeed > maxSpeed * 0.7;
      
      dots.push(`
        <div class="speed-dot ${isActive ? 'active' : ''} ${isHigh ? 'high' : ''}" 
             style="height: ${height}px;" 
             title="${this.formatBytes(totalSpeed)}/s"></div>
      `);
    }
    
    dotsContainer.innerHTML = dots.join('');
  }

  updateCurrentSpeeds(realtimeData) {
    let uploadSpeed = 0;
    let downloadSpeed = 0;
    
    if (realtimeData && Array.isArray(realtimeData)) {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      
      uploadSpeed = realtimeData
        .filter(d => d && d.timestamp > oneSecondAgo && d.type === 'upload')
        .reduce((sum, d) => sum + (d.bytes || 0), 0);
      
      downloadSpeed = realtimeData
        .filter(d => d && d.timestamp > oneSecondAgo && d.type === 'download')
        .reduce((sum, d) => sum + (d.bytes || 0), 0);
    }
    
    // Update main speed indicators
    this.updateElement('upload-speed', this.formatBytes(uploadSpeed) + '/s');
    this.updateElement('download-speed', this.formatBytes(downloadSpeed) + '/s');
    
    // Update visualization
    this.updateSpeedVisualization(uploadSpeed, downloadSpeed);
    
    console.log(`DataWireUI: Speeds - Upload: ${this.formatBytes(uploadSpeed)}/s, Download: ${this.formatBytes(downloadSpeed)}/s`);
  }

  updateUI(data) {
    if (!data || typeof data !== 'object') {
      console.warn('DataWireUI: No valid data to update UI');
      return;
    }
    
    console.log('DataWireUI: Updating UI with data:', {
      sessionTotal: data.currentSession ? (data.currentSession.upload + data.currentSession.download) : 0,
      sitesCount: data.siteUsage ? Object.keys(data.siteUsage).length : 0,
      realtimeCount: data.realtimeData ? data.realtimeData.length : 0
    });
    
    try {
      const { currentSession, dailyUsage, siteUsage, realtimeData } = data;
      const today = new Date().toDateString();
      const todayData = dailyUsage && dailyUsage[today] ? dailyUsage[today] : { upload: 0, download: 0 };
      
      // Update session stats
      if (currentSession) {
        const sessionTotal = (currentSession.upload || 0) + (currentSession.download || 0);
        this.updateElement('session-total', this.formatBytes(sessionTotal));
        this.updateElement('session-start', new Date(currentSession.startTime).toLocaleTimeString());
      }
      
      // Update today's stats
      const todayTotal = (todayData.upload || 0) + (todayData.download || 0);
      this.updateElement('today-total', this.formatBytes(todayTotal));
      this.updateElement('today-upload', this.formatBytes(todayData.upload || 0));
      this.updateElement('today-download', this.formatBytes(todayData.download || 0));
      
      // Update current speeds (this replaces the chart)
      this.updateCurrentSpeeds(realtimeData);
      
      // Update top sites
      if (siteUsage) {
        this.updateTopSites(siteUsage);
      }
      
      // Show that the extension is working
      const statusDot = document.querySelector('.status-dot');
      if (statusDot) {
        statusDot.style.background = '#4ecdc4';
        statusDot.style.animation = 'pulse 2s infinite';
      }
      
    } catch (error) {
      console.error('DataWireUI: Error updating UI:', error);
    }
  }

  updateTopSites(siteUsage) {
    const topSitesContainer = document.getElementById('top-sites');
    if (!topSitesContainer) {
      console.warn('DataWireUI: Top sites container not found');
      return;
    }
    
    console.log('DataWireUI: Updating top sites with', Object.keys(siteUsage).length, 'sites');
    
    try {
      // Sort sites by total usage
      const sortedSites = Object.entries(siteUsage)
        .map(([domain, usage]) => ({
          domain,
          total: (usage.upload || 0) + (usage.download || 0),
          upload: usage.upload || 0,
          download: usage.download || 0
        }))
        .filter(site => site.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 4); // Top 4 sites for compact display
      
      if (sortedSites.length === 0) {
        topSitesContainer.innerHTML = `
          <div class="site-item">
            <div class="site-name" style="opacity: 0.6;">
              <span>No sites tracked yet</span>
            </div>
            <div class="site-usage">0 B</div>
          </div>
        `;
        return;
      }
      
      topSitesContainer.innerHTML = sortedSites.map(site => {
        const mainDomain = this.getMainDomain(site.domain);
        const firstLetter = mainDomain.charAt(0).toUpperCase();
        
        return `
          <div class="site-item">
            <div class="site-name" title="${site.domain}">
              <div class="site-icon" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 16px; height: 16px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; margin-right: 8px;">
                ${firstLetter}
              </div>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${mainDomain}</span>
            </div>
            <div class="site-usage">${this.formatBytes(site.total)}</div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error('DataWireUI: Error updating top sites:', error);
    }
  }

  getMainDomain(domain) {
    if (!domain || domain === 'unknown') return 'unknown';
    
    try {
      // Remove www. prefix
      let clean = domain.replace(/^www\./, '');
      
      // Split by dots and get main domain
      const parts = clean.split('.');
      
      // Handle special cases
      if (parts.length >= 2) {
        // For most cases, just take the last two parts (domain.com)
        const mainDomain = parts.slice(-2).join('.');
        
        // Special handling for well-known domains
        const knownDomains = [
          'co.uk', 'com.au', 'co.jp', 'com.br', 'co.in', 
          'com.cn', 'co.za', 'com.mx', 'co.kr', 'com.sg'
        ];
        
        // If it's a known country domain, take last 3 parts
        if (parts.length >= 3) {
          const lastTwo = parts.slice(-2).join('.');
          if (knownDomains.includes(lastTwo)) {
            return parts.slice(-3).join('.');
          }
        }
        
        return mainDomain;
      }
      
      return clean;
    } catch (error) {
      console.error('DataWireUI: Error parsing domain:', domain, error);
      return domain || 'unknown';
    }
  }

  setupEventListeners() {
    try {
      // Reset session button
      const resetBtn = document.getElementById('reset-session');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          try {
            console.log('DataWireUI: Resetting session...');
            await this.sendMessage({ action: 'resetSession' });
            await this.loadInitialData();
            console.log('DataWireUI: Session reset complete');
          } catch (error) {
            console.error('DataWireUI: Error resetting session:', error);
          }
        });
      }
      
      // Clear all data button
      const clearBtn = document.getElementById('clear-all');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to clear all usage data? This cannot be undone.')) {
            try {
              console.log('DataWireUI: Clearing all data...');
              await this.sendMessage({ action: 'clearAllData' });
              await this.loadInitialData();
              console.log('DataWireUI: All data cleared');
            } catch (error) {
              console.error('DataWireUI: Error clearing data:', error);
            }
          }
        });
      }
      
      // Options button
      const optionsBtn = document.getElementById('open-options');
      if (optionsBtn) {
        optionsBtn.addEventListener('click', () => {
          console.log('DataWireUI: Opening options page...');
          if (chrome.runtime && chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            console.error('DataWireUI: Cannot open options page');
          }
        });
      }
    } catch (error) {
      console.error('DataWireUI: Error setting up event listeners:', error);
    }
  }

  startPeriodicUpdates() {
    try {
      // Update every 1 second for responsive speed monitoring
      setInterval(async () => {
        try {
          const response = await this.sendMessage({ action: 'getUsageData' });
          if (response && typeof response === 'object') {
            this.updateUI(response);
          }
        } catch (error) {
          console.error('DataWireUI: Error updating data:', error);
        }
      }, 1000); // 1 second updates for real-time feel
      
      console.log('DataWireUI: Periodic updates started (1 second interval)');
    } catch (error) {
      console.error('DataWireUI: Error starting periodic updates:', error);
    }
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn('DataWireUI: Element not found:', id);
    }
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }
      
      console.log('DataWireUI: Sending message:', message);
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('DataWireUI: Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('DataWireUI: Received response:', response);
            resolve(response);
          }
        });
      } catch (error) {
        console.error('DataWireUI: Error sending message:', error);
        reject(error);
      }
    });
  }
}

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DataWireUI: DOM loaded, initializing simple version...');
  try {
    new DataWireUI();
  } catch (error) {
    console.error('DataWireUI: Failed to initialize:', error);
  }
});