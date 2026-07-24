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

  global.MrToolkit = MrToolkit;
})(window);