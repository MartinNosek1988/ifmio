/** SLA policy per priority — hours for response and resolution */
export const SLA_POLICY: Record<string, { responseHours: number; resolutionHours: number }> = {
  low:    { responseHours: 72,  resolutionHours: 336  }, // 3 days / 14 days
  medium: { responseHours: 24,  resolutionHours: 120  }, // 1 day / 5 days
  high:   { responseHours: 8,   resolutionHours: 48   }, // 8h / 2 days
  urgent: { responseHours: 1,   resolutionHours: 8    }, // 1h / 8h
};

export function calculateSlaDates(priority: string, createdAt: Date): {
  responseDueAt: Date;
  resolutionDueAt: Date;
} {
  const policy = SLA_POLICY[priority] ?? SLA_POLICY.medium;
  return {
    responseDueAt: new Date(createdAt.getTime() + policy.responseHours * 3_600_000),
    resolutionDueAt: new Date(createdAt.getTime() + policy.resolutionHours * 3_600_000),
  };
}
