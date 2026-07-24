 /* ============================================================
   مكتبة أدوات مستر مصطفى المشتركة — MrToolkit
   ملف واحد بيجمع الدوال المتكررة في مشاريعك المختلفة
   (تسجيل صوتي، رفع ملفات، نطق نص، رسائل حالة، تأثير احتفالي)
   الاستخدام: <script src="رابط الملف على jsDelivr"></script>
   وبعدين تنادي أي دالة عن طريق: MrToolkit.اسم_الدالة(...)
   ============================================================ */
(function (global) {
  "use strict";

  const MrToolkit = {};

  /* ---------------------------------------------------------
     1) نطق نص بصوت حقيقي (Text-to-Speech)
     الاستخدام: MrToolkit.speak("أهلاً بيك يا يوسف")
  --------------------------------------------------------- */
  MrToolkit.speak = function (text, options) {
    options = options || {};
    try {
      if (!("speechSynthesis" in window)) return false;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = options.lang || "ar-SA";
      utter.rate = options.rate || 0.95;
      utter.pitch = options.pitch || 1.05;
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang && v.lang.startsWith(utter.lang.slice(0, 2)));
      if (preferred) utter.voice = preferred;
      speechSynthesis.speak(utter);
      return true;
    } catch (err) {
      console.warn("MrToolkit.speak: تعذّر النطق", err);
      return false;
    }
  };

  /* ---------------------------------------------------------
     2) تسجيل صوتي من المتصفح
     الاستخدام:
       const rec = MrToolkit.createRecorder({
         onTick: (seconds) => console.log(seconds),
       });
       await rec.start();
       ... لاحقاً ...
       const blob = await rec.stop(); // Blob بصيغة audio/webm
  --------------------------------------------------------- */
  MrToolkit.createRecorder = function (options) {
    options = options || {};
    let mediaRecorder, audioChunks = [], stream, timerInterval, seconds = 0;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.start();
      seconds = 0;
      timerInterval = setInterval(() => {
        seconds++;
        if (options.onTick) options.onTick(seconds);
      }, 1000);
    }

    function stop() {
      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          clearInterval(timerInterval);
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(audioChunks, { type: "audio/webm" }));
        };
        mediaRecorder.stop();
      });
    }

    function isRecording() {
      return mediaRecorder && mediaRecorder.state === "recording";
    }

    return { start, stop, isRecording };
  };

  /* ---------------------------------------------------------
     3) رفع ملف إلى Supabase Storage (نفس طريقة تطبيق الـ QR)
     الاستخدام:
       MrToolkit.uploadToSupabase(file, {
         url: "https://xxxx.supabase.co",
         anonKey: "sb_publishable_...",
         bucket: "my-bucket",
         onProgress: (pct) => console.log(pct)
       }).then(url => console.log("رابط الملف:", url));
  --------------------------------------------------------- */
  MrToolkit.uploadToSupabase = function (file, config) {
    return new Promise((resolve, reject) => {
      if (!config || !config.url || !config.anonKey || !config.bucket) {
        reject(new Error("محتاج تمرر url و anonKey و bucket في الإعدادات"));
        return;
      }
      const safeName = `${Date.now()}-${file.name}`.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
      const endpoint = `${config.url}/storage/v1/object/${config.bucket}/${safeName}`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.setRequestHeader("apikey", config.anonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${config.anonKey}`);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && config.onProgress) {
          config.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(`${config.url}/storage/v1/object/public/${config.bucket}/${safeName}`);
        } else {
          let msg = xhr.responseText.slice(0, 200);
          try { msg = JSON.parse(xhr.responseText).message || msg; } catch (e) {}
          reject(new Error(`(HTTP ${xhr.status}) ${msg}`));
        }
      };
      xhr.onerror = () => reject(new Error("تعذّر الاتصال بسيرفر Supabase"));
      xhr.send(file);
    });
  };

  /* ---------------------------------------------------------
     4) رسائل حالة سريعة (Toast) — بتنشئ صندوق الرسالة تلقائياً لو مش موجود
     الاستخدام: MrToolkit.toast("تم الحفظ بنجاح ✅")
                MrToolkit.toast("حصل خطأ", true)
  --------------------------------------------------------- */
  MrToolkit.toast = function (message, isError) {
    let box = document.getElementById("mrtoolkit-toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "mrtoolkit-toast";
      box.style.cssText = [
        "position:fixed", "bottom:20px", "left:50%", "transform:translateX(-50%)",
        "background:#170f2e", "color:#f7f3ff", "padding:12px 20px", "border-radius:999px",
        "font-family:Cairo,sans-serif", "font-size:14px", "z-index:99999",
        "box-shadow:0 8px 24px rgba(0,0,0,.35)", "transition:opacity .3s", "opacity:0",
      ].join(";");
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.color = isError ? "#ff6b6b" : "#f7f3ff";
    box.style.opacity = "1";
    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => { box.style.opacity = "0"; }, 2800);
  };

  /* ---------------------------------------------------------
     5) تأثير احتفالي (كونفيتي) — لأي زرار "تم بنجاح"
     الاستخدام: MrToolkit.confetti()
  --------------------------------------------------------- */
  MrToolkit.confetti = function (options) {
    options = options || {};
    const colors = options.colors || ["#f4b93e", "#ff6f91", "#34d399", "#7c9dff"];
    const count = options.count || 36;
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.style.cssText = [
        "position:fixed", "top:-10px", "width:8px", "height:14px", "border-radius:2px",
        "pointer-events:none", "z-index:99998",
        `left:${Math.random() * 100}vw`,
        `background:${colors[i % colors.length]}`,
        `animation:mrtoolkit-fall ${(2.2 + Math.random() * 1.4).toFixed(2)}s linear forwards`,
        `animation-delay:${(Math.random() * 0.4).toFixed(2)}s`,
      ].join(";");
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 4200);
    }
    if (!document.getElementById("mrtoolkit-confetti-style")) {
      const style = document.createElement("style");
      style.id = "mrtoolkit-confetti-style";
      style.textContent = "@keyframes mrtoolkit-fall{to{transform:translateY(110vh) rotate(540deg);opacity:.9;}}";
      document.head.appendChild(style);
    }
  };

  /* ---------------------------------------------------------
     6) حفظ واسترجاع بيانات JSON من localStorage بأمان
     الاستخدام: MrToolkit.storage.set("progress", {level:3})
                MrToolkit.storage.get("progress", {level:1}) // قيمة افتراضية لو مش موجودة
  --------------------------------------------------------- */
  MrToolkit.storage = {
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (err) { console.warn("MrToolkit.storage.set فشل:", err); return false; }
    },
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) { return fallback; }
    },
  };

  /* ---------------------------------------------------------
     7) دوال مساعدة عامة
  --------------------------------------------------------- */
  MrToolkit.debounce = function (fn, waitMs) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), waitMs);
    };
  };

  /* ---------------------------------------------------------
     8) الاتصال بقاعدة بيانات Supabase (جلب/إضافة بيانات)
     أول حاجة: نادِ configure مرة واحدة في أول مشروعك
       MrToolkit.supabase.configure({ url: "...", anonKey: "..." });
     بعدها:
       const rows = await MrToolkit.supabase.fetchData("students");
       const rows2 = await MrToolkit.supabase.fetchData("students", { filter: "grade=eq.3", limit: 10 });
       const created = await MrToolkit.supabase.insertData("students", { name: "يوسف", grade: 3 });
     ⚠️ الحماية الحقيقية بتكون من خلال RLS Policies في لوحة Supabase، مش من إخفاء المفتاح.
  --------------------------------------------------------- */
  MrToolkit.supabase = (function () {
    let cfg = null;

    function configure(config) {
      cfg = config; // { url, anonKey }
    }

    function requireConfig() {
      if (!cfg || !cfg.url || !cfg.anonKey) {
        throw new Error("نادِ MrToolkit.supabase.configure({url, anonKey}) قبل الاستخدام");
      }
    }

    function headers() {
      return {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "Content-Type": "application/json",
      };
    }

    async function fetchData(table, options) {
      requireConfig();
      options = options || {};
      let url = `${cfg.url}/rest/v1/${table}?select=${options.select || "*"}`;
      if (options.filter) url += `&${options.filter}`; // مثال: "grade=eq.3"
      if (options.limit) url += `&limit=${options.limit}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error(`فشل جلب البيانات (HTTP ${res.status})`);
      return res.json();
    }

    async function insertData(table, data) {
      requireConfig();
      const res = await fetch(`${cfg.url}/rest/v1/${table}`, {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "return=representation" }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`فشل إضافة البيانات (HTTP ${res.status})`);
      return res.json();
    }

    return { configure, fetchData, insertData };
  })();

  /* ---------------------------------------------------------
     9) الاتصال بقاعدة بيانات Firebase Realtime Database
       MrToolkit.firebase.configure({ databaseURL: "https://xxx.firebaseio.com" });
       const data = await MrToolkit.firebase.fetchData("students");
       const created = await MrToolkit.firebase.insertData("students", { name: "يوسف" });
     ⚠️ الحماية الحقيقية بتكون من خلال Realtime Database Rules في لوحة Firebase.
  --------------------------------------------------------- */
  MrToolkit.firebase = (function () {
    let cfg = null;

    function configure(config) {
      cfg = config; // { databaseURL }
    }

    function requireConfig() {
      if (!cfg || !cfg.databaseURL) {
        throw new Error("نادِ MrToolkit.firebase.configure({databaseURL}) قبل الاستخدام");
      }
    }

    async function fetchData(path) {
      requireConfig();
      const res = await fetch(`${cfg.databaseURL}/${path}.json`);
      if (!res.ok) throw new Error(`فشل جلب البيانات (HTTP ${res.status})`);
      return res.json();
    }

    async function insertData(path, data) {
      requireConfig();
      const res = await fetch(`${cfg.databaseURL}/${path}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`فشل إضافة البيانات (HTTP ${res.status})`);
      return res.json();
    }

    return { configure, fetchData, insertData };
  })();

  /* ---------------------------------------------------------
     10) التحقق من صيغة البريد الإلكتروني
     الاستخدام: MrToolkit.isValidEmail("test@mail.com") // true / false
  --------------------------------------------------------- */
  MrToolkit.isValidEmail = function (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  };

  /* ---------------------------------------------------------
     11) تنسيق الأسعار والعملات
     الاستخدام: MrToolkit.formatPrice(1250)                         // "$1,250.00"
                MrToolkit.formatPrice(1250, {currency:"EGP", locale:"ar-EG"}) // بالجنيه المصري
  --------------------------------------------------------- */
  MrToolkit.formatPrice = function (amount, options) {
    options = options || {};
    const currency = options.currency || "USD";
    const locale = options.locale || "en-US";
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
    } catch (err) {
      return String(amount);
    }
  };

  /* ---------------------------------------------------------
     12) تفعيل الوضع الداكن مع حفظ الاختيار دائماً
     في مشروعك، عرّف الألوان بمتغيرات CSS زي كده:
       :root{ --bg:#fff; --text:#111; }
       [data-theme="dark"]{ --bg:#0f0f16; --text:#f5f5f5; }
       body{ background:var(--bg); color:var(--text); }
     الاستخدام:
       MrToolkit.theme.applySaved();      // ناديها أول ما الصفحة تفتح
       MrToolkit.theme.toggle();          // ناديها من زرار التبديل
  --------------------------------------------------------- */
  MrToolkit.theme = {
    toggle() {
      const root = document.documentElement;
      const isDark = root.getAttribute("data-theme") !== "dark";
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      MrToolkit.storage.set("mrtoolkit_theme", isDark ? "dark" : "light");
      return isDark;
    },
    applySaved(defaultTheme) {
      const saved = MrToolkit.storage.get("mrtoolkit_theme", defaultTheme || "light");
      document.documentElement.setAttribute("data-theme", saved);
      return saved;
    },
  };

  /* ---------------------------------------------------------
     13) نظام النقاط والشارات والتتابع اليومي (XP / Badges / Streak)
     كل لعبة/تطبيق ليه "اسم" خاص بيه (gameKey) عشان بياناته منفصلة عن باقي مشاريعك.

     الاستخدام:
       // بعد ما الطفل يجاوب صح:
       const result = MrToolkit.gamify.addXP("sparky_academy", 10);
       // result = { xp: 40, level: 1, leveledUp: false }

       // بعد ما يخلص مستوى معين:
       const badge = MrToolkit.gamify.unlockBadge("sparky_academy", "level1_complete", {
         name: "بطل المستوى الأول", icon: "🏅"
       });
       // badge.isNew = true أول مرة بس، وfalse لو كانت متفتحة قبل كده

       // مرة واحدة كل يوم يفتح فيه الطفل التطبيق:
       const streak = MrToolkit.gamify.recordDailyActivity("sparky_academy");
       // streak = عدد الأيام المتتالية

       // لعرض كل تقدّم الطفل:
       const progress = MrToolkit.gamify.getProgress("sparky_academy");
       // { xp, level, badges: [...], streak, lastActiveDate }
  --------------------------------------------------------- */
  MrToolkit.gamify = (function () {
    function stateKey(gameKey) {
      return `mrtoolkit_gamify_${gameKey}`;
    }

    function getState(gameKey) {
      return MrToolkit.storage.get(stateKey(gameKey), {
        xp: 0,
        level: 1,
        badges: [],
        streak: 0,
        lastActiveDate: null,
      });
    }

    function saveState(gameKey, state) {
      MrToolkit.storage.set(stateKey(gameKey), state);
    }

    function addXP(gameKey, amount, options) {
      options = options || {};
      const xpPerLevel = options.xpPerLevel || 100;
      const state = getState(gameKey);
      const oldLevel = state.level;
      state.xp += amount;
      state.level = Math.floor(state.xp / xpPerLevel) + 1;
      saveState(gameKey, state);
      return { xp: state.xp, level: state.level, leveledUp: state.level > oldLevel };
    }

    function unlockBadge(gameKey, badgeId, badgeInfo) {
      const state = getState(gameKey);
      const alreadyHas = state.badges.some((b) => b.id === badgeId);
      if (alreadyHas) return { isNew: false, badges: state.badges };
      state.badges.push(Object.assign({ id: badgeId, unlockedAt: Date.now() }, badgeInfo || {}));
      saveState(gameKey, state);
      return { isNew: true, badges: state.badges };
    }

    function isYesterday(dateStr) {
      if (!dateStr) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return dateStr === yesterday.toDateString();
    }

    function recordDailyActivity(gameKey) {
      const state = getState(gameKey);
      const today = new Date().toDateString();
      if (state.lastActiveDate === today) {
        // اتسجّل بالفعل النهاردة، متعملش حاجة
      } else if (isYesterday(state.lastActiveDate)) {
        state.streak += 1;
      } else {
        state.streak = 1;
      }
      state.lastActiveDate = today;
      saveState(gameKey, state);
      return state.streak;
    }

    function getProgress(gameKey) {
      return getState(gameKey);
    }

    function reset(gameKey) {
      saveState(gameKey, { xp: 0, level: 1, badges: [], streak: 0, lastActiveDate: null });
    }

    return { addXP, unlockBadge, recordDailyActivity, getProgress, reset };
  })();

  global.MrToolkit = MrToolkit;

  // اسم بديل مريح لنفس دالة الاحتفال (بعض المشاريع بتنادي عليها celebrate)
  MrToolkit.celebrate = MrToolkit.confetti;
})(window);
