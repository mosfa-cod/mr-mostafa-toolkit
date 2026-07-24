 (function (global) {
    "use strict";

    const MrToolkit = {};

    // 1) دالة نطق النصوص المكتوبة
    MrToolkit.speak = function (text, options) {
        options = options || {};
        try {
            if (!("speechSynthesis" in window)) return false;
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = options.lang || "ar-SA";
            utter.rate = options.rate || 0.95;
            utter.pitch = options.pitch || 1.05;
            speechSynthesis.speak(utter);
            return true;
        } catch (err) {
            console.warn("MrToolkit.speak تعذّر النطق:", err);
            return false;
        }
    };

    // 2) دالة التأثير الاحتفالي الملون (Confetti) 🎉
    MrToolkit.celebrate = function () {
        if (!window.confetti) {
            const script = document.createElement('script');
            script.src = 'https://jsdelivr.net';
            script.onload = () => window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            document.head.appendChild(script);
        } else {
            window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
    };

    global.MrToolkit = MrToolkit;

})(typeof window !== "undefined" ? window : this);
