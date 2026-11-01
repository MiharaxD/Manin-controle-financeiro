"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

const KEY = "manin-music";
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function isOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const on = useSyncExternalStore(subscribe, isOn, () => true);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.volume = 0.3;
    if (!on) {
      el.pause();
      return;
    }
    // Navegadores bloqueiam som sem interação: tenta agora e, se falhar, no primeiro toque.
    const start = () => void el.play().catch(() => {});
    el.play().then(
      () => {},
      () => {
        window.addEventListener("pointerdown", start, { once: true });
        window.addEventListener("keydown", start, { once: true });
      },
    );
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [on]);

  function toggle() {
    try {
      localStorage.setItem(KEY, on ? "off" : "on");
    } catch {}
    listeners.forEach((fn) => fn());
  }

  return (
    <>
      <audio
        ref={audio}
        src="/audio/beneath-the-mask.mp3"
        loop
        preload="auto"
      />
      <button
        className="icon-button"
        onClick={toggle}
        aria-label={on ? "Silenciar música" : "Ligar música"}
        aria-pressed={on}
      >
        {on ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </button>
    </>
  );
}
