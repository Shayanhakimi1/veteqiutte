const express = require('express');
const { db } = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM comprehensive_user_data', [], (err, row) => {
        if (err) reject(err);
        else resolve(parseInt(row.count));
      });
    });

    // Get total consultations
    const totalConsultations = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM comprehensive_user_data WHERE consultation_price IS NOT NULL', [], (err, row) => {
        if (err) reject(err);
        else resolve(parseInt(row.count));
      });
    });

    // Get pending consultations
    const pendingConsultations = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM comprehensive_user_data WHERE consultation_status = 'pending'",
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(parseInt(row.count));
        }
      );
    });

    // Get users registered today
    const usersToday = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM comprehensive_user_data WHERE DATE(user_registration_date) = DATE("now")',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(parseInt(row.count));
        }
      );
    });

    // Get consultations by status
    const consultationsByStatus = await new Promise((resolve, reject) => {
      db.all(
        `SELECT consultation_status as status, COUNT(*) as count 
         FROM comprehensive_user_data 
         WHERE consultation_price IS NOT NULL
         GROUP BY consultation_status 
         ORDER BY count DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get recent registrations (last 7 days)
    const recentRegistrations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DATE(user_registration_date) as date, COUNT(*) as count 
         FROM comprehensive_user_data 
         WHERE user_registration_date >= DATE('now', '-7 days') 
         GROUP BY DATE(user_registration_date) 
         ORDER BY date DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      totalUsers,
      totalConsultations,
      pendingConsultations,
      usersToday,
      consultationsByStatus,
      recentRegistrations,
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// Get all users with pagination and search
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `WHERE user_full_name LIKE ? OR user_mobile LIKE ?`;
      params = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const totalQuery = `
      SELECT COUNT(DISTINCT id) as total 
      FROM comprehensive_user_data 
      ${whereClause}
    `;

    const total = await new Promise((resolve, reject) => {
      db.get(totalQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    // Get users with all their data
    const usersQuery = `
      SELECT 
        id,
        user_first_name,
        user_last_name,
        user_full_name,
        user_mobile,
        user_registration_date,
        pet_name,
        pet_breed,
        pet_age,
        pet_gender,
        pet_is_neutered,
        pet_type,
        pet_weight,
        consultation_description,
        consultation_price,
        consultation_status,
        appointment_date,
        appointment_time,
        medical_documents,
        video_files,
        audio_files,
        submission_date,
        created_at,
        updated_at
      FROM comprehensive_user_data
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = search ? [...params, limit, offset] : [limit, offset];

    const users = await new Promise((resolve, reject) => {
      db.all(usersQuery, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'خطا در دریافت کاربران' });
  }
});

// Get specific user details
router.get('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details from comprehensive_user_data
    const userQuery = `
      SELECT *
      FROM comprehensive_user_data
      WHERE id = ?
    `;

    const user = await new Promise((resolve, reject) => {
      db.get(userQuery, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'خطا در دریافت جزئیات کاربر' });
  }
});

// Get all consultations with pagination and filters
router.get('/consultations', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      search = '', 
      sortBy = 'created_at', 
      sortOrder = 'DESC' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE consultation_price IS NOT NULL';
    let queryParams = [];
    
    if (status) {
      whereClause += ` AND consultation_status = ?`;
      queryParams.push(status);
    }
    
    if (search) {
      whereClause += ` AND (user_full_name LIKE ? OR user_mobile LIKE ? OR pet_name LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get consultations from comprehensive_user_data
    const consultationsQuery = `
      SELECT *
      FROM comprehensive_user_data
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const consultations = await new Promise((resolve, reject) => {
      db.all(consultationsQuery, [...queryParams, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count
      FROM comprehensive_user_data
      ${whereClause}
    `;
    
    const totalCount = await new Promise((resolve, reject) => {
      db.get(countQuery, queryParams, (err, row) => {
        if (err) reject(err);
        else resolve(parseInt(row.count));
      });
    });

    res.json({
      consultations: consultations,
      totalCount: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست مشاوره‌ها' });
  }
});

// Update consultation status and response
router.put('/consultations/:consultationId', authenticateAdmin, async (req, res) => {
  try {
    const consultationId = req.params.consultationId;
    const { status, adminResponse } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'وضعیت الزامی است' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE comprehensive_user_data 
         SET consultation_status = ?, admin_response = ?, response_date = datetime('now'), 
             updated_at = datetime('now') 
         WHERE id = ?`,
        [status, adminResponse || null, consultationId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'مشاوره با موفقیت به‌روزرسانی شد' });

  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی مشاوره' });
  }
});

// Update consultation status
router.patch('/consultations/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'وضعیت مشاوره الزامی است' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE comprehensive_user_data SET consultation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'وضعیت مشاوره با موفقیت به‌روزرسانی شد' });

  } catch (error) {
    console.error('Update consultation status error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت مشاوره' });
  }
});

// Delete user (soft delete)
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM comprehensive_user_data WHERE id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'کاربر با موفقیت حذف شد' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'خطا در حذف کاربر' });
  }
});

// Get user's consultations with files
router.get('/users/:userId/consultations', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const consultations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT *
         FROM comprehensive_user_data
         WHERE id = ? AND consultation_price IS NOT NULL
         ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ consultations });

  } catch (error) {
    console.error('Get user consultations error:', error);
    res.status(500).json({ error: 'خطا در دریافت مشاوره‌های کاربر' });
  }
});

module.exports = router;