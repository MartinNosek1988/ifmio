interface Props {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

const sizes = { sm: 16, md: 24, lg: 40 };

export function LoadingState({
  text = 'Načítání...',
  size = 'md',
  inline = false,
}: Props) {
  const px = sizes[size];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: inline ? 'row' : 'column',
        gap: 8,
        padding: inline ? 0 : 48,
        color: 'var(--text-muted, #888)',
        fontSize: 14,
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--border, #e5e7eb)" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--accent, #6366f1)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {text && <span>{text}</span>}
    </div>
  );
}
