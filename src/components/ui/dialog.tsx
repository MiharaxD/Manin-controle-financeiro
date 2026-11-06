"use client";
// shadcn-style composable primitive, based on Radix Dialog.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cloneElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  onExited?: () => void;
};
// iOS não encolhe o viewport de layout com o teclado: segue o visual para a
// folha ficar acima dele (--vv-height / --vv-bottom, usadas no globals.css).
let viewportUsers = 0;
function useKeyboardViewport(active: boolean) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--vv-height", `${vv.height}px`);
      root.style.setProperty(
        "--vv-bottom",
        `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      );
    };
    viewportUsers++;
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      if (--viewportUsers === 0) {
        root.style.removeProperty("--vv-height");
        root.style.removeProperty("--vv-bottom");
      }
    };
  }, [active]);
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
  onExited,
}: DialogProps) {
  // Capture before the portal mounts: an input's autoFocus can run before
  // Radix's open event. These dialogs mount when their caller opens them.
  const returnFocus = useRef<HTMLElement | null>(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useKeyboardViewport(open);
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={`dialog-content ${wide ? "wide" : ""}`}
          aria-describedby={undefined}
          aria-hidden={open ? undefined : true}
          inert={!open}
          onCloseAutoFocus={(event) => {
            const active = document.activeElement;
            // Focus already moved on, e.g. into the next dialog.
            if (active && active !== document.body) event.preventDefault();
            else if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus({ preventScroll: true });
            }
            onExited?.();
          }}
        >
          <div className="dialog-heading">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="icon-button" aria-label="Fechar">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
// Keeps the last dialog mounted, closed, while its exit animation plays.
export function DialogExit({
  children,
}: {
  children: ReactElement<DialogProps> | false | null | undefined;
}) {
  const [last, setLast] = useState(children || null);
  if (children && children !== last) setLast(children);
  if (children) return children;
  return (
    last && cloneElement(last, { open: false, onExited: () => setLast(null) })
  );
}
