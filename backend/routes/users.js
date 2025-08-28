const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get user profile with pet data
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user data
    const userResult = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, first_name, last_name, full_name, mobile, registration_date FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? { rows: [row] } : { rows: [] });
        }
      );
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    // Get pet data
    const petResult = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM pets WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        }
      );
    });

    // Get consultation data
    const consultationResult = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM consultations WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        }
      );
    });

    const user = userResult.rows[0];
    const pets = petResult.rows;
    const consultations = consultationResult.rows;

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        mobile: user.mobile,
        registrationDate: user.registration_date
      },
      pets,
      consultations
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, fullName } = req.body;

    // Validate input
    if (!firstName || !lastName || !fullName) {
      return res.status(400).json({ error: 'تمام فیلدهای الزامی را پر کنید' });
    }

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET first_name = ?, last_name = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [firstName, lastName, fullName, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی اطلاعات کاربر' });
  }
});

// Add new pet
router.post('/pets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, breed, age, gender, isNeutered, petType } = req.body;

    // Validate input
    if (!name || !petType) {
      return res.status(400).json({ error: 'نام حیوان و نوع حیوان الزامی است' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO pets (user_id, name, breed, age, gender, is_neutered, pet_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, breed, age, gender, isNeutered, petType],
        function(err) {
          if (err) reject(err);
          else {
            db.get('SELECT * FROM pets WHERE id = ?', [this.lastID], (err, row) => {
              if (err) reject(err);
              else resolve({ rows: [row] });
            });
          }
        }
      );
    });

    res.status(201).json({
      message: 'حیوان خانگی با موفقیت اضافه شد',
      pet: result.rows[0]
    });

  } catch (error) {
    console.error('Add pet error:', error);
    res.status(500).json({ error: 'خطا در اضافه کردن حیوان خانگی' });
  }
});

// Update pet
router.put('/pets/:petId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;
    const { name, breed, age, gender, isNeutered, petType } = req.body;

    // Check if pet belongs to user
    const petCheck = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM pets WHERE id = ? AND user_id = ?',
        [petId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? { rows: [row] } : { rows: [] });
        }
      );
    });

    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: 'حیوان خانگی یافت نشد' });
    }

    // Update pet
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE pets SET name = ?, breed = ?, age = ?, gender = ?, 
         is_neutered = ?, pet_type = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, breed, age, gender, isNeutered, petType, petId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: 'اطلاعات حیوان خانگی با موفقیت به‌روزرسانی شد' });

  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی اطلاعات حیوان خانگی' });
  }
});

// Delete pet
router.delete('/pets/:petId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    // Check if pet belongs to user
    const petCheck = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM pets WHERE id = ? AND user_id = ?',
        [petId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? { rows: [row] } : { rows: [] });
        }
      );
    });

    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: 'حیوان خانگی یافت نشد' });
    }

    // Delete pet
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM pets WHERE id = ?', [petId], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    res.json({ message: 'حیوان خانگی با موفقیت حذف شد' });

  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ error: 'خطا در حذف حیوان خانگی' });
  }
});

module.exports = router;