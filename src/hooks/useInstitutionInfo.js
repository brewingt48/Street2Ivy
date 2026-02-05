/**
 * Custom hook to fetch institution info for the current user (students)
 *
 * Returns institution membership status and AI coaching availability
 */

import { useState, useEffect } from 'react';
import { fetchMyInstitution } from '../util/api';

/**
 * Hook to get institution info for the current student user
 * @param {Object} currentUser - The current user object
 * @returns {Object} - { institutionInfo, loading, error }
 */
export const useInstitutionInfo = currentUser => {
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isStudent = userType === 'student';
  const userId = currentUser?.id?.uuid;

  useEffect(() => {
    // Only fetch for authenticated students
    if (!isStudent || !userId) {
      setInstitutionInfo(null);
      return;
    }

    let isMounted = true;

    const fetchInstitution = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchMyInstitution();

        if (isMounted) {
          setInstitutionInfo(response);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch institution info:', err);
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchInstitution();

    return () => {
      isMounted = false;
    };
  }, [isStudent, userId]);

  return { institutionInfo, loading, error };
};

export default useInstitutionInfo;
