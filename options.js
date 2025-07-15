// options.js - Simple and reliable analytics page (Fixed)

class DataWireOptions {
  constructor() {
    this.usageData = null;
    this.updateInterval = null;
    this.settings = {
      updateInterval: 5,
      dataRetention: 30
    };
    this.isLoading = false;
    
    console.log('DataWireOptions: Initializing...');
    this.init();
  }

  async init() {
    try {
      console.log('DataWireOptions: Starting initialization...');
      
      this.setupTabs();
      this.setupEventListeners();
      await this.loadSettings();
      await this.loadData();
      this.startAutoUpdates();
      
      console.log('DataWireOptions: Initialization complete');
    } catch (error) {
      console.error('DataWireOptions: Initialization failed:', error);
      this.showError('Failed to initialize. Please refresh the page.');
    }
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get(['settings']);
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }
      
      // Update UI with loaded settings
      const updateInterval = document.getElementById('update-interval');
      const dataRetention = document.getElementById('data-retention');
      
      if (updateInterval) updateInterval.value = this.settings.updateInterval;
      if (dataRetention) dataRetention.value = this.settings.dataRetention;
      
      console.log('DataWireOptions: Settings loaded:', this.settings);
    } catch (error) {
      console.error('DataWireOptions: Error loading settings:', error);
    }
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        console.log('Tab clicked:', tab.dataset.tab);
        
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.getElementById(tab.dataset.tab);
        if (targetContent) {
          targetContent.classList.add('active');
        }
        
        // Load data for the active tab
        this.loadData();
      });
    });
    
    console.log('DataWireOptions: Tabs setup complete');
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('Manual refresh clicked');
        this.loadData(true); // Force refresh
      });
    }

    // Settings buttons
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('Save settings clicked');
        this.saveSettings();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        console.log('Reset settings clicked');
        this.resetSettings();
      });
    }

    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv');
    const exportJsonBtn = document.getElementById('export-json');
    const importBtn = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        console.log('Export CSV clicked');
        this.exportData('csv');
      });
    }
    
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        console.log('Export JSON clicked');
        this.exportData('json');
      });
    }
    
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        console.log('Import data clicked');
        if (importFile) importFile.click();
      });
    }
    
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        console.log('File selected for import');
        this.handleFileImport(e);
      });
    }

    // Clear data buttons
    const clearSessionBtn = document.getElementById('clear-session');
    const clearHistoryBtn = document.getElementById('clear-history');
    const clearAllBtn = document.getElementById('clear-all-data');
    
    if (clearSessionBtn) {
      clearSessionBtn.addEventListener('click', () => {
        console.log('Clear session clicked');
        this.clearData('session');
      });
    }
    
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        console.log('Clear history clicked');
        this.clearData('history');
      });
    }
    
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        console.log('Clear all clicked');
        this.clearData('all');
      });
    }
    
    console.log('DataWireOptions: Event listeners setup complete');
  }

  async loadData(forceRefresh = false) {
    if (this.isLoading && !forceRefresh) {
      console.log('DataWireOptions: Already loading, skipping...');
      return;
    }
    
    this.isLoading = true;
    
    // Show loading in chart immediately
    const chartContainer = document.getElementById('overview-chart');
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="text-align: center; color: #4ecdc4; padding: 20px;">
          <div style="font-size: 18px; margin-bottom: 10px;">⏳ Loading Data...</div>
          <div style="font-size: 14px; opacity: 0.8;">
            Fetching usage statistics from background script...
          </div>
        </div>
      `;
    }
    
    try {
      console.log('DataWireOptions: Loading data from background script...');
      
      // Update refresh button to show loading state
      const refreshBtn = document.getElementById('refresh-data');
      if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '⏳ Loading...';
        refreshBtn.disabled = true;
        
        // Set up timeout for loading state
        const timeout = setTimeout(() => {
          refreshBtn.innerHTML = '❌ Timeout';
          refreshBtn.disabled = false;
        }, 10000); // 10 second timeout
        
        // Clear timeout and restore button when done
        const restoreButton = () => {
          clearTimeout(timeout);
          refreshBtn.innerHTML = originalText;
          refreshBtn.disabled = false;
        };
        
        // Store restore function for later use
        this.restoreRefreshButton = restoreButton;
      }
      
      const response = await this.sendMessage({ action: 'getUsageData' });
      console.log('DataWireOptions: Received response:', response);
      
      if (response && typeof response === 'object') {
        this.usageData = response;
        this.updateUI();
        console.log('DataWireOptions: Data loaded and UI updated');
        
        // Show success message briefly
        if (chartContainer) {
          chartContainer.innerHTML = `
            <div style="text-align: center; color: #4ecdc4; padding: 20px;">
              <div style="font-size: 18px; margin-bottom: 10px;">✅ Data Loaded!</div>
              <div style="font-size: 14px; opacity: 0.8;">
                Last updated: ${new Date().toLocaleTimeString()}
              </div>
            </div>
          `;
          
          // Switch to normal view after brief success message
          setTimeout(() => this.clearError(), 1500);
        }
        
        // Restore refresh button
        if (this.restoreRefreshButton) {
          this.restoreRefreshButton();
        }
      } else {
        console.warn('DataWireOptions: Invalid response received:', response);
        this.showEmptyState();
        
        // Restore refresh button
        if (this.restoreRefreshButton) {
          this.restoreRefreshButton();
        }
      }
    } catch (error) {
      console.error('DataWireOptions: Error loading data:', error);
      this.showError('Failed to load data. Please try refreshing.');
      this.showEmptyState();
      
      // Restore refresh button
      if (this.restoreRefreshButton) {
        this.restoreRefreshButton();
      }
    } finally {
      this.isLoading = false;
    }
  }

  updateUI() {
    if (!this.usageData) {
      console.warn('DataWireOptions: No usage data to display');
      this.showEmptyState();
      return;
    }

    console.log('DataWireOptions: Updating UI with data');
    console.log('DataWireOptions: Full data structure:', this.usageData);
    
    try {
      this.updateOverviewStats();
      this.updateHistoryTable();
      this.updateSitesTable();
      this.clearError();
      
      // Update the overview chart with actual data summary
      const chartContainer = document.getElementById('overview-chart');
      if (chartContainer) {
        const sessionTotal = (this.usageData.currentSession?.upload || 0) + (this.usageData.currentSession?.download || 0);
        const sitesCount = Object.keys(this.usageData.siteUsage || {}).length;
        const historyDays = Object.keys(this.usageData.dailyUsage || {}).length;
        
        chartContainer.innerHTML = `
          <div style="text-align: center; color: #4ecdc4; padding: 20px;">
            <div style="font-size: 18px; margin-bottom: 10px;">📊 DataWire Analytics</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0;">
              <div style="background: rgba(78, 205, 196, 0.1); padding: 10px; border-radius: 8px;">
                <div style="font-size: 16px; font-weight: bold;">${this.formatBytes(sessionTotal)}</div>
                <div style="font-size: 12px; opacity: 0.8;">Current Session</div>
              </div>
              <div style="background: rgba(78, 205, 196, 0.1); padding: 10px; border-radius: 8px;">
                <div style="font-size: 16px; font-weight: bold;">${sitesCount}</div>
                <div style="font-size: 12px; opacity: 0.8;">Sites Tracked</div>
              </div>
              <div style="background: rgba(78, 205, 196, 0.1); padding: 10px; border-radius: 8px;">
                <div style="font-size: 16px; font-weight: bold;">${historyDays}</div>
                <div style="font-size: 12px; opacity: 0.8;">Days of Data</div>
              </div>
            </div>
            <div style="font-size: 12px; opacity: 0.6;">
              Last updated: ${new Date().toLocaleTimeString()} • 
              Updates every ${this.settings.updateInterval}s
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('DataWireOptions: Error updating UI:', error);
      this.showError('Error displaying data. Please refresh.');
    }
  }

  updateOverviewStats() {
    try {
      const { currentSession, dailyUsage } = this.usageData;
      
      if (!currentSession) {
        console.warn('DataWireOptions: No session data');
        return;
      }

      const today = new Date().toDateString();
      const todayData = dailyUsage && dailyUsage[today] ? dailyUsage[today] : { upload: 0, download: 0 };

      // Update stats
      const sessionTotal = (currentSession.upload || 0) + (currentSession.download || 0);
      const todayTotal = (todayData.upload || 0) + (todayData.download || 0);
      const weekTotal = this.calculateWeekTotal(dailyUsage || {});
      const monthTotal = this.calculateMonthTotal(dailyUsage || {});

      this.updateElement('total-session', this.formatBytes(sessionTotal));
      this.updateElement('total-today', this.formatBytes(todayTotal));
      this.updateElement('total-week', this.formatBytes(weekTotal));
      this.updateElement('total-month', this.formatBytes(monthTotal));

      console.log('DataWireOptions: Overview stats updated');
    } catch (error) {
      console.error('DataWireOptions: Error updating overview stats:', error);
    }
  }

  updateHistoryTable() {
    try {
      const table = document.getElementById('history-table');
      const tbody = table ? table.querySelector('tbody') : null;
      
      if (!tbody) {
        console.warn('DataWireOptions: History table body not found');
        return;
      }

      if (!this.usageData.dailyUsage || Object.keys(this.usageData.dailyUsage).length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No history data available</td></tr>';
        return;
      }

      const dailyData = Object.entries(this.usageData.dailyUsage)
        .map(([date, data]) => ({
          date: new Date(date),
          upload: data.upload || 0,
          download: data.download || 0,
          total: (data.upload || 0) + (data.download || 0)
        }))
        .filter(day => day.total > 0) // Only show days with data
        .sort((a, b) => b.date - a.date);

      if (dailyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No usage data recorded yet</td></tr>';
        return;
      }

      tbody.innerHTML = dailyData.map(day => `
        <tr>
          <td>${day.date.toLocaleDateString()}</td>
          <td>${this.formatBytes(day.upload)}</td>
          <td>${this.formatBytes(day.download)}</td>
          <td><strong>${this.formatBytes(day.total)}</strong></td>
        </tr>
      `).join('');

      console.log('DataWireOptions: History table updated with', dailyData.length, 'entries');
    } catch (error) {
      console.error('DataWireOptions: Error updating history table:', error);
    }
  }

  updateSitesTable() {
    try {
      const table = document.getElementById('sites-table');
      const tbody = table ? table.querySelector('tbody') : null;
      
      if (!tbody) {
        console.warn('DataWireOptions: Sites table body not found');
        return;
      }

      if (!this.usageData.siteUsage || Object.keys(this.usageData.siteUsage).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No site data available</td></tr>';
        return;
      }

      const siteData = Object.entries(this.usageData.siteUsage)
        .map(([domain, data]) => ({
          domain,
          upload: data.upload || 0,
          download: data.download || 0,
          total: (data.upload || 0) + (data.download || 0)
        }))
        .filter(site => site.total > 0)
        .sort((a, b) => b.total - a.total);

      if (siteData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No site usage data recorded yet</td></tr>';
        return;
      }

      const totalUsage = siteData.reduce((sum, site) => sum + site.total, 0);

      tbody.innerHTML = siteData.map(site => {
        const percentage = totalUsage > 0 ? ((site.total / totalUsage) * 100).toFixed(1) : 0;
        const favicon = this.getFaviconUrl(site.domain);
        
        return `
          <tr>
            <td>
              <div class="site-row">
                <img src="${favicon}" class="site-favicon" onerror="this.style.display='none'">
                <span title="${site.domain}">${this.truncateText(site.domain, 30)}</span>
              </div>
            </td>
            <td>${this.formatBytes(site.upload)}</td>
            <td>${this.formatBytes(site.download)}</td>
            <td><strong>${this.formatBytes(site.total)}</strong></td>
            <td>${percentage}%</td>
          </tr>
        `;
      }).join('');

      console.log('DataWireOptions: Sites table updated with', siteData.length, 'sites');
    } catch (error) {
      console.error('DataWireOptions: Error updating sites table:', error);
    }
  }

  calculateWeekTotal(dailyUsage) {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      return Object.entries(dailyUsage)
        .filter(([date]) => new Date(date) >= weekAgo)
        .reduce((total, [, data]) => total + (data.upload || 0) + (data.download || 0), 0);
    } catch (error) {
      console.error('DataWireOptions: Error calculating week total:', error);
      return 0;
    }
  }

  calculateMonthTotal(dailyUsage) {
    try {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      return Object.entries(dailyUsage)
        .filter(([date]) => new Date(date) >= monthAgo)
        .reduce((total, [, data]) => total + (data.upload || 0) + (data.download || 0), 0);
    } catch (error) {
      console.error('DataWireOptions: Error calculating month total:', error);
      return 0;
    }
  }

  getFaviconUrl(domain) {
    if (!domain || domain === 'unknown') {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23666" rx="2"/></svg>';
    }
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn('DataWireOptions: Element not found:', id);
    }
  }

  showEmptyState() {
    try {
      this.updateElement('total-session', '0 B');
      this.updateElement('total-today', '0 B');
      this.updateElement('total-week', '0 B');
      this.updateElement('total-month', '0 B');
      
      // Update chart container
      const chartContainer = document.getElementById('overview-chart');
      if (chartContainer) {
        chartContainer.innerHTML = `
          <div style="text-align: center; color: #666; padding: 20px;">
            <div style="font-size: 18px; margin-bottom: 10px;">📊 No Data Yet</div>
            <div style="font-size: 14px;">
              Start browsing websites to see usage statistics.<br>
              The extension is monitoring your data usage in the background.
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('DataWireOptions: Error showing empty state:', error);
    }
  }

  showError(message) {
    const chartContainer = document.getElementById('overview-chart');
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="color: #ff4757; text-align: center;">
          <div>⚠️ ${message}</div>
          <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #4ecdc4; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
    }
  }

  clearError() {
    const chartContainer = document.getElementById('overview-chart');
    if (chartContainer && chartContainer.innerHTML.includes('⚠️')) {
      chartContainer.innerHTML = `
        <div style="text-align: center; color: #4ecdc4; padding: 20px;">
          <div style="font-size: 18px; margin-bottom: 10px;">📊 Data Successfully Loaded!</div>
          <div style="font-size: 14px; opacity: 0.8;">
            Session: ${this.formatBytes((this.usageData.currentSession?.upload || 0) + (this.usageData.currentSession?.download || 0))}<br>
            Sites tracked: ${Object.keys(this.usageData.siteUsage || {}).length}<br>
            Days of history: ${Object.keys(this.usageData.dailyUsage || {}).length}
          </div>
        </div>
      `;
    } else if (chartContainer && !chartContainer.innerHTML.includes('📊')) {
      chartContainer.innerHTML = `
        <div style="text-align: center; color: #4ecdc4; padding: 20px;">
          <div style="font-size: 18px; margin-bottom: 10px;">📊 Data Overview</div>
          <div style="font-size: 14px; opacity: 0.8;">
            View detailed statistics in the tabs above.<br>
            Data updates every ${this.settings.updateInterval} seconds.
          </div>
        </div>
      `;
    }
  }

  startAutoUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      console.log('DataWireOptions: Auto-updating data...');
      this.loadData();
    }, this.settings.updateInterval * 1000);
    
    console.log('DataWireOptions: Auto-updates started (every', this.settings.updateInterval, 'seconds)');
  }

  async saveSettings() {
    try {
      const updateInterval = document.getElementById('update-interval');
      const dataRetention = document.getElementById('data-retention');
      
      if (updateInterval) {
        this.settings.updateInterval = parseInt(updateInterval.value) || 5;
      }
      
      if (dataRetention) {
        this.settings.dataRetention = parseInt(dataRetention.value) || 30;
      }
      
      await chrome.storage.local.set({ settings: this.settings });
      this.showNotification('Settings saved successfully!', 'success');
      this.startAutoUpdates(); // Restart with new interval
      
      console.log('DataWireOptions: Settings saved:', this.settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  resetSettings() {
    this.settings = {
      updateInterval: 5,
      dataRetention: 30
    };
    
    const updateInterval = document.getElementById('update-interval');
    const dataRetention = document.getElementById('data-retention');
    
    if (updateInterval) updateInterval.value = 5;
    if (dataRetention) dataRetention.value = 30;
    
    this.saveSettings();
  }

  exportData(format) {
    if (!this.usageData) {
      this.showNotification('No data to export', 'error');
      return;
    }
    
    try {
      let content, filename, mimeType;
      
      if (format === 'csv') {
        content = this.generateCSV();
        filename = `datawire-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(this.usageData, null, 2);
        filename = `datawire-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('DataWireOptions: Error exporting data:', error);
      this.showNotification('Error exporting data', 'error');
    }
  }

  generateCSV() {
    const lines = ['Date,Upload (bytes),Download (bytes),Total (bytes)'];
    
    if (this.usageData.dailyUsage) {
      Object.entries(this.usageData.dailyUsage).forEach(([date, data]) => {
        const total = (data.upload || 0) + (data.download || 0);
        lines.push(`${date},${data.upload || 0},${data.download || 0},${total}`);
      });
    }
    
    return lines.join('\n');
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.dailyUsage || !data.siteUsage) {
        throw new Error('Invalid data format');
      }
      
      // Merge with existing data
      const existingData = await chrome.storage.local.get(['dailyUsage', 'siteUsage']);
      
      await chrome.storage.local.set({
        dailyUsage: { ...existingData.dailyUsage, ...data.dailyUsage },
        siteUsage: { ...existingData.siteUsage, ...data.siteUsage }
      });
      
      await this.loadData(true);
      this.showNotification('Data imported successfully!', 'success');
    } catch (error) {
      this.showNotification('Error importing data: ' + error.message, 'error');
      console.error('Error importing data:', error);
    }
    
    event.target.value = '';
  }

  async clearData(type) {
    let message, action;
    
    switch (type) {
      case 'session':
        message = 'Clear current session data?';
        action = 'resetSession';
        break;
      case 'history':
        message = 'Clear all usage history? This cannot be undone.';
        action = 'clearHistory';
        break;
      case 'all':
        message = 'Clear ALL data? This cannot be undone.';
        action = 'clearAllData';
        break;
    }
    
    if (!confirm(message)) return;
    
    try {
      await this.sendMessage({ action });
      await this.loadData(true);
      this.showNotification('Data cleared successfully', 'success');
    } catch (error) {
      this.showNotification('Error clearing data', 'error');
      console.error('Error clearing data:', error);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 1000;
      transition: all 0.3s ease;
      ${type === 'success' ? 'background: #4ecdc4; color: #1a1a2e;' : ''}
      ${type === 'error' ? 'background: #ff4757; color: #fff;' : ''}
      ${type === 'info' ? 'background: #667eea; color: #fff;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }
      
      console.log('DataWireOptions: Sending message:', message);
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('DataWireOptions: Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('DataWireOptions: Received response:', response);
            resolve(response);
          }
        });
      } catch (error) {
        console.error('DataWireOptions: Error sending message:', error);
        reject(error);
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing DataWire Options...');
  try {
    new DataWireOptions();
  } catch (error) {
    console.error('Failed to initialize DataWire Options:', error);
  }
});