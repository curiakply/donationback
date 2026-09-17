const express = require("express");const router = express.Router();
const Family = require("../models/Family");
const Person = require("../models/Person");
const {
  getAllFamilies,
  getBulkFamilyData,
  getAllParFamilies,
  getFamiliesByKoottayma,
  getOneFamily,
  createNewFamily,
  updateFamily,
  deleteFamily,
} = require("../controllers/familyController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Family:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The ID of the family
 *         name:
 *           type: string
 *           description: The name of the family
 *         building:
 *           type: string
 *           description: The building of the family
 *         forane:
 *           type: string
 *           description: The ID of the forane
 *         parish:
 *           type: string
 *           description: The ID of the parish
 *         koottayma:
 *           type: string
 *           description: The ID of the koottayma
 *         head:
 *           type: string
 *           description: The ID of the head of the family
 *         phone:
 *           type: string
 *           description: The phone number of the family
 *         street:
 *           type: string
 *           description: The street of the family
 *         city:
 *           type: string
 *           description: The city of the family
 *         district:
 *           type: string
 *           description: The district of the family
 *         pincode:
 *           type: string
 *           description: The pincode of the family
 *       required:
 *         - id
 *         - name
 *         - building
 *         - forane
 *         - parish
 *         - koottayma
 *         - phone
 *         - street
 *         - city
 *         - district
 *         - pincode
 */
/**
 * @swagger
 * /family/kottayma/{koottaymaid}:
 *   get:
 *     summary: Get all families in a specific koottayma
 *     tags: [Family]
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while fetching family data.
 * 
 * /family/{familyid}:
 *   get:
 *     summary: Get a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while fetching family data.
 * 
 *   post:
 *     summary: Create a new family
 *     tags: [Family]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Family'
 *     responses:
 *       201:
 *         description: Family created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while creating family.
 * 
 *   put:
 *     summary: Update a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Family'
 *     responses:
 *       200:
 *         description: Family updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Family'
 *       500:
 *         description: An error occurred while updating family.
 * 
 *   delete:
 *     summary: Delete a specific family by ID
 *     tags: [Family]
 *     parameters:
 *       - in: path
 *         name: familyid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the family
 *     responses:
 *       200:
 *         description: Family deleted successfully
 *       500:
 *         description: An error occurred while deleting family.
 */

router.get("/kottayma/:koottaymaid", getAllFamilies);
router.get('/bulk-family-data/:foraneId/:parishId/:koottaymaId/:yearId', getBulkFamilyData);
router.get("/koottayma/:koottaymaid", getFamiliesByKoottayma);
router.get("/parish/:parishId", getAllParFamilies);
router.get("/:familyid", getOneFamily);
router.post("/", createNewFamily);
router.put("/:familyid", updateFamily);
router.delete("/:familyid", deleteFamily);
router.get('/search/familyNumber/:familyNumber/parish/:parishId', async (req, res) => {
  try {
    const { familyNumber, parishId } = req.params;
    
    const family = await Family.findOne({ 
      familyNumber: familyNumber,
      parish: parishId,
      status: 'active' 
    }).populate('forane'); // Only populate forane, not parish
    
    if (!family) {
      return res.status(404).json({ message: 'Family not found in selected parish' });
    }
    
    res.json(family);
  } catch (error) {
    res.status(500).json({ message: 'Error searching family', error: error.message });
  }
});
router.get('/next-family-number/:parishId', async (req, res) => {
  try {
    const { parishId } = req.params;
    
    // Find the highest familyNumber for the given parish
    const lastFamily = await Family.findOne({ parish: parishId })
      .sort({ familyNumber: -1 })  // Sort by familyNumber in descending order
      .select('familyNumber')
      .exec();

    let nextFamilyNumber = 1; // Default to 1 if no families are found

    if (lastFamily && lastFamily.familyNumber) {
      nextFamilyNumber = lastFamily.familyNumber + 1; // Increment by 1
    }

    res.json({ 
      familyNumber: nextFamilyNumber,
      message: `Next available family number for parish: ${nextFamilyNumber}` 
    });
  } catch (error) {
    console.error('Error getting next family number:', error);
    res.status(500).json({ 
      message: 'Error getting next family number', 
      error: error.message 
    });
  }
});
module.exports = router;
