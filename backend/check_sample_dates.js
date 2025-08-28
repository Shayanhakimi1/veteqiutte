const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT user_registration_date, created_at FROM comprehensive_user_data LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Sample dates:');
    rows.forEach((row, i) => {
      console.log(`${i+1}. user_registration_date: ${row.user_registration_date}, created_at: ${row.created_at}`);
    });
  }
  db.close();
});