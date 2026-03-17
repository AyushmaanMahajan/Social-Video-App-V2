'use client';

import { useCallback, useState } from 'react';
import { getDiscoveryProfile } from '@/lib/api';

export function useDiscovery() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState('');
  const [rotationSlot, setRotationSlot] = useState(null);
  const [poolReset, setPoolReset] = useState(false);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getDiscoveryProfile();

      setRotationSlot(typeof data?.rotationSlot === 'number' ? data.rotationSlot : null);
      setPoolReset(Boolean(data?.poolReset));

      if (data?.empty) {
        setEmpty(true);
        setCandidate(null);
        return data;
      }

      setEmpty(false);
      setCandidate(data?.user || null);
      return data;
    } catch (err) {
      console.error('Discovery fetch error:', err);
      setError(err?.response?.data?.error || 'Could not load discovery right now.');
      setCandidate(null);
      setEmpty(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    candidate,
    loading,
    empty,
    error,
    rotationSlot,
    poolReset,
    fetchNext,
  };
}
