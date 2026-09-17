const express = require("express");const router = express.Router();
const {
  getAllParishes,
  getWAllParishes,
  getOneParish,
  createNewParish,
  updateParish,
  deleteParish,
  searchParishes,  
  getMultipleParishes,
  getForaneByParish,
  generateMissingShortCodes,
} = require("../controllers/parishController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Parish:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the parish
 *         building:
 *           type: string
 *           description: The building of the parish
 *         forane:
 *           type: string
 *           description: The ID of the forane
 *         phone:
 *           type: string
 *           description: The phone number of the parish
 *         street:
 *           type: string
 *           description: The street of the parish
 *         city:
 *           type: string
 *           description: The city of the parish
 *         district:
 *           type: string
 *           description: The district of the parish
 *         state:
 *           type: string
 *           description: The state of the parish
 *         pincode:
 *           type: string
 *           description: The pincode of the parish
 *       required:
 *         - name
 *         - building
 *         - forane
 *         - phone
 *         - city
 *         - district
 *         - state
 *         - pincode
 */
/**
 * @swagger
 * /parish/forane/{foraneid}:
 *   get:
 *     summary: Get all parishes for a specific forane
 *     tags: [Parish]
 *     parameters:
 *       - in: path
 *         name: foraneid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the forane
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Parish'
 *       404:
 *         description: Forane not found
 * 
 * /parish/{parishid}:
 *   get:
 *     summary: Get a specific parish by ID
 *     tags: [Parish]
 *     parameters:
 *       - in: path
 *         name: parishid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parish
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Parish'
 *       404:
 *         description: Parish not found
 * 
 *   put:
 *     summary: Update a specific parish by ID
 *     tags: [Parish]
 *     parameters:
 *       - in: path
 *         name: parishid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parish
 *       - in: body
 *         name: parish
 *         schema:
 *           $ref: '#/components/schemas/Parish'
 *         required: true
 *         description: The updated parish object
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Parish'
 *       404:
 *         description: Parish not found
 * 
 *   delete:
 *     summary: Delete a specific parish by ID
 *     tags: [Parish]
 *     parameters:
 *       - in: path
 *         name: parishid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the parish
 *     responses:
 *       204:
 *         description: Successful operation
 *       404:
 *         description: Parish not found
 * 
 * /parish:
 *   post:
 *     summary: Create a new parish
 *     tags: [Parish]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parish'
 *     responses:
 *       201:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Parish'
 *       400:
 *         description: Invalid request body
 * 
 */
router.get("/", getWAllParishes);
router.get("/search", searchParishes);
router.get("/m/:parishid", getMultipleParishes);
router.get("/forane/:foraneid", getAllParishes);
router.get("/:parishid", getOneParish);
router.post("/", createNewParish);
router.put("/:parishid", updateParish);
router.delete("/:parishid", deleteParish);
router.get('/getforane/:parishId', getForaneByParish);
router.post('/generate-short-codes', generateMissingShortCodes);
module.exports = router;
