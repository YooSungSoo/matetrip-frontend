import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-semibold text-gray-700 mt-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-500 mt-2 mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Button onClick={() => navigate('/')} size="lg">
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
