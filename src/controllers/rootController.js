const pinterestService = require('../services/pinterestService');
const { validateDownloadRequest } = require('../middleware/validation');

const rootController = {
  // POST untuk download di root
  async downloadFromRoot(req, res) {
    try {
      // Validasi manual untuk root
      const { error } = require('../middleware/validation').downloadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }

      const { url } = req.body;
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
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET untuk info di root
  async getInfoFromRoot(req, res) {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: 'error',
          message: 'URL query parameter is required'
        });
      }

      const result = await pinterestService.getMediaInfo(url);
      
      if (result.status === 'error') {
        return res.status(404).json({
          status: 'error',
          message: result.message
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

module.exports = rootController;