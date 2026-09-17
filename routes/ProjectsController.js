const Project = require('../models/Project');

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProject = async (req, res) => {
  const { name, percent, amountAllocated, fiscalYear } = req.body;
  
  try {
    const project = new Project({
      name,
      percent,
      amountAllocated,
      fiscalYear
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  const { id } = req.params;
  const { name, percent, amountAllocated, fiscalYear } = req.body;

  try {
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.name = name;
    project.percent = percent;
    project.amountAllocated = amountAllocated;
    project.fiscalYear = fiscalYear;
    await project.save();
    
    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};