import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  wide?: boolean;
  extraWide?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, wide, extraWide, footer, children }: Props) {
  if (!open) return null;

  const cls = `modal${wide ? ' modal--wide' : ''}${extraWide ? ' modal--extra-wide' : ''}`

  return (
    <div className="modal-overlay" data-testid="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cls} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <div className="modal__title">{title}</div>
            {subtitle && <div className="modal__subtitle">{subtitle}</div>}
          </div>
          <button className="btn btn--sm" data-testid="modal-close" onClick={onClose} style={{ border: 'none', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
