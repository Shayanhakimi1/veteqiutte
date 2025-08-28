const { db } = require('./config/database');

// بررسی ساختار فعلی دیتابیس و داده‌های موجود
const checkDatabaseStructure = async () => {
  console.log('=== بررسی ساختار جدول comprehensive_user_data ===');
  
  // دریافت ساختار جدول
  db.all("PRAGMA table_info(comprehensive_user_data)", [], (err, columns) => {
    if (err) {
      console.error('خطا در دریافت ساختار جدول:', err);
      return;
    }
    
    console.log('\nستون‌های جدول:');
    columns.forEach(col => {
      console.log(`- ${col.name}: ${col.type} (nullable: ${col.notnull === 0 ? 'true' : 'false'})`);
    });
    
    // بررسی داده‌های موجود
    console.log('\n=== بررسی داده‌های موجود ===');
    db.all("SELECT * FROM comprehensive_user_data LIMIT 5", [], (err, rows) => {
      if (err) {
        console.error('خطا در دریافت داده‌ها:', err);
        return;
      }
      
      console.log(`\nتعداد کل رکوردها: ${rows.length}`);
      
      if (rows.length > 0) {
        console.log('\nنمونه داده‌ها:');
        rows.forEach((row, index) => {
          console.log(`\nرکورد ${index + 1}:`);
          Object.keys(row).forEach(key => {
            const value = row[key];
            if (value === null || value === undefined || value === '') {
              console.log(`  ${key}: NULL/EMPTY`);
            } else {
              console.log(`  ${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
            }
          });
        });
        
        // بررسی فیلدهای خالی
        console.log('\n=== بررسی فیلدهای خالی ===');
        const firstRow = rows[0];
        Object.keys(firstRow).forEach(key => {
          db.get(`SELECT COUNT(*) as count FROM comprehensive_user_data WHERE ${key} IS NULL OR ${key} = ''`, [], (err, result) => {
            if (!err && result) {
              if (result.count > 0) {
                console.log(`فیلد ${key}: ${result.count} رکورد خالی`);
              }
            }
          });
        });
      } else {
        console.log('هیچ داده‌ای در جدول وجود ندارد.');
      }
      
      // بستن اتصال
      setTimeout(() => {
        db.close((err) => {
          if (err) {
            console.error('خطا در بستن دیتابیس:', err);
          } else {
            console.log('\nاتصال دیتابیس بسته شد.');
          }
        });
      }, 2000);
    });
  });
};

checkDatabaseStructure();