const express = require('express');
const router = express.Router();
const financeTransationController = require('../controllers/financeTransationController');

router.get('/gettransactions', financeTransationController.getTransactions);
// router.get('/transactions/:id', financeTransationController.getTransaction);
router.patch('/transactions/:id', financeTransationController.updateTransaction);
router.post('/transactions', financeTransationController.createTransaction);
router.delete('/transactions/:id', financeTransationController.deleteTransaction);
router.put('/transactions/:id', financeTransationController.updateTransaction);

module.exports = router;