import React from 'react';

/**
 * Windowed carousel dots (Instagram-style).
 *
 * Instead of rendering one dot per image (which overflows on galleries with
 * many photos), this shows a fixed window of up to 3 full-size dots centered
 * on the active image. The dots at the edges of the window shrink and fade to
 * hint there are more images, and the whole strip slides as `active` changes.
 *
 * Props:
 *  - count: total number of images
 *  - active: index of the currently shown image
 *  - activeColor: color of the active dot (default white, for image overlays)
 *  - className: extra classes for the viewport wrapper (positioning, z-index)
 */
const DOT = 8;          // dot diameter in px
const STEP = 14;        // px allotted per dot slot (dot + gap)
const VISIBLE_MAX = 5;  // window size: 3 full dots + 1 faded edge on each side

const ImageDots = ({ count, active, activeColor = '#ffffff', className = '' }) => {
  if (count <= 1) return null;

  const visible = Math.min(count, VISIBLE_MAX);
  const half = Math.floor(visible / 2);
  const maxStart = Math.max(0, count - visible);
  const start = Math.min(Math.max(active - half, 0), maxStart);
  const gap = (STEP - DOT) / 2;

  return (
    <div className={`overflow-hidden ${className}`} style={{ width: visible * STEP }}>
      <div
        className="flex items-center transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${-start * STEP}px)` }}
      >
        {Array.from({ length: count }).map((_, idx) => {
          const pos = idx - start;                       // position within the window
          const inWindow = pos >= 0 && pos <= visible - 1;
          const isActive = idx === active;
          const isLeftEdge = pos === 0 && start > 0;
          const isRightEdge = pos === visible - 1 && start < maxStart;

          let scale = 1;
          let opacity = 0.45;
          if (!inWindow) { scale = 0; opacity = 0; }
          else if (isActive) { opacity = 1; }
          else if (isLeftEdge || isRightEdge) { scale = 0.5; opacity = 0.5; }

          return (
            <span
              key={idx}
              aria-hidden="true"
              className="flex-shrink-0 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{
                width: DOT,
                height: DOT,
                marginLeft: gap,
                marginRight: gap,
                transform: `scale(${scale})`,
                opacity,
                backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.85)',
                boxShadow: isActive ? '0 0 0 1px rgba(0,0,0,0.18)' : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ImageDots;
