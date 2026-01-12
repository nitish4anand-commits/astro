import { cn } from '@/lib/utils'

export type Step = { key: string; label: string }

export default function Stepper({ steps, active }: { steps: Step[]; active: number }) {
  return (
    <ol className="flex items-center justify-between w-full">
      {steps.map((s, i) => (
        <li key={s.key} className="flex-1">
          <div className={cn('flex items-center', i < steps.length - 1 && 'after:flex-1 after:border-t after:mx-2') }>
            <span
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                i <= active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300'
              )}
              aria-current={i === active ? 'step' : undefined}
            >
              {i + 1}
            </span>
            <span className={cn('ml-2 text-sm', i === active ? 'font-medium text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-neutral-300')}>{s.label}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
