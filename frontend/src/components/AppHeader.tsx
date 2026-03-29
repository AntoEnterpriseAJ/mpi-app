type AppHeaderProps = {
  subtitle: string;
  title: string;
  description?: string;
};

export function AppHeader({ subtitle, title, description }: AppHeaderProps) {
  return (
    <header className="app-header">
      <p className="app-subtitle">{subtitle}</p>
      <h1 className="app-title">{title}</h1>
      {description ? <p className="app-description">{description}</p> : null}
    </header>
  );
}
