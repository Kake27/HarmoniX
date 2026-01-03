import {AlertCircle, X, Info, AlertTriangle} from "lucide-react"

type ErrorVariant = "error" | "warning" | "info"

type Props = {
  title?: string
  message: string
  variant?: ErrorVariant
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
}

export default function ErrorMessage({title, message, variant="error", onClose, actionLabel, onAction}: Props) {
  const styles = {
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-400",
      icon: AlertCircle,
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-800 dark:text-yellow-400",
      icon: AlertTriangle,
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-400",
      icon: Info,
    },
  }[variant]

  const Icon = styles.icon

  return (
    <div
      className={`relative rounded-xl border p-4 ${styles.bg} ${styles.border}`}
    >
      <div className="flex gap-3 items-start">
        <Icon className={`w-5 h-5 mt-0.5 ${styles.text}`} />

        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold mb-1 ${styles.text}`}>
              {title}
            </h4>
          )}
          <p className={`text-sm ${styles.text}`}>{message}</p>

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={`mt-3 text-sm font-medium underline ${styles.text}`}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${styles.text}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}