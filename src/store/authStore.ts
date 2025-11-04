import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import client from '../api/client';

// 앱 전역에서 사용할 표준 User 타입 정의
// 두 API 응답의 필드를 종합하여 정의합니다.
interface User {
  id: string;
  email: string;
  nickname: string;
  gender: string;
  description: string;
  intro: string;
  mbtiTypes: string;
  travelStyles: string[];
  profileImageId: string | null;
  // 로그인 응답에만 있는 필드는 optional로 처리
  travelTendency?: string[];
  createdAt?: string;
  updatedAt?: string | null;
}

interface AuthState {
  isLoggedIn: boolean;
  isAuthLoading: boolean; // 인증 상태 확인 중인지 여부
  user: User | null;
  checkAuth: () => Promise<void>;
  login: (user: User) => void; // 이 함수는 현재 사용되지 않지만, 필요에 따라 추가할 수 있습니다.
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools((set) => ({
    isLoggedIn: false,
    isAuthLoading: true, // 앱 시작 시 인증 확인을 하므로 초기값을 true로 설정
    user: null,
    checkAuth: async () => {
      // checkAuth가 호출될 때마다 로딩 상태를 true로 설정 (로그인 후 호출 등)
      set({ isAuthLoading: true }, false, 'checkAuth/start');
      try {
        // HttpOnly 쿠키가 포함된 요청을 보내 사용자 정보를 가져옵니다.
        // '/profile/my'는 평탄한 구조의 사용자 정보를 반환합니다.
        const response = await client.get<User>('/profile/my');

        if (response.data && response.data.id) {
          // response.data는 이미 User 타입과 호환되므로 바로 할당합니다.
          set(
            { isLoggedIn: true, user: response.data, isAuthLoading: false },
            false,
            'checkAuth/success'
          );
        } else {
          // 응답은 성공했지만 데이터가 없는 경우
          set({ isLoggedIn: false, user: null, isAuthLoading: false }, false, 'checkAuth/no-user');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // API 요청 실패 시
        set({ isLoggedIn: false, user: null, isAuthLoading: false }, false, 'checkAuth/failure');
      }
    },
    // login 함수는 이제 사용되지 않으므로, 로그인 성공 시 checkAuth()를 호출하는 패턴을 유지합니다.
    // 필요하다면, 로그인 응답을 User 타입으로 변환하는 로직을 여기에 추가할 수 있습니다.
    // 예: login: (loginResponse) => { const user = mapLoginResponseToUser(loginResponse); set... }
    login: (user: User) => set({ isLoggedIn: true, user }, false, 'auth/login'),
    logout: async () => {
      try {
        // 서버에 로그아웃 요청을 보내 HttpOnly 쿠키를 삭제합니다.
        await client.post('/auth/logout');
      } catch (error) {
        // API 요청이 실패하더라도 클라이언트 상태는 초기화하는 것이 사용자 경험에 좋습니다.
        console.error('Logout API call failed:', error);
      } finally {
        // API 호출 성공 여부와 관계없이 클라이언트의 인증 상태를 초기화합니다.
        set({ isLoggedIn: false, user: null }, false, 'auth/logout');
      }
    },
  }))
);
