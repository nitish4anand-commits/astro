import { cn } from '@/lib/utils'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border bg-white dark:bg-neutral-900 shadow-sm', className)}>{children}</div>
  )
}

export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6 border-b', className)}>{children}</div>
}

export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn('text-xl font-semibold', className)}>{children}</h2>
}

export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6 space-y-4', className)}>{children}</div>
}

export function CardFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6 border-t flex justify-end gap-3', className)}>{children}</div>
}
