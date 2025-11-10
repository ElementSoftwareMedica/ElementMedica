import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog"
import { Button } from "./button"

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    {children}
  </Dialog>
)

const AlertDialogTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <DialogContent ref={ref} {...props}>
    {children}
  </DialogContent>
))

AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = DialogHeader
const AlertDialogFooter = DialogFooter
const AlertDialogTitle = DialogTitle
const AlertDialogDescription = DialogDescription

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ children, onClick, ...props }, ref) => (
    <Button ref={ref} onClick={onClick} {...props}>
      {children}
    </Button>
  )
)
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ children, onClick, ...props }, ref) => (
    <Button ref={ref} variant="outline" onClick={onClick} {...props}>
      {children}
    </Button>
  )
)
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
