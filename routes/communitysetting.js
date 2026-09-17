const express = require('express');
const router = express.Router();
const communitySettingsController = require('../controllers/communitySettingsController');


router.get('/', communitySettingsController.getAll);

router.get('/year/:year', communitySettingsController.getByYear);


router.get('/community/:communityId', communitySettingsController.getByCommunity);
router.get('/with-balance/:year', communitySettingsController.getAllCommunitiesWithBalance);

router.post('/', communitySettingsController.saveBulkSettings);

router.get('/parish-allocation/:year', communitySettingsController.getParishAllocation);
router.post('/parish-allocation', communitySettingsController.saveParishAllocation);

module.exports = router; 