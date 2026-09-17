const express = require("express");
const router = express.Router();

const {
  createNewTransaction,
  calculateFamilyTotal,
  calculateForaneTotal,
  calculateParishTotal,
  calculatePersonTotal,
  getTransferredTransaction,
  updateTransaction,
  deleteTransaction,
  getLatestTransaction,
  getTransactionsByYear,
  calculateYearlyData,
  calculateYearlyDatasum,
  calculateYearlyDataByForane,
  calculateYearlyDataTotal,
  getPersonByYear,
  getAllPersonTransactions,
  transferTransaction,
  calculateTranParishTotal,
  getKoottaymaWiseTitheInfo,
  getConsolidatedTitheByKoottayma,
} = require("../controllers/transactionController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         forane:
 *           type: string
 *           description: The ID of the forane associated with the transaction.
 *         parish:
 *           type: string
 *           description: The ID of the parish associated with the transaction.
 *         family:
 *           type: string
 *           description: The ID of the family associated with the transaction.
 *         person:
 *           type: string
 *           description: The ID of the person associated with the transaction.
 *         amountPaid:
 *           type: number
 *           description: The amount paid in the transaction.
 *         date:
 *           type: string
 *           format: date("dd/MM/yyyy")
 *           description: The date of the transaction.
 *       required:
 *         - forane
 *         - parish
 *         - family
 *         - person
 *         - amountPaid
 *
 * /transaction:
 *   post:
 *     summary: Create a new transaction.
 *     tags:
 *       - Transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewTransaction'
 *     responses:
 *       201:
 *         description: Successfully created a new transaction.
 *       500:
 *         description: An error occurred while recording the transaction.
 *
 * /transaction/forane/{foraneid}:
 *   get:
 *     summary: Calculate the total transaction amount for a specific forane.
 *     tags:
 *       - Transaction
 *     parameters:
 *       - in: path
 *         name: foraneid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the forane.
 *     responses:
 *       200:
 *         description: Successfully calculated the total transaction amount for the forane.
 *       500:
 *         description: An error occurred while calculating the total amount for the Forane.
 *
 * /transaction/parish/{parishid}:
 *   get:
 *     summary: Calculate the total transaction amount for a specific parish.
 *     tags:
 *       - Transaction
 *     parameters:
 *       - in: path
 *         name: parishid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parish.
 *     responses:
 *       200:
 *         description: Successfully calculated the total transaction amount for the parish.
 *       500:
 *         description: An error occurred while calculating the total amount for the Parish.
 *
 * /transaction/family/{familyid}:
 *   get:
 *     summary: Calculate the total transaction amount for a specific family.
 *     tags:
 *       - Transaction
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family.
 *     responses:
 *       200:
 *         description: Successfully calculated the total transaction amount for the family.
 *       500:
 *         description: An error occurred while calculating the total amount for the Family.
 *
 * /transaction/person/{personid}:
 *   get:
 *     summary: Calculate the total transaction amount for a specific person.
 *     tags:
 *       - Transaction
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the person.
 *     responses:
 *       200:
 *         description: Successfully calculated the total transaction amount for the person.
 *       500:
 *         description: An error occurred while calculating the total amount for the Person.
 *
 * /transaction/{transactionid}:
 *  put:
 *    summary: Update a transaction by transactionid.
 *    tags:
 *      - Transaction
 *    parameters:
 *      - in: path
 *        name: transactionid
 *        schema:
 *          type: string
 *        required: true
 *        description: The ID of the transaction.
 *    responses:
 *      200:
 *         description: Transaction updated successfully.
 *      500:
 *         description: An error occured while updating transaction.
 *      404:
 *         description: Transaction not found.
 *
 */

router.get("/forane/:foraneid", calculateForaneTotal);
router.get("/parish/:parishid", calculateParishTotal);
router.get("/family/:familyid", calculateFamilyTotal);
router.get("/person/:personid", calculatePersonTotal);
router.get("/latest/person/:personid", getLatestTransaction);
router.get('/person/:personId/year/:year/transferred', getTransferredTransaction);
router.post("/", createNewTransaction);
router.put("/transactionId/:transactionId", updateTransaction);
router.delete('/:id', deleteTransaction);
router.get("/year/:familyId", getTransactionsByYear);  
router.get("/person/:personid/year/:year", getPersonByYear);
router.get("/yearlyData/:year", calculateYearlyData);
router.get("/yearlysumData/:year", calculateYearlyDatasum);
router.get("/yearly/:year/forane/:foraneId", calculateYearlyDataByForane);
router.get("/yearlytotal/", calculateYearlyDataTotal);
router.get('/person/:personId/all', getAllPersonTransactions);
router.post('/transfer', transferTransaction);
router.get('/parish/all-with-transactions/year/:year', calculateTranParishTotal);
router.get('/tithe-info/:parishId', getKoottaymaWiseTitheInfo);
router.get('/consolidated-tithe/:parishId', getConsolidatedTitheByKoottayma);
module.exports = router;
