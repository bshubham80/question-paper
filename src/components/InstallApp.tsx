"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Chrome/Edge/Samsung Internet fire this when the site is installable; not in lib.dom yet.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad Safari has no install prompt, only Share → Add to Home Screen. iPadOS reports as a Mac. */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const noSubscribe = () => () => {};
/** Show iOS steps only in a browser tab on iOS (false during SSR, so no hydration mismatch). */
const useIOSBrowser = () => useSyncExternalStore(noSubscribe, () => isIOS() && !isStandalone(), () => false);

/**
 * "Install app" button for the header. Uses the browser's native prompt where there is one (Android)
 * and shows Add-to-Home-Screen steps on iOS. Renders nothing once installed or when unsupported.
 */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const ios = useIOSBrowser();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event so the button can show the prompt later
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt && !ios) return null;

  async function install() {
    if (!prompt) return setShowHelp(true);
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null); // the event can only be used once
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink hover:bg-bg"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
        Install app
      </button>

      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-surface p-5 pb-[calc(1.25rem+var(--safe-b))] shadow-lg sm:rounded-2xl sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="install-title" className="font-serif text-lg font-semibold">
              Install on your iPhone
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink">
              <li>
                Open this page in <b>Safari</b>.
              </li>
              <li>
                Tap the <b>Share</b> button
                <svg viewBox="0 0 24 24" className="mx-1 inline h-4 w-4 align-[-2px] text-brand" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-label="share icon">
                  <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
                </svg>
                in the toolbar.
              </li>
              <li>
                Scroll down and choose <b>Add to Home Screen</b>, then tap <b>Add</b>.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-md bg-brand py-2.5 text-sm font-medium text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
