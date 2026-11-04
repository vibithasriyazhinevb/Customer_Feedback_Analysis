function Header({ user, onLogout }) {
  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "U";

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#" aria-label="Customer voice home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-copy"><strong>good<span>word</span></strong><small>THE CUSTOMER VOICE</small></span>
        </a>
        <div className="header-actions">
          <span className="workspace-label">Your workspace</span>
          <span className="user-avatar" aria-hidden="true">{initials}</span>
          <span className="user-name">{user?.name || "Your account"}</span>
          <button type="button" onClick={onLogout}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    </header>
  );
}

export default Header;
