import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (installed || !prompt) return null;

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition"
      title="Install Bharat FPO App"
    >
      <Download size={15} />
      Install App
    </button>
  );
}
