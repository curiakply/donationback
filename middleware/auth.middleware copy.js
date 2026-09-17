const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/blacklistedToken.model');
const Admin = require('../models/admin.model'); // Add this import for user verification

/**
 * Enhanced version of your existing verifyToken middleware
 * Now includes comprehensive user authentication and tracking
 */
exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                error: 'MISSING_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                error: 'MISSING_TOKEN'
            });
        }

        // Check if token is blacklisted
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token is no longer valid',
                error: 'BLACKLISTED_TOKEN'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ENHANCED: Verify user still exists in database and get fresh user data
        let userFromDB = null;
        try {
            userFromDB = await Admin.findById(decoded.id).select('name email role status');
            if (!userFromDB) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                    error: 'USER_NOT_FOUND'
                });
            }

            // Check if user account is still active
            if (userFromDB.status && userFromDB.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'User account is inactive',
                    error: 'INACTIVE_USER'
                });
            }
        } catch (userCheckError) {
            console.error('User verification failed:', userCheckError);
            // Continue with token data if database check fails
        }

        // ENHANCED: Create comprehensive user object with both token and database data
        req.user = {
            // Original token data
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            
            // Enhanced fields from database (if available)
            ...(userFromDB && {
                dbName: userFromDB.name,
                dbEmail: userFromDB.email,
                dbRole: userFromDB.role,
                status: userFromDB.status
            }),
            
            // Use database data if available, fallback to token data
            actualName: userFromDB?.name || decoded.name,
            actualEmail: userFromDB?.email || decoded.email,
            actualRole: userFromDB?.role || decoded.role,
            
            // Token metadata
            tokenIssuedAt: decoded.iat,
            tokenExpiresAt: decoded.exp
        };

        // ENHANCED: Add request tracking and user context
        req.requestId = req.headers['x-request-id'] || 
                       `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        req.userContext = {
            userName: req.user.actualName,
            userEmail: req.user.actualEmail,
            userRole: req.user.actualRole,
            userId: req.user.id,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            sessionId: req.headers['x-session-id'] || `session_${req.user.id}_${Date.now()}`
        };

        // ENHANCED: Add session tracking
        req.sessionId = req.userContext.sessionId;

        // ENHANCED: Add authentication metadata for audit
        req.authMetadata = {
            tokenValid: true,
            userVerified: !!userFromDB,
            authenticatedAt: new Date().toISOString(),
            authMethod: 'JWT',
            tokenSource: 'header'
        };

        // ENHANCED: Log successful authentication for audit trail
        console.log(`[AUTH] User authenticated: ${req.user.actualName} (${req.user.actualEmail})`, {
            userId: req.user.id,
            method: req.method,
            url: req.originalUrl,
            requestId: req.requestId,
            sessionId: req.sessionId,
            ip: req.userContext.ipAddress,
            timestamp: req.userContext.timestamp
        });

        next();
    } catch (error) {
        // ENHANCED: Better error handling with detailed logging
        console.error('[AUTH] Token verification failed:', {
            error: error.message,
            errorType: error.name,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                error: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format',
                error: 'INVALID_TOKEN_FORMAT'
            });
        }
        
        if (error.name === 'NotBeforeError') {
            return res.status(401).json({
                success: false,
                message: 'Token not active yet',
                error: 'TOKEN_NOT_ACTIVE'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: 'TOKEN_VERIFICATION_FAILED'
        });
    }
};

/**
 * ENHANCED: Additional middleware for transaction operations
 * Specifically designed for your transaction routes
 */
exports.verifyTokenForTransactions = async (req, res, next) => {
    try {
        // First run the standard verification
        await new Promise((resolve, reject) => {
            exports.verifyToken(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Additional validation for transaction operations
        if (!req.user.actualName || req.user.actualName.trim() === '') {
            return res.status(401).json({
                success: false,
                message: 'User name is required for transaction operations',
                error: 'MISSING_USER_NAME'
            });
        }

        // ENHANCED: Add transaction-specific context
        req.transactionContext = {
            createdBy: req.user.actualName,
            createdByUserId: req.user.id,
            lastModifiedBy: req.user.actualName,
            lastModifiedByUserId: req.user.id,
            userContext: {
                userName: req.user.actualName,
                userEmail: req.user.actualEmail,
                userRole: req.user.actualRole,
                loginTime: req.headers['x-login-time'] || new Date().toISOString()
            },
            sessionId: req.sessionId,
            requestId: req.requestId,
            clientTimestamp: Date.now()
        };

        // ENHANCED: Add data checksum helper for transaction integrity
        req.generateChecksum = (data) => {
            const str = JSON.stringify({
                ...data,
                createdBy: req.user.actualName,
                userId: req.user.id
            }, Object.keys(data).sort());
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(36);
        };

        console.log(`[TRANSACTION AUTH] User verified for transaction operation: ${req.user.actualName}`, {
            operation: req.method,
            endpoint: req.originalUrl,
            userId: req.user.id,
            requestId: req.requestId
        });

        next();
    } catch (error) {
        console.error('[TRANSACTION AUTH] Enhanced verification failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication verification failed',
            error: 'AUTH_VERIFICATION_ERROR'
        });
    }
};

/**
 * ENHANCED: Optional authentication middleware
 * Adds user info if present, but doesn't require authentication
 */
exports.optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // No token provided, set anonymous context
            req.user = null;
            req.userContext = {
                userName: 'Anonymous',
                userEmail: null,
                userRole: 'guest',
                userId: null,
                requestId: req.headers['x-request-id'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            return next();
        }

        // Try to verify token, but don't fail if it's invalid
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userFromDB = await Admin.findById(decoded.id).select('name email role status');

            if (userFromDB && (!userFromDB.status || userFromDB.status === 'active')) {
                req.user = {
                    id: decoded.id,
                    actualName: userFromDB.name || decoded.name,
                    actualEmail: userFromDB.email || decoded.email,
                    actualRole: userFromDB.role || decoded.role,
                    status: userFromDB.status
                };

                req.userContext = {
                    userName: req.user.actualName,
                    userEmail: req.user.actualEmail,
                    userRole: req.user.actualRole,
                    userId: req.user.id,
                    requestId: req.headers['x-request-id'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent']
                };
            } else {
                // Invalid user, treat as anonymous
                req.user = null;
                req.userContext = {
                    userName: 'Anonymous',
                    userEmail: null,
                    userRole: 'guest',
                    userId: null,
                    requestId: req.headers['x-request-id'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent']
                };
            }
        } catch (tokenError) {
            // Token invalid, treat as anonymous
            req.user = null;
            req.userContext = {
                userName: 'Anonymous',
                userEmail: null,
                userRole: 'guest',
                userId: null,
                requestId: req.headers['x-request-id'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            };
        }

        next();
    } catch (error) {
        // If anything fails, continue as anonymous
        req.user = null;
        req.userContext = {
            userName: 'Anonymous',
            userEmail: null,
            userRole: 'guest',
            userId: null,
            requestId: req.headers['x-request-id'] || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        };
        next();
    }
};

/**
 * ENHANCED: Role-based authorization middleware
 */
exports.requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'NOT_AUTHENTICATED'
            });
        }

        const userRole = req.user.actualRole || req.user.role;
        if (userRole !== requiredRole) {
            console.log(`[AUTH] Access denied for ${req.user.actualName}: required role ${requiredRole}, has ${userRole}`);
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${requiredRole}`,
                error: 'INSUFFICIENT_PERMISSIONS',
                userRole: userRole,
                requiredRole: requiredRole
            });
        }

        next();
    };
};

/**
 * ENHANCED: User activity logging middleware
 */
exports.logUserActivity = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request with user context
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        user: req.user ? `${req.user.actualName} (${req.user.actualEmail})` : 'Anonymous',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId || req.userContext?.requestId
    };

    console.log(`[ACTIVITY] ${req.method} ${req.originalUrl}`, logData);

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        
        console.log(`[ACTIVITY] Response ${res.statusCode} - ${duration}ms`, {
            ...logData,
            status: res.statusCode,
            duration: `${duration}ms`,
            responseTime: new Date().toISOString()
        });
        
        return originalJson.call(this, data);
    };

    next();
};