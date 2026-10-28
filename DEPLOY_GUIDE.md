# 🛡️ راهنمای جامع استقرار امن (DevSecOps) روی سرور اوبونتو — LuckyDrop VIP

این راهنما بر اساس **معماری Zero Hardcoded Secrets** طراحی شده است؛ یعنی **هیچ توکن ربات تلگرام، کلید خصوصی یا آیدی حساسی** در سورس‌کد یا گیت‌هاب قرار نمی‌گیرد و تمامی اطلاعات محرمانه صرفاً در فایل `.env` روی سرور شخصی (VPS) شما خوانده می‌شوند.

---

## ۱. تنظیم متغیرهای محیطی (`.env`) روی سرور

فایل `.gitignore` به گونه‌ای تنظیم شده که فایل‌های `.env` و `.env.local` هرگز به GitHub ارسال نمی‌شوند.
در ریشه پروژه روی سرور خود، یک کپی از `.env.example` بسازید:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

مقادیر زیر را در فایل `.env` وارد کنید:

```env
# ۱. توکن ربات تلگرام (از @BotFather) — فقط در سمت سرور خوانده می‌شود
TELEGRAM_BOT_TOKEN="1234567890:AAH_YOUR_PRIVATE_BOT_TOKEN_HERE"

# ۲. توکن امنیتی وبهوک تلگرام (یک رشته تصادفی دلخواه برای تایید هدر وبهوک)
TELEGRAM_WEBHOOK_SECRET="my_super_secret_webhook_token_99x"

# ۳. آیدی عددی تلگرام ادمین‌ها (برای دسترسی به پنل مدیریت و دکمه‌های تایید/رد برداشت در تلگرام)
# آیدی عددی خود را می‌توانید از @userinfobot بگیرید
ADMIN_TELEGRAM_USER_IDS="778899101,123456789"

# ۴. آیدی کانال یا گروه تلگرام برای ارسال خودکار نوتیفیکیشن‌های زنده
# (ربات شما باید در این کانال/گروه Admin باشد)
TELEGRAM_NOTIFICATION_CHAT_ID="@YourChannelUsername"

# ۵. آدرس کیف پول رسمی TON شما برای دریافت واریزی‌های TON Connect 2.0
PUBLIC_TON_TREASURY_WALLET="UQ.............................................."

# ۶. دامنه رسمی متصل به SSL (HTTPS برای مینی‌اپ تلگرام الزامی است)
APP_DOMAIN="https://yourdomain.com"

# ۷. سقف برداشت اتوماتیک TON (مبالغ بالاتر از این عدد نیازمند تایید ادمین با دکمه شیشه‌ای در تلگرام هستند)
AUTO_WITHDRAW_LIMIT_TON="50"

# ۸. فعال‌سازی بررسی سخت‌گیرانه امضای کریپتوگرافیک HMAC-SHA256 تلگرام در محیط پروداکشن
STRICT_TELEGRAM_INITDATA_AUTH="true"
```

---

## ۲. نصب خودکار روی سرور Ubuntu 24.04 (اسکریپت تک‌دستوری)

پس از اتصال به سرور مجازی (VPS) خود با SSH و کلون کردن پروژه:

```bash
chmod +x deploy/setup-vps.sh
sudo ./deploy/setup-vps.sh yourdomain.com admin@yourdomain.com
```

این اسکریپت به صورت خودکار مراحل زیر را انجام می‌دهد:
1. نصب **Node.js 22 LTS**، **PM2**، **Nginx**، **UFW Firewall** و **Certbot**.
2. باز کردن پورت‌های استاندارد (`22`، `80`، `443`) در فایروال.
3. اجرای `npm ci && npm run build` و بالا آوردن سرور با **PM2** (`ecosystem.config.cjs`) همراه با راه‌اندازی مجدد خودکار در زمان ریبوت سرور (`pm2 startup`).
4. کانفیگ **Nginx Reverse Proxy** (`deploy/nginx.conf`) با پشتیبانی از **WebSocket**، محدودکننده نرخ درخواست (**Rate Limiting** روی `/api/wallet` و `/api/pam`) و هدرهای امنیتی مینی‌اپ تلگرام (`CSP frame-ancestors https://web.telegram.org`).
5. دریافت گواهی **SSL رایگان Let's Encrypt** و فعال‌سازی تمدید خودکار.
6. ثبت خودکار آدرس **Webhook** ربات تلگرام روی `https://yourdomain.com/api/telegram/webhook`.

---

## ۳. استقرار با Docker (روش جایگزین)

اگر ترجیح می‌دهید با Docker و Docker Compose پروژه را اجرا کنید:

```bash
cp .env.example .env
nano .env
docker compose up -d --build
```

دیتابیس و لاگ‌های دفترکل PAM در پوشه `./data` و `./logs` روی دیسک سرور شما مونت (Mount) می‌شوند و با آپدیت یا ری‌استارت کانتینر هرگز پاک نمی‌شوند.

---

## ۴. تنظیم مینی‌اپ و پرداخت Stars در `@BotFather`

1. وارد ربات رسمی **[@BotFather](https://t.me/BotFather)** در تلگرام شوید.
2. دستور `/mybots` را بزنید و ربات خود را انتخاب کنید.
3. گزینه **Bot Settings** -> **Menu Button** -> **Configure menu button** را بزنید و آدرس `https://yourdomain.com` و عنوان `🚀 ورود به LuckyDrop VIP` را وارد کنید.
4. برای ساخت لینک مستقیم مینی‌اپ (جهت پشتیبانی از لینک‌های رفرال `?startapp=ref_ID`)، دستور `/newapp` را در `@BotFather` بزنید و URL مینی‌اپ را `https://yourdomain.com` قرار دهید.
5. برای ثبت دستی وبهوک تلگرام (در صورتی که اسکریپت خودکار را اجرا نکرده‌اید)، دستور زیر را در ترمینال سرور اجرا کنید:

```bash
source .env
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${APP_DOMAIN}/api/telegram/webhook\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\", \"callback_query\", \"pre_checkout_query\"]
  }"
```

---

## ۵. معماری امنیتی پیاده‌سازی‌شده (خلاصه ممیزی امنیتی)

* **تایید کریپتوگرافیک `initData` تلگرام (`HMAC-SHA256`):** تمامی درخواست‌های حساس (`/api/pam/debit`، `/api/pam/credit`، `/api/pam/mini-game/play`، `/api/tickets/purchase`، `/api/wallet/deposit`، `/api/wallet/withdraw`) هدر `X-Telegram-Init-Data` را با کلید مشتق‌شده `HMAC_SHA256("WebAppData", TELEGRAM_BOT_TOKEN)` و مقایسه امن زمانی (`crypto.timingSafeEqual`) بررسی می‌کنند تا هیچ کاربری نتواند از طریق کنسول مرورگر آیدی یا موجودی خود را جعل کند.
* **قفل کامل قوانین دیتابیس (`firestore.rules`):** دسترسی نوشتن مستقیم کلاینت به کالکشن‌های مالی (`/ledger`، `/tickets`، `/draws`، `/deposits`، `/withdrawals`، `/treasury`) کاملاً بسته (`allow write: if false`) شده و در پروفایل کاربران نیز هیچ کاربری اجازه تغییر فیلدهای `balanceUsdt`، `vipTier` یا `referralEarningsUsdt` را از طریق مرورگر ندارد.
* **مدیریت برداشت‌های سنگین در تلگرام:** برداشت‌های کمتر از سقف `AUTO_WITHDRAW_LIMIT_TON` به صورت آنی تسویه می‌شوند و برداشت‌های بالاتر در وضعیت `pending_review` قرار گرفته و همراه با دو دکمه شیشه‌ای **«✅ تایید و تسویه آنی»** (`approve_wd:<CODE>`) و **«❌ رد و برگشت وجه»** (`reject_wd:<CODE>`) به تلگرام ادمین ارسال می‌شوند.
