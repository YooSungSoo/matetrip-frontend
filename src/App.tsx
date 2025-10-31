import { useState } from 'react';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { Workspace } from './components/Workspace';
import { Profile } from './components/Profile';
import { CreatePostModal } from './components/CreatePostModal';
import { Login } from './components/Login';
import { Signup } from './components/Signup';

type View = 'login' | 'signup' | 'app';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [activeTab, setActiveTab] = useState<'feed' | 'workspace' | 'profile'>('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);

  const handleJoinWorkspace = (postId: number) => {
    setSelectedPost(postId);
    setActiveTab('workspace');
  };

  const handleLogin = () => {
    setCurrentView('app');
  };

  const handleSignup = () => {
    setCurrentView('app');
  };

  // Show login or signup view
  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onSignupClick={() => setCurrentView('signup')} />;
  }

  if (currentView === 'signup') {
    return <Signup onSignup={handleSignup} onLoginClick={() => setCurrentView('login')} />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onCreatePost={() => setShowCreatePost(true)}
      />
      
      <main>
        {activeTab === 'feed' && (
          <Feed onJoinWorkspace={handleJoinWorkspace} />
        )}
        {activeTab === 'workspace' && (
          <Workspace postId={selectedPost} />
        )}
        {activeTab === 'profile' && (
          <Profile />
        )}
      </main>

      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
    </div>
  );
}
