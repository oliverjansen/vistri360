import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProfileCached, invalidateProfileCache, updateProfile } from "../../api/authService";

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback((forceRefresh = false) => {
    setError("");
    fetchProfileCached(forceRefresh).then((response) => {
      setProfile(response.data);
      setName(response.data.name ?? "");
    }).catch(() => setError("Unable to load your profile right now.")).finally(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await updateProfile({ name });
      setProfile(response.data);
      setName(response.data.name ?? name);
      invalidateProfileCache();
      setMessage("Profile updated.");
    } catch {
      setError("Unable to update your profile right now.");
    }
  };

  if (isLoading && !profile) return <main className="min-h-screen bg-surface p-8 text-navy">Loading profile…</main>;
  if (error && !profile) return <main className="min-h-screen bg-surface p-8 text-navy"><p>{error}</p><button type="button" onClick={() => loadProfile(true)} className="mt-4 rounded-xl bg-navy px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary">Try again</button></main>;

  return <main className="min-h-screen bg-surface p-6 font-body text-navy sm:p-10">
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy/50 transition hover:text-primary"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>Back to dashboard</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Account</p><h1 className="mt-2 font-display text-4xl font-black">Your profile</h1></div>
      </div>
      <form onSubmit={save} className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><label className="block text-xs font-bold">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-surface px-4 text-sm outline-none focus:border-primary" /></label><p className="mt-4 text-sm text-navy/50">{profile.email}</p><button className="mt-6 rounded-xl bg-navy px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary">Save changes</button>{message && <p className="mt-3 text-sm text-primary">{message}</p>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</form>
    </div>
  </main>;
};

export default ProfilePage;
