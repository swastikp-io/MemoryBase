import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"

export { PromptInputTextarea, PromptInputActions } from "@/components/ui/prompt-input"
import { PromptInput as OriginalPromptInput } from "@/components/ui/prompt-input"

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean
  value?: string
  onValueChange?: (val: string) => void
  onSubmit?: () => void
}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, isLoading, value, onValueChange, onSubmit, ...props }, ref) => {
    return (
      <OriginalPromptInput ref={ref} className={className} {...props} />
    )
  }
)
PromptInput.displayName = "PromptInput"

interface PromptInputActionProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltip: string
}

const PromptInputAction = React.forwardRef<HTMLDivElement, PromptInputActionProps>(
  ({ className, tooltip, children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      <Tooltip content={tooltip}>
        {children}
      </Tooltip>
    </div>
  )
)
PromptInputAction.displayName = "PromptInputAction"

export { PromptInput, PromptInputAction }
