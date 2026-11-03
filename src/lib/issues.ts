const DAY_MS = 24 * 60 * 60 * 1000;

// Repair deadlines from the Fair Rental amendment. Kept in one place so they
// can be adjusted once a lawyer has confirmed them.
const URGENT_DAYS = 3;
const REGULAR_DAYS = 30;

export function issueDeadline(issue: { urgent: boolean; reportedAt: Date }) {
  const days = issue.urgent ? URGENT_DAYS : REGULAR_DAYS;
  return new Date(issue.reportedAt.getTime() + days * DAY_MS);
}

// Whole days left to handle the issue; negative once the deadline has passed.
export const daysLeft = (deadline: Date, now: Date) =>
  Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);

export function deadlineLabel(left: number) {
  if (left < 0) return `עבר היעד לטיפול לפני ${-left} ימים`;
  if (left === 0) return "היעד לטיפול הוא היום";
  return `נותרו ${left} ימים לטיפול`;
}
