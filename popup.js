// popup.js - Main popup UI logic with enhanced error handling

class DataWireUI {
  constructor() {
    this.chart = null;
    this.lastUpdateTime = 0;
    this.speedCalculation = {
      upload: { lastBytes: 0, lastTime: 0 },
      download: { lastBytes: 0, lastTime: 0 }
    };
    this.initializationRetries = 0;
    this.maxRetries = 3;
    
    console.log('DataWireUI: Starting initialization...');
    this.init();
  }

  async init() {
    try {
      console.log('DataWireUI: Loading initial data...');
      await this.loadInitialData();
      
      console.log('DataWireUI: Setting up chart...');
      await this.setupChart();
      
      console.log('DataWireUI: Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('DataWireUI: Starting periodic updates...');
      this.startPeriodicUpdates();
      
      // Hide loading, show content
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
      
      console.log('DataWireUI: Initialization complete');
    } catch (error) {
      console.error('DataWireUI: Initialization failed:', error);
      
      // Retry initialization up to maxRetries times
      if (this.initializationRetries < this.maxRetries) {
        this.initializationRetries++;
        console.log(`DataWireUI: Retrying initialization (${this.initializationRetries}/${this.maxRetries})...`);
        setTimeout(() => this.init(), 1000 * this.initializationRetries);
        return;
      }
      
      // Show error message in loading area
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.innerHTML = `
          <div style="color: #ff6b6b; text-align: center;">
            <div>Error loading extension</div>
            <div style="font-size: 10px; margin-top: 8px;">Check console for details</div>
            <button onclick="location.reload()" style="margin-top: 8px; padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
          </div>
        `;
      }
    }
  }

  async loadInitialData() {
    try {
      console.log('DataWireUI: Requesting usage data from background...');
      const response = await this.sendMessage({ action: 'getUsageData' });
      console.log('DataWireUI: Received response:', response);
      
      if (response && typeof response === 'object') {
        this.updateUI(response);
      } else {
        console.warn('DataWireUI: Invalid response received from background:', response);
        // Initialize with empty data
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
      throw error;
    }
  }

  async setupChart() {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.getElementById('realtimeChart');
        if (!canvas) {
          console.error('DataWireUI: Chart canvas not found');
          reject(new Error('Chart canvas not found'));
          return;
        }
        
        // Wait for canvas to be properly sized
        setTimeout(() => {
          try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('DataWireUI: Cannot get 2D context from canvas');
              reject(new Error('Cannot get 2D context'));
              return;
            }
            
            // Ensure canvas has valid dimensions
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(rect.width || 300, 100);
            const height = Math.max(rect.height || 80, 50);
            
            // Set canvas size
            canvas.width = width * 2; // For retina displays
            canvas.height = height * 2;
            ctx.scale(2, 2);
            
            this.chart = {
              canvas: canvas,
              ctx: ctx,
              width: width,
              height: height,
              data: {
                upload: new Array(60).fill(0), // 60 seconds of data
                download: new Array(60).fill(0)
              },
              isInitialized: true
            };
            
            console.log('DataWireUI: Chart setup complete, dimensions:', width, 'x', height);
            this.drawChart();
            resolve();
          } catch (error) {
            console.error('DataWireUI: Error setting up chart context:', error);
            reject(error);
          }
        }, 100);
      } catch (error) {
        console.error('DataWireUI: Error in setupChart:', error);
        reject(error);
      }
    });
  }

  drawChart() {
    if (!this.chart || !this.chart.isInitialized) {
      console.warn('DataWireUI: Chart not initialized for drawing');
      return;
    }
    
    try {
      const { ctx, width, height, data } = this.chart;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Find max value for scaling
      const maxUpload = Math.max(...data.upload);
      const maxDownload = Math.max(...data.download);
      const maxValue = Math.max(maxUpload, maxDownload, 1000); // Minimum 1KB scale
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 0; i <= 6; i++) {
        const x = (width / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw upload line (red)
      this.drawLine(data.upload, maxValue, '#ff6b6b', 2);
      
      // Draw download line (teal)
      this.drawLine(data.download, maxValue, '#4ecdc4', 2);
      
      // Draw legend
      this.drawLegend();
    } catch (error) {
      console.error('DataWireUI: Error drawing chart:', error);
    }
  }

  drawLine(dataArray, maxValue, color, lineWidth) {
    if (!this.chart || !this.chart.isInitialized) {
      return;
    }
    
    const { ctx, width, height } = this.chart;
    
    // Validate inputs
    if (!dataArray || dataArray.length === 0 || !maxValue || maxValue <= 0) {
      return;
    }
    
    try {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      
      for (let i = 0; i < dataArray.length; i++) {
        const x = (width / Math.max(dataArray.length - 1, 1)) * i;
        const y = Math.max(0, height - Math.min((dataArray[i] / maxValue) * height, height));
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Fill area under curve
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = color;
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } catch (error) {
      console.error('DataWireUI: Error drawing line:', error);
    }
  }

  drawLegend() {
    if (!this.chart || !this.chart.isInitialized) {
      return;
    }
    
    try {
      const { ctx } = this.chart;
      
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      
      // Upload legend
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(5, 5, 8, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('Upload', 18, 11);
      
      // Download legend
      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(5, 18, 8, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('Download', 18, 24);
    } catch (error) {
      console.error('DataWireUI: Error drawing legend:', error);
    }
  }

  updateChart(realtimeData) {
    if (!this.chart || !this.chart.isInitialized) {
      console.warn('DataWireUI: Chart not initialized, skipping update');
      return;
    }
    
    if (!realtimeData || !Array.isArray(realtimeData)) {
      console.warn('DataWireUI: Invalid realtime data, using empty array');
      realtimeData = [];
    }
    
    console.log('DataWireUI: Updating chart with', realtimeData.length, 'data points');
    
    try {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      
      // Calculate bytes in last second for each type
      const uploadLastSecond = realtimeData
        .filter(d => d && d.timestamp > oneSecondAgo && d.type === 'upload')
        .reduce((sum, d) => sum + (d.bytes || 0), 0);
      
      const downloadLastSecond = realtimeData
        .filter(d => d && d.timestamp > oneSecondAgo && d.type === 'download')
        .reduce((sum, d) => sum + (d.bytes || 0), 0);
      
      // Shift array and add new data
      this.chart.data.upload.shift();
      this.chart.data.upload.push(uploadLastSecond);
      
      this.chart.data.download.shift();
      this.chart.data.download.push(downloadLastSecond);
      
      this.drawChart();
      
      // Update speed indicators
      const uploadEl = document.getElementById('upload-speed');
      const downloadEl = document.getElementById('download-speed');
      
      if (uploadEl) uploadEl.textContent = this.formatBytes(uploadLastSecond) + '/s';
      if (downloadEl) downloadEl.textContent = this.formatBytes(downloadLastSecond) + '/s';
      
      console.log('DataWireUI: Current speeds - Upload:', this.formatBytes(uploadLastSecond) + '/s', 'Download:', this.formatBytes(downloadLastSecond) + '/s');
    } catch (error) {
      console.error('DataWireUI: Error updating chart:', error);
    }
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
        const sessionTotal = currentSession.upload + currentSession.download;
        const sessionTotalEl = document.getElementById('session-total');
        const sessionStartEl = document.getElementById('session-start');
        
        if (sessionTotalEl) sessionTotalEl.textContent = this.formatBytes(sessionTotal);
        if (sessionStartEl) sessionStartEl.textContent = new Date(currentSession.startTime).toLocaleTimeString();
      }
      
      // Update today's stats
      const todayTotal = todayData.upload + todayData.download;
      const todayTotalEl = document.getElementById('today-total');
      const todayUploadEl = document.getElementById('today-upload');
      const todayDownloadEl = document.getElementById('today-download');
      
      if (todayTotalEl) todayTotalEl.textContent = this.formatBytes(todayTotal);
      if (todayUploadEl) todayUploadEl.textContent = this.formatBytes(todayData.upload);
      if (todayDownloadEl) todayDownloadEl.textContent = this.formatBytes(todayData.download);
      
      // Update chart
      this.updateChart(realtimeData);
      
      // Update top sites
      if (siteUsage) {
        this.updateTopSites(siteUsage);
      }
    } catch (error) {
      console.error('DataWireUI: Error updating UI:', error);
    }
  }

  // Get favicon URL for a domain with beautiful fallbacks
  getFaviconUrl(domain) {
    if (!domain || domain === 'unknown') {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23333" rx="3"/><text x="8" y="11" text-anchor="middle" fill="%23fff" font-size="8" font-family="Inter">?</text></svg>';
    }
    
    // Use Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
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
            <div class="site-name" style="display: flex; align-items: center; opacity: 0.6;">
              <div class="site-icon" style="background: #333;">
                <div class="icon-letter">?</div>
              </div>
              <span>No data yet</span>
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
              <div class="site-icon" data-domain="${mainDomain}">
                <div class="icon-letter">${firstLetter}</div>
              </div>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${mainDomain}</span>
            </div>
            <div class="site-usage">${this.formatBytes(site.total)}</div>
          </div>
        `;
      }).join('');
      
      // Load real favicons after DOM is updated
      this.loadRealFavicons();
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

  loadRealFavicons() {
    try {
      const siteIcons = document.querySelectorAll('.site-icon[data-domain]');
      
      siteIcons.forEach(iconDiv => {
        const domain = iconDiv.dataset.domain;
        if (!domain || domain === 'unknown') return;
        
        // Create favicon image
        const img = document.createElement('img');
        img.style.width = '16px';
        img.style.height = '16px';
        img.style.borderRadius = '3px';
        img.style.display = 'block';
        
        // If favicon loads successfully, replace the letter
        img.onload = function() {
          if (this.naturalWidth > 0 && this.naturalHeight > 0) {
            iconDiv.innerHTML = '';
            iconDiv.appendChild(this);
            iconDiv.style.background = 'transparent';
          }
        };
        
        // If favicon fails, keep the letter
        img.onerror = function() {
          console.log(`Favicon failed for ${domain}, keeping letter fallback`);
        };
        
        // Try multiple favicon sources
        const faviconUrls = [
          `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
          `https://favicon.yandex.net/favicon/${domain}`,
          `https://${domain}/favicon.ico`,
          `https://www.${domain}/favicon.ico`
        ];
        
        this.tryFaviconUrls(img, faviconUrls, 0);
      });
    } catch (error) {
      console.error('DataWireUI: Error loading favicons:', error);
    }
  }

  tryFaviconUrls(img, urls, index) {
    if (index >= urls.length) return; // All URLs failed, keep letter
    
    const originalOnError = img.onerror;
    
    img.onerror = () => {
      // Try next URL
      if (index + 1 < urls.length) {
        this.tryFaviconUrls(img, urls, index + 1);
      } else {
        // All URLs failed, restore original error handler
        img.onerror = originalOnError;
        if (originalOnError) originalOnError();
      }
    };
    
    img.src = urls[index];
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
      // Update every 2 seconds for more responsive UI
      setInterval(async () => {
        try {
          const response = await this.sendMessage({ action: 'getUsageData' });
          if (response && typeof response === 'object') {
            this.updateUI(response);
          }
        } catch (error) {
          console.error('DataWireUI: Error updating data:', error);
        }
      }, 2000);
      console.log('DataWireUI: Periodic updates started');
    } catch (error) {
      console.error('DataWireUI: Error starting periodic updates:', error);
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
  console.log('DataWireUI: DOM loaded, initializing...');
  try {
    new DataWireUI();
  } catch (error) {
    console.error('DataWireUI: Failed to initialize:', error);
  }
});