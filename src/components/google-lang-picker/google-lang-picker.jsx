import React, { useEffect, useRef, useState } from "react";
import { translateLanguage } from "./google-language-selector";
import { Globe, Check, ChevronDown, Loader2 } from "lucide-react";
import "./google-picker.css";

const options = [
  { label: "EN", language: "English", flag: "🌐", native: "English" },
  { label: "HI", language: "Hindi", flag: "🇮🇳", native: "हिन्दी" },
  { label: "MR", language: "Marathi", flag: "🇮🇳", native: "मराठी" },
  { label: "GU", language: "Gujarati", flag: "🇮🇳", native: "ગુજરાતી" },
  { label: "TE", language: "Telugu", flag: "🇮🇳", native: "తెలుగు" },
  { label: "BN", language: "Bengali", flag: "🇮🇳", native: "বাংলা" },
  { label: "AS", language: "Assamese", flag: "🇮🇳", native: "অসমীয়া" },
  { label: "MN", language: "Manipuri", flag: "🇮🇳", native: "মৈতৈলোন্" },
];

function GoogleLangPicker({ classes = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  const [isTranslating, setIsTranslating] = useState(false);
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

  const handleSelect = async (option) => {
    if (isTranslating) return;
    if (option.language === selected.language) {
      setIsOpen(false);
      return;
    }
    setSelected(option);
    setIsOpen(false);
    setIsTranslating(true);
    try {
      await translateLanguage(option.language);
    } catch (err) {
      console.error("Language translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div ref={ref} className={`lang-picker relative z-20 ${classes}`}>
      <button
        disabled={isTranslating}
        className={`lang-trigger border-2 border-emerald-500 shadow-sm transition-all ${
          isTranslating ? "opacity-90 cursor-wait bg-emerald-50" : ""
        }`}
        onClick={() => setIsOpen((p) => !p)}
        translate="no"
      >
        {isTranslating ? (
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
        ) : (
          <span className="lang-flag">{selected.flag}</span>
        )}
        <span className="lang-label font-bold">
          {isTranslating ? "Translating..." : selected.label}
        </span>
        {!isTranslating && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && (
        <ul className="lang-dropdown shadow-2xl z-30" translate="no">
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
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GoogleLangPicker;
