const express = require('express');
const router = express.Router();
const ProjectsController = require('./ProjectsController');

// Get all projects
router.get('/projects', ProjectsController.getAllProjects);

// Create a new project
router.post('/projects', ProjectsController.createProject);

// Update an existing project
router.put('/projects/:id', ProjectsController.updateProject);

module.exports = router;