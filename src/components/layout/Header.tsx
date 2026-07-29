export function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        {/* <svg className="header-logo" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="16" width="10" height="12" fill="#186d4e" opacity="0.9"/>
          <rect x="16" y="10" width="10" height="18" fill="#186d4e" opacity="0.6"/>
          <rect x="10" y="6" width="6" height="10" fill="#186d4e" opacity="0.4"/>
          <polygon points="4,16 9,8 14,16" fill="#0e4937" opacity="0.8"/>
        </svg> */}
        <div>
          <h1 className="header-title">IFC Fragments Viewer</h1>
          <p className="header-subtitle">Convert · View · Download</p>
        </div>
      </div>
      <div className="header-actions">
      </div>
    </header>
  )
}
