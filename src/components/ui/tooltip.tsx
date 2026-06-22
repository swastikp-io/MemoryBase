"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

export function Tooltip({
  children,
  content,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  className,
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
} & React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root {...props}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            style={{ fontFamily: 'Inter, sans-serif' }}
            className={cn(
              "z-[99999] pointer-events-none rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-[#ffffff] px-[10px] py-[6px] text-[11px] font-medium whitespace-nowrap text-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
              "animate-in fade-in-0 zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[side=bottom]:origin-top data-[side=top]:origin-bottom data-[side=left]:origin-right data-[side=right]:origin-left duration-150 ease-out",
              className
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = TooltipPrimitive.Content;

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };
