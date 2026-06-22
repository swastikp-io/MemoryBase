import * as React from "react"
import { cn } from "../../lib/utils"

export interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col w-full chat-container",
        className
      )}
      {...props}
    />
  )
)
PromptInput.displayName = "PromptInput"

export interface PromptInputTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onEnter?: () => void;
}

const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, onEnter, onKeyDown, onChange, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)
    
    // Merge refs
    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement)

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (internalRef.current) {
        internalRef.current.style.height = "auto"
        internalRef.current.style.height = `${Math.min(internalRef.current.scrollHeight, 200)}px`
      }
      onChange?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onEnter?.()
      }
      onKeyDown?.(e)
    }

    // Auto-resize on initial mount or value change
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.style.height = "auto"
        internalRef.current.style.height = `${Math.min(internalRef.current.scrollHeight, 200)}px`
      }
    }, [value])

    return (
      <textarea
        ref={internalRef}
        className={cn(
          "w-full bg-transparent resize-none border-0 focus:ring-0 outline-none min-h-[56px] max-h-[200px] px-6 py-5 scrollbar-thin scrollbar-thumb-border-color placeholder:transition-opacity chat-textarea",
          className
        )}
        rows={1}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        value={value}
        {...props}
      />
    )
  }
)
PromptInputTextarea.displayName = "PromptInputTextarea"

export interface PromptInputFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const PromptInputFooter = React.forwardRef<HTMLDivElement, PromptInputFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between px-3 pb-3 pt-0 gap-2 mt-auto", className)}
      {...props}
    />
  )
)
PromptInputFooter.displayName = "PromptInputFooter"

export interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const PromptInputActions = React.forwardRef<HTMLDivElement, PromptInputActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-1.5 flex-wrap", className)}
      {...props}
    />
  )
)
PromptInputActions.displayName = "PromptInputActions"

export interface PromptInputAttachmentsProps extends React.HTMLAttributes<HTMLDivElement> {}

const PromptInputAttachments = React.forwardRef<HTMLDivElement, PromptInputAttachmentsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 px-4 pt-4 pb-1 flex-wrap empty:hidden", className)}
      {...props}
    />
  )
)
PromptInputAttachments.displayName = "PromptInputAttachments"

export interface PromptInputAttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  onRemove?: () => void;
}

const PromptInputAttachment = React.forwardRef<HTMLDivElement, PromptInputAttachmentProps>(
  ({ className, src, onRemove, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative group w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surfaceSecondary)]", className)}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Attachment" className="w-full h-full object-cover" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 p-0.5 rounded-full bg-[rgba(0,0,0,0.5)] text-[#fff] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(0,0,0,0.7)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
)
PromptInputAttachment.displayName = "PromptInputAttachment"

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputActions,
  PromptInputAttachments,
  PromptInputAttachment,
}
