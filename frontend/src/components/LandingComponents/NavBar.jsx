import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoHori from "../../assets/logos/Vistri Logo_Horizontal.png";

const NavBar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const quotation = () => {
    navigate("/quotation");
  }

  const navLinks = [
    { label: "Home", sectionId: "home" },
    { label: "Pricing", sectionId: "pricing" },
    { label: "About", sectionId: "about" },
    { label: "Projects", sectionId: "projects" },
  ];

  const scrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId); // Immediately update active state
    setMobileOpen(false); // Close mobile menu immediately if open

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which section is currently in view
  useEffect(() => {
    const sectionIds = navLinks.map((l) => l.sectionId);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const mostVisible = visible.reduce((current, entry) => {
          return entry.intersectionRatio > current.intersectionRatio ? entry : current;
        }, visible[0]);

        setActiveSection(mostVisible.target.id);
      },
      {
        rootMargin: "-40% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isActive = (sectionId) => activeSection === sectionId;

  return (
    <header
      className={`font-display fixed left-0 right-0 z-50 transition-all duration-300 ease-out px-4 md:px-8
        ${scrolled ? "top-3" : "top-6"}
      `}
    >
      <nav
        className={`mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8 rounded-2xl transition-all duration-300
          ${scrolled
            ? "bg-white/95 backdrop-blur-md shadow-md border border-gray-100/50"
            : "bg-white shadow-sm"
          }
        `}
      >
        {/* Logo / Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900 select-none uppercase"
          style={{ letterSpacing: "0.04em" }}
        >
          <img src={logoHori} alt="Vistri 360 Horizontal Logo" className="h-10 w-auto object-contain drop-shadow-md" />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ label, sectionId }) => (
            <li key={sectionId}>
              <button
                type="button"
                onClick={() => scrollToSection(sectionId)}
                className={`
                  relative text-xs md:text-[13px] font-bold tracking-widest uppercase transition-colors duration-200 cursor-pointer
                  ${isActive(sectionId)
                    ? "text-navy"
                    : "text-navy/60 hover:text-navy"
                  }
                `}
              >
                {label}
                {/* Active underline indicator */}
                {isActive(sectionId) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-navy" />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <button
          type="button"
          onClick={() => scrollToSection("quotation")}
          className="
            hidden rounded-md bg-navy px-6 py-3
            text-xs font-bold tracking-widest text-white uppercase cursor-pointer
            transition-all duration-200
            hover:bg-primary
            md:inline-flex
          "
        >
          Inquire Now
        </button>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="relative z-50 flex h-9 w-9 items-center justify-center rounded-md md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <div className="flex w-5 flex-col items-end gap-1.25">
            <span
              className={`
                block h-0.5 rounded-full bg-navy transition-all duration-300
                ${mobileOpen ? "w-5 translate-y-1.75 rotate-45" : "w-5"}
              `}
            />
            <span
              className={`
                block h-0.5 rounded-full bg-navy transition-all duration-300
                ${mobileOpen ? "w-0 opacity-0" : "w-3.5"}
              `}
            />
            <span
              className={`
                block h-0.5 rounded-full bg-navy transition-all duration-300
                ${mobileOpen ? "w-5 -translate-y-1.75 -rotate-45" : "w-5"}
              `}
            />
          </div>
        </button>
      </nav>

      {/* Mobile menu panel */}
      <div
        className={`
          absolute top-full left-4 right-4 mt-2 overflow-hidden rounded-[20px] bg-white shadow-lg transition-all duration-300 ease-out md:hidden
          ${mobileOpen ? "max-h-64 opacity-100 border border-gray-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="px-5 pb-6 pt-4">
          <ul className="flex flex-col gap-5">
            {navLinks.map(({ label, sectionId }) => (
              <li key={sectionId}>
                <button
                  type="button"
                  onClick={() => scrollToSection(sectionId)}
                  className={`
                    block text-xs font-bold tracking-widest uppercase transition-colors duration-200 cursor-pointer
                    ${isActive(sectionId) ? "text-navy" : "text-navy/60"}
                  `}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => scrollToSection("quotation")}
            className="
              mt-5 block w-full rounded-md bg-navy
              px-5 py-3 text-center text-xs font-bold tracking-widest text-white uppercase cursor-pointer
              transition-all duration-200
              hover:bg-primary
            "
          >
            Inquire Now
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavBar;