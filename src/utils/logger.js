const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[INFO] ${timestamp} - ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console.log(`[INFO] ${timestamp} - ${message}`);
    }
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} - ${message}`);
    if (error) {
      console.error(`[ERROR] Stack:`, error.stack || error);
    }
  },
  warn: (message) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] ${timestamp} - ${message}`);
  },
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[DEBUG] ${timestamp} - ${message}`, data || '');
    }
  }
};

module.exports = logger;