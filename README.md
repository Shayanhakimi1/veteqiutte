# Pet Consultation Platform

یک پلتفرم جامع برای مشاوره دامپزشکی آنلاین با قابلیت‌های مدیریت کاربران و داشبورد ادمین.

## ویژگی‌های اصلی

### فرانت‌اند (React + Vite)
- 🎨 رابط کاربری مدرن و ریسپانسیو با Tailwind CSS
- 👥 سیستم احراز هویت کاربران
- 📊 داشبورد ادمین با آمار کاربران
- 🐾 مدیریت اطلاعات حیوانات خانگی
- 📅 سیستم رزرو نوبت
- 💬 بخش مشاوره آنلاین
- 📱 طراحی موبایل فرست

### بک‌اند (Node.js + Express)
- 🔐 سیستم احراز هویت JWT
- 🗄️ پایگاه داده SQLite
- 📡 API RESTful
- 👨‍💼 پنل مدیریت ادمین
- 📊 محاسبه آمار کاربران در زمان واقعی
- 🔒 میدلور امنیتی

## ساختار پروژه

```
veteqiutte2/
├── backend/                 # سرور Node.js
│   ├── config/             # تنظیمات پایگاه داده
│   ├── middleware/         # میدلورهای احراز هویت
│   ├── routes/             # مسیرهای API
│   ├── server.js           # فایل اصلی سرور
│   └── package.json        # وابستگی‌های بک‌اند
└── pet-consultation/       # اپلیکیشن React
    ├── src/
    │   ├── components/     # کامپوننت‌های React
    │   ├── pages/          # صفحات اپلیکیشن
    │   ├── contexts/       # Context API
    │   └── services/       # سرویس‌های API
    └── package.json        # وابستگی‌های فرانت‌اند
```

## نصب و راه‌اندازی

### پیش‌نیازها
- Node.js (نسخه 16 یا بالاتر)
- npm یا yarn

### نصب بک‌اند
```bash
cd backend
npm install
npm start
```

### نصب فرانت‌اند
```bash
cd pet-consultation
npm install
npm run dev
```

## متغیرهای محیطی

فایل `.env` را در پوشه `backend` ایجاد کنید:

```env
JWT_SECRET=your_jwt_secret_key
PORT=3000
DB_PATH=./database.sqlite
```

## API Endpoints

### احراز هویت
- `POST /api/auth/register` - ثبت‌نام کاربر جدید
- `POST /api/auth/login` - ورود کاربر
- `POST /api/auth/admin/login` - ورود ادمین

### کاربران
- `GET /api/users` - دریافت لیست کاربران (ادمین)
- `GET /api/users/stats` - آمار کاربران (ادمین)

### نوبت‌ها
- `GET /api/appointments` - دریافت نوبت‌ها
- `POST /api/appointments` - ایجاد نوبت جدید

### مشاوره‌ها
- `GET /api/consultations` - دریافت مشاوره‌ها
- `POST /api/consultations` - ایجاد مشاوره جدید

## تکنولوژی‌های استفاده شده

### فرانت‌اند
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Context API

### بک‌اند
- Node.js
- Express.js
- SQLite3
- JWT
- bcryptjs
- CORS

## ویژگی‌های اخیر

- ✅ رفع مشکل محاسبه آمار کاربران در داشبورد ادمین
- ✅ بهبود الگوریتم محاسبه تاریخ برای "کاربران امروز" و "کاربران این هفته"
- ✅ اصلاح مودال تبلیغات با متن "با همراهی فروشگاه بزرگ کاژه"
- ✅ بهینه‌سازی عملکرد API endpoints

## مشارکت

برای مشارکت در این پروژه:
1. پروژه را Fork کنید
2. یک branch جدید ایجاد کنید
3. تغییرات خود را commit کنید
4. Pull Request ارسال کنید

## لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

## پشتیبانی

برای گزارش باگ یا درخواست ویژگی جدید، لطفاً یک Issue ایجاد کنید.

---

**توسعه‌دهنده:** Pet Consultation Team  
**آخرین به‌روزرسانی:** دی ۱۴۰۳