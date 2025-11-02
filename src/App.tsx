import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Outlet } from 'react-router-dom';
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

// Layout component for pages with Header
function Layout({
  isLoggedIn,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onCreatePost,
  onLogoClick
}: {
  isLoggedIn: boolean;
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

  const handleSearch = (params: { date?: string; location?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.date) searchParams.set('date', params.date);
    if (params.location) searchParams.set('location', params.location);
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleViewPost = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  return <MainPage onSearch={handleSearch} onViewPost={handleViewPost} />;
}

function SearchResultsWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const params = {
    date: searchParams.get('date') || undefined,
    location: searchParams.get('location') || undefined,
  };

  const handleViewPost = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  return <SearchResults searchParams={params} onViewPost={handleViewPost} />;
}

function PostDetailWrapper({
  isLoggedIn,
  onEditPost
}: {
  isLoggedIn: boolean;
  onEditPost: (postId: number) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const postId = parseInt(location.pathname.split('/').pop() || '0');

  const handleJoinWorkspace = (postId: number) => {
    navigate(`/workspace/${postId}`);
  };

  const handleEditPost = () => {
    onEditPost(postId);
  };

  return (
    <PostDetail
      postId={postId}
      isLoggedIn={isLoggedIn}
      onJoinWorkspace={handleJoinWorkspace}
      onEditPost={handleEditPost}
    />
  );
}

function WorkspaceWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const postId = parseInt(location.pathname.split('/').pop() || '0');

  const handleEndTrip = () => {
    navigate('/review');
  };

  return <Workspace postId={postId} onEndTrip={handleEndTrip} />;
}

function ProfileWrapper({
  isLoggedIn
}: {
  isLoggedIn: boolean;
}) {
  const navigate = useNavigate();

  const handleViewPost = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  return <Profile isLoggedIn={isLoggedIn} onViewPost={handleViewPost} />;
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

  // 유저의 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 모달 상태
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<number | null>(null);

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigate('/');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
      <Routes>
        {/* Routes without Header */}
        <Route path="/login" element={<LoginWrapper onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignupWrapper onSignup={handleLogin} />} />

        {/* Routes with Header */}
        <Route
          element={
            <Layout
              isLoggedIn={isLoggedIn}
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
                onEditPost={(postId) => {
                  setSelectedPostForEdit(postId);
                  setShowEditPost(true);
                }}
              />
            }
          />
          <Route path="/workspace/:id" element={<WorkspaceWrapper />} />
          <Route path="/profile" element={<ProfileWrapper isLoggedIn={isLoggedIn} />} />
          <Route path="/review" element={<ReviewPageWrapper />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      {/* Modals */}
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
      {showEditPost && (
        <EditPostModal
          postId={selectedPostForEdit || 0}
          onClose={() => setShowEditPost(false)}
        />
      )}
    </div>
  );
}
