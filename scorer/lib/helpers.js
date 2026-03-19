export const COLORS = {
  border: '#E5E7EB',
  muted: '#6B7280',
  passGreen: '#16A34A',
  passGreenBg: '#DCFCE7',
  failRed: '#DC2626',
  failRedBg: '#FEE2E2',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  blue: '#2563EB',
  blueBg: '#DBEAFE',
};

export function verdictStyle(verdict) {
  if (!verdict) return {};
  if (verdict.startsWith('Ready')) return { color: COLORS.passGreen, background: COLORS.passGreenBg };
  if (verdict.startsWith('Address')) return { color: COLORS.blue, background: COLORS.blueBg };
  if (verdict.startsWith('Significant')) return { color: COLORS.amber, background: COLORS.amberBg };
  return { color: COLORS.failRed, background: COLORS.failRedBg };
}

export function scoreColor(total) {
  if (total >= 9) return COLORS.passGreen;
  if (total >= 7) return COLORS.blue;
  if (total >= 5) return COLORS.amber;
  return COLORS.failRed;
}

export function nextSteps(verdict) {
  if (!verdict) return '';
  if (verdict.startsWith('Ready')) return 'Schedule engineering kickoff. Confirm all open questions are in-flight. Proceed.';
  if (verdict.startsWith('Address')) return 'Close the failing dimensions before sprint planning. These are known gaps — the cost of fixing them now is far lower than discovering them in build.';
  if (verdict.startsWith('Significant')) return 'Schedule a PRD review with engineering, ops, and a cross-functional stakeholder before proceeding. The gaps at this score are structural, not editorial.';
  return 'Restart with the AI Feature PRD Toolkit. The failing dimensions indicate the requirements are not yet ready for engineering — proceeding now means discovering the answers in production.';
}
