// routes/totalAmountRoutes.js

const express = require('express');
const router = express.Router();
const totalAmountController= require('../controllers/totalAmountController');

router.put('/parish-allocations/:year', totalAmountController.updateParishAllocationDetails);
router.get('/parish-allocations/:year', totalAmountController.getParishAllocationDetails);

module.exports = router;