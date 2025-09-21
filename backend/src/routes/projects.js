const express = require('express');
const projectService = require('../services/projectService');
const { authenticateWallet } = require('../middleware/auth');
const router = express.Router();

// Create new project
router.post('/', async (req, res) => {
  try {
    const projectData = req.body;
    const project = await projectService.createProject(projectData);
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectService.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active projects
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const projects = await projectService.getActiveProjects(parseInt(limit));
    
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join project
router.post('/:projectId/join', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userWallet, role = 'contributor' } = req.body;
    
    const collaboration = await projectService.joinProject(projectId, userWallet, role);
    
    res.json({ success: true, collaboration });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project team
router.get('/:projectId/team', async (req, res) => {
  try {
    const { projectId } = req.params;
    const team = await projectService.getProjectTeam(projectId);
    
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project status
router.patch('/:projectId/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, updatedBy } = req.body;
    
    const project = await projectService.updateProjectStatus(projectId, status, updatedBy);
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;