const express = require('express');
const router = express.Router();
const familyMovementController = require('../controllers/familyMovementController');

router.post('/', familyMovementController.createMovement);
router.get('/', familyMovementController.getMovements);

module.exports = router;