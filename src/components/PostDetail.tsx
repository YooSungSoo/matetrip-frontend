import { useState, useEffect, useCallback } from 'react';
import {
  // Lucide-react 아이콘 임포트
  User,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Thermometer,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Button } from './ui/button'; // UI 컴포넌트 임포트
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import client from '../api/client'; // API 클라이언트 임포트
import { type Post } from './PostCard'; // Post 타입 임포트
import { translateKeyword } from '../utils/keyword'; // 키워드 번역 함수 임포트

import { useAuthStore } from '../store/authStore';
import type { Participation } from '../types/participation.ts';

interface PostDetailProps {
  postId: string;
  isLoggedIn: boolean;
  onJoinWorkspace: (postId: string) => void;
  onViewProfile: (userId: string) => void;
  onEditPost: () => void;
}

export function PostDetail({
  postId,
  isLoggedIn,
  onJoinWorkspace,
  onViewProfile,
  onEditPost,
}: PostDetailProps) {
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Participation[]>([]);
  const [approvedParticipants, setApprovedParticipants] = useState<
    Participation[]
  >([]);

  const fetchPostDetail = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [postResponse, participationsResponse] = await Promise.all([
        client.get<Post>(`/post/${postId}`),
        client.get<Participation[]>(`/posts/${postId}/participations`),
      ]);

      setPost(postResponse.data);
      const allParticipations = participationsResponse.data;
      setParticipations(allParticipations);
      // 참여자 목록을 상태별로 분리합니다.
      setApprovedParticipants(
        allParticipations.filter((p) => p.status === '승인'),
      );
      setPendingRequests(
        allParticipations.filter((p) => p.status === '대기중'),
      );
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch post details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetail();
  }, [fetchPostDetail]);

  // 현재 로그인한 사용자가 게시글 작성자인지 확인
  const isAuthor = user && post ? user.userId === post.writerId : false;
  // console.log(`isAuthor: ${isAuthor}`);
  // console.log(user);
  // console.log(post);

  // 현재 로그인한 사용자의 참여 정보 확인
  const userParticipation = user
    ? participations.find((p) => p.requester.id === user.userId)
    : undefined;

  const handleApply = async () => {
    try {
      await client.post(`/posts/${postId}/participations`);
      alert('동행 신청이 완료되었습니다.');
      // 참여 목록을 다시 불러와 상태를 갱신합니다.
      await fetchPostDetail();
    } catch (err) {
      console.error('Failed to apply for post:', err);
      alert('동행 신청 중 오류가 발생했습니다.');
    }
  };

  const handleAcceptRequest = async (participationId: number) => {
    try {
      await client.patch(`/posts/${postId}/participations/${participationId}`, {
        status: '승인',
      });
      alert('신청을 수락했습니다.');
      await fetchPostDetail(); // 데이터를 새로고침하여 UI를 업데이트합니다.
    } catch (err) {
      console.error('Failed to accept request:', err);
      alert('요청 수락 중 오류가 발생했습니다.');
    }
  };

  const handleRejectRequest = async (participationId: number) => {
    try {
      await client.patch(`/posts/${postId}/participations/${participationId}`, {
        status: '거절',
      });
      alert('신청을 거절했습니다.');
      await fetchPostDetail(); // 데이터를 새로고침하여 UI를 업데이트합니다.
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert('요청 거절 중 오류가 발생했습니다.');
    }
  };

  const handleViewProfile = (userId: string) => {
    onViewProfile(userId);
  };

  // TODO: 매너온도 기능 구현 시 실제 데이터와 연동 필요
  const getTempColor = (temp: number) => {
    if (temp >= 38) return 'text-green-600';
    if (temp >= 37) return 'text-blue-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return <div className="text-center py-16">게시글을 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-16">게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        뒤로 가기
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header Image */}
          <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
            <ImageWithFallback
              src={
                post.image ||
                'https://images.unsplash.com/photo-1533106418989-87423dec6922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWx8ZW58MXx8fHwxNzIxNzE2MDMwfDA&ixlib=rb-4.1.0&q=80&w=1080'
              }
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <Badge
              className={`absolute top-4 right-4 ${
                post.status === '모집중' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              {post.status}
            </Badge>
          </div>

          {/* Title and Author */}
          <div className="mb-6">
            <h1 className="text-gray-900 mb-4">{post.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                <div>
                  <div className="text-gray-900">
                    {post.writerProfile.nickname}
                  </div>
                  {/* TODO: 매너온도 기능 구현 시 아래 코드 활성화 */}
                  {/* <div
                    className={`text-sm flex items-center gap-1 ${getTempColor(36.5)}`}
                  >
                    <Thermometer className="w-4 h-4" />
                    매너온도 36.5°C
                  </div> */}
                </div>
              </div>

              {isAuthor && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditPost}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700" // TODO: 삭제 핸들러 연결
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {post.writerProfile.travelStyles?.map((style) => (
                <Badge key={style} variant="secondary">
                  {translateKeyword(style)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-4">여행 소개</h3>
            {post.content ? (
              <p className="text-gray-700 whitespace-pre-line">
                {post.content}
              </p>
            ) : (
              <p className="text-gray-500">작성된 여행 소개가 없습니다.</p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Current Members */}
          {/* TODO: 참여중인 동행 목록 API 연동 필요 */}
          <div>
            <h3 className="text-gray-900 mb-4">
              참여중인 동행 ({approvedParticipants.length}명)
            </h3>
            {approvedParticipants.length > 0 ? (
              <div className="space-y-3">
                {approvedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => handleViewProfile(String(p.requester.id))}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">
                          {p.requester.profile.nickname}
                        </span>
                      </div>
                      {/* TODO: 매너온도 데이터 연동 */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">현재 참여중인 동행이 없습니다.</p>
            )}
          </div>

          {/* Pending Requests (Author Only) */}
          {/* TODO: 동행 신청 목록 API 연동 필요 */}
          {isAuthor && pendingRequests.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-gray-900 mb-4">
                  동행 신청 ({pendingRequests.length}명)
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div
                        className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full cursor-pointer"
                        onClick={() =>
                          handleViewProfile(String(request.requester.id))
                        }
                      />
                      <div className="flex-1">
                        <div
                          className="text-gray-900 mb-1 cursor-pointer"
                          onClick={() =>
                            handleViewProfile(String(request.requester.id))
                          }
                        >
                          {request.requester.profile.nickname}
                        </div>
                        <div className="flex gap-1 mb-2">
                          {/* TODO: 신청자 여행 스타일 표시 */}
                        </div>
                        {/* TODO: 매너온도 표시 */}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          className="gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4" />
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectRequest(request.id)}
                          className="gap-1"
                        >
                          <X className="w-4 h-4" />
                          거절
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-gray-900 mb-4">여행 정보</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">여행 일정</div>
                  <div>{`${post.startDate} ~ ${post.endDate}`}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">여행지</div>
                  <div>{post.location}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">모집 인원</div>
                  <div>
                    {/* TODO: 현재 참여 인원 API 연동 필요 */}
                    {approvedParticipants.length + 1} / {post.maxParticipants}
                    명
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">여행 키워드</div>
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {translateKeyword(keyword)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* --- 버튼 영역: 로그인 상태 및 작성자 여부에 따라 분기 --- */}
            {!isLoggedIn && (
              <Button disabled className="w-full">
                로그인 후 신청 가능
              </Button>
            )}

            {isLoggedIn && isAuthor && (
              <Button
                onClick={() => onJoinWorkspace(postId)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                워크스페이스 입장
              </Button>
            )}

            {isLoggedIn && !isAuthor && (
              <>
                {!userParticipation && (
                  <Button
                    onClick={handleApply}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    동행 신청하기
                  </Button>
                )}
                {userParticipation?.status === '대기중' && (
                  <Button disabled className="w-full bg-gray-400">
                    이미 신청한 동행입니다
                  </Button>
                )}
                {userParticipation?.status === '거절' && (
                  <Button disabled className="w-full bg-gray-400">
                    거절된 동행입니다
                  </Button>
                )}
                {userParticipation?.status === '승인' && (
                  <Button
                    onClick={() => onJoinWorkspace(postId)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    워크스페이스 입장
                  </Button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
