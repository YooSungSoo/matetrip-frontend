import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { Header } from './components/Header';
import { MainPage } from './components/MainPage';
import { SearchResults } from './components/SearchResults';
import { PostDetail } from './components/PostDetail';
import { Workspace } from './components/Workspace';
import { Profile } from './components/Profile';
import { CreatePostModal } from './components/CreatePostModal';
import { EditPostModal } from './components/EditPostModal';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { ReviewPage } from './components/ReviewPage';
import { NotFound } from './components/NotFound';
import { useAuthStore } from './store/authStore'; // Zustand 스토어 임포트
import { NotificationListener } from './components/NotificationListener';
import client from './api/client';
import type { CreateWorkspaceResponse } from './types/workspace';
import type { Post } from './types/post';
import { Toaster } from 'sonner';
import PublicOnlyRoute from './components/PublicOnlyRoute';


// Layout component for pages with Header
function Layout({
  isLoggedIn,
  isAuthLoading,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onCreatePost,
  onLogoClick,
}: {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: () => void;
  onCreatePost: () => void;
  onLogoClick: () => void;
}) {
  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        isAuthLoading={isAuthLoading}
        onLoginClick={onLoginClick}
        onLogoutClick={onLogoutClick}
        onProfileClick={onProfileClick}
        onCreatePost={onCreatePost}
        onLogoClick={onLogoClick}
      />
      <Outlet />
    </>
  );
}

// Wrapper components for route handling
function MainPageWrapper() {
  const navigate = useNavigate();

  const handleSearch = (params: {
    startDate?: string;
    endDate?: string;
    location?: string;
    title?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.location) searchParams.set('location', params.location);
    if (params.title) searchParams.set('title', params.title);
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleViewPost = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handleUserClick = (userId: string) => {
    // userId도 string일 가능성이 높으므로 함께 변경
    navigate(`/profile/${userId}`);
  };

  return (
    <MainPage
      onSearch={handleSearch}
      onViewPost={handleViewPost}
      onUserClick={handleUserClick}
    />
  );
}

function SearchResultsWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const params = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    location: searchParams.get('location') || undefined,
    title: searchParams.get('title') || undefined,
  };

  const handleViewPost = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  return <SearchResults searchParams={params} onViewPost={handleViewPost} />;
}

function PostDetailWrapper({
  isLoggedIn,
  onEditPost,
}: {
  // onEditPost prop의 postId 타입을 string으로 변경
  isLoggedIn: boolean;
  onEditPost: (post: Post) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const postId = location.pathname.split('/').pop() || ''; // postId를 string으로 직접 추출

  const handleJoinWorkspace = (postId: string, workspaceName: string) => {
    // TODO : 워크스페이스 생성 API를 호출해서 생성된 id 를 반환해야 함.
    const createAndNavigate = async () => {
      // 디버깅용 로그
      console.log(`postId`, postId);
      console.log(`workspaceName`, workspaceName);

      try {
        // API 응답 데이터 구조에 맞게 타입과 변수명 수정
        const response = await client.post<CreateWorkspaceResponse>(
          '/workspace',
          { postId, workspaceName }
        );

        // 디버깅용 로그
        console.log(`=== POST /workspace 응답 ===`);
        console.log(response.data);

        const { planDayDtos, workspaceResDto } = response.data;
        const { id, workspaceName: resWorkspaceName } = workspaceResDto;

        // 디버깅용 로그
        console.log(`id`, id);
        console.log(`workspaceName`, resWorkspaceName);
        console.log(`planDayDtos`, planDayDtos);

        // navigate의 state를 사용하여 워크스페이스 이름을 전달합니다.
        navigate(`/workspace/${id}`, {
          state: { workspaceName: resWorkspaceName, planDayDtos },
        });
      } catch (error) {
        console.error('Failed to create or join workspace:', error);
        alert('워크스페이스에 입장하는 중 오류가 발생했습니다.');
      }
    };
    createAndNavigate();
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <PostDetail
      postId={postId}
      isLoggedIn={isLoggedIn}
      onJoinWorkspace={handleJoinWorkspace}
      onEditPost={onEditPost} // onEditPost를 그대로 전달
      onViewProfile={handleViewProfile}
    />
  );
}

function WorkspaceWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceId = location.pathname.split('/').pop() || ''; // 명확한 변수명으로 변경
  const workspaceName = location.state?.workspaceName || '워크스페이스'; // state에서 이름 가져오기
  const planDayDtos = location.state?.planDayDtos || [];

  const handleEndTrip = () => {
    navigate('/review');
  };

  return (
    <Workspace
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      planDayDtos={planDayDtos}
      onEndTrip={handleEndTrip}
    />
  );
}

function ProfileWrapper({
  isLoggedIn,
  loggedInUserId,
}: {
  isLoggedIn: boolean;
  loggedInUserId?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // 어떤 userId를 사용할지 결정합니다:
  // 경로가 정확히 '/profile'인 경우, 로그인된 사용자의 ID (loggedInUserId)를 사용합니다.
  // 그 외의 경우 (예: '/profile/:userId'), URL에서 userId를 파싱합니다.
  const userIdFromUrl = location.pathname.split('/').pop() || ''; // userId를 string으로 직접 추출
  const targetUserId =
    location.pathname === '/profile' ? loggedInUserId : userIdFromUrl;

  const handleViewPost = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  return (
    <Profile
      isLoggedIn={isLoggedIn}
      onViewPost={handleViewPost}
      userId={targetUserId}
    />
  );
}

function LoginWrapper({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();

  const handleSignupClick = () => {
    navigate('/signup');
  };

  return <Login onLogin={onLogin} onSignupClick={handleSignupClick} />;
}

function SignupWrapper({ onSignup }: { onSignup: () => void }) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return <Signup onSignup={onSignup} onLoginClick={handleLoginClick} />;
}

function ReviewPageWrapper() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/');
  };

  return <ReviewPage onComplete={handleComplete} />;
}

export default function App() {
  const navigate = useNavigate();

  // Zustand 스토어에서 상태와 액션을 가져옵니다.
  const {
    isLoggedIn,
    isAuthLoading,
    user,
    checkAuth,
    logout: storeLogout,
  } = useAuthStore();

  // 모달 상태
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<Post | null>(
    null
  );

  // 앱이 처음 로드될 때 쿠키를 통해 로그인 상태를 확인합니다.
  // checkAuth 함수는 Zustand 스토어에 의해 안정적으로 제공되므로 의존성 배열에 포함해도 안전합니다.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = () => {
    // 로그인 성공 후, Zustand 스토어의 checkAuth를 호출하여 상태를 동기화합니다.
    // 이 시점에서 서버는 HttpOnly 쿠키를 설정했을 것입니다.
    checkAuth();
    navigate('/');
  };

  const handleLogout = async () => {
    await storeLogout(); // Zustand 스토어의 logout 액션을 호출하여 상태를 업데이트합니다.
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {isLoggedIn && <NotificationListener />}
      <Routes>
        {/* Routes without Header */}
        <Route element={<PublicOnlyRoute />}>
          <Route
            path="/login"
            element={<LoginWrapper onLogin={handleLogin} />}
          />
          <Route
            path="/signup"
            element={<SignupWrapper onSignup={handleLogin} />} // 회원가입 후 자동 로그인 처리
          />
        </Route>

        {/* Routes with Header */}
        <Route
          element={
            <Layout
              isLoggedIn={isLoggedIn}
              isAuthLoading={isAuthLoading}
              onLoginClick={() => navigate('/login')}
              onLogoutClick={handleLogout}
              onProfileClick={handleProfileClick}
              onCreatePost={() => setShowCreatePost(true)}
              onLogoClick={handleLogoClick}
            />
          }
        >
          <Route path="/" element={<MainPageWrapper />} />
          <Route path="/search" element={<SearchResultsWrapper />} />
          <Route
            path="/post/:id"
            element={
              <PostDetailWrapper
                isLoggedIn={isLoggedIn}
                onEditPost={(post) => {
                  setSelectedPostForEdit(post);
                  setShowEditPost(true);
                }}
              />
            }
          />
          <Route path="/workspace/:id" element={<WorkspaceWrapper />} />
          <Route
            path="/profile"
            element={
              <ProfileWrapper
                isLoggedIn={isLoggedIn}
                loggedInUserId={user?.userId}
              />
            }
          />
          <Route
            path="/profile/:userId"
            element={<ProfileWrapper isLoggedIn={isLoggedIn} />} // userId는 URL에서 파싱
          />
          <Route path="/review" element={<ReviewPageWrapper />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      {/* Modals */}
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
      {showEditPost && selectedPostForEdit && (
        <EditPostModal
          post={selectedPostForEdit}
          onClose={() => setShowEditPost(false)} // 사용자가 X 버튼이나 취소 버튼을 눌렀을 때
          onSuccess={() => {
            setShowEditPost(false); // 모달 닫기
            alert('게시물이 성공적으로 수정되었습니다.');
            navigate(0); // 현재 페이지 새로고침하여 데이터 갱신
          }}
        />
      )}
    </div>
  );
}
