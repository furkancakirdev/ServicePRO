type SyncResultWithMetadata = {
  metadata?: {
    warnings?: string[];
  };
};

export function buildSyncDateValidation(results: Record<string, SyncResultWithMetadata>) {
  const dateValidationIssues: Array<{ sheet: string; count: number; warnings: string[] }> = [];

  for (const [sheet, result] of Object.entries(results)) {
    const warnings = result.metadata?.warnings ?? [];
    const dateWarnings = warnings.filter(
      (warning) => warning.startsWith('date_fallback:') || warning.startsWith('date_parse_failed:')
    );

    if (dateWarnings.length > 0) {
      dateValidationIssues.push({
        sheet,
        count: dateWarnings.length,
        warnings: dateWarnings.slice(0, 5),
      });
    }
  }

  return {
    issuesFound: dateValidationIssues.length,
    details: dateValidationIssues,
  };
}

