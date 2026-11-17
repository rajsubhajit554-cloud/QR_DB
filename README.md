# 🚀 QR STUDIO 0.2
### ডাইনামিক QR ও ক্লাউড রিডাইরেক্ট ম্যানেজার (Next.js + Google Apps Script + Vercel)

QR STUDIO 0.2 হলো একটি পূর্ণাঙ্গ ডাইনামিক QR কোড জেনারেটর এবং লিংক ম্যানেজমেন্ট সিস্টেম। এর মাধ্যমে আপনি যেকোনো প্রিন্ট বা পোস্টারের জন্য এমন একটি QR কোড বানাতে পারেন যার টার্গেট লিংক ভবিষ্যতে শতবার পরিবর্তন করলেও আসল প্রিন্ট করা QR কোড নষ্ট হবে না!

---

## 🏗️ আর্কিটেকচার (How It Works)

```text
[ইউজার QR স্ক্যান করল] 
       │
       ▼
https://yourapp.vercel.app/r/abc123   (স্থায়ী শর্ট লিংক)
       │
       ▼ (কোল্ড-স্টার্ট ছাড়া দ্রুত)
Vercel Edge/Serverless Route ──> Google Apps Script API ──> Google Sheet (QR_DB)
       │                                                          │
       │<────────────── টার্গেট URL ফেরত দেয় ─────────────────────┘
       ▼
HTTP 302 Temporary Redirect  (ব্রাউজার ক্যাশ করবে না)
       │
       ▼
আসল গন্তব্য ওয়েবসাইট (Destination URL)
```

> **গুরুত্বপূর্ণ:** এখানে **302 Redirect** ব্যবহার করা হয়েছে। 301 ব্যবহার করলে ব্রাউজার ক্যাশ করে ফেলত, ফলে আপনি লিংক বদলালেও ইউজারের ফোনে পুরনো লিংক ওপেন হতো। 302 ব্যবহারে লিংক পরিবর্তন সাথে সাথে কাজ করে!

---

## 📁 ফোল্ডার স্ট্রাকচার

```
QR STUDIO 0.2/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── route.js       # Admin CRUD API (GAS এর সাথে সুরক্ষিত সংযোগ)
│   ├── r/
│   │   └── [code]/
│   │       └── route.js       # 302 রিডাইরেক্ট রাউট (QR স্ক্যান হ্যান্ডলার)
│   ├── globals.css            # Tailwind + ফন্ট স্টাইলিং
│   ├── layout.js              # Next.js রুট লেআউট
│   └── page.js                # পূর্ণাঙ্গ ৩-প্যানেল স্টুডিও UI
├── google-apps-script.js       # Google Apps Script ব্যাকএন্ড কোড
├── .env.local.example         # এনভায়রনমেন্ট ভ্যারিয়েবল ফরম্যাট
├── .env.local                 # লোকাল কনফিগারেশন ফাইল
├── package.json
└── README.md
```

---

## 🛠️ ধাপে ধাপে সেটআপ গাইড (Step-by-step Setup)

### ধাপ ১: Google Sheet তৈরি করুন
1. ব্রাউজারে [sheets.new](https://sheets.new) ওপেন করুন।
2. ফাইলের নাম দিন `QR_DB`।
3. প্রথম সারিতে (Row 1) এই কলাম হেডারগুলো লিখুন:
   ```text
   code | name | url | style | created | updated | scans
   ```

---

### ধাপ ২: Google Apps Script কোড দিন
1. গুগল শিটের মেনু থেকে **Extensions** > **Apps Script** এ ক্লিক করুন।
2. এডিটরের পুরনো সব লেখা মুছে ফেলুন।
3. এই প্রজেক্টের `google-apps-script.js` ফাইলের পুরো কোড কপি করে পেস্ট করুন।
4. কোডের একদম উপরে থাকা `SECRET` পরিবর্তন করে নিজের মতো একটি সিক্রেট পাসওয়ার্ড দিতে পারেন:
   ```javascript
   const SECRET = "qr_studio_super_secret_2026";
   ```
5. উপরে **Save** (💾) আইকনে ক্লিক করুন।

---

### ধাপ ৩: Web App হিসেবে Deploy করুন
1. উপরে ডানপাশে **Deploy** > **New deployment** বাটনে ক্লিক করুন।
2. বাঁপাশে গিয়ার (⚙️) আইকন থেকে **Web app** সিলেক্ট করুন।
3. সেটিংসগুলো নিচের মতো দিন:
   - **Description:** `QR Studio Backend v0.2`
   - **Execute as:** `Me (আপনার ইমেইল)`
   - **Who has access:** `Anyone` *(খুব গুরুত্বপূর্ণ! এটি Anyone না দিলে Vercel থেকে রিকোয়েস্ট ব্লক হবে)*
4. **Deploy** বাটনে ক্লিক করুন এবং `Authorize access` দিয়ে আপনার গুগল একাউন্টে পারমিশন দিন।
5. ডিপ্লয় শেষ হলে একটি **Web app URL** পাবেন (যেমন: `https://script.google.com/macros/s/AKfycb.../exec`)। এটি কপি করে নিন।

---

### ধাপ ৪: প্রজেক্টে Environment Variables সেট করুন
প্রজেক্টের `.env.local` ফাইলে কপি করা URL ও সিক্রেট বসিয়ে দিন:

```env
GAS_URL=https://script.google.com/macros/s/AKfycb.../exec
GAS_SECRET=qr_studio_super_secret_2026
ADMIN_PASSWORD=admin123
```

---

### ধাপ ৫: লোকালি রান করুন (Local Development)
টার্মিনালে এই কমান্ডটি চালান:
```bash
npm run dev
```
এরপর ব্রাউজারে `http://localhost:3000` ওপেন করলেই ৩-প্যানেল QR স্টুডিও দেখতে পাবেন!

---

### ধাপ ৬: Vercel-এ ফ্রিতে ডিপ্লয় করুন (Deploy to Vercel)
1. কোডটি GitHub-এ পুশ করুন।
2. [vercel.com](https://vercel.com)-এ গিয়ে **Add New Project** এ ক্লিক করে আপনার রিপোজিটরি ইমপোর্ট করুন।
3. **Environment Variables** সেকশনে এই ৩টি ভ্যারিয়েবল যোগ করুন:
   - `GAS_URL` = আপনার Google Apps Script Web App URL
   - `GAS_SECRET` = আপনার Apps Script-এর SECRET
   - `ADMIN_PASSWORD` = এডমিন প্যানেল আনলক পাসওয়ার্ড (যেমন: `admin123`)
4. **Deploy** বাটনে ক্লিক করুন।
5. Vercel আপনাকে একটি ফ্রি ডোমেইন দেবে (যেমন: `your-qr-app.vercel.app`)।

---

## 🎨 ৩-প্যানেল স্টুডিও ফিচারসমূহ

1. **বাম প্যানেল (Left Panel):**
   - সব প্রজেক্টের তালিকা ও সার্চ ফিল্টার।
   - এক ক্লিকে নতুন প্রজেক্ট তৈরি (অটোমেটিক ৬ অক্ষরের ইউনিক শর্ট কোড)।
   - মোট স্ক্যান কাউন্ট ব্যাজ ও ডিলিট অপশন।

2. **মধ্যম প্যানেল (Middle Panel - Live Preview & Actions):**
   - `qr-code-styling` দিয়ে লাইভ রিয়েল-টাইম QR প্রিভিউ।
   - স্থায়ী শর্ট লিংক কপি করার বাটন ও এক ক্লিকে ব্রাউজারে টেস্ট করার সুবিধা।
   - প্রিন্ট কোয়ালিটি অপশন: **PNG**, **SVG (ভেক্টর)**, **JPEG**, **WEBP**।
   - হাই-রেজোলিউশন সিলেক্টর (500px, 1000px, 2000px প্রিন্ট রেডি)।

3. **ডান প্যানেল (Right Panel - Customization & Editing):**
   - **টার্গেট লিংক পরিবর্তন:** যেকোনো সময় মূল লিংক আপডেট করুন।
   - **স্টাইলিং:** ডটস স্টাইল (Rounded, Dots, Classy, Square, Extra-rounded)।
   - **রং ও প্যালেট:** ডটস কালার, কর্নার ফ্রেম কালার, কর্নার ডট কালার, ব্যাকগ্রাউন্ড কালার ও রেডিমেড থিম প্রিসেট।
   - **লোগো আপলোড:** QR-এর মাঝখানে নিজের লোগো বা ছবি যুক্ত করার সুবিধা, লোগো সাইজ ও মার্জিন স্লাইডার।
