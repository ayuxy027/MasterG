import { useEffect, useState } from "react";

const STORAGE_KEY = "masterji_banner_dismissed";
const EVENT_NAME = "masterji:banner-dismissed";

export function useBannerDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );

  useEffect(() => {
    const sync = () => setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return [dismissed, dismiss];
}
