export type AnalyticsEvent = 'brief_completed' | 'direction_selected' | 'creative_saved' | 'creative_exported' | 'project_reopened' | 'project_created'|'creative_generated'|'creative_selected'|'creative_copied'|'creative_edited'|'creative_regenerated'|'creative_scored'|'creative_improved'|'creative_localized'|'creative_compared'|'project_deleted';
export type AnalyticsAdapter = { track: (event: AnalyticsEvent, properties: Record<string,string|number|boolean>)=>void };
// Opt-in adapter: no copy, personal data, or network telemetry collected by default.
let adapter: AnalyticsAdapter | undefined;
export function setAnalyticsAdapter(next: AnalyticsAdapter) { adapter=next; }
export function track(event: AnalyticsEvent, properties: Record<string,string|number|boolean> = {}) { try{adapter?.track(event,properties);}catch{/* Optional telemetry must not prevent local work. */} }
