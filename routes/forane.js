const express = require("express");
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
const {
  uploadExcel,
  getAllForanes,
  createNewForane,
  updateForane,
  getOneForane,
  deleteForane,
} = require("../controllers/foraneController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Forane:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the forane.
 *         building:
 *           type: string
 *           description: The building name or number of the forane.
 *         phone:
 *           type: string
 *           description: The phone number of the forane.
 *         street:
 *           type: string
 *           description: The street address of the forane.
 *         city:
 *           type: string
 *           description: The city where the forane is located.
 *         district:
 *           type: string
 *           description: The district where the forane is located.
 *         state:
 *           type: string
 *           description: The state where the forane is located.
 *         pincode:
 *           type: string
 *           description: The postal code of the forane.
 *       required:
 *         - name
 *         - building
 *         - phone
 *         - city
 *         - district
 *         - state
 *         - pincode
 */
/**
 * @swagger

 * /forane:
 *   get:
 *     summary: Get all foranes
 *     tags: [Forane]
 *     responses:
 *       200:
 *         description: List of foranes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Forane'
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new forane
 *     tags: [Forane]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Forane'
 *     responses:
 *       201:
 *         description: Forane created successfully
 *       409:
 *         description: Forane already exists
 *       500:
 *         description: Internal server error
 * /forane/{foraneid}:
 *   get:
 *     summary: Get a specific forane by ID
 *     tags: [Forane]
 *     parameters:
 *       - in: path
 *         name: foraneid
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the forane
 *     responses:
 *       200:
 *         description: Forane found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Forane'
 *       404:
 *         description: Forane not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a specific forane by ID
 *     tags: [Forane]
 *     parameters:
 *       - in: path
 *         name: foraneid
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the forane
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Forane'
 *     responses:
 *       200:
 *         description: Forane updated successfully
 *       404:
 *         description: Forane not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a specific forane by ID
 *     tags: [Forane]
 *     parameters:
 *       - in: path
 *         name: foraneid
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the forane
 *     responses:
 *       200:
 *         description: Forane deleted successfully
 *       404:
 *         description: Forane not found
 *       500:
 *         description: Internal server error
 */

router.get("/", getAllForanes);
router.get("/:foraneid", getOneForane);
router.post("/", createNewForane);
router.put("/:foraneid", updateForane);
router.delete("/:foraneid", deleteForane);
router.post('/upload', uploadExcel);

module.exports = router;
