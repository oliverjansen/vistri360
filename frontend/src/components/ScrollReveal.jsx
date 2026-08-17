import { useEffect, useRef, useState } from "react";

const ScrollReveal = ({ children, className = "", delay = 0 }) => {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsVisible(true);
      observer.unobserve(entry.target);
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.1,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-80"} ${className}`}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
