const express = require("express");
const router = express.Router();
const Person = require("../models/Person");
const {
  getAllPersons,
  getAllPersons1,
  getAllPersonsfamily,
  getStatusHistory,
  getOnePerson,
  createNewPerson,
  updatePerson,
  deletePerson,
  getPopulationSummary,
  getPopulationBreakdown,
  getPopulationByAgeGroups,
  getGenderDistribution,
  getPopulationByEducation,
  Education,
  getPopulationOverview, 
  getEducationDistribution,
  getAgeGroupDistribution,
  getAllEducationCategories,
  getOccupationDistribution,
  getAgeGroupDistribution1,
  getFamilyDataWithTransactions,
  getFamilyStatusHistory,
  getPersonsByFamilies
} = require("../controllers/personController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Person:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the person.
 *         baptismName:
 *           type: string
 *           description: The baptism name of the person.
 *         gender:
 *           type: string
 *           description: The gender of the person.
 *           enum: [male, female]
 *         dob:
 *           type: string
 *           format: date
 *           description: The date of birth of the person in dd/MM/yyyy.
 *         phone:
 *           type: string
 *           description: The phone number of the person.
 *         email:
 *           type: string
 *           description: The email address of the person.
 *         education:
 *           type: string
 *           description: The education of the person.
 *         occupation:
 *           type: string
 *           description: The occupation of the person.
 *         forane:
 *           type: string
 *           description: The ID of the forane the person belongs to.
 *         parish:
 *           type: string
 *           description: The ID of the parish the person belongs to.
 *         family:
 *           type: string
 *           description: The ID of the family the person belongs to.
 *         relation:
 *           type: string
 *           description: The relation of the person to the family head.
 *           enum: [head, bride, groom, son, daughter, father, mother, brother, sister]
 *         status:
 *           type: string
 *           description: The status of the person.
 *           enum: [alive, deceased]
 *       required:
 *         - name
 *         - baptismName
 *         - gender
 *         - dob
 *         - phone
 *         - email
 *         - education
 *         - occupation
 *         - forane
 *         - parish
 *         - family
 *         - relation
 */
/**
 * @swagger
 * /person/family/{familyid}:
 *   get:
 *     summary: Get all persons in a family
 *     tags: [Persons]
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Person'
 *       404:
 *         description: Family not found
 *       500:
 *         description: An error occurred while fetching persons data
 *   post:
 *     summary: Create a new person
 *     tags: [Persons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Person'
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       500:
 *         description: An error occurred while creating a new person
 *
 * /person/{personid}:
 *   get:
 *     summary: Get a person by ID
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the person
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       404:
 *         description: Person not found
 *       500:
 *         description: An error occurred while fetching person data
 *   put:
 *     summary: Update a person
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the person
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Person'
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       404:
 *         description: Person not found
 *       500:
 *         description: An error occurred while updating person data
 *   delete:
 *     summary: Delete a person
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: personid
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the person
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The success message
 *       500:
 *         description: An error occurred while deleting person
 *//*
router.get("/population", getPopulationSummary);
router.get("/population/forane/:foraneId", getPopulationSummary);
router.get("/population/startDate/:foraneId/endDate/:foraneId", getPopulationSummary);
router.get("/population/forane/:foraneId/startDate/:startDate/endDate/:endDate", getPopulationSummary);*/

router.get('/population', getPopulationSummary);
router.get('/education', Education);
router.get('/population/forane/:foraneId', getPopulationSummary);
router.get('/population/breakdown', getPopulationBreakdown);
router.get('/person/age-groups', getPopulationByAgeGroups);
router.get('/population/gender-distribution', getGenderDistribution);
router.get('/person/education', getPopulationByEducation);

router.get('/education/distribution', getEducationDistribution); 
router.get('/education/distribution/:foraneId', getEducationDistribution);
router.get('/occupation/distribution', getOccupationDistribution);
router.get('/occupation/distribution/:foraneId', getOccupationDistribution);

router.get('/age-groups/distribution', getAgeGroupDistribution1);
router.get('/age-groups/distribution/:foraneId', getAgeGroupDistribution1);

router.get('/person/age-groups/distribution/:foraneId/:startDate/:endDate', getAgeGroupDistribution);
router.get('/person/age-groups/distribution/:foraneId', getAgeGroupDistribution);
router.get('/person/education/categories', getAllEducationCategories);
router.get('/', getPopulationOverview);
router.get('/distinct-relations', async (req, res) => {
  try {
    const distinctRelations = await Person.distinct('relation');
    // Filter out null/undefined values and sort
    let cleanRelations = distinctRelations
      .filter(relation => relation && relation.trim())
      .map(relation => relation.trim().toLowerCase())
      .sort();
    
    // Ensure 'head' comes first
    cleanRelations = cleanRelations.filter(relation => relation !== 'head');
    cleanRelations.unshift('head');
    
    res.json(cleanRelations);
  } catch (error) {
    console.error('Error fetching distinct relations:', error);
    res.status(500).json({ message: 'Failed to fetch relations' });
  }
});

// Family Management specific routes - Place these BEFORE the general routes to avoid conflicts
router.get('/familydata/:familyId/year/:year', getFamilyDataWithTransactions);
router.get('/family/:familyId/status-history', getFamilyStatusHistory);
router.get('/persons/families/:familyIds', getPersonsByFamilies);


router.get("/family/:familyid", getAllPersons);
router.get('/persons/families/:familyIds', getAllPersons1);
router.get('/familydata/:familyIds/year/:year', getAllPersonsfamily);
router.get('/persons/families', getAllPersons1);
router.get('/family/:familyId/status-history', getStatusHistory);
router.get("/:personid", getOnePerson);
router.post("/", createNewPerson);
router.put("/:personid", updatePerson);  
router.delete("/:personid", deletePerson);


module.exports = router;
