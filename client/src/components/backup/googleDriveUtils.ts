/** Shared script loading for Google Identity and Picker (gapi). */

export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function loadGoogleIdentity(): Promise<void> {
  await loadScript("https://accounts.google.com/gsi/client");
}

type GapiLoadPickerOptions = {
  callback: () => void;
  onerror?: () => void;
  timeout?: number;
};

declare global {
  interface Window {
    gapi?: {
      load: (api: string, options: GapiLoadPickerOptions) => void;
    };
  }
}

/** Loads `apis/googleapis.js` and the `picker` module (adds `google.picker`). */
export async function loadGooglePickerApi(): Promise<void> {
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((resolve, reject) => {
    const gapi = window.gapi;
    if (!gapi?.load) {
      reject(new Error("Google API script did not expose gapi.load"));
      return;
    }
    gapi.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("Failed to load Google Picker")),
      timeout: 15000,
    });
  });
}
