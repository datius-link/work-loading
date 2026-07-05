export default function ComingSoonPage({ title, description }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">🚧</div>
        <p>{description}</p>
      </div>
    </div>
  );
}
