type AppHeaderProps = {
  subtitle: string;
  title: string;
};

export function AppHeader({ subtitle, title }: AppHeaderProps) {
  return (
    <header>
      <p className="app-subtitle">{subtitle}</p>
      <h1>{title}</h1>
    </header>
  );
}
