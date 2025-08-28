const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// مسیر فایل دیتابیس
const dbPath = path.join(__dirname, 'database.sqlite');

// ایجاد اتصال به دیتابیس
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('خطا در اتصال به دیتابیس:', err.message);
    process.exit(1);
  }
});

// افزودن فیلدهای appointment_date و appointment_time
const addAppointmentFields = () => {
  console.log('در حال افزودن فیلدهای appointment_date و appointment_time...');
  
  // افزودن فیلد appointment_date
  db.run(`ALTER TABLE comprehensive_user_data ADD COLUMN appointment_date TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطا در افزودن فیلد appointment_date:', err.message);
    } else {
      console.log('فیلد appointment_date با موفقیت اضافه شد');
    }
    
    // افزودن فیلد appointment_time
    db.run(`ALTER TABLE comprehensive_user_data ADD COLUMN appointment_time TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('خطا در افزودن فیلد appointment_time:', err.message);
      } else {
        console.log('فیلد appointment_time با موفقیت اضافه شد');
      }
      
      // بررسی ساختار جدید جدول
      db.all(`PRAGMA table_info(comprehensive_user_data)`, (err, rows) => {
        if (err) {
          console.error('خطا در بررسی ساختار جدول:', err.message);
        } else {
          console.log('\nساختار جدید جدول comprehensive_user_data:');
          console.log('نام فیلد\t\t\tنوع\t\t\tNull\t\t\tپیش‌فرض');
          console.log('----------------------------------------');
          rows.forEach(row => {
            console.log(`${row.name}\t\t${row.type}\t\t${row.notnull ? 'NO' : 'YES'}\t\t\t${row.dflt_value || 'NULL'}`);
          });
        }
        
        // بستن اتصال دیتابیس
        db.close((err) => {
          if (err) {
            console.error('خطا در بستن دیتابیس:', err.message);
          } else {
            console.log('\nاتصال دیتابیس بسته شد');
          }
        });
      });
    });
  });
};

// اجرای اسکریپت
addAppointmentFields();