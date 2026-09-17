const express = require('express');
const router = express.Router();
const slabController1 = require('../controllers/slabController');

router.get('/:year', slabController1.getSlabs);
router.post('/', slabController1.saveSlabs);  

module.exports = router;