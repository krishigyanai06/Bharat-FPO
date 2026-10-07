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

function clearCookies() {
  const host = window.location.hostname;
  const path = "/";
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${host}`;
  if (host && host.includes(".")) {
    const parts = host.split(".");
    const mainDomain = parts.slice(-2).join(".");
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${mainDomain}`;
  }
}

function setCookie(value) {
  clearCookies();
  const host = window.location.hostname;
  const path = "/";
  document.cookie = `googtrans=${value}; path=${path}`;
  document.cookie = `googtrans=${value}; path=${path}; domain=${host}`;
  if (host && host.includes(".")) {
    const parts = host.split(".");
    const mainDomain = parts.slice(-2).join(".");
    document.cookie = `googtrans=${value}; path=${path}; domain=.${mainDomain}`;
  }
}

export function translateLanguage(language) {
  return new Promise((resolve) => {
    if (!language) {
      resolve(false);
      return;
    }

    const prevLang = localStorage.getItem("currentLang");
    localStorage.setItem("currentLang", language);
    const code = LANG_CODES[language] || "en";
    const cookieVal = code === "en" ? "/en/en" : `/en/${code}`;

    setCookie(cookieVal);

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      try {
        select.value = code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        select.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {
        console.error("DOM dispatch error:", e);
      }
    }

    // Reload page on language change to ensure Google Translate activates across all React components
    if (prevLang && prevLang !== language) {
      setTimeout(() => {
        window.location.reload();
      }, 250);
    } else {
      setTimeout(() => resolve(true), 500);
    }
  });
}
