interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Chyba při načítání',
  message = 'Nepodařilo se načíst data. Zkuste to prosím znovu.',
  onRetry,
}: Props) {
  return (
    <div className="error-state">
      <div className="error-state__icon">!</div>
      <div className="error-state__title">{title}</div>
      <div className="error-state__message">{message}</div>
      {onRetry && (
        <button className="error-state__retry" onClick={onRetry}>
          Zkusit znovu
        </button>
      )}
    </div>
  );
}
