const pinterestService = require('../services/pinterestService');
const logger = require('../utils/logger');

const downloadController = {
  // POST - Create new download request
  async createDownload(req, res) {
    try {
      const { url } = req.validatedData;
      
      logger.info(`POST download request for URL: ${url}`);
      
      const result = await pinterestService.getMediaInfo(url);
      
      if (result.status === 'error') {
        logger.warn(`Download failed for ${url}: ${result.message}`);
        return res.status(400).json({
          status: 'error',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Download successful for ${url}`, {
        type: result.data.type,
        urlCount: result.data.urls.length
      });

      res.status(201).json({
        status: 'success',
        message: 'Download request created successfully',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Create download controller error', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET - Retrieve download info
  async getDownloadInfo(req, res) {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: 'error',
          message: 'URL query parameter is required',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`GET download info for URL: ${url}`);
      
      const result = await pinterestService.getMediaInfo(url);
      
      if (result.status === 'error') {
        logger.warn(`Get info failed for ${url}: ${result.message}`);
        return res.status(404).json({
          status: 'error',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get download info controller error', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  },

  // PUT - Update download request
  async updateDownload(req, res) {
    try {
      const { url } = req.validatedData;
      
      logger.info(`PUT update request for URL: ${url}`);
      
      // Force session reset
      pinterestService.sessionCookies = null;
      pinterestService.csrfToken = null;
      
      const result = await pinterestService.getMediaInfo(url);
      
      if (result.status === 'error') {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Download request updated successfully',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Update download controller error', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  },

  // PATCH - Partial update
  async patchDownload(req, res) {
    try {
      const { url, options = {} } = req.body;
      
      if (!url) {
        return res.status(400).json({
          status: 'error',
          message: 'URL is required',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`PATCH request for URL: ${url}`, { options });
      
      const result = await pinterestService.getMediaInfo(url);
      
      if (result.status === 'error') {
        return res.status(404).json({
          status: 'error',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

      // Metadata only response
      if (options.metadataOnly) {
        return res.status(200).json({
          status: 'success',
          data: {
            metadata: result.data.metadata,
            type: result.data.type,
            timestamp: new Date().toISOString()
          }
        });
      }

      // URL list only
      if (options.urlsOnly) {
        return res.status(200).json({
          status: 'success',
          data: {
            urls: result.data.urls,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Default response
      res.status(200).json({
        status: 'success',
        message: 'Partial update successful',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Patch download controller error', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Health check
  async healthCheck(req, res) {
    try {
      await pinterestService.initializeSession();
      
      res.status(200).json({
        status: 'success',
        message: 'Pinterest download service is healthy',
        service: 'SnapPin',
        timestamp: new Date().toISOString(),
        session: {
          hasToken: !!pinterestService.csrfToken,
          hasCookies: !!pinterestService.sessionCookies
        }
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'error',
        message: 'Pinterest download service is unavailable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = downloadController;