const express = require("express");const router = express.Router();
const {
    saveParishAllocations,
    getParishAllocations,
    checkCollectionChanges,
         
} = require("../controllers/parishAllocationController");


router.post('/parish-allocations/save-all', saveParishAllocations);
router.get('/parish-allocations/:year', getParishAllocations);
router.get('/parish-allocations/changes/:year', checkCollectionChanges);

module.exports = router;