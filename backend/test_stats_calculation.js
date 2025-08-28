const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT user_registration_date FROM comprehensive_user_data WHERE user_registration_date IS NOT NULL', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  const users = rows;
  const totalUsers = users.length;
  
  // محاسبه کاربران امروز
  const todayUsers = users.filter(user => {
    const today = new Date();
    const userDate = new Date(user.user_registration_date);
    
    return today.getFullYear() === userDate.getFullYear() &&
           today.getMonth() === userDate.getMonth() &&
           today.getDate() === userDate.getDate();
  }).length;
  
  // محاسبه کاربران این هفته
  const thisWeekUsers = users.filter(user => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const userDate = new Date(user.user_registration_date);
    
    return userDate >= oneWeekAgo && userDate <= now;
  }).length;

  console.log('=== آمار کاربران ===');
  console.log(`کل کاربران: ${totalUsers}`);
  console.log(`کاربران امروز: ${todayUsers}`);
  console.log(`کاربران این هفته: ${thisWeekUsers}`);
  console.log('');
  console.log('تاریخ امروز:', new Date().toISOString().split('T')[0]);
  console.log('یک هفته پیش:', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  
  db.close();
});