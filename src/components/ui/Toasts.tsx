import { Icon, type IconName } from '@/components/ui/Icon'
import type { ToastKind } from '@/types'
import { useViewerStore } from '@/store/useViewerStore'

const ICON: Record<ToastKind, IconName> = { info: 'info', success: 'check', error: 'alert' }

export function Toasts() {
  const toasts = useViewerStore(s => s.toasts)
  const dismiss = useViewerStore(s => s.dismissToast)

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <Icon name={ICON[t.kind]} size={15} className="toast-icon" />
          <span className="toast-message">{t.message}</span>
          <button className="icon-btn icon-btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
