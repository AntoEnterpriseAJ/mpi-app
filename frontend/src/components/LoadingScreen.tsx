type LoadingScreenProps = {
  label?: string;
  fullPage?: boolean;
};

export function LoadingScreen({
  label = 'Loading...',
  fullPage = false,
}: LoadingScreenProps) {
  return (
    <section
      className={`loading-panel${fullPage ? ' loading-panel-full' : ''}`}
    >
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </section>
  );
}
