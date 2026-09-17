const express = require('express');
const { login, register,logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/login/:username/:password', login);
router.post('/register', register);
router.post('/logout', logout);
router.get('/me', verifyToken, async (req, res) => {
    try {
      const admin = await Admin.findById(req.user.id).select('-password');
      res.json(admin);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  module.exports = router;