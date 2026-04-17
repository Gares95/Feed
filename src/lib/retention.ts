export function cutoffDate(days: number, now = Date.now()): Date {
  return new Date(now - days * 24 * 60 * 60 * 1000);
}

export function retentionWhere(cutoff: Date) {
  return {
    publishedAt: { lt: cutoff },
    isRead: true as const,
    isStarred: false as const,
    highlights: { none: {} },
  };
}
