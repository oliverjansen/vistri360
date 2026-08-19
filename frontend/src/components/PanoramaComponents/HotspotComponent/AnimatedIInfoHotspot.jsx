import React from "react";

/**
 * Responsive animated callout for React/Vite websites.
 *
 * Coordinate values are percentages from 0 to 100:
 *   x: 0 = left, 100 = right
 *   y: 0 = top, 100 = bottom
 *
 * Example:
 * <AnimatedImageCallout
 *   imageSrc="/images/room.jpg"
 *   imageAlt="Bedroom"
 *   label="Curtain"
 *   anchor={{ x: 26, y: 70 }}
 *   elbow={{ x: 35, y: 27 }}
 *   labelPoint={{ x: 49, y: 27 }}
 * />
 */
export default function AnimatedImageCallout({
  imageSrc,
  imageAlt = "",
  label = "Your label",
  anchor = { x: 26, y: 70 },
  elbow = { x: 35, y: 27 },
  labelPoint = { x: 49, y: 27 },
  color = "#46506b",
  labelBackground = "rgba(255, 255, 255, 0.96)",
  labelColor = "#34394a",
  labelWidth = 116,
  animationDelay = 0,
  className = "",
  onLabelClick,
}) {
  const delay = `${animationDelay}ms`;

  return (
    <figure
      className={`aic-callout ${className}`.trim()}
      style={{
        "--aic-color": color,
        "--aic-label-bg": labelBackground,
        "--aic-label-color": labelColor,
        "--aic-delay": delay,
      }}
    >
      <img className="aic-image" src={imageSrc} alt={imageAlt} />

      <svg
        className="aic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="aic-line"
          d={`M ${anchor.x} ${anchor.y} L ${elbow.x} ${elbow.y} L ${labelPoint.x} ${labelPoint.y}`}
          pathLength="1"
        />

        <circle
          className="aic-pulse"
          cx={anchor.x}
          cy={anchor.y}
          r="2.5"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="aic-dot"
          cx={anchor.x}
          cy={anchor.y}
          r="1.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <button
        type="button"
        className="aic-label"
        style={{
          left: `${labelPoint.x}%`,
          top: `${labelPoint.y}%`,
          width: `${labelWidth}px`,
        }}
        onClick={onLabelClick}
        disabled={!onLabelClick}
        aria-label={label}
      >
        {label}
      </button>

      <style>{styles}</style>
    </figure>
  );
}

const styles = `
  .aic-callout {
    --aic-color: #46506b;
    --aic-label-bg: rgba(255, 255, 255, 0.96);
    --aic-label-color: #34394a;
    --aic-delay: 0ms;
    position: relative;
    display: block;
    width: 100%;
    margin: 0;
    overflow: hidden;
    isolation: isolate;
  }

  .aic-image {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
  }

  .aic-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .aic-line {
    fill: none;
    stroke: var(--aic-color);
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: aic-draw 700ms cubic-bezier(.22, 1, .36, 1)
      calc(var(--aic-delay) + 80ms) forwards;
  }

  .aic-dot {
    fill: #fff;
    stroke: var(--aic-color);
    stroke-width: 1.6;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: aic-dot-in 260ms ease-out var(--aic-delay) forwards;
  }

  .aic-pulse {
    fill: none;
    stroke: var(--aic-color);
    stroke-width: 1.2;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: aic-pulse 1.8s ease-out calc(var(--aic-delay) + 900ms) infinite;
  }

  .aic-label {
    position: absolute;
    z-index: 2;
    min-height: 26px;
    padding: 4px 9px;
    border: 1.5px solid var(--aic-color);
    border-radius: 1px;
    background: var(--aic-label-bg);
    box-shadow: 0 2px 7px rgba(18, 24, 39, 0.22);
    color: var(--aic-label-color);
    font: 500 12px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: left;
    white-space: nowrap;
    transform: translateY(-50%) translateX(8px) scale(.92);
    transform-origin: left center;
    opacity: 0;
    animation: aic-label-in 380ms cubic-bezier(.2, .9, .2, 1.25)
      calc(var(--aic-delay) + 620ms) forwards;
  }

  .aic-label:not(:disabled) {
    cursor: pointer;
  }

  .aic-label:not(:disabled):hover {
    background: #fff;
    box-shadow: 0 4px 14px rgba(18, 24, 39, 0.28);
  }

  .aic-label:disabled {
    cursor: default;
  }

  .aic-label:focus-visible {
    outline: 3px solid rgba(73, 117, 255, 0.5);
    outline-offset: 3px;
  }

  @keyframes aic-draw {
    to { stroke-dashoffset: 0; }
  }

  @keyframes aic-dot-in {
    from { opacity: 0; transform: scale(.25); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes aic-label-in {
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(8px) scale(1);
    }
  }

  @keyframes aic-pulse {
    0% { opacity: .65; transform: scale(.4); }
    70%, 100% { opacity: 0; transform: scale(2.25); }
  }

  @media (prefers-reduced-motion: reduce) {
    .aic-line,
    .aic-dot,
    .aic-pulse,
    .aic-label {
      animation: none;
    }

    .aic-line { stroke-dashoffset: 0; }
    .aic-dot { opacity: 1; }
    .aic-pulse { display: none; }
    .aic-label {
      opacity: 1;
      transform: translateY(-50%) translateX(8px) scale(1);
    }
  }
`;
