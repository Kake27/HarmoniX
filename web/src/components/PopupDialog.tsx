type Props = {
    title: string,
    message: string,
    confirmText?: string,
    cancelText?: string,
    onConfirm: () => void,
    onCancel: () => void
}

export default function PopupDialog({
    title, message, confirmText = "Delete",cancelText = "Cancel", onConfirm, onCancel,
}: Props) {
    return (
    <div className="fixed text-white inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border cursor-pointer hover:opacity-75"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:opacity-75"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}