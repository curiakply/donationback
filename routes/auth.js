const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const JWT_SECRET = process.env.SESSION_SECRET
// Register Route
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    // Check if user with this email or phone already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    // Create a new user
    const newUser = new User({ name, email, phone, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      req.login(user, { session: false }, async (err) => {
        if (err) return next(err);
  
        // Create a JWT with user details
        const token = jwt.sign(
          {
            id: user._id,
            name: user.name,
            parish: user.parish, // Send additional data like parish
          },
          JWT_SECRET,
          { expiresIn: '1h' } // Token expiry time
        );
  
        // Send token and user data to the client
        return res.json({
          message: 'Logged in successfully',
          token, // Send token
          user: {
            id: user._id,
            name: user.name,
            parish: user.parish, // Include parish info
            role: user.role,
          },
          redirectUrl: '/dashboard',
        });
      });
    })(req, res, next);
  });

// Logout Route
router.get('/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
