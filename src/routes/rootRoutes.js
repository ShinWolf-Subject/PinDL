const express = require('express');
const router = express.Router();
const rootController = require('../controllers/rootController');

// Root endpoints
router.post('/', rootController.downloadFromRoot);      // POST /
router.get('/', rootController.getInfoFromRoot);        // GET /
router.put('/', rootController.downloadFromRoot);       // PUT /
router.patch('/', rootController.downloadFromRoot);     // PATCH /

module.exports = router;