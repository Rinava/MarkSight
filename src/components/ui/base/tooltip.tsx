"use client";

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";

type Side = "top" | "bottom" | "left" | "right";

/**
 * One provider at the workspace root so adjacent icon-button tooltips open
 * instantly once the first has appeared (Base UI's grouping behaviour).
 */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delay={450} closeDelay={0}>
      {children}
    </Tooltip.Provider>
  );
}

const POPUP_CLASS =
  "z-50 rounded-md bg-[#23331e] px-2 py-1 text-xs font-medium text-[#f1f6ec] shadow-[0_4px_14px_rgba(20,32,16,0.35)] " +
  "transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 " +
  "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[instant]:transition-none";

/**
 * Wrap any interactive element (button/anchor) as a tooltip trigger. The child
 * is passed through `render`, so Base UI merges its own props/ref/aria onto the
 * element you supply — keep your onClick/className on that element.
 */
export function Tip({
  label,
  side = "bottom",
  sideOffset = 6,
  children,
}: {
  label: React.ReactNode;
  side?: Side;
  sideOffset?: number;
  children: React.ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={sideOffset}>
          <Tooltip.Popup className={POPUP_CLASS}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
