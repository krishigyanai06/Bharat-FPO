import React, { useEffect, useRef, useState } from "react";
import { translateLanguage } from "./google-language-selector";
import "./google-picker.css";

const options = [
  { label: "EN", language: "English",  flag: "🇬🇧", native: "English" },
  { label: "HI", language: "Hindi",    flag: "🇮🇳", native: "हिन्दी" },
  { label: "MR", language: "Marathi",  flag: "🇮🇳", native: "मराठी" },
  { label: "GU", language: "Gujarati", flag: "🇮🇳", native: "ગુજરાતી" },
  { label: "TE", language: "Telugu",   flag: "🇮🇳", native: "తెలుగు" },
  { label: "BN", language: "Bengali",  flag: "🇮🇳", native: "বাংলা" },
  { label: "AS", language: "Assamese", flag: "🇮🇳", native: "অসমীয়া" },
  { label: "MN", language: "Manipuri", flag: "🇮🇳", native: "মৈতৈলোন্" },
];

function GoogleLangPicker({ classes = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  const ref = useRef(null);

  useEffect(() => {
    const lang = localStorage.getItem("currentLang");
    if (lang && lang !== "English") {
      const match = options.find((o) => o.language === lang);
      if (match) setSelected(match);
      translateLanguage(lang);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    setSelected(option);
    setIsOpen(false);
    translateLanguage(option.language);
  };

  return (
    <div ref={ref} className={`lang-picker ${classes}`}>
      <button className="lang-trigger" onClick={() => setIsOpen((p) => !p)} translate="no">
        <span className="lang-flag">{selected.flag}</span>
        <span className="lang-label">{selected.label}</span>
        <svg className={`lang-chevron ${isOpen ? "open" : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <ul className="lang-dropdown" translate="no">
          {options.map((option) => (
            <li
              key={option.label}
              className={`lang-option ${selected.label === option.label ? "active" : ""}`}
              onClick={() => handleSelect(option)}
            >
              <span className="lang-flag">{option.flag}</span>
              <div className="lang-names">
                <span className="lang-name-en">{option.language}</span>
                <span className="lang-name-native">{option.native}</span>
              </div>
              {selected.label === option.label && (
                <svg className="lang-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3.5 3.5 5.5-6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GoogleLangPicker;
