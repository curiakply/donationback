const express = require('express');
const parishController = require('../controllers/parishalloController');

const router = express.Router();


router.post('/save-data', parishController.saveParishData);

module.exports = router;