"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

const TRACK_BASE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  width: 44,
  height: 24,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  boxSizing: "border-box",
  transition: "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
  flexShrink: 0,
};

const THUMB_BASE_STYLE = {
  display: "block",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
  transition: "transform 160ms ease",
  willChange: "transform",
};

const Switch = React.forwardRef(({ checked, style, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    checked={checked}
    style={{
      ...TRACK_BASE_STYLE,
      background: checked ? "var(--accent, #ff8c50)" : "rgba(255,255,255,0.08)",
      borderColor: checked ? "var(--accent, #ff8c50)" : "rgba(255,255,255,0.14)",
      boxShadow: checked ? "0 0 0 4px rgba(255,140,80,0.14)" : "none",
      ...style,
    }}
    {...props}
  >
    <SwitchPrimitive.Thumb
      style={{
        ...THUMB_BASE_STYLE,
        transform: checked ? "translateX(21px)" : "translateX(2px)",
      }}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = "Switch";

export { Switch };
