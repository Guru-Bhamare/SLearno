import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext } from 'react';

import { getOrCreateAuthUserId, supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  name: string | null;
  skill_level: string;
  free_time_minutes: number;
  created_at: string;
  focus_skill: string | null;
  focus_resource_id: string | null;
};

type SessionContextValue = {
  userId?: string;
  profile: Profile | null;
  isLoading: boolean;
  refetchProfile: () => Promise<unknown>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: userId, isLoading: userLoading } = useQuery({
    queryKey: ['auth-user-id'],
    queryFn: getOrCreateAuthUserId,
    staleTime: Infinity,
  });

  const {
    data: profile,
    isLoading: profileLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });

  const refetchProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    return refetch();
  };

  return (
    <SessionContext.Provider
      value={{
        userId,
        profile: profile ?? null,
        isLoading: userLoading || (!!userId && profileLoading),
        refetchProfile,
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
