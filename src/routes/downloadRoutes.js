const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const { validateDownloadRequest } = require('../middleware/validation');

// Health check
router.get('/health', downloadController.healthCheck);

// POST - Create new download
router.post('/', validateDownloadRequest, downloadController.createDownload);

// GET - Retrieve download info
router.get('/', downloadController.getDownloadInfo);

// PUT - Update/reprocess download
router.put('/', validateDownloadRequest, downloadController.updateDownload);

// PATCH - Partial update
router.patch('/', downloadController.patchDownload);

module.exports = router;