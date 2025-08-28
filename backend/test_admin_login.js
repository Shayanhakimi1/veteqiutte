const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// تست ایجاد توکن ادمین جدید
const adminCredentials = {
  mobile: 'admin',
  isAdmin: true
};

const token = jwt.sign(adminCredentials, process.env.JWT_SECRET, { expiresIn: '24h' });

console.log('توکن ادمین جدید:');
console.log(token);

// تست تأیید توکن
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('\nتوکن معتبر است:');
  console.log(decoded);
} catch (error) {
  console.log('\nخطا در تأیید توکن:');
  console.log(error.message);
}

// تست درخواست با توکن جدید
const fetch = require('node-fetch');

fetch('http://localhost:3001/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log(`\nوضعیت پاسخ: ${response.status}`);
  return response.json();
})
.then(data => {
  console.log('پاسخ API:');
  console.log(data);
})
.catch(error => {
  console.log('خطا در درخواست API:');
  console.log(error.message);
});