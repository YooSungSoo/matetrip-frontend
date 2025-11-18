import { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  MoreVertical,
  MapPin,
  Smile,
  Paperclip,
  Send,
} from 'lucide-react';
import client from '../api/client';
import { type Post } from '../types/post';

// TODO: Jump back in 섹션 - 방문한 PostCard 작성자 프로필 데이터
// 구현 방법:
// 1. PostDetail 방문 시 localStorage에 작성자 정보 저장
// 2. 저장 형식: { authorId, authorName, authorImage, visitedAt }
// 3. 최근 3개만 유지하도록 관리
// 4. 이 컴포넌트에서 localStorage 읽어서 표시

// TODO: Get inspired 섹션 - InspirationPage 컴포넌트 데이터
// 구현 방법:
// 1. 백엔드 API 엔드포인트 필요: GET /api/inspirations
// 2. 또는 기존 Feed 데이터를 랜덤하게 3개 선택
// 3. InspirationCard 컴포넌트 별도 생성 권장

export function AIChatPage() {
  const [_posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await client.get<Post[]>('/posts');
        const sortedPosts = response.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPosts(sortedPosts.slice(0, 8));
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      // TODO: AI Agent 백엔드 연동 시 메시지 전송 로직 추가
      console.log('Message sent:', chatMessage);
      setChatMessage('');
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Chat Section - AI Agent 탑재 예정 */}
      <main className="w-[770px] h-full bg-white border-r border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="h-[77px] border-b border-gray-200 flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold text-neutral-950 tracking-tight">
                AI Travel Assistant
              </h3>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-sm text-gray-500 tracking-tight">
                  제주도 힐링 여행
                </span>
              </div>
            </div>
          </div>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Chat Messages Area */}
        {/* TODO: AI Agent 채팅 기능 연결 */}
        {/* 구현 방법:
            1. useState로 messages 상태 관리
            2. AI Agent API 엔드포인트 연결 (POST /api/chat)
            3. 메시지 전송 및 응답 처리
            4. 메시지 리스트 렌더링
            5. 자동 스크롤 구현
        */}
        <div className="flex-1 bg-white overflow-y-auto">
          {/* 채팅 메시지가 여기에 표시됩니다 */}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSendMessage}
          className="h-[85px] border-t border-gray-200 flex items-center gap-2 px-4 pt-[17px]"
        >
          <button
            type="button"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 h-[52px] bg-gray-50 rounded-full flex items-center gap-2 px-4">
            <input
              type="text"
              placeholder="Ask anything..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none tracking-tight"
            />
            <button
              type="button"
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-200"
            >
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-200"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button
            type="submit"
            className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-800"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
      </main>

      {/* Right Panel - Recommendations */}
      <section className="flex-1 h-full bg-gray-50 flex flex-col justify-between py-[60px] overflow-y-auto">
        {/* For you in Section */}
        {/* TODO: 백엔드 API 연결 - 사용자 행동 기반 여행지 추천 */}
        {/*
          엔드포인트: GET /api/recommendations/personalized
          응답 형식: { places: [{ id, title, category, imageUrl }] }
          연결 방법:
          1. useEffect에서 API 호출
          2. useState로 데이터 관리
          3. map으로 카드 렌더링
        */}
        <div className="px-8 w-full">
          <h2 className="text-xl font-bold text-black mb-3">For you in</h2>
          <div className="flex items-center justify-between w-full gap-4">
            {/* Placeholder Cards - 백엔드 연결 시 동적 데이터로 교체 */}
            {isLoading ? (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
              </>
            ) : (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        장소 카테고리
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        장소 카테고리
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        장소 카테고리
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Jump back in Section */}
        {/* TODO: LocalStorage 기반 최근 방문 작성자 프로필 */}
        {/*
          구현 단계:
          1. PostDetail.tsx에서 방문 시 저장 로직 추가:
             const saveVisitedAuthor = (author) => {
               const visited = JSON.parse(localStorage.getItem('visitedAuthors') || '[]');
               const newVisit = { ...author, visitedAt: Date.now() };
               const updated = [newVisit, ...visited.filter(v => v.id !== author.id)].slice(0, 3);
               localStorage.setItem('visitedAuthors', JSON.stringify(updated));
             };

          2. 이 컴포넌트에서 불러오기:
             const [visitedAuthors, setVisitedAuthors] = useState([]);
             useEffect(() => {
               const saved = localStorage.getItem('visitedAuthors');
               if (saved) setVisitedAuthors(JSON.parse(saved));
             }, []);

          3. 프로필 이미지와 이름 표시
        */}
        <div className="px-8 w-full">
          <h2 className="text-xl font-bold text-black mb-3">Jump back in</h2>
          <div className="flex items-center justify-between w-full gap-4">
            {/* Placeholder Cards - LocalStorage 연결 시 프로필 사진으로 교체 */}
            {isLoading ? (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
              </>
            ) : (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <p className="text-xl font-bold text-white">제목입니다.</p>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <p className="text-xl font-bold text-white">제목입니다.</p>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <p className="text-xl font-bold text-white">제목입니다.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Get inspired Section */}
        {/* TODO: Inspiration 데이터 연결 */}
        {/*
          구현 방법 (선택):

          방법 1 - 백엔드 API 사용:
          엔드포인트: GET /api/inspirations?limit=3
          응답: { inspirations: [{ id, title, address, imageUrl }] }

          방법 2 - 기존 Feed 데이터 재사용:
          Feed 컴포넌트의 posts 데이터를 랜덤하게 3개 선택

          방법 3 - 별도 컴포넌트 임포트:
          InspirationPage 컴포넌트에서 카드 데이터를 export하여 사용

          권장: 방법 1 또는 방법 2 (재사용성 고려)
        */}
        <div className="px-8 w-full">
          <h2 className="text-xl font-bold text-black mb-3">Get inspired</h2>
          <div className="flex items-center justify-between w-full gap-4">
            {/* Placeholder Cards - API 연결 시 실제 데이터로 교체 */}
            {isLoading ? (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl animate-pulse" />
              </>
            ) : (
              <>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        주소입니다.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        주소 입니다.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-[200px] h-[200px] bg-gray-300 rounded-2xl p-5 flex flex-col justify-end overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-bold text-white">제목입니다.</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">
                        주소 입니다.
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
