import { useState, useEffect, useCallback } from 'react';
import { getVoteCounts, castVote, getUserVote, subscribeToVotes } from '../utils/communityApi';
import { getAnonymousId } from '../utils/anonymousUser';
import { useAuth } from './useAuth';

export function useVoting(restaurants = []) {
  const { user } = useAuth();
  const [voteCounts, setVoteCounts] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.id || null;
  const anonymousId = !userId ? getAnonymousId() : null;

  // Fetch vote counts
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [countsResult, voteResult] = await Promise.all([
        getVoteCounts(),
        getUserVote(userId, anonymousId),
      ]);

      setVoteCounts(countsResult.counts);
      setTotalVotes(countsResult.total);
      setUserVote(voteResult.vote?.restaurant_name || null);
    } catch (err) {
      console.error('Failed to fetch votes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, anonymousId]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchData();

    const unsubscribe = subscribeToVotes((payload) => {
      // Refetch on any change
      fetchData();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Cast a vote
  const vote = useCallback(async (restaurantName) => {
    if (voting) return;

    try {
      setVoting(true);
      setError(null);

      const { error: voteError } = await castVote(restaurantName, userId, anonymousId);

      if (voteError) {
        throw voteError;
      }

      // Optimistic update
      setUserVote(restaurantName);

      // Refetch to get accurate counts
      await fetchData();
    } catch (err) {
      console.error('Failed to cast vote:', err);
      setError(err.message);
    } finally {
      setVoting(false);
    }
  }, [userId, anonymousId, voting, fetchData]);

  // Get vote percentage for a restaurant
  const getPercentage = useCallback((restaurantName) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCounts[restaurantName] || 0) / totalVotes * 100);
  }, [voteCounts, totalVotes]);

  // Get sorted restaurants by vote count
  const getSortedRestaurants = useCallback(() => {
    return [...restaurants].sort((a, b) => {
      return (voteCounts[b] || 0) - (voteCounts[a] || 0);
    });
  }, [restaurants, voteCounts]);

  return {
    voteCounts,
    totalVotes,
    userVote,
    loading,
    voting,
    error,
    vote,
    getPercentage,
    getSortedRestaurants,
    refetch: fetchData,
  };
}
