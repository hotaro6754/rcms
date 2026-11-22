"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, type ThemeChoice } from "@/lib/theme";
import s from "./theme-switch.module.css";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Match device", Icon: Monitor },
];

/** Light / dark / device switch. Remembered in this browser; applied before paint by the boot script. */
export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  // Light-only for now: the switch is hidden everywhere it is used.
  if (compact !== undefined) return null;
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    setChoice(readTheme());
    // Keep the dark class in step when the device flips while "Match device" is on.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={s.seg} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          title={label}
          aria-label={label}
          onClick={() => {
            setChoice(value);
            applyTheme(value);
          }}
        >
          <Icon aria-hidden />
          {!compact && <span>{value === "system" ? "Auto" : label}</span>}
        </button>
      ))}
    </div>
  );
}
