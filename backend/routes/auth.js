const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      mobile,
      password,
      petData
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !mobile || !password || !petData) {
      return res.status(400).json({ error: 'تمام فیلدهای الزامی را پر کنید' });
    }

    // Create full name
    const fullName = `${firstName} ${lastName}`;

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM comprehensive_user_data WHERE user_mobile = ?', [mobile], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: `شماره موبایل ${mobile} قبلاً در سیستم ثبت‌نام کرده است. لطفاً از شماره دیگری استفاده نمایید.` });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert comprehensive user data
    const userId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO comprehensive_user_data (
          user_first_name, user_last_name, user_full_name, user_mobile, user_password, user_registration_date,
          pet_name, pet_breed, pet_age, pet_gender, pet_is_neutered, pet_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          firstName, lastName, fullName, mobile, hashedPassword, new Date().toISOString(),
          petData.name, petData.breed, petData.age, petData.gender, petData.isNeutered ? 1 : 0, petData.type
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId, mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'ثبت‌نام با موفقیت انجام شد',
      token,
      user: {
        id: userId,
        firstName,
        lastName,
        fullName,
        mobile
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'خطا در ثبت‌نام کاربر' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Validate input
    if (!mobile || !password) {
      return res.status(400).json({ error: 'شماره موبایل و رمز عبور الزامی است' });
    }

    // Check for admin login
    if (mobile === process.env.ADMIN_MOBILE && password === process.env.ADMIN_PASSWORD) {
      const adminToken = jwt.sign(
        { isAdmin: true, mobile },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        message: 'ورود ادمین موفقیت‌آمیز',
        token: adminToken,
        isAdmin: true,
        user: {
          mobile,
          role: 'admin'
        }
      });
    }

    // Check regular user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, user_first_name, user_last_name, user_full_name, user_mobile, user_password FROM comprehensive_user_data WHERE user_mobile = ?',
        [mobile],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'شماره موبایل یا رمز عبور اشتباه است' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.user_password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'شماره موبایل یا رمز عبور اشتباه است' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, mobile: user.user_mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'ورود موفقیت‌آمیز',
      token,
      user: {
        id: user.id,
        firstName: user.user_first_name,
        lastName: user.user_last_name,
        fullName: user.user_full_name,
        mobile: user.user_mobile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطا در ورود کاربر' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'توکن ارائه نشده است' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.isAdmin) {
      return res.json({
        valid: true,
        isAdmin: true,
        user: { mobile: decoded.mobile, role: 'admin' }
      });
    }

    // Get user data
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, user_first_name, user_last_name, user_full_name, user_mobile FROM comprehensive_user_data WHERE id = ?',
        [decoded.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'کاربر یافت نشد' });
    }
    res.json({
      valid: true,
      user: {
        id: user.id,
        firstName: user.user_first_name,
        lastName: user.user_last_name,
        fullName: user.user_full_name,
        mobile: user.user_mobile
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'توکن نامعتبر است' });
  }
});

module.exports = router;