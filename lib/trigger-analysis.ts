import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

export type AnalysisTrigger =
  | 'onboarding'
  | 'task_status'
  | 'note'
  | 'doubt'
  | 'curiosity'
  | 'reflection'
  | 'skill_switch'
  | 'day_map';

/**
 * Fire-and-forget: re-runs the intern's Gemini analysis after a relevant
 * activity, then invalidates the dashboard query so it picks up the new
 * row. Never awaited by callers — must not block the UI mutation it's
 * attached to.
 */
export function triggerProgressAnalysis(profileId: string, trigger: AnalysisTrigger) {
  supabase.functions
    .invoke('analyze-progress', { body: { profileId, trigger } })
    .then(({ error }) => {
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile_analysis', profileId] });
    })
    .catch((err) => {
      console.warn('triggerProgressAnalysis failed', err);
    });
}
