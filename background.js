// background.js - Service Worker for monitoring network requests

class DataUsageMonitor {
  constructor() {
    this.currentSession = {
      upload: 0,
      download: 0,
      startTime: Date.now()
    };
    this.dailyUsage = {};
    this.siteUsage = {};
    this.realtimeData = [];
    this.isInitialized = false;
    
    console.log('DataUsageMonitor: Starting initialization...');
    this.init();
  }

  // Enhanced notification system
  async showNotification(title, message, type = 'basic') {
    if (!this.settings?.usageAlerts) return;
    
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: `DataWire: ${title}`,
        message: message
      });
    } catch (error) {
      console.log('DataUsageMonitor: Notifications not available');
    }
  }

  // Check for usage alerts
  checkUsageAlerts() {
    if (!this.settings?.usageAlerts || !this.settings?.alertThreshold) return;
    
    const today = new Date().toDateString();
    const todayData = this.dailyUsage[today] || { upload: 0, download: 0 };
    const todayTotal = (todayData.upload + todayData.download) / (1024 * 1024); // Convert to MB
    
    if (todayTotal > this.settings.alertThreshold) {
      this.showNotification(
        'High Data Usage Alert',
        `You've used ${this.formatBytes(todayTotal * 1024 * 1024)} today, exceeding your ${this.settings.alertThreshold}MB threshold.`
      );
    }
  }

  // Load settings for alerts
  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get(['settings']);
      if (stored.settings) {
        this.settings = stored.settings;
      }
    } catch (error) {
      console.error('DataUsageMonitor: Error loading settings:', error);
    }
  }

  async init() {
    try {
      // Load settings first for alert configuration
      await this.loadSettings();
      
      // Load existing data
      await this.loadStoredData();
      
      // Set up request monitoring
      this.setupRequestMonitoring();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up periodic data saving
      this.setupPeriodicSave();
      
      // Set up daily reset
      this.setupDailyReset();
      
      // Set up usage alerts check
      this.setupUsageAlertsCheck();
      
      // Update badge
      this.updateBadge();
      
      this.isInitialized = true;
      console.log('DataUsageMonitor: Initialization complete');
      
      // Test the monitoring by adding some fake data initially
      this.addTestData();
    } catch (error) {
      console.error('DataUsageMonitor: Initialization failed:', error);
    }
  }

  setupKeyboardShortcuts() {
    // Handle keyboard shortcuts
    if (chrome.commands) {
      chrome.commands.onCommand.addListener((command) => {
        switch (command) {
          case 'open-popup':
            chrome.action.openPopup();
            break;
          case 'reset-session':
            this.resetSession();
            this.showNotification('Session Reset', 'Your current session data has been reset.');
            break;
        }
      });
      console.log('DataUsageMonitor: Keyboard shortcuts setup complete');
    }
  }

  setupUsageAlertsCheck() {
    // Check for usage alerts every hour
    setInterval(() => {
      this.checkUsageAlerts();
    }, 3600000); // Every hour
    
    console.log('DataUsageMonitor: Usage alerts check setup complete');
  }

  resetSession() {
    this.currentSession = {
      upload: 0,
      download: 0,
      startTime: Date.now()
    };
    this.updateBadge();
    console.log('DataUsageMonitor: Session reset via keyboard shortcut');
  }

  // Add some test data to verify the system is working
  addTestData() {
    console.log('DataUsageMonitor: Adding test data...');
    
    // Add some fake data for testing
    this.addUploadData(1024, 'https://example.com/test');
    this.addDownloadData(5120, 'https://google.com/search');
    this.addDownloadData(2048, 'https://github.com/test');
    
    console.log('DataUsageMonitor: Test data added');
  }

  async loadStoredData() {
    try {
      console.log('DataUsageMonitor: Loading stored data...');
      const stored = await chrome.storage.local.get(['dailyUsage', 'siteUsage', 'currentSession']);
      
      if (stored.dailyUsage) {
        this.dailyUsage = stored.dailyUsage;
        console.log('DataUsageMonitor: Loaded daily usage data:', Object.keys(this.dailyUsage).length, 'days');
      }
      
      if (stored.siteUsage) {
        this.siteUsage = stored.siteUsage;
        console.log('DataUsageMonitor: Loaded site usage data:', Object.keys(this.siteUsage).length, 'sites');
      }
      
      if (stored.currentSession) {
        this.currentSession = stored.currentSession;
        console.log('DataUsageMonitor: Loaded session data');
      }
      
      // Reset if new day
      const today = new Date().toDateString();
      if (!this.dailyUsage[today]) {
        this.dailyUsage[today] = { upload: 0, download: 0 };
        console.log('DataUsageMonitor: Created new day entry for', today);
      }
    } catch (error) {
      console.error('DataUsageMonitor: Error loading stored data:', error);
    }
  }

  setupRequestMonitoring() {
    console.log('DataUsageMonitor: Setting up request monitoring...');
    
    // Monitor request headers to estimate upload data
    if (chrome.webRequest && chrome.webRequest.onBeforeSendHeaders) {
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          try {
            this.handleRequestHeaders(details);
          } catch (error) {
            console.error('DataUsageMonitor: Error in onBeforeSendHeaders:', error);
          }
        },
        { urls: ["<all_urls>"] },
        ["requestHeaders"]
      );
      console.log('DataUsageMonitor: onBeforeSendHeaders listener added');
    } else {
      console.error('DataUsageMonitor: webRequest.onBeforeSendHeaders not available');
    }

    // Monitor response headers to get download data
    if (chrome.webRequest && chrome.webRequest.onHeadersReceived) {
      chrome.webRequest.onHeadersReceived.addListener(
        (details) => {
          try {
            this.handleResponseHeaders(details);
          } catch (error) {
            console.error('DataUsageMonitor: Error in onHeadersReceived:', error);
          }
        },
        { urls: ["<all_urls>"] },
        ["responseHeaders"]
      );
      console.log('DataUsageMonitor: onHeadersReceived listener added');
    } else {
      console.error('DataUsageMonitor: webRequest.onHeadersReceived not available');
    }

    // Monitor completed requests
    if (chrome.webRequest && chrome.webRequest.onCompleted) {
      chrome.webRequest.onCompleted.addListener(
        (details) => {
          try {
            this.handleRequestCompleted(details);
          } catch (error) {
            console.error('DataUsageMonitor: Error in onCompleted:', error);
          }
        },
        { urls: ["<all_urls>"] }
      );
      console.log('DataUsageMonitor: onCompleted listener added');
    } else {
      console.error('DataUsageMonitor: webRequest.onCompleted not available');
    }
  }

  handleRequestHeaders(details) {
    if (!details || !details.url) return;
    
    let uploadSize = 0;
    
    // Estimate upload size from headers
    if (details.requestHeaders) {
      details.requestHeaders.forEach(header => {
        uploadSize += (header.name.length + (header.value?.length || 0) + 4); // +4 for ": \r\n"
      });
    }
    
    // Add URL length
    uploadSize += details.url.length;
    
    // Add method length
    if (details.method) {
      uploadSize += details.method.length;
    }
    
    // Add extra for POST data (estimate)
    if (details.method === 'POST') {
      uploadSize += 512; // Average POST data size estimate
    }
    
    console.log(`DataUsageMonitor: Upload - ${uploadSize} bytes to ${this.extractDomain(details.url)}`);
    this.addUploadData(uploadSize, details.url);
  }

  handleResponseHeaders(details) {
    if (!details || !details.url || !details.responseHeaders) return;
    
    const contentLengthHeader = details.responseHeaders.find(
      header => header.name.toLowerCase() === 'content-length'
    );
    
    if (contentLengthHeader && contentLengthHeader.value) {
      const downloadSize = parseInt(contentLengthHeader.value) || 0;
      if (downloadSize > 0) {
        console.log(`DataUsageMonitor: Download - ${downloadSize} bytes from ${this.extractDomain(details.url)}`);
        this.addDownloadData(downloadSize, details.url);
      }
    }
  }

  handleRequestCompleted(details) {
    if (!details || !details.url) return;
    
    // Fallback for responses without content-length header
    if (details.responseHeaders && details.statusCode === 200) {
      const contentLengthHeader = details.responseHeaders.find(
        header => header.name.toLowerCase() === 'content-length'
      );
      
      if (!contentLengthHeader) {
        // Estimate size for successful requests without content-length
        const estimatedSize = this.estimateResponseSize(details.url);
        console.log(`DataUsageMonitor: Estimated download - ${estimatedSize} bytes from ${this.extractDomain(details.url)}`);
        this.addDownloadData(estimatedSize, details.url);
      }
    }
  }

  estimateResponseSize(url) {
    // Simple heuristic for estimating response sizes
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.js')) return 50000; // 50KB average for JS
    if (urlLower.includes('.css')) return 20000; // 20KB average for CSS
    if (urlLower.includes('.png') || urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('.gif')) return 100000; // 100KB for images
    if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.avi')) return 1000000; // 1MB for videos
    if (urlLower.includes('.pdf')) return 500000; // 500KB for PDFs
    if (urlLower.includes('api/') || urlLower.includes('/api')) return 10000; // 10KB for API responses
    
    return 5000; // 5KB default for HTML/other
  }

  addUploadData(bytes, url) {
    if (!bytes || bytes <= 0) return;
    
    const domain = this.extractDomain(url);
    const today = new Date().toDateString();
    
    // Update current session
    this.currentSession.upload += bytes;
    
    // Update daily usage
    if (!this.dailyUsage[today]) {
      this.dailyUsage[today] = { upload: 0, download: 0 };
    }
    this.dailyUsage[today].upload += bytes;
    
    // Update site usage
    if (!this.siteUsage[domain]) {
      this.siteUsage[domain] = { upload: 0, download: 0 };
    }
    this.siteUsage[domain].upload += bytes;
    
    // Add to realtime data
    this.addRealtimeData('upload', bytes, domain);
    
    this.updateBadge();
    console.log(`DataUsageMonitor: Added ${bytes} upload bytes for ${domain}`);
  }

  addDownloadData(bytes, url) {
    if (!bytes || bytes <= 0) return;
    
    const domain = this.extractDomain(url);
    const today = new Date().toDateString();
    
    // Update current session
    this.currentSession.download += bytes;
    
    // Update daily usage
    if (!this.dailyUsage[today]) {
      this.dailyUsage[today] = { upload: 0, download: 0 };
    }
    this.dailyUsage[today].download += bytes;
    
    // Update site usage
    if (!this.siteUsage[domain]) {
      this.siteUsage[domain] = { upload: 0, download: 0 };
    }
    this.siteUsage[domain].download += bytes;
    
    // Add to realtime data
    this.addRealtimeData('download', bytes, domain);
    
    this.updateBadge();
    console.log(`DataUsageMonitor: Added ${bytes} download bytes for ${domain}`);
  }

  addRealtimeData(type, bytes, domain) {
    const now = Date.now();
    this.realtimeData.push({
      timestamp: now,
      type: type,
      bytes: bytes,
      domain: domain
    });
    
    // Keep only last 5 minutes of data
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    this.realtimeData = this.realtimeData.filter(data => data.timestamp > fiveMinutesAgo);
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  updateBadge() {
    try {
      const totalToday = this.getTodayTotal();
      const badgeText = this.formatBytes(totalToday).split(' ')[0];
      
      chrome.action.setBadgeText({
        text: badgeText.length > 4 ? badgeText.substring(0, 4) : badgeText
      });
      
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } catch (error) {
      console.error('DataUsageMonitor: Error updating badge:', error);
    }
  }

  getTodayTotal() {
    const today = new Date().toDateString();
    const todayData = this.dailyUsage[today] || { upload: 0, download: 0 };
    return todayData.upload + todayData.download;
  }

  setupPeriodicSave() {
    // Save data every 10 seconds instead of 5 to reduce overhead
    setInterval(() => {
      this.saveData();
    }, 10000);
    console.log('DataUsageMonitor: Periodic save setup complete');
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        dailyUsage: this.dailyUsage,
        siteUsage: this.siteUsage,
        currentSession: this.currentSession
      });
    } catch (error) {
      console.error('DataUsageMonitor: Error saving data:', error);
    }
  }

  setupDailyReset() {
    // Check for day change every hour
    setInterval(() => {
      const today = new Date().toDateString();
      if (!this.dailyUsage[today]) {
        this.dailyUsage[today] = { upload: 0, download: 0 };
        console.log('DataUsageMonitor: Created new day entry:', today);
        
        // Clean up old data (keep last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        Object.keys(this.dailyUsage).forEach(date => {
          if (new Date(date) < thirtyDaysAgo) {
            delete this.dailyUsage[date];
          }
        });
      }
    }, 3600000); // Every hour
    
    console.log('DataUsageMonitor: Daily reset setup complete');
  }

  // Message handling for popup communication
  handleMessage(request, sender, sendResponse) {
    console.log('DataUsageMonitor: Received message:', request.action);
    
    if (!this.isInitialized) {
      console.log('DataUsageMonitor: Not initialized yet, returning empty data');
      sendResponse({
        currentSession: this.currentSession,
        dailyUsage: this.dailyUsage,
        siteUsage: this.siteUsage,
        realtimeData: this.realtimeData,
        todayTotal: this.getTodayTotal()
      });
      return;
    }
    
    switch (request.action) {
      case 'getUsageData':
        const data = {
          currentSession: this.currentSession,
          dailyUsage: this.dailyUsage,
          siteUsage: this.siteUsage,
          realtimeData: this.realtimeData,
          todayTotal: this.getTodayTotal()
        };
        console.log('DataUsageMonitor: Sending usage data:', {
          sessionTotal: this.currentSession.upload + this.currentSession.download,
          sitesCount: Object.keys(this.siteUsage).length,
          realtimeCount: this.realtimeData.length
        });
        sendResponse(data);
        break;
      
      case 'resetSession':
        this.currentSession = {
          upload: 0,
          download: 0,
          startTime: Date.now()
        };
        this.updateBadge();
        console.log('DataUsageMonitor: Session reset');
        sendResponse({ success: true });
        break;
      
      case 'clearAllData':
        this.dailyUsage = {};
        this.siteUsage = {};
        this.currentSession = {
          upload: 0,
          download: 0,
          startTime: Date.now()
        };
        this.realtimeData = [];
        this.saveData();
        this.updateBadge();
        console.log('DataUsageMonitor: All data cleared');
        sendResponse({ success: true });
        break;
        
      default:
        console.log('DataUsageMonitor: Unknown action:', request.action);
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize the monitor
console.log('Background script starting...');
const monitor = new DataUsageMonitor();

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    monitor.handleMessage(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  } catch (error) {
    console.error('Background script: Error handling message:', error);
    sendResponse({ error: error.message });
    return false;
  }
});

console.log('Background script initialized');