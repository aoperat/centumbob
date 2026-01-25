import { useState, useEffect, useCallback } from 'react';
import { getVoteCounts, castVote, getUserVote, subscribeToVotes } from '../utils/communityApi';
import { getAnonymousId } from '../utils/anonymousUser';
import { useAuth } from './useAuth';

// restaurants는 이제 { id, name } 객체 배열이어야 함
export function useVoting(restaurants = []) {
  const { user } = useAuth();
  const [voteCounts, setVoteCounts] = useState({}); // { restaurantId: count }
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVotedId, setUserVotedId] = useState(null); // 사용자가 투표한 식당 ID
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.id || null;
  const anonymousId = !userId ? getAnonymousId() : null;

  // Fetch vote counts (showLoading: 초기 로딩에만 true)
  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [countsResult, voteResult] = await Promise.all([
        getVoteCounts(),
        getUserVote(userId, anonymousId),
      ]);

      setVoteCounts(countsResult.counts);
      setTotalVotes(countsResult.total);
      setUserVotedId(voteResult.votedRestaurantId || null);
    } catch (err) {
      console.error('Failed to fetch votes:', err);
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userId, anonymousId]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchData(true); // 초기 로딩 시에만 loading 표시

    const unsubscribe = subscribeToVotes((payload) => {
      // Refetch on any change (백그라운드 갱신, loading 표시 안함)
      fetchData(false);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Cast a vote (restaurantId, restaurantName)
  const vote = useCallback(async (restaurantId, restaurantName) => {
    if (voting) return;

    try {
      setVoting(true);
      setError(null);

      const { error: voteError } = await castVote(restaurantId, restaurantName, userId, anonymousId);

      if (voteError) {
        throw voteError;
      }

      // Optimistic update - 즉시 UI 반영
      const previousVotedId = userVotedId;
      setUserVotedId(restaurantId);

      // 투표 카운트 낙관적 업데이트
      setVoteCounts(prev => {
        const newCounts = { ...prev };
        // 이전 투표 차감
        if (previousVotedId && newCounts[previousVotedId]) {
          newCounts[previousVotedId] = Math.max(0, newCounts[previousVotedId] - 1);
        }
        // 새 투표 추가
        newCounts[restaurantId] = (newCounts[restaurantId] || 0) + 1;
        return newCounts;
      });

      // 총 투표수 업데이트 (첫 투표인 경우만 증가)
      if (!previousVotedId) {
        setTotalVotes(prev => prev + 1);
      }

      // Refetch to get accurate counts (백그라운드 갱신, loading 표시 안함)
      await fetchData(false);
    } catch (err) {
      console.error('Failed to cast vote:', err);
      setError(err.message);
    } finally {
      setVoting(false);
    }
  }, [userId, anonymousId, voting, userVotedId, fetchData]);

  // Get vote percentage for a restaurant by ID
  const getPercentage = useCallback((restaurantId) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCounts[restaurantId] || 0) / totalVotes * 100);
  }, [voteCounts, totalVotes]);

  // Get sorted restaurants by vote count
  const getSortedRestaurants = useCallback(() => {
    return [...restaurants].sort((a, b) => {
      const countA = voteCounts[a.id] || 0;
      const countB = voteCounts[b.id] || 0;
      return countB - countA;
    });
  }, [restaurants, voteCounts]);

  return {
    voteCounts,
    totalVotes,
    userVotedId,
    loading,
    voting,
    error,
    vote,
    getPercentage,
    getSortedRestaurants,
    refetch: fetchData,
  };
}
