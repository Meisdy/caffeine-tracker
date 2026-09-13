import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '../../domain/types';
import { getProfile, saveProfile as persistProfile } from '../../data/repositories';

interface UseProfileResult {
  profile: Profile | null;
  saveProfile: (profile: Profile) => Promise<void>;
  isLoading: boolean;
}

/** Loads the single stored profile and exposes a setter that persists and reflects changes immediately. */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getProfile().then((loadedProfile) => {
      if (!isMounted) return;
      setProfile(loadedProfile);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveProfile = useCallback(async (nextProfile: Profile) => {
    await persistProfile(nextProfile);
    setProfile(nextProfile);
  }, []);

  return { profile, saveProfile, isLoading };
}
