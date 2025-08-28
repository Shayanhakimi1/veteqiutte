const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('بررسی جدول comprehensive_user_data...');

// بررسی تعداد کل رکوردها
db.get('SELECT COUNT(*) as count FROM comprehensive_user_data', (err, row) => {
  if (err) {
    console.error('خطا در شمارش رکوردها:', err);
    return;
  }
  console.log(`تعداد کل کاربران: ${row.count}`);
  
  if (row.count > 0) {
    // نمایش چند رکورد نمونه
    db.all('SELECT user_id, user_first_name, user_last_name, user_mobile, pet_type, pet_name FROM comprehensive_user_data LIMIT 5', (err, rows) => {
      if (err) {
        console.error('خطا در دریافت نمونه داده‌ها:', err);
        return;
      }
      
      console.log('\nنمونه کاربران:');
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.user_first_name} ${row.user_last_name} - ${row.user_mobile} - حیوان: ${row.pet_type || 'ندارد'} (${row.pet_name || 'بدون نام'})`);
      });
      
      db.close();
    });
  } else {
    console.log('هیچ کاربری در دیتابیس یافت نشد!');
    db.close();
  }
});