// options.js - Simple and reliable analytics page

class DataWireOptions {
  constructor() {
    this.usageData = null;
    this.updateInterval = null;
    this.settings = {
      updateInterval: 5,
      dataRetention: 30
    };
    
    console.log('DataWireOptions: Initializing...');
    this.init();
  }

  async init() {
    try {
      console.log('DataWireOptions: Starting initialization...');
      
      this.setupTabs();
      this.setupEventListeners();
      await this.loadData();
      this.startAutoUpdates();
      
      console.log('DataWireOptions: Initialization complete');
    } catch (error) {
      console.error('DataWireOptions: Initialization failed:', error);
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
        this.loadData();
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

  async loadData() {
    try {
      console.log('DataWireOptions: Loading data from background script...');
      
      const response = await this.sendMessage({ action: 'getUsageData' });
      console.log('DataWireOptions: Received response:', response);
      
      if (response) {
        this.usageData = response;
        this.updateUI();
        console.log('DataWireOptions: Data loaded and UI updated');
      } else {
        console.warn('DataWireOptions: No data received');
        this.showEmptyState();
      }
    } catch (error) {
      console.error('DataWireOptions: Error loading data:', error);
      this.showEmptyState();
    }
  }

  updateUI() {
    if (!this.usageData) {
      console.warn('DataWireOptions: No usage data to display');
      return;
    }

    console.log('DataWireOptions: Updating UI with data');
    
    this.updateOverviewStats();
    this.updateHistoryTable();
    this.updateSitesTable();
  }

  updateOverviewStats() {
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
  }

  updateHistoryTable() {
    const table = document.getElementById('history-table');
    const tbody = table ? table.querySelector('tbody') : null;
    
    if (!tbody) return;

    if (!this.usageData.dailyUsage || Object.keys(this.usageData.dailyUsage).length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No history data available</td></tr>';
      return;
    }

    const dailyData = Object.entries(this.usageData.dailyUsage)
      .map(([date, data]) => ({
        date: new Date(date),
        upload: data.upload || 0,
        download: data.download || 0,
        total: (data.upload || 0) + (data.download || 0)
      }))
      .sort((a, b) => b.date - a.date);

    tbody.innerHTML = dailyData.map(day => `
      <tr>
        <td>${day.date.toLocaleDateString()}</td>
        <td>${this.formatBytes(day.upload)}</td>
        <td>${this.formatBytes(day.download)}</td>
        <td><strong>${this.formatBytes(day.total)}</strong></td>
      </tr>
    `).join('');

    console.log('DataWireOptions: History table updated with', dailyData.length, 'entries');
  }

  updateSitesTable() {
    const table = document.getElementById('sites-table');
    const tbody = table ? table.querySelector('tbody') : null;
    
    if (!tbody) return;

    if (!this.usageData.siteUsage || Object.keys(this.usageData.siteUsage).length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No site data available</td></tr>';
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
  }

  calculateWeekTotal(dailyUsage) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return Object.entries(dailyUsage)
      .filter(([date]) => new Date(date) >= weekAgo)
      .reduce((total, [, data]) => total + (data.upload || 0) + (data.download || 0), 0);
  }

  calculateMonthTotal(dailyUsage) {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return Object.entries(dailyUsage)
      .filter(([date]) => new Date(date) >= monthAgo)
      .reduce((total, [, data]) => total + (data.upload || 0) + (data.download || 0), 0);
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
    }
  }

  showEmptyState() {
    this.updateElement('total-session', '0 B');
    this.updateElement('total-today', '0 B');
    this.updateElement('total-week', '0 B');
    this.updateElement('total-month', '0 B');
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
    const updateInterval = document.getElementById('update-interval');
    const dataRetention = document.getElementById('data-retention');
    
    if (updateInterval) {
      this.settings.updateInterval = parseInt(updateInterval.value) || 5;
    }
    
    if (dataRetention) {
      this.settings.dataRetention = parseInt(dataRetention.value) || 30;
    }
    
    try {
      await chrome.storage.local.set({ settings: this.settings });
      this.showNotification('Settings saved successfully!', 'success');
      this.startAutoUpdates(); // Restart with new interval
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
    if (!this.usageData) return;
    
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
      
      await this.loadData();
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
      await this.loadData();
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing DataWire Options...');
  new DataWireOptions();
});