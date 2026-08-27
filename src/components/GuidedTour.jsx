// src/components/GuidedTour.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react';

const PAD = 8;          // breathing room around the highlighted element
const FIND_MS = 1000;   // give a target this long to mount before giving up
const SETTLE_MS = 2500; // hard stop for rect tracking, settled or not
const STABLE_FRAMES = 5; // rect unchanged this many frames == scrolling has settled
const GLOW = '0 0 0 3px #FFD700, 0 0 22px 6px rgba(255, 215, 0, 0.65)';

// Which end of the screen the card sits at. The highlight is a glow drawn on the target
// itself, not a hole cut in the dim, so there is no space to negotiate any more — the card
// only has to avoid covering the thing it points at. Pure, for the test.
// Exported for the test only.
export function cardEnd({ vh, rect }) {
  if (!rect) return 'centre';
  // Measured on the visible part of the target, not the whole of it: a flight row taller
  // than the screen is top-aligned, so its real centre is far below the fold and would
  // send the card up over the glowing top edge that identifies it.
  // Targets are scrolled to the top, so this is 'bottom' almost always. The exception is
  // one that cannot be scrolled out of the way — the mobile price bar is fixed to the
  // bottom of the viewport — and there the card goes to the top instead.
  const visibleCentre = (Math.max(0, rect.top) + Math.min(vh, rect.bottom)) / 2;
  return visibleCentre > vh / 2 ? 'top' : 'bottom';
}

// Includes tabindex="-1" so the step heading counts as a stop — it's the element that
// holds focus at the start of every step, and Shift+Tab off it must wrap, not escape.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[tabindex="-1"]',
].join(',');

// ponytail: the target is lit by cutting the dim around it and ringing it with a glow,
// not by raising it above the overlay — it sits under a `transform` (hover:scale-102 on
// the property cards), so it makes its own stacking context and z-index cannot lift it the
// way Intro.js does. The cut-out is only geometry: it constrains nothing.
const GuidedTour = ({ steps, isOpen, onClose, setActiveTab, returnFocusRef }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [portalEl, setPortalEl] = useState(null);
  const cardRef = useRef(null);
  const headingRef = useRef(null);

  // Held in a ref so an inline `steps` array from the parent doesn't re-fire the effects.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const step = steps[index] || null;
  const isLast = index === steps.length - 1;

  const close = useCallback(() => {
    onClose();
    const el = returnFocusRef?.current;
    if (el) requestAnimationFrame(() => el.focus());
  }, [onClose, returnFocusRef]);

  // Rendered into its own body-level node so the rest of the page can be made inert
  // below without the tour inerting itself along with it.
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-guided-tour-portal', 'true');
    document.body.appendChild(el);
    setPortalEl(el);
    return () => { document.body.removeChild(el); };
  }, []);

  // Make aria-modal honest: hide and un-focus everything behind the tour, restoring
  // whatever each sibling had before. Without this the whole page stays tabbable.
  useEffect(() => {
    if (!isOpen || !portalEl) return undefined;

    const siblings = Array.from(document.body.children).filter((child) => child !== portalEl);
    const previous = siblings.map((child) => ({
      child,
      ariaHidden: child.getAttribute('aria-hidden'),
      inert: child.inert,
      hadInertAttribute: child.hasAttribute('inert'),
    }));

    siblings.forEach((child) => {
      child.setAttribute('aria-hidden', 'true');
      child.inert = true;
    });

    return () => {
      previous.forEach(({ child, ariaHidden, inert, hadInertAttribute }) => {
        if (ariaHidden === null) child.removeAttribute('aria-hidden');
        else child.setAttribute('aria-hidden', ariaHidden);

        child.inert = inert;
        if (!hadInertAttribute && !inert) child.removeAttribute('inert');
      });
    };
  }, [isOpen, portalEl]);

  // Always restart from step 1 — the "How it works" button replays the whole tour.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      setRect(null);
    }
  }, [isOpen]);

  // Switch tab if the step names one, wait for the target to mount, scroll it to the
  // centre, then track its rect until the scroll settles.
  useEffect(() => {
    if (!isOpen) return undefined;
    const current = stepsRef.current[index];
    if (!current) return undefined;

    if (current.tab) setActiveTab(current.tab);

    if (!current.target) {
      setRect(null);
      return undefined;
    }

    const reduceMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let scrolled = false;
    let stable = 0;
    let lastKey = '';
    const started = Date.now();

    const tick = () => {
      const el = current.target();
      if (el) {
        if (!scrolled) {
          scrolled = true;
          // Always top-align: it keeps the card pinned to the bottom on every step
          // instead of hopping ends, and a target taller than the screen gets its top
          // framed rather than its middle. scroll-margin-top on the targets keeps them
          // clear of the sticky tab nav.
          el.scrollIntoView({
            block: 'start',
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
        }
        const r = el.getBoundingClientRect();
        // A zero-sized element (hidden by a responsive class) counts as "not there".
        setRect(r.width > 0 && r.height > 0 ? r : null);
        const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
        if (key === lastKey) {
          stable += 1;
          if (stable >= STABLE_FRAMES) return;
        } else {
          stable = 0;
          lastKey = key;
        }
        // A rect that never settles (an image still loading and resizing the row) would
        // otherwise spin this loop for as long as the step is open.
        if (Date.now() - started > SETTLE_MS) return;
      } else if (Date.now() - started > FIND_MS) {
        // Never showed up (no flights, collapsed section, finalized view) — fall back to
        // a plain centred card. One rule covers every missing-anchor case.
        setRect(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, index, setActiveTab]);

  // The dim is pointer-events-none now, so the page scrolls behind the tour and the ring
  // has to follow its target. Capture phase catches scrolling containers, not just window.
  useEffect(() => {
    if (!isOpen) return undefined;
    let raf = 0;
    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const current = stepsRef.current[index];
        const el = current && current.target ? current.target() : null;
        const r = el ? el.getBoundingClientRect() : null;
        setRect(r && r.width > 0 && r.height > 0 ? r : null);
      });
    };
    window.addEventListener('scroll', recompute, { capture: true, passive: true });
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    // Placement is measured against visualViewport, so it has to re-run when the mobile
    // URL bar collapses — that fires here, not on window resize.
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', recompute, { capture: true });
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
      if (vv) vv.removeEventListener('resize', recompute);
    };
  }, [isOpen, index]);

  // Move focus to the step heading so screen readers announce each step.
  useEffect(() => {
    if (isOpen && headingRef.current) headingRef.current.focus({ preventScroll: true });
  }, [isOpen, index]);

  // Esc closes; Tab cycles inside the card.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const nodes = Array.from(cardRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((node) => node.offsetParent !== null || node === headingRef.current);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      // Focus sitting outside the list (the heading right after a step change, or
      // anything that slipped out) gets pulled back in rather than walking the page.
      if (!nodes.includes(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  if (!isOpen || !step || !portalEl) return null;

  // visualViewport excludes the mobile URL bar; innerHeight includes it and so
  // overestimates the room the card has by ~60-100px on a phone.
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

  const end = cardEnd({ vh, rect });

  // Where the dim opens up. Clamped to the viewport so a partly-scrolled target doesn't
  // hand a panel a negative size. Nothing is placed against this any more — it is the
  // lit window and the glow's edge, not a constraint.
  const vw = window.innerWidth;
  const hole = rect && {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    right: Math.min(vw, rect.right + PAD),
    bottom: Math.min(vh, rect.bottom + PAD),
  };
  const holeH = hole ? hole.bottom - hole.top : 0;
  const dim = 'fixed bg-black/60 pointer-events-none';

  // print:hidden replaces the .screen-only hiding that the portal moved us out of.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      {/* ponytail: four dim panels around the target rather than one flat dim, so the
          target itself stays lit while everything else goes dark. Chosen over
          `box-shadow: 0 0 0 9999px` (repaints the whole frame, and the ring now moves on
          every scroll frame) and over clip-path (iOS Safari). All four are
          pointer-events-none so the page still scrolls behind; the background is inert,
          so it reads and scrolls but cannot be tapped mid-tour. */}
      {hole ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div className={dim} style={{ top: hole.bottom, left: 0, right: 0, bottom: 0 }} />
          <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: holeH }} />
          <div className={dim} style={{ top: hole.top, left: hole.right, right: 0, height: holeH }} />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}

      {rect && (
        <div
          className="fixed rounded-2xl pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: GLOW,
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed left-0 right-0 flex justify-center px-4 pointer-events-none ${
          end === 'centre' ? 'inset-0 items-center' : ''
        }`}
        style={end === 'top' ? { top: PAD } : end === 'bottom' ? { bottom: PAD } : undefined}
      >
        {/* overflow-hidden, not auto: the card must never scroll. It is pinned to an end
            of the screen and gets the whole viewport height to play with, so the only way
            it clips is a step taller than the screen itself. */}
        <div
          ref={cardRef}
          style={{ maxHeight: vh - PAD * 2 }}
          className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 text-left overflow-hidden"
        >
        {/* Banner row: where the client is, and how far through. Pairing the two
              reclaims a row versus a standalone progress line. */}
          <div className="flex items-baseline gap-3 mb-1.5">
            {step.eyebrow && (
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                {step.eyebrow}
              </span>
            )}
            <span className="text-sm text-gray-500 ml-auto whitespace-nowrap">
              Step {index + 1} of {steps.length}
            </span>
          </div>

          <h2
            id="guided-tour-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-gray-900 focus:outline-none"
          >
            {step.title}
          </h2>

          {step.bullets && (
            <ul className="mt-3 space-y-2">
              {step.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <ChevronRight
                    size={18}
                    className="shrink-0 mt-0.5 text-blue-600"
                    aria-hidden="true"
                  />
                  <span className="text-base text-gray-700 leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {step.note && (
            <p className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 leading-relaxed">
              {step.note}
            </p>
          )}

          <div className="flex items-center gap-2 mt-5 mb-4">
            <span className="flex gap-1.5 ml-auto" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === index ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </span>
          </div>

          {/* Controls stay in the same place on every step, low enough for the thumb.
              Three 44px targets don't fit one row on a 360px phone, so they stack there. */}
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
            <button
              onClick={close}
              className="min-h-[44px] px-3 text-base font-medium text-gray-600 hover:text-gray-900 cursor-pointer rounded-lg text-left whitespace-nowrap min-[390px]:text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Skip tour
            </button>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIndex((i) => i - 1)}
                disabled={index === 0}
                className="min-h-[44px] px-3 flex items-center justify-center gap-1.5 text-base font-medium text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={() => (isLast ? close() : setIndex((i) => i + 1))}
                className="min-h-[44px] px-5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {isLast ? <Check size={18} /> : null}
                {isLast ? 'Done' : 'Next'}
                {isLast ? null : <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalEl
  );
};

export default GuidedTour;
