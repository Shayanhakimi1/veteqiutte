const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// بررسی ساختار جدول comprehensive_user_data
db.all("PRAGMA table_info(comprehensive_user_data)", (err, rows) => {
  if (err) {
    console.error('خطا در بررسی ساختار جدول:', err.message);
  } else {
    console.log('ساختار جدول comprehensive_user_data:');
    console.log('نام فیلد\t\tنوع\t\tNull\t\tپیش‌فرض');
    console.log('----------------------------------------');
    rows.forEach(row => {
      console.log(`${row.name}\t\t${row.type}\t\t${row.notnull ? 'NO' : 'YES'}\t\t${row.dflt_value || 'NULL'}`);
    });
  }
  
  db.close();
});