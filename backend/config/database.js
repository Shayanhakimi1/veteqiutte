const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// مسیر فایل دیتابیس
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// ایجاد اتصال به دیتابیس SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('خطا در اتصال به دیتابیس SQLite:', err.message);
  } else {
    console.log('اتصال به دیتابیس SQLite برقرار شد');
  }
});

// تست اتصال به دیتابیس
const testConnection = async () => {
  return new Promise((resolve) => {
    db.get('SELECT 1', (err) => {
      if (err) {
        console.error('خطا در تست اتصال دیتابیس:', err.message);
        resolve(false);
      } else {
        console.log('تست اتصال دیتابیس موفقیت‌آمیز بود');
        resolve(true);
      }
    });
  });
};

// ایجاد جداول دیتابیس
const initializeTables = async () => {
  return new Promise((resolve) => {
    db.serialize(() => {

      // جدول ادمین‌ها
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mobile TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'admin',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // جدول جامع اطلاعات کاربران و مشاوره‌ها
      db.run(`
        CREATE TABLE IF NOT EXISTS comprehensive_user_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          -- اطلاعات کاربر
          user_first_name TEXT NOT NULL,
          user_last_name TEXT NOT NULL,
          user_full_name TEXT NOT NULL,
          user_mobile TEXT UNIQUE NOT NULL,
          user_password TEXT NOT NULL,
          user_registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          -- اطلاعات حیوان خانگی
          pet_name TEXT NOT NULL,
          pet_breed TEXT,
          pet_age INTEGER,
          pet_gender TEXT,
          pet_is_neutered BOOLEAN DEFAULT 0,
          pet_type TEXT NOT NULL,
          -- اطلاعات مشاوره
  
          consultation_description TEXT,
          consultation_price REAL,
          consultation_status TEXT DEFAULT 'pending',
          appointment_date TEXT, -- تاریخ قرار ملاقات
          appointment_time TEXT, -- ساعت قرار ملاقات
          -- فایل‌های آپلود شده
          medical_documents TEXT, -- JSON array of file paths
          video_files TEXT, -- JSON array of file paths
          audio_files TEXT, -- JSON array of file paths
          -- تاریخ‌ها
          submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // جدول ساعت‌های مشاوره
      db.run(`
        CREATE TABLE IF NOT EXISTS appointment_slots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL, -- تاریخ به فرمت YYYY-MM-DD
          time_slot TEXT NOT NULL, -- ساعت به فرمت HH:MM
          is_available BOOLEAN DEFAULT 1, -- آیا ساعت خالی است
          user_id INTEGER, -- شناسه کاربری که این ساعت را رزرو کرده
          consultation_id INTEGER, -- شناسه مشاوره
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, time_slot)
        )
      `);

      // ایجاد ایندکس‌ها برای بهبود عملکرد
      db.run('CREATE INDEX IF NOT EXISTS idx_admin_users_mobile ON admin_users(mobile)');
      db.run('CREATE INDEX IF NOT EXISTS idx_comprehensive_user_mobile ON comprehensive_user_data(user_mobile)');

      db.run('CREATE INDEX IF NOT EXISTS idx_comprehensive_submission_date ON comprehensive_user_data(submission_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_appointment_slots_date ON appointment_slots(date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_appointment_slots_available ON appointment_slots(is_available)', (err) => {
        if (err) {
          console.error('خطا در ایجاد جداول دیتابیس:', err.message);
          resolve(false);
        } else {
          console.log('جداول دیتابیس با موفقیت ایجاد شدند');
          resolve(true);
        }
      });
    });
  });
};

module.exports = {
  db,
  testConnection,
  initializeTables
};