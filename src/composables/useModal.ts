export const useModal = (onClose: () => void) => {
  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return { handleBackdropClick }
}
