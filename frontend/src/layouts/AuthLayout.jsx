import { useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import logoHori from '../assets/logos/Vistri Logo_Horizontal.png';

const AuthLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === "/auth/signin") {
      document.title = "Vistri 360 | Sign in";
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Side: Form Content */}
      <div className="relative z-10 flex w-full flex-col justify-between bg-white px-6 py-10 sm:px-12 lg:w-[45%] xl:w-[40%] xl:px-20">
        <header className="animate-in fade-in slide-in-from-top-4 duration-700">
          <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
            <img src={logoHori} alt="Vistri 360" className="h-12 w-auto object-contain" />
          </Link>
        </header>

        <main className="flex w-full flex-1 items-center justify-center py-12">
          <div className="w-full max-w-105 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-150">
            <Outlet />
          </div>
        </main>

        {/* <footer className="flex items-center justify-between font-body text-xs font-medium text-navy/40 animate-in fade-in duration-700 delay-300">
          <span>© 2026 Vistri 360.</span>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <a href="mailto:contact@vistri360.com" className="hover:text-primary transition-colors">Help</a>
          </div>
        </footer> */}
      </div>

      {/* Right Side: Hero Image */}
      <div className="relative hidden w-full lg:flex lg:w-[55%] xl:w-[60%] overflow-hidden bg-surface/30 p-4 pb-4 pr-4">
        <div className="relative h-full w-full overflow-hidden rounded-[40px] shadow-2xl shadow-navy/10">
          <img 
            src="https://images.unsplash.com/photo-1497465689543-5940d3cede89?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Modern Architectural Structure" 
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[20s] ease-out hover:scale-105"
          />
          {/* Subtle gradient to ensure text readability */}
          <div className="absolute inset-0 bg-linear-to-t from-navy/90 via-navy/30 to-navy/10 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-navy/60"></div>
          
          <div className="absolute bottom-16 left-16 right-16 text-white animate-in fade-in slide-in-from-right-12 duration-1000 delay-500 fill-mode-both">
            {/* <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-body text-xs font-bold tracking-widest uppercase text-white/90">Property Management Reimagined</span>
            </div> */}
            <h1 className="font-display text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight mb-6">
              Everything<br/>
              Property<br/>
              Managers<br/>
              Need<span className="text-primary">.</span>
            </h1>
            <p className="max-w-md text-lg font-body leading-relaxed text-white/80">
              Let us help you spend less time on routines, so you can focus on building your business.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout