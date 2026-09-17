// const jwt = require('jsonwebtoken');
// const Admin = require('../models/admin.model');
// const BlacklistedToken = require('../models/blacklistedToken.model');

// const login = async (req, res) => {
//   try {
//     const { username, password } = req.params;
    
//     // Validate input
//     if (!username || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     // Find admin by email
//     const admin = await Admin.findOne({ email: username });
//     if (!admin) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Verify password
//     const isPasswordValid = await admin.comparePassword(password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       {
//         id: admin._id,
//         email: admin.email,
//         role: admin.role,
//         name: admin.name
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '9h' }
//     );

//     // Send response
//     res.json({
//       token,
//       admin: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const register = async (req, res) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     // Validate input
//     if (!name || !email || !password || !phone) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Check if admin already exists
//     const existingAdmin = await Admin.findOne({ email });
//     if (existingAdmin) {
//       return res.status(400).json({ message: 'Email already registered' });
//     }

//     // Create new admin
//     const admin = new Admin({
//       name,
//       email,
//       password,
//       phone,
//       role: 'admin' // Default role
//     });

//     await admin.save();

//     res.status(201).json({
//       admin: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role
//       }
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const logout = async (req, res) => {
//   try {
//     // Get token from header
//     const token = req.headers.authorization?.split(' ')[1];
    
//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: 'No token provided'
//       });
//     }

//     // Verify token is valid before blacklisting
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (jwtError) {
//       // Even if token is invalid/expired, we can still try to blacklist it
//       console.log('Token verification failed during logout:', jwtError.message);
//     }

//     // Check if token is already blacklisted
//     const isAlreadyBlacklisted = await BlacklistedToken.isTokenBlacklisted(token);
    
//     if (isAlreadyBlacklisted) {
//       return res.status(200).json({
//         success: true,
//         message: 'Already logged out'
//       });
//     }

//     // Use the static method to blacklist the token
//     const blacklistResult = await BlacklistedToken.blacklistToken(
//       token,
//       decoded?.id || null, // userId from JWT (if available)
//       'logout'             // reason
//     );

//     if (blacklistResult) {
//       res.json({
//         success: true,
//         message: 'Logged out successfully'
//       });
//     } else {
//       res.status(500).json({
//         success: false,
//         message: 'Failed to blacklist token'
//       });
//     }

//   } catch (error) {
//     console.error('Logout error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during logout'
//     });
//   }
// };

// module.exports = {
//   login,
//   register,
//   logout
// };

const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const BlacklistedToken = require('../models/blacklistedToken.model');

const login = async (req, res) => {
  try {
    const { username, password } = req.params;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin by email - simplified query
    const admin = await Admin.findOne({ email: username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '9h' }
    );

    // Send response
    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new admin
    const admin = new Admin({
      name,
      email,
      password,
      phone,
      role: 'admin'
    });

    await admin.save();

    res.status(201).json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log('Token verification failed during logout:', jwtError.message);
    }

    // Check if already blacklisted
    const isAlreadyBlacklisted = await BlacklistedToken.isTokenBlacklisted(token);
    
    if (isAlreadyBlacklisted) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out'
      });
    }

    // Blacklist the token
    const blacklistResult = await BlacklistedToken.blacklistToken(
      token,
      decoded?.id || null,
      'logout'
    );

    if (blacklistResult) {
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to blacklist token'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  login,
  register,
  logout
};