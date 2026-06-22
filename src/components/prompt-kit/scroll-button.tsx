import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"

interface ScrollButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ScrollButton = React.forwardRef<HTMLButtonElement, ScrollButtonProps>(
  ({ className, ...props }, ref) => (
    <Button 
      ref={ref} 
      variant="outline" 
      size="icon" 
      className={cn("rounded-full bg-background", className)} 
      {...props}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  )
)
ScrollButton.displayName = "ScrollButton"

export { ScrollButton }
