// Trial: home page motion (gliding planes and slide-ins).
// Kept apart from App.tsx so it is easy to keep, change, or remove.
import { useEffect, useRef, type RefObject } from "react";

// Top-down plane silhouette, nose pointing right so it follows its route.
const PLANE =
  "M24 0 C23 -2 20 -2.6 16 -2.6 L6 -2.6 L-6 -20 L-10 -20 L-3 -2.6 L-15 -2.6 L-20 -9 L-23 -9 L-21 -2 L-21 2 L-23 9 L-20 9 L-15 2.6 L-3 2.6 L-10 20 L-6 20 L6 2.6 L16 2.6 C20 2.6 23 2 24 0 Z";

// A plane that flies along `route`, drawing a contrail behind it.
// It waits off screen until `start`, flies until `end` (fractions of `dur`),
// then the contrail fades before the next loop.
function Flight({
  id,
  route,
  dur,
  start,
  end,
  scale = 1,
  once = false,
  className = "",
}: {
  id: string;
  route: string;
  dur: number;
  start: number;
  end: number;
  scale?: number;
  once?: boolean;
  className?: string;
}) {
  const timing = {
    dur: `${dur}s`,
    keyTimes: `0;${start};${end};1`,
    calcMode: "linear",
    ...(once ? { fill: "freeze" } : { repeatCount: "indefinite" }),
  };
  return (
    <g className={`flight ${className}`}>
      <path
        id={id}
        d={route}
        className="contrail"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset="1"
      >
        <animate attributeName="stroke-dashoffset" values="1;1;0;0" {...timing} />
        <animate attributeName="opacity" values="1;1;1;0" {...timing} />
      </path>
      <g>
        <path d={PLANE} transform={`scale(${scale})`} className="plane" />
        <animateMotion keyPoints="0;0;1;1" rotate="auto" {...timing}>
          <mpath xlinkHref={`#${id}`} />
        </animateMotion>
      </g>
    </g>
  );
}

function Cloud({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <g className="cloud">
        <ellipse cx="0" cy="0" rx="70" ry="20" />
        <circle cx="-24" cy="-12" r="24" />
        <circle cx="16" cy="-20" r="32" />
      </g>
    </g>
  );
}

export function HeroSky() {
  return (
    <>
      <svg
        className="sky sky-back"
        viewBox="0 0 1200 650"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Cloud x={540} y={130} size={0.6} />
        <Cloud x={330} y={480} size={0.7} />
        <Flight
          id="hero-route-near"
          route="M-80 590 C 260 470 470 640 760 470 S 1080 160 1300 210"
          dur={15}
          start={0.08}
          end={0.72}
          scale={1.05}
          className="flight-near"
        />
        <Flight
          id="hero-route-far"
          route="M-80 160 C 300 70 650 220 1300 80"
          dur={23}
          start={0.45}
          end={0.93}
          scale={0.6}
          className="flight-far"
        />
      </svg>
      <svg
        className="sky sky-front"
        viewBox="0 0 1200 650"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Flight
          id="hero-route-flyby"
          route="M-60 660 C 320 610 560 400 760 270 S 1080 30 1290 -30"
          dur={5}
          start={0.12}
          end={0.66}
          scale={1.3}
          once
          className="flight-flyby"
        />
      </svg>
    </>
  );
}

// Fixed star positions so the sky looks the same on every visit.
const STARS = [
  [80, 60], [210, 140], [330, 40], [470, 110], [610, 70], [720, 160],
  [860, 50], [960, 130], [1100, 80], [1160, 200], [140, 260], [1040, 300],
  [400, 330], [760, 380], [60, 420], [1130, 440],
].map(([x, y], i) => ({ x, y, r: i % 3 === 0 ? 1.8 : 1.2, delay: (i * 0.37) % 3 }));

export function NightSky() {
  return (
    <svg
      className="sky sky-night"
      viewBox="0 0 1200 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {STARS.map((star) => (
        <circle
          key={`${star.x}-${star.y}`}
          className="star"
          cx={star.x}
          cy={star.y}
          r={star.r}
          style={{ animationDelay: `${star.delay}s` }}
        />
      ))}
      <Flight
        id="night-route"
        route="M-80 430 C 300 320 700 470 1300 110"
        dur={18}
        start={0.1}
        end={0.7}
        scale={0.8}
      />
    </svg>
  );
}

// Slides in each [data-reveal] element, and each child of a [data-reveal-group],
// when it scrolls into view. Items arriving together follow one another.
// When `contentKey` changes it looks again, so items added later (such as
// courses that arrive after the page opens) slide in too.
export function useScrollReveal(root: RefObject<HTMLElement>, contentKey?: unknown) {
  // Kept across those second looks, so an item still sliding in gets its own
  // transitions back. Cleared only when the page goes away.
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    // Items already shown are left alone, so they do not hide and slide in again.
    const targets = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-group] > *"),
    ).filter((element) => !element.classList.contains("revealed"));
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      targets.forEach((element) => element.classList.add("revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, order) => {
            const element = entry.target as HTMLElement;
            observer.unobserve(element);
            const delay = order * 110;
            element.style.transitionDelay = `${delay}ms`;
            element.classList.add("reveal-anim", "revealed");
            // Hand back the element's own transitions (such as card hover) once it lands.
            timers.current.push(
              window.setTimeout(() => {
                element.classList.remove("reveal-anim");
                element.style.transitionDelay = "";
              }, 1000 + delay),
            );
          });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [root, contentKey]);
}
