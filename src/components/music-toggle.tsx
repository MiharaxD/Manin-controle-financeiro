"use client";
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Volume2, VolumeX } from "lucide-react";

const KEY = "manin-music";
const VOLUME_KEY = "manin-music-volume";
const DEFAULT_VOLUME = 0.3;
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

function getVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY) ?? DEFAULT_VOLUME);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((fn) => fn());
}

export function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const on = useSyncExternalStore(subscribe, isOn, () => true);
  const volume = useSyncExternalStore(
    subscribe,
    getVolume,
    () => DEFAULT_VOLUME,
  );

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
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
    save(KEY, on ? "off" : "on");
  }

  function changeVolume(value: number) {
    save(VOLUME_KEY, String(value));
    if (!on && value > 0) save(KEY, "on");
    if (on && value === 0) save(KEY, "off");
  }

  // Mantém o painel dentro da tela quando o botão fica perto de uma borda.
  function fitPanel() {
    const el = popover.current;
    if (!el) return;
    const margin = 8;
    const shadow = 5;
    const shift = parseFloat(el.style.getPropertyValue("--shift")) || 0;
    const rect = el.getBoundingClientRect();
    const left = rect.left - shift;
    const right = rect.right - shift + shadow;
    const max = document.documentElement.clientWidth - margin;
    const next =
      left < margin ? margin - left : right > max ? max - right : 0;
    el.style.setProperty("--shift", `${Math.round(next)}px`);
  }

  const level = on ? volume : 0;

  return (
    <div
      className="music-control"
      onPointerEnter={fitPanel}
      onFocus={fitPanel}
    >
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
      <div className="music-volume" ref={popover}>
        <div
          className="music-volume-panel"
          style={{ "--vol": level } as CSSProperties}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={level}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume da música"
          />
          <output aria-hidden="true">{Math.round(level * 100)}</output>
        </div>
      </div>
    </div>
  );
}
