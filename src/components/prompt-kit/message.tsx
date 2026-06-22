import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"
import ReactMarkdown from 'react-markdown'

const Message = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col", className)} {...props} />
  )
)
Message.displayName = "Message"

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  markdown?: boolean
}

const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className, markdown, children, ...props }, ref) => {
    if (markdown && typeof children === 'string') {
      return (
        <div ref={ref} className={cn("prose dark:prose-invert", className)} {...props}>
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      )
    }
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    )
  }
)
MessageContent.displayName = "MessageContent"

const MessageActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
  )
)
MessageActions.displayName = "MessageActions"

interface MessageActionProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltip: string
  delayDuration?: number
}

const MessageAction = React.forwardRef<HTMLDivElement, MessageActionProps>(
  ({ className, tooltip, delayDuration = 200, children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      <Tooltip content={tooltip}>
        {children}
      </Tooltip>
    </div>
  )
)
MessageAction.displayName = "MessageAction"

export { Message, MessageContent, MessageActions, MessageAction }
