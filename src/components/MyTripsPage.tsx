import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import client from '../api/client';
import { type Post } from '../types/post';
import { MainPostCardSkeleton } from './AIMatchingSkeletion';
import { WorkspaceCarousel } from './WorkspaceCarousel';
import { useAuthStore } from '../store/authStore';

interface MyTripsPageProps {
  onViewPost: (postId: string) => void;
  isLoggedIn: boolean;
  fetchTrigger: number;
}

export function MyTripsPage({
  onViewPost,
  isLoggedIn,
  fetchTrigger,
}: MyTripsPageProps) {
  const [plannedPosts, setPlannedPosts] = useState<Post[]>([]);
  const [participatingPosts, setParticipatingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    const fetchUserPosts = async () => {
      setIsLoading(true);
      try {
        if (isLoggedIn && user?.userId) {
          const userPostsResponse = await client.get<Post[]>(
            `/posts/user/${user.userId}`
          );

          const sortedUserPosts = userPostsResponse.data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          const planned = sortedUserPosts.filter(
            (post) => post.writer && post.writer.id === user.userId
          );
          const participating = sortedUserPosts.filter(
            (post) =>
              post.writer &&
              post.writer.id !== user.userId &&
              post.participations.some(
                (p) => p.requester.id === user.userId && p.status === '승인'
              )
          );

          setPlannedPosts(planned);
          setParticipatingPosts(participating);
        } else {
          setPlannedPosts([]);
          setParticipatingPosts([]);
        }
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPosts();
  }, [isLoggedIn, user?.userId, isAuthLoading, fetchTrigger]);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-16 py-12">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-gray-900 mb-2">
            {isLoading ? (
              <div className="h-9 bg-gray-200 rounded w-48 animate-pulse"></div>
            ) : (
              `${user?.profile.nickname}님의 여행`
            )}
          </h1>
          <p className="text-base text-gray-600">
            참여중인 여행과 작성한 게시글을 확인하세요
          </p>
        </div>

        {/* User's Participating Trips Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isLoading ? (
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              ) : (
                `내가 참여중인 여행`
              )}
            </h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : participatingPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              참여중인 여행이 없습니다.
            </div>
          ) : (
            <WorkspaceCarousel
              posts={participatingPosts}
              onCardClick={(post) => onViewPost(post.id)}
            />
          )}
        </section>

        {/* User's Created Posts Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isLoading ? (
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              ) : (
                '내가 계획한 여행'
              )}
            </h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : plannedPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              작성한 게시글이 없습니다.
            </div>
          ) : (
            <WorkspaceCarousel
              posts={plannedPosts}
              onCardClick={(post) => onViewPost(post.id)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
