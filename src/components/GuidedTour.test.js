import { cardEnd } from './GuidedTour';

// The highlight is a glow drawn on the target, not a hole cut in the dim, so there is no
// space to negotiate: the card is always given the full viewport and never scrolls. The
// only thing left to get right is that it doesn't sit on top of what it points at.
const rectAt = (top, height) => ({ top, bottom: top + height, height });

describe('cardEnd', () => {
  const viewports = [
    ['iPhone SE', 553],
    ['small Android', 540],
    ['landscape phone', 320],
    ['iPad', 1024],
    ['desktop', 679],
  ];

  viewports.forEach(([name, vh]) => {
    it(`${name}: a top-aligned target puts the card at the bottom`, () => {
      // Every step scrolls its target to the top, so this is the normal case.
      expect(cardEnd({ vh, rect: rectAt(0, 320) })).toBe('bottom');
    });

    it(`${name}: a bottom-pinned target puts the card at the top`, () => {
      // The mobile price bar is fixed to the bottom and can't be scrolled out of the way.
      expect(cardEnd({ vh, rect: rectAt(vh - 80, 80) })).toBe('top');
    });

    it(`${name}: never puts the card at the end its target occupies`, () => {
      [0, vh / 4, vh / 2, (vh * 3) / 4, vh - 100].forEach((top) => {
        const rect = rectAt(top, 100);
        const end = cardEnd({ vh, rect });
        const centre = (Math.max(0, rect.top) + Math.min(vh, rect.bottom)) / 2;
        if (end === 'bottom') expect(centre).toBeLessThanOrEqual(vh / 2);
        if (end === 'top') expect(centre).toBeGreaterThan(vh / 2);
      });
    });
  });

  it('centres the card when there is no target to point at', () => {
    // Collapsed section, no flights, finalized view — the missing-anchor case.
    expect(cardEnd({ vh: 553, rect: null })).toBe('centre');
  });

  it('handles a target taller than the viewport', () => {
    // A flight row on a phone. Top-aligned, so its true centre is far below the fold —
    // measured on that, the card would go to the top and cover the glowing edge that
    // identifies it. Measured on the visible part, it correctly goes to the bottom.
    expect(cardEnd({ vh: 553, rect: rectAt(0, 1200) })).toBe('bottom');
  });
});
