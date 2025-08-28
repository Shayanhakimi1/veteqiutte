const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/database');
const { authenticateToken, optionalAuthentication } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/consultations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: parseInt(process.env.MAX_FILES) || 5 // 5 files default
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری و ویدیویی مجاز هستند'));
    }
  }
});

// Create new consultation
router.post('/', optionalAuthentication, upload.array('files', 5), async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const {
      petId,
      symptoms,
      duration,
      severity,
      additionalInfo,
      urgency,
      description,
      consultationType,
      price,
      medicalDocuments,
      videos,
      audioFiles,
      appointmentDate,
      appointmentTime,
      appointmentDateLabel,
      appointmentTimeLabel
    } = req.body;

    // Use description if provided, otherwise fallback to symptoms
    const consultationDescription = description || symptoms;
    const consultationPrice = 280000;
    
    // Validate required fields
    if (!petId || (!consultationDescription && (!req.files || req.files.length === 0))) {
      return res.status(400).json({ error: 'لطفاً توضیحات مشاوره را وارد کنید یا فایل صوتی آپلود کنید' });
    }

    // Get user information from comprehensive_user_data table or request body
    let userInfo = null;
    if (userId) {
      userInfo = await new Promise((resolve, reject) => {
        db.get(
          'SELECT user_first_name as first_name, user_last_name as last_name, user_full_name as full_name, user_mobile as mobile, user_password as password FROM comprehensive_user_data WHERE user_id = ? LIMIT 1',
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // Use user info from request body if available, otherwise use database or defaults
    const finalUserInfo = {
      first_name: req.body.userFirstName || (userInfo && userInfo.first_name) || 'کاربر',
      last_name: req.body.userLastName || (userInfo && userInfo.last_name) || 'جدید',
      full_name: req.body.userFullName || (userInfo && userInfo.full_name) || 'کاربر جدید',
      mobile: req.body.userMobile || (userInfo && userInfo.mobile) || 'نامشخص',
      password: req.body.userPassword || (userInfo && userInfo.password) || ''
    };

    // Get pet information from comprehensive_user_data table or request body
    let petInfo = null;
    if (userId) {
      petInfo = await new Promise((resolve, reject) => {
        db.get(
          'SELECT pet_name as name, pet_breed as breed, pet_age as age, pet_gender as gender, pet_is_neutered as is_neutered, pet_type FROM comprehensive_user_data WHERE user_id = ? AND pet_name IS NOT NULL LIMIT 1',
          [userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // Use pet info from request body if available, otherwise use database or defaults
    const finalPetInfo = {
      name: req.body.petName || (petInfo && petInfo.name) || 'حیوان خانگی',
      breed: req.body.petBreed || (petInfo && petInfo.breed) || 'نامشخص',
      age: req.body.petAge || (petInfo && petInfo.age) || null,
      gender: req.body.petGender || (petInfo && petInfo.gender) || 'نامشخص',
      is_neutered: req.body.petIsNeutered || (petInfo && petInfo.is_neutered) || 0,
      pet_type: req.body.petType || (petInfo && petInfo.pet_type) || 'نامشخص'
    };

    // Process uploaded files to get audio and video file names
    let audioFileNames = [];
    let videoFileNames = [];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.mimetype.startsWith('audio/')) {
          audioFileNames.push(file.originalname);
        } else if (file.mimetype.startsWith('video/')) {
          videoFileNames.push(file.originalname);
        }
      }
    }

    // Insert consultation into comprehensive_user_data
    const consultationId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO comprehensive_user_data (
          user_id, user_first_name, user_last_name, user_full_name, user_mobile, user_password,
          pet_id, pet_name, pet_breed, pet_age, pet_gender, pet_is_neutered, pet_type,
          consultation_description, consultation_price, consultation_status,
          appointment_date, appointment_time, submission_date, consultation_id,
          audio_files, video_files, medical_documents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          finalUserInfo.first_name || 'نامشخص',
          finalUserInfo.last_name || 'نامشخص', 
          finalUserInfo.full_name || 'نامشخص',
          finalUserInfo.mobile || 'نامشخص',
          finalUserInfo.password || '',
          petId || null,
          finalPetInfo.name || 'نامشخص',
          finalPetInfo.breed || null,
          finalPetInfo.age || null,
          finalPetInfo.gender || null,
          finalPetInfo.is_neutered || 0,
          finalPetInfo.pet_type || 'نامشخص',
          consultationDescription,
          consultationPrice,
          'در انتظار بررسی',
          appointmentDate || null,
          appointmentTime || null,
          new Date().toISOString(),
          null, // consultation_id will be set to this.lastID after insert
          audioFileNames.join(',') || null,
          videoFileNames.join(',') || null,
          medicalDocuments ? JSON.stringify(medicalDocuments) : null
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Update consultation_id field with the actual ID
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE comprehensive_user_data SET consultation_id = ? WHERE rowid = ?',
        [consultationId, consultationId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Process uploaded files
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        uploadedFiles.push({
          name: file.originalname,
          path: file.path,
          type: file.mimetype
        });
      }
    }

    res.status(201).json({
      message: 'درخواست مشاوره با موفقیت ثبت شد',
      consultationId,

      price: consultationPrice,
      description: consultationDescription,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      appointmentDateLabel: appointmentDateLabel,
      appointmentTimeLabel: appointmentTimeLabel,
      filesUploaded: req.files ? req.files.length : 0
    });

  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست مشاوره' });
  }
});

// Get user consultations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get consultations with pet data
    const consultations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, p.name as pet_name, p.pet_type
         FROM consultations c
         LEFT JOIN pets p ON c.pet_id = p.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get files for each consultation
    for (const consultation of consultations) {
      const files = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, file_name as fileName, file_type as fileType, 
           file_size as fileSize, uploaded_at as uploadedAt
           FROM consultation_files WHERE consultation_id = ?`,
          [consultation.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      consultation.files = files;
    }

    // Get total count
    const totalCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM consultations WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    res.json({
      consultations: consultations,
      totalCount: parseInt(totalCount),
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست مشاوره‌ها' });
  }
});

// Get specific consultation
router.get('/:consultationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const consultationId = req.params.consultationId;

    // Get consultation with pet data
    const consultation = await new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, p.name as pet_name, p.pet_type, p.breed
         FROM consultations c
         LEFT JOIN pets p ON c.pet_id = p.id
         WHERE c.id = ? AND c.user_id = ?`,
        [consultationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!consultation) {
      return res.status(404).json({ error: 'مشاوره یافت نشد' });
    }

    // Get files for consultation
    const files = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, file_name as fileName, file_type as fileType, 
         file_size as fileSize, uploaded_at as uploadedAt
         FROM consultation_files WHERE consultation_id = ?`,
        [consultationId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    consultation.files = files;
    res.json(consultation);

  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مشاوره' });
  }
});

// Update consultation status (for admin use)
router.put('/:consultationId/status', authenticateToken, async (req, res) => {
  try {
    const consultationId = req.params.consultationId;
    const { status, response } = req.body;

    // Only admin can update status
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE consultations SET status = ?, admin_response = ?, 
         response_date = datetime('now'), updated_at = datetime('now') 
         WHERE id = ?`,
        [status, response, consultationId],
        (err) => {
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

// Get comprehensive user data
router.get('/comprehensive', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const comprehensiveData = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM comprehensive_user_data WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Parse JSON fields
    const processedData = comprehensiveData.map(row => ({
      ...row,
      medical_documents: row.medical_documents ? JSON.parse(row.medical_documents) : [],
      video_files: row.video_files ? JSON.parse(row.video_files) : [],
      audio_files: row.audio_files ? JSON.parse(row.audio_files) : []
    }));

    res.json({
      message: 'اطلاعات جامع کاربر با موفقیت دریافت شد',
      data: processedData
    });

  } catch (error) {
    console.error('Get comprehensive data error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات جامع' });
  }
});

// Get all comprehensive data (admin only)
router.get('/comprehensive/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you might want to add admin middleware)
    const allData = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM comprehensive_user_data ORDER BY created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Parse JSON fields
    const processedData = allData.map(row => ({
      ...row,
      medical_documents: row.medical_documents ? JSON.parse(row.medical_documents) : [],
      video_files: row.video_files ? JSON.parse(row.video_files) : [],
      audio_files: row.audio_files ? JSON.parse(row.audio_files) : []
    }));

    res.json({
      message: 'تمام اطلاعات جامع با موفقیت دریافت شد',
      data: processedData,
      total: processedData.length
    });

  } catch (error) {
    console.error('Get all comprehensive data error:', error);
    res.status(500).json({ error: 'خطا در دریافت تمام اطلاعات جامع' });
  }
});

module.exports = router;