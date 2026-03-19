import { COLORS, verdictStyle, scoreColor, nextSteps } from '../lib/helpers';

describe('verdictStyle', () => {
  it('returns empty object for falsy input', () => {
    expect(verdictStyle(null)).toEqual({});
    expect(verdictStyle(undefined)).toEqual({});
    expect(verdictStyle('')).toEqual({});
  });

  it('returns green for Ready verdict', () => {
    const style = verdictStyle('Ready for engineering kickoff');
    expect(style.color).toBe(COLORS.passGreen);
    expect(style.background).toBe(COLORS.passGreenBg);
  });

  it('returns blue for Address verdict', () => {
    const style = verdictStyle('Address gaps before sprint planning');
    expect(style.color).toBe(COLORS.blue);
    expect(style.background).toBe(COLORS.blueBg);
  });

  it('returns amber for Significant verdict', () => {
    const style = verdictStyle('Significant rework needed');
    expect(style.color).toBe(COLORS.amber);
    expect(style.background).toBe(COLORS.amberBg);
  });

  it('returns red for Not ready verdict', () => {
    const style = verdictStyle('Not ready — restart with the template');
    expect(style.color).toBe(COLORS.failRed);
    expect(style.background).toBe(COLORS.failRedBg);
  });
});

describe('scoreColor', () => {
  it('returns green for scores 9 and 10', () => {
    expect(scoreColor(10)).toBe(COLORS.passGreen);
    expect(scoreColor(9)).toBe(COLORS.passGreen);
  });

  it('returns blue for scores 7 and 8', () => {
    expect(scoreColor(8)).toBe(COLORS.blue);
    expect(scoreColor(7)).toBe(COLORS.blue);
  });

  it('returns amber for scores 5 and 6', () => {
    expect(scoreColor(6)).toBe(COLORS.amber);
    expect(scoreColor(5)).toBe(COLORS.amber);
  });

  it('returns red for scores below 5', () => {
    expect(scoreColor(4)).toBe(COLORS.failRed);
    expect(scoreColor(0)).toBe(COLORS.failRed);
  });
});

describe('nextSteps', () => {
  it('returns empty string for falsy input', () => {
    expect(nextSteps(null)).toBe('');
    expect(nextSteps(undefined)).toBe('');
    expect(nextSteps('')).toBe('');
  });

  it('returns kickoff message for Ready verdict', () => {
    const msg = nextSteps('Ready for engineering kickoff');
    expect(msg).toMatch(/kickoff/i);
  });

  it('returns gap-closing message for Address verdict', () => {
    const msg = nextSteps('Address gaps before sprint planning');
    expect(msg).toMatch(/failing dimensions/i);
  });

  it('returns review message for Significant verdict', () => {
    const msg = nextSteps('Significant rework needed');
    expect(msg).toMatch(/PRD review/i);
  });

  it('returns restart message for Not ready verdict', () => {
    const msg = nextSteps('Not ready — restart with the template');
    expect(msg).toMatch(/AI Feature PRD Toolkit/i);
  });
});
