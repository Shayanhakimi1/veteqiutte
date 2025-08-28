const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// اضافه کردن فیلد pet_weight به جدول comprehensive_user_data
db.run("ALTER TABLE comprehensive_user_data ADD COLUMN pet_weight REAL", (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('فیلد pet_weight قبلاً وجود دارد.');
    } else {
      console.error('خطا در اضافه کردن فیلد pet_weight:', err.message);
    }
  } else {
    console.log('فیلد pet_weight با موفقیت به جدول اضافه شد.');
  }
  
  // بررسی ساختار جدید جدول
  db.all("PRAGMA table_info(comprehensive_user_data)", (err, rows) => {
    if (err) {
      console.error('خطا در بررسی ساختار جدول:', err.message);
    } else {
      console.log('\nساختار جدید جدول comprehensive_user_data:');
      const petFields = rows.filter(row => row.name.startsWith('pet_'));
      console.log('فیلدهای مربوط به حیوان خانگی:');
      petFields.forEach(row => {
        console.log(`- ${row.name}: ${row.type}`);
      });
    }
    
    db.close();
  });
});