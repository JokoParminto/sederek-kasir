import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseAlert from '@/components/base/BaseAlert.vue'

describe('BaseAlert', () => {
  it('renders success alert', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'success',
        title: 'Success!',
        description: 'Operation completed',
      }
    })

    expect(wrapper.find('.base-alert--success').exists()).toBe(true)
    expect(wrapper.text()).toContain('Success!')
    expect(wrapper.text()).toContain('Operation completed')
  })

  it('renders error alert', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'error',
        title: 'Error',
        description: 'Something went wrong'
      }
    })

    expect(wrapper.find('.base-alert--error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Error')
  })

  it('renders warning alert', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'warning',
        title: 'Warning',
        description: 'Please be careful'
      }
    })

    expect(wrapper.find('.base-alert--warning').exists()).toBe(true)
  })

  it('renders info alert', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'info',
        description: 'This is info'
      }
    })

    expect(wrapper.find('.base-alert--info').exists()).toBe(true)
  })

  it('displays custom icon', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'error',
        icon: '🔥',
        title: 'Fire'
      }
    })

    expect(wrapper.text()).toContain('🔥')
  })

  it('uses default icon if not provided', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'success',
        title: 'Success'
      }
    })

    expect(wrapper.text()).toContain('✓')
  })

  it('shows close button when closable is true', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'info',
        closable: true
      }
    })

    expect(wrapper.find('.base-alert__close').exists()).toBe(true)
  })

  it('hides close button when closable is false', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'info',
        closable: false
      }
    })

    expect(wrapper.find('.base-alert__close').exists()).toBe(false)
  })

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'error',
        closable: true
      }
    })

    await wrapper.find('.base-alert__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders slot content', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'info',
        title: 'Title'
      },
      slots: {
        default: 'Slot content here'
      }
    })

    expect(wrapper.text()).toContain('Slot content here')
  })

  it('has proper accessibility attributes', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        type: 'error',
        title: 'Error Alert',
        description: 'Error description'
      }
    })

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.attributes('aria-label')).toBe('error alert: Error Alert')
  })
})
