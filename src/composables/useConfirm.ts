import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const showDialog = ref(false)
const dialogOptions = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'Ya',
  cancelText: 'Batal',
  type: 'warning'
})
const resolveCallback = ref<((value: boolean) => void) | null>(null)

export function useConfirm() {
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      dialogOptions.value = {
        ...options,
        confirmText: options.confirmText || 'Ya',
        cancelText: options.cancelText || 'Batal',
        type: options.type || 'warning'
      }
      showDialog.value = true
      resolveCallback.value = resolve
    })
  }

  const handleConfirm = () => {
    if (resolveCallback.value) {
      resolveCallback.value(true)
    }
    showDialog.value = false
    resolveCallback.value = null
  }

  const handleCancel = () => {
    if (resolveCallback.value) {
      resolveCallback.value(false)
    }
    showDialog.value = false
    resolveCallback.value = null
  }

  return {
    showDialog,
    dialogOptions,
    confirm,
    handleConfirm,
    handleCancel
  }
}
