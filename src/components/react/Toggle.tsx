import { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";

export const Toggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  });

  return (
    <Switch
      checked={enabled}
      onChange={setEnabled}
      className="group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-amber-200/25 transition-colors duration-200 ease-in-out focus:outline-none ring-offset-slate-100/70 focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 data-[checked]:bg-slate-600"
    >
      <span className="sr-only">Toggle UI mode</span>
      <span className="pointer-events-none relative inline-block size-5 transform rounded-full bg-amber-200/80 shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5">
        <span
          aria-hidden="true"
          className="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in group-data-[checked]:opacity-0 group-data-[checked]:duration-100 group-data-[checked]:ease-out"
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4 text-slate-950/70"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
            />
          </svg>
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex h-full w-full items-center justify-center opacity-0 transition-opacity duration-100 ease-out group-data-[checked]:opacity-100 group-data-[checked]:duration-200 group-data-[checked]:ease-in"
        >
          <svg
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-3 text-slate-600/70"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
            />
          </svg>
        </span>
      </span>
    </Switch>
  );
};
