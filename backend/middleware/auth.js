const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'توکن دسترسی ارائه نشده است' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's admin token
    if (decoded.isAdmin) {
      req.user = {
        isAdmin: true,
        mobile: decoded.mobile
      };
      return next();
    }

    // For regular users, verify user still exists
    const userResult = await pool.query(
      'SELECT id, mobile, deleted_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].deleted_at) {
      return res.status(401).json({ error: 'کاربر یافت نشد یا حذف شده است' });
    }

    req.user = {
      userId: decoded.userId,
      mobile: decoded.mobile,
      isAdmin: false
    };

    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'توکن نامعتبر است' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'توکن منقضی شده است' });
    }
    
    return res.status(500).json({ error: 'خطا در احراز هویت' });
  }
};

// Middleware to authenticate admin only
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'توکن دسترسی ارائه نشده است' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's admin token
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز - فقط ادمین' });
    }

    req.user = {
      isAdmin: true,
      mobile: decoded.mobile
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'توکن نامعتبر است' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'توکن منقضی شده است' });
    }
    
    return res.status(500).json({ error: 'خطا در احراز هویت ادمین' });
  }
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const resourceId = req.params.id || req.params.petId || req.params.consultationId;

      if (!resourceId) {
        return res.status(400).json({ error: 'شناسه منبع ارائه نشده است' });
      }

      let query;
      switch (resourceType) {
        case 'pet':
          query = 'SELECT user_id FROM pets WHERE id = $1';
          break;
        case 'consultation':
          query = 'SELECT user_id FROM consultations WHERE id = $1';
          break;
        default:
          return res.status(400).json({ error: 'نوع منبع نامعتبر است' });
      }

      const result = await pool.query(query, [resourceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'منبع یافت نشد' });
      }

      if (result.rows[0].user_id !== userId && !req.user.isAdmin) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز به این منبع' });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({ error: 'خطا در بررسی مالکیت منبع' });
    }
  };
};

// Rate limiting middleware for sensitive operations
const rateLimitSensitive = (req, res, next) => {
  // This is a simple in-memory rate limiter
  // In production, use Redis or a proper rate limiting solution
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 100; // افزایش موقت برای تست

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const userAttempts = global.rateLimitStore.get(ip) || [];
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({ 
      error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید' 
    });
  }

  recentAttempts.push(now);
  global.rateLimitStore.set(ip, recentAttempts);

  next();
};

// Optional authentication middleware - allows requests with or without token
const optionalAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's admin token
    if (decoded.isAdmin) {
      req.user = {
        isAdmin: true,
        mobile: decoded.mobile
      };
      return next();
    }

    // For regular users, verify user still exists
    const userResult = await pool.query(
      'SELECT id, mobile, deleted_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].deleted_at) {
      // User not found or deleted, continue without authentication
      req.user = null;
      return next();
    }

    req.user = {
      userId: decoded.userId,
      mobile: decoded.mobile,
      isAdmin: false
    };

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // On any error, continue without authentication
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  checkResourceOwnership,
  rateLimitSensitive,
  optionalAuthentication
};