const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  searchPersons,
  searchFamilies,
  searchTransactions,
  combinedSearch,
  getFilterStats,
  exportFilteredData
} = require("../controllers/filterController");

/**
 * @swagger
 * components:
 *   schemas:
 *     FilterQuery:
 *       type: object
 *       properties:
 *         filter:
 *           type: object
 *           description: MongoDB query object
 *         page:
 *           type: integer
 *           default: 1
 *         limit:
 *           type: integer
 *           default: 50
 *         sort:
 *           type: object
 *           description: MongoDB sort object
 */

/**
 * @swagger
 * /filter/persons:
 *   post:
 *     summary: Search persons with advanced filtering
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterQuery'
 *           example:
 *             filter:
 *               gender: "male"
 *               status: "active"
 *               parish: "507f1f77bcf86cd799439011"
 *             page: 1
 *             limit: 50
 *     responses:
 *       200:
 *         description: Filtered persons returned successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/persons", verifyToken, searchPersons);

/**
 * @swagger
 * /filter/families:
 *   post:
 *     summary: Search families with advanced filtering
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterQuery'
 *     responses:
 *       200:
 *         description: Filtered families returned successfully
 */
router.post("/families", verifyToken, searchFamilies);

/**
 * @swagger
 * /filter/transactions:
 *   post:
 *     summary: Search transactions with advanced filtering
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FilterQuery'
 *     responses:
 *       200:
 *         description: Filtered transactions returned successfully
 */
router.post("/transactions", verifyToken, searchTransactions);

/**
 * @swagger
 * /filter/search:
 *   post:
 *     summary: Combined search with type selection
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/FilterQuery'
 *               - type: object
 *                 properties:
 *                   searchType:
 *                     type: string
 *                     enum: [person, family, transaction]
 *                     default: person
 *     responses:
 *       200:
 *         description: Search results returned successfully
 */
router.post("/search", verifyToken, combinedSearch);

/**
 * @swagger
 * /filter/stats:
 *   post:
 *     summary: Get statistics for filtered data
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filter:
 *                 type: object
 *     responses:
 *       200:
 *         description: Statistics returned successfully
 */
router.post("/stats", verifyToken, getFilterStats);

/**
 * @swagger
 * /filter/export:
 *   post:
 *     summary: Export filtered data
 *     tags: [Filter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filter:
 *                 type: object
 *               searchType:
 *                 type: string
 *                 enum: [person, family, transaction]
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 default: json
 *     responses:
 *       200:
 *         description: Data exported successfully
 */
router.post("/export", verifyToken, exportFilteredData);

module.exports = router;