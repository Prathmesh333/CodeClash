import { useEffect, useRef } from 'react';

/** One reveal per section; content remains visible when motion or scripting is unavailable. */
export function useSectionMotion() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (preference.matches) continue;
          const animation = entry.target.animate(
            [
              { opacity: 0.35, transform: 'translateY(12px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.12 },
    );
    root
      .querySelectorAll('.cc-how, .cc-bottom-grid, .cc-banner')
      .forEach((node) => observer.observe(node));
    const stop = () => {
      if (preference.matches) animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener('change', stop);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', stop);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);
  return ref;
}
