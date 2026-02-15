'use client';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-0">
            <span className="font-display text-xl tracking-wider text-[#1a1a2e]">PROVE</span>
            <span className="font-display text-xl tracking-wider text-[#d4a843]">GROUND</span>
          </div>

          {/* Links + copyright */}
          <div className="flex items-center gap-6 text-sm text-[#3a3a3a]/60">
            <a href="/privacy" className="hover:text-[#3a3a3a] transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-[#3a3a3a] transition-colors">
              Terms
            </a>
            <a href="/contact" className="hover:text-[#3a3a3a] transition-colors">
              Contact
            </a>
            <span>&copy; {new Date().getFullYear()} Proveground, Inc. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
