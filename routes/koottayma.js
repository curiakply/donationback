const express = require("express");
const router = express.Router();

const {
  getAllKoottaymas,
  getOneKoottayma,
  createNewKoottayma,
  updateKoottayma,
  deleteKoottayma,
} = require("../controllers/koottaymaController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Koottayma:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the Koottayma.
 *         forane:
 *           type: string
 *           description: The ID of the associated Forane.
 *         parish:
 *           type: string
 *           description: The ID of the associated Parish.
 *       required:
 *         - name
 *         - forane
 *         - parish
 */

/**
 * @swagger
 * /koottayma/parish/{parishid}:
 *   get:
 *     summary: Get all koottaymas by parish ID
 *     tags: [Koottayma]
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Koottayma'
 *       404:
 *         description: No koottaymas found
 *   post:
 *     summary: Create a new koottayma
 *     tags: [Koottayma]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Koottayma'
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Koottayma'
 *       500:
 *         description: An error occurred while creating koottayma
 * 
 * /koottayma/{koottaymaid}:
 *   get:
 *     summary: Get a koottayma by ID
 *     tags: [Koottayma]
 *     parameters:
 *       - in: path
 *         name: koottaymaid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the koottayma
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Koottayma'
 *       404:
 *         description: Koottayma not found
 *   put:
 *     summary: Update a koottayma
 *     tags: [Koottayma]
 *     parameters:
 *       - in: path
 *         name: koottaymaid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the koottayma
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Koottayma'
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Koottayma'
 *       500:
 *         description: An error occurred while updating koottayma
 *   delete:
 *     summary: Delete a koottayma
 *     tags: [Koottayma]
 *     parameters:
 *       - in: path
 *         name: koottaymaid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the koottayma
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: An error occurred while deleting koottayma
 */

router.get("/parish/:parishid", getAllKoottaymas);
router.get("/:koottaymaid", getOneKoottayma);
router.post("/", createNewKoottayma);
router.put("/:koottaymaid", updateKoottayma);
router.delete("/:koottaymaid", deleteKoottayma);

module.exports = router;
