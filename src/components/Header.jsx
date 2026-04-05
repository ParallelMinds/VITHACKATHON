import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 shadow-lg shadow-zinc-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Name */}
          <Link to="/" className="flex items-center gap-3 no-underline group">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700/80 shadow-lg shadow-zinc-900/40 group-hover:shadow-rose-500/20 transition-all duration-300 bg-zinc-900">
              <img
                src="/deepcargo-logo.svg"
                alt="Deep Cargo logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-display text-lg font-semibold text-white tracking-tight leading-[1.1]">
                Deep CargoVision
              </span>
              <span className="hidden sm:block text-xs text-zinc-500 mt-0.5 leading-none">
                Security Platform
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 no-underline ${
                    isActive
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
