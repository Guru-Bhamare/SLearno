import { supabase } from '@/lib/supabase';

export type FlashcardSourceType = 'note' | 'curiosity' | 'task';

export async function createFlashcard(
  profileId: string,
  front: string,
  back: string,
  sourceType: FlashcardSourceType
) {
  if (!front.trim() || !back.trim()) return;
  await supabase.from('flashcards').insert({
    profile_id: profileId,
    front: front.trim(),
    back: back.trim(),
    source_type: sourceType,
    interval_stage: 0,
    next_due_at: new Date().toISOString(),
  });
}
