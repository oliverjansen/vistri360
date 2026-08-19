import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../api/authService';

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('example@gmail.com');
  const [password, setPassword] = useState('example123');
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await login({ email, password });
      localStorage.setItem('vistri_token', response.data.token);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.data?.message ?? 'Sign in failed. Please try again.');
    }
  }

  return (
    <div className="w-full">
      <div className="mb-10">
        <h2 className="font-display text-4xl sm:text-5xl font-black text-navy mb-3 tracking-tight">Sign in</h2>
        <p className="font-body text-base text-navy/60">Welcome back to Vistri 360. Please enter your details.</p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSignIn}>
        
        {/* Email Field */}
        <div className="relative group">
          <input 
            type="email" 
            id="email"
            className="peer w-full rounded-xl border border-surface/80 bg-surface/30 px-5 pb-3 pt-6 font-body text-sm text-navy outline-none transition-all hover:bg-surface/50 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            placeholder=" "
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label 
            htmlFor="email" 
            className="absolute left-5 top-4 -translate-y-2.5 text-xs font-semibold text-navy/50 transition-all peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-sm peer-placeholder-shown:text-navy/60 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-mt-2.5 peer-focus:top-4 peer-focus:-translate-y-1.3 peer-focus:text-xs peer-focus:text-primary pointer-events-none"
          >
            Email address
          </label>
        </div>

        {/* Password Field */}
        <div className="relative group">
          <input 
            type={showPassword ? "text" : "password"} 
            id="password"
            className="peer w-full rounded-xl border border-surface/80 bg-surface/30 px-5 pb-3 pt-6 font-body text-sm text-navy outline-none transition-all hover:bg-surface/50 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 pr-12"
            placeholder=" "
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label 
            htmlFor="password" 
            className="absolute left-5 top-4 -translate-y-2.5 text-xs font-semibold text-navy/50 transition-all peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-sm peer-placeholder-shown:text-navy/60 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-mt-2.5 peer-focus:top-4 peer-focus:-translate-y-1.3 peer-focus:text-xs peer-focus:text-primary pointer-events-none"
          >
            Password
          </label>
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className=" absolute right-4 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors focus:outline-none focus:text-primary"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
        {/* Options */}
        {/* <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input type="checkbox" defaultChecked className="peer appearance-none h-5 w-5 rounded-md border-2 border-surface/80 bg-surface/30 checked:border-primary checked:bg-primary transition-all cursor-pointer" />
              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="font-body text-sm font-medium text-navy/70 group-hover:text-navy transition-colors">Remember me</span>
          </label>
          <Link to="/auth/forgot-password" className="font-body text-sm font-bold text-primary hover:text-navy transition-colors">
            Forgot Password?
          </Link>
        </div> */}

        {/* Submit */}
        <button 
          type="submit"
          className="cursor-pointer group relative mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-navy py-4 font-display text-sm font-bold tracking-wider text-white uppercase transition-all hover:bg-primary hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="relative z-10">Sign in to Account</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </form>

      {/* <div className="mt-10 flex items-center justify-center gap-2 font-body text-sm font-medium text-navy/60">
        <span>Don't have an account?</span> 
        <Link to="/auth/signup" className="font-bold text-primary hover:text-navy transition-colors underline decoration-2 underline-offset-4 decoration-primary/30 hover:decoration-navy">
          Sign up
        </Link>
      </div> */}
    </div>
  )
}

export default SignInPage
