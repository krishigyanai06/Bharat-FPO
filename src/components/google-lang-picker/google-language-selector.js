const LANG_CODES = {
  English:  "en",
  Hindi:    "hi",
  Marathi:  "mr",
  Gujarati: "gu",
  Telugu:   "te",
  Bengali:  "bn",
  Assamese: "as",
  Manipuri: "mni-Mtei",
};

function setCookie(value) {
  const domain = location.hostname === 'localhost' ? 'localhost' : location.hostname;
  document.cookie = `googtrans=${value}; path=/; domain=${domain}`;
  document.cookie = `googtrans=${value}; path=/`;
}

export function translateLanguage(language) {
  if (!language) return;
  localStorage.setItem("currentLang", language);

  const code = LANG_CODES[language] || "en";

  if (code === "en") {
    setCookie("/en/en");
  } else {
    setCookie(`/en/${code}`);
  }

  const select = document.querySelector(".goog-te-combo");
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    const interval = setInterval(() => {
      const s = document.querySelector(".goog-te-combo");
      if (s) {
        s.value = code;
        s.dispatchEvent(new Event("change", { bubbles: true }));
        clearInterval(interval);
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 5000);
  }
}
