import { describe, it, expect, beforeEach } from 'vitest'
import { useToast } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    const { clearAll } = useToast()
    clearAll()
  })

  it('should initialize with empty toasts', () => {
    const { toasts } = useToast()
    expect(toasts.value).toHaveLength(0)
  })

  it('should add toast with showToast', () => {
    const { toasts, showToast } = useToast()
    showToast('Test message', 'success')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Test message')
    expect(toasts.value[0].type).toBe('success')
  })

  it('should remove toast', () => {
    const { toasts, showToast, removeToast } = useToast()
    const id = showToast('Test', 'success')
    expect(toasts.value).toHaveLength(1)
    removeToast(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('should clear all toasts', () => {
    const { toasts, showToast, clearAll } = useToast()
    showToast('Test 1', 'success')
    showToast('Test 2', 'error')
    expect(toasts.value).toHaveLength(2)
    clearAll()
    expect(toasts.value).toHaveLength(0)
  })

  it('should support success shortcut', () => {
    const { toasts, success } = useToast()
    success('Success!')
    expect(toasts.value[0].type).toBe('success')
  })

  it('should support error shortcut', () => {
    const { toasts, error } = useToast()
    error('Error!')
    expect(toasts.value[0].type).toBe('error')
  })

  it('should return unique IDs for each toast', () => {
    const { showToast } = useToast()
    const id1 = showToast('Test 1', 'success')
    const id2 = showToast('Test 2', 'success')
    expect(id1).not.toBe(id2)
  })
})
