import { useState, useEffect } from "react";

const pricingPlans = [
  {
    id: "starter",
    title: "Starter plan",
    price: "₱5,000",
    setup: "One-time setup fee",
    renewalLabel: "Annual renewal",
    renewalValue: "₱3,000 upon renewal",
    floorArea: "Applicable floor area: 0–20 sqm",
    includes: [
      "360° virtual tour",
      "Mobile and desktop compatibility",
      "360° navigation",
      "Website embedding",
      "Minimal updates",
      "Hosting service",
      "Shareable tour link",
      "Information tag",
    ],
    idealFor: "Small condominiums, studio units, kiosks, and small retail spaces.",
    gradient: "from-primary via-secondary to-sky-600",
    badgeBg: "bg-primary/10",
    badgeText: "text-primary",
  },
  {
    id: "standard",
    title: "Standard plan",
    price: "₱12,000",
    setup: "One-time setup fee",
    renewalLabel: "Annual renewal",
    renewalValue: "₱8,000 upon renewal",
    floorArea: "Applicable floor area: 21–50 sqm",
    includes: [
      "Everything included in the Starter plan",
      "High-resolution marketing photos",
      "Enhanced image quality",
    ],
    idealFor: "Airbnb units, cafés, restaurants, offices, salons, and small commercial establishments.",
    gradient: "from-secondary via-navy to-sky-500",
    badgeBg: "bg-secondary",
    badgeText: "text-white",
  },
  {
    id: "business",
    title: "Business plan",
    price: "₱25,000",
    setup: "One-time setup fee",
    renewalLabel: "Annual renewal",
    renewalValue: "₱13,000 upon renewal",
    floorArea: "Applicable floor area: c–150 sqm",
    includes: [
      "Everything included in the Standard plan",
      "Professional marketing photo package",
      "Floor plan navigation",
      "Multiple interactive hotspots",
    ],
    idealFor: "Restaurants, gyms, event venues, clinics, showrooms, and medium-sized commercial establishments.",
    gradient: "from-navy via-primary to-sky-500",
    badgeBg: "bg-navy",
    badgeText: "text-white",
  },
];

const HomePage = () => {
  const [showMore, setShowMore] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const toggleShowMore = () => {
    setShowMore((current) => !current);
  };

  const sectionTransition = (sectionId) =>
    activeSection === sectionId
      ? "opacity-100 translate-y-0"
      : "opacity-80 translate-y-6";

  useEffect(() => {
    const sectionIds = ["home", "pricing", "about", "projects"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const mostVisible = visible.reduce((current, entry) =>
          entry.intersectionRatio > current.intersectionRatio ? entry : current
        );
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

  return (
    <>
      <section id="home" className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-navy">
        {/* Background Image with Architectural Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Modern architecture skyscrapers reaching into the sky"
            className="h-full w-full object-cover opacity-50"
          />
          {/* Deep navy gradients to ensure text legibility and brand integration */}
          <div className="absolute inset-0 bg-linear-to-r from-navy/95 via-navy/70 to-transparent mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-linear-to-t from-navy via-transparent to-transparent opacity-90"></div>
        </div>

        {/* Hero Content */}
        <div className={`relative z-10 mx-auto w-full max-w-7xl px-5 md:px-8 lg:px-10 mt-24 transition-all duration-700 ease-out ${sectionTransition("home")}`}>
          <div className="max-w-3xl">
            {/* Eyebrow label */}
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-body text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary">
                Next-Gen Architectural Visualization
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-black leading-[1.05] text-white md:text-7xl lg:text-[5.5rem] tracking-tight">
              Visualize the <br className="hidden md:block" />
              future of <span className="text-primary">space.</span>
            </h1>

            {/* Sub-copy */}
            <p className="mt-8 max-w-xl font-body text-lg md:text-xl text-surface/80 leading-relaxed font-light">
              Transform blueprints into immersive realities. We craft high-fidelity 360° tours and architectural renderings that let your clients experience the unbuilt environment.
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <button
                type="button"
                className="w-full sm:w-auto rounded-md bg-primary px-8 py-4 font-body text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
              >
                Book a Consultation
              </button>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md border border-surface/20 bg-white/5 backdrop-blur-sm px-8 py-4 font-body text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-white/10"
              >
                Explore Projects
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="min-h-screen w-full bg-surface/90 py-24">
        <div className={`mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 md:px-8 lg:px-10 transition-all duration-700 ease-out ${sectionTransition("pricing")}`}>
          <div className="max-w-3xl mt-5">
            <p className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Pricing
            </p>
            <h2 className="font-display text-4xl font-black tracking-tight text-navy md:text-5xl">
              Tailored 360° packages for every small space.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-navy/70">
              Choose the package that matches your floor area and business needs, from compact studios and kiosks to full-service venues with rich interactive experiences.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 items-stretch">
            {pricingPlans.map((plan) => (
              <article key={plan.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-surface/70 bg-surface p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)] transition duration-300 ease-out hover:-translate-y-2 hover:border-primary/40 hover:bg-surface hover:shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
                <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${plan.gradient} opacity-90`}></div>
                <div className="relative flex h-full flex-col">
                  <div>
                    <span className={`mb-4 inline-flex rounded-full transition-colors duration-200 ${plan.badgeBg} px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] ${plan.badgeText}`}>
                      {plan.title}
                    </span>
                    <h3 className="text-3xl font-semibold text-navy">{plan.price}</h3>
                    <p className="mt-2 text-sm text-navy/70">{plan.setup}</p>
                  </div>

                  <div className={`mt-6 space-y-2 rounded-3xl bg-surface/80 text-sm ${showMore ? 'mb-6' : 'mb-0'} text-navy/70`}>
                    <p className="font-semibold text-navy">{plan.renewalLabel}</p>
                    <p>{plan.renewalValue}</p>
                    <p>{plan.floorArea}</p>
                  </div>

                  <div className="text-sm text-navy/70">
                    <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${showMore ? 'max-h-225 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <p className="font-semibold text-navy mb-3">Package includes</p>
                      <ul className="space-y-2">
                        {plan.includes.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-1 block h-2 w-2 rounded-full bg-primary"></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-6 text-sm font-semibold text-navy">Ideal for</p>
                      <p className="mt-2 text-sm text-navy/70">{plan.idealFor}</p>
                    </div>
                    <button type="button" onClick={toggleShowMore} className="cursor-pointer mt-4 mb-3 flex items-center gap-2 text-sm font-semibold text-primary transition duration-300 ease-in-out hover:text-navy">
                      <span>{showMore ? 'Show less' : 'Show more'}</span>
                      <span className={`inline-block transition-transform duration-300 ease-in-out ${showMore ? 'rotate-180' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  </div>

                  <button type="button" className="mt-auto w-full rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white transition duration-300 ease-out hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-surface">
                    Get started
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="min-h-screen w-full bg-white py-24">
        <div className={`mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 md:px-8 lg:px-10 transition-all duration-700 ease-out ${sectionTransition("about")}`}>
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="space-y-6 mt-5">
              <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                About
              </span>
              <h2 className="font-display text-4xl font-black tracking-tight text-navy md:text-5xl">
                Explore our world of modern property storytelling.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-navy/70">
                Vistri 360 brings real estate spaces to life with cinematic interior imagery, seamless digital walkthroughs, and immersive presentation that helps buyers feel the property before they arrive.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-surface/80 bg-surface p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-navy">Interior atmosphere</h3>
                  <p className="mt-3 text-sm text-navy/70">
                    Highlight each room with polished styling, natural light, and thoughtful layout that speaks to modern living.
                  </p>
                </div>
                <div className="rounded-3xl border border-surface/80 bg-surface p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-navy">Property narrative</h3>
                  <p className="mt-3 text-sm text-navy/70">
                    Pair every visual asset with clear storytelling so every listing captures purpose, form, and lifestyle.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 mt-5">
              <div className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                <img
                  src="https://images.unsplash.com/photo-1745794621090-d856c53b0cc2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Premium open-plan dining and kitchen space"
                  className="h-96 w-full object-cover transition duration-500 ease-out hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy/90 via-transparent to-transparent p-6 text-white">
                  <p className="text-sm font-semibold">Premium interiors</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                  <img
                    src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=2496&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Modern residential lounge with warm wood and soft lighting"
                    className="h-44 w-full object-cover transition duration-500 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy/90 via-transparent to-transparent p-4 text-white">
                    <p className="text-xs font-semibold">Warm living spaces</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                  <img
                    src="https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=2067&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Contemporary architectural residence with sculptural form"
                    className="h-44 w-full object-cover transition duration-500 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy/90 via-transparent to-transparent p-4 text-white">
                    <p className="text-xs font-semibold">Signature architecture</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className={`min-h-screen w-full bg-primary pt-24 transition-all duration-700 ease-out ${sectionTransition("projects")}`} />
    </>
  )
}

export default HomePage