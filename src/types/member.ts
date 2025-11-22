import type { UserProfile } from './user';

/**
 * 워크스페이스 멤버 정보를 나타내는 타입입니다.
 * UserProfile을 확장하여 워크스페이스 관련 정보를 포함할 수 있습니다.
 */
export interface WorkspaceMember {
  id: string;
  email: string;
  profile: UserProfile;
}

/**
 * 현재 활성화된(접속 중인) 멤버 정보를 나타내는 타입입니다.
 * PlanRoomHeader 등에서 사용됩니다.
 */
export interface ActiveMember {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  profileId?: string;
  userId?: string;
}
