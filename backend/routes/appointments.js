const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// دریافت ساعت‌های موجود برای یک تاریخ خاص
router.get('/available-slots/:date', (req, res) => {
  const { date } = req.params;
  
  // ساعت‌های پیش‌فرض (8 صبح تا 8 شب)
  const defaultTimeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  // بررسی ساعت‌های رزرو شده در دیتابیس
  const query = `
    SELECT time_slot, is_available 
    FROM appointment_slots 
    WHERE date = ?
  `;

  db.all(query, [date], (err, rows) => {
    if (err) {
      console.error('خطا در دریافت ساعت‌های مشاوره:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'خطا در دریافت ساعت‌های مشاوره' 
      });
    }

    // ایجاد نقشه از ساعت‌های موجود در دیتابیس
    const bookedSlots = {};
    rows.forEach(row => {
      bookedSlots[row.time_slot] = row.is_available;
    });

    // ترکیب ساعت‌های پیش‌فرض با ساعت‌های دیتابیس
    const availableSlots = defaultTimeSlots.map(timeSlot => ({
      time: timeSlot,
      available: bookedSlots.hasOwnProperty(timeSlot) ? bookedSlots[timeSlot] === 1 : true
    }));

    res.json({
      success: true,
      date: date,
      slots: availableSlots
    });
  });
});

// رزرو یک ساعت مشاوره
router.post('/book-slot', (req, res) => {
  const { date, timeSlot, userId, consultationId } = req.body;

  if (!date || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: 'تاریخ و ساعت الزامی است'
    });
  }

  // بررسی اینکه آیا این ساعت قبلاً رزرو شده یا نه
  const checkQuery = `
    SELECT id, is_available 
    FROM appointment_slots 
    WHERE date = ? AND time_slot = ?
  `;

  db.get(checkQuery, [date, timeSlot], (err, row) => {
    if (err) {
      console.error('خطا در بررسی ساعت مشاوره:', err);
      return res.status(500).json({
        success: false,
        message: 'خطا در بررسی ساعت مشاوره'
      });
    }

    if (row && row.is_available === 0) {
      return res.status(400).json({
        success: false,
        message: 'این ساعت قبلاً رزرو شده است'
      });
    }

    // اگر ساعت وجود ندارد، آن را ایجاد کن، در غیر این صورت به‌روزرسانی کن
    const upsertQuery = `
      INSERT OR REPLACE INTO appointment_slots 
      (date, time_slot, is_available, user_id, consultation_id, updated_at)
      VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(upsertQuery, [date, timeSlot, userId, consultationId], function(err) {
      if (err) {
        console.error('خطا در رزرو ساعت مشاوره:', err);
        return res.status(500).json({
          success: false,
          message: 'خطا در رزرو ساعت مشاوره'
        });
      }

      res.json({
        success: true,
        message: 'ساعت مشاوره با موفقیت رزرو شد',
        appointmentId: this.lastID
      });
    });
  });
});

// لغو رزرو ساعت مشاوره
router.delete('/cancel-slot/:date/:timeSlot', (req, res) => {
  const { date, timeSlot } = req.params;

  const updateQuery = `
    UPDATE appointment_slots 
    SET is_available = 1, user_id = NULL, consultation_id = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE date = ? AND time_slot = ?
  `;

  db.run(updateQuery, [date, timeSlot], function(err) {
    if (err) {
      console.error('خطا در لغو رزرو ساعت مشاوره:', err);
      return res.status(500).json({
        success: false,
        message: 'خطا در لغو رزرو ساعت مشاوره'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'ساعت مشاوره یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'رزرو ساعت مشاوره با موفقیت لغو شد'
    });
  });
});

// دریافت تمام ساعت‌های رزرو شده برای ادمین
router.get('/admin/booked-slots', (req, res) => {
  const query = `
    SELECT 
      a.id,
      a.date,
      a.time_slot,
      a.user_id,
      a.consultation_id,
      a.created_at,
      c.user_full_name,
      c.user_mobile,
      c.pet_name
    FROM appointment_slots a
    LEFT JOIN comprehensive_user_data c ON a.user_id = c.id
    WHERE a.is_available = 0
    ORDER BY a.date ASC, a.time_slot ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('خطا در دریافت ساعت‌های رزرو شده:', err);
      return res.status(500).json({
        success: false,
        message: 'خطا در دریافت ساعت‌های رزرو شده'
      });
    }

    res.json({
      success: true,
      appointments: rows
    });
  });
});

module.exports = router;