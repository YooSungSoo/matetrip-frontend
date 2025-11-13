import { useState, useEffect } from 'react';
import type { WorkspaceMember } from '../types/member';
import { API_BASE_URL } from '../api/client.ts';

const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff; // 0-255
    const darkValue = Math.floor(value * 0.7); // 0-178 범위로 조정하여 어두운 색상 유도
    color += darkValue.toString(16).padStart(2, '0');
  }
  return color.toUpperCase();
};

interface UseWorkspaceMembersReturn {
  members: WorkspaceMember[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * 특정 워크스페이스의 멤버 목록을 가져오는 커스텀 훅
 * @param workspaceId - 워크스페이스 ID
 */
export function useWorkspaceMembers(
  workspaceId: string | null
): UseWorkspaceMembersReturn {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: API 주소를 환경 변수 등으로 관리하는 것을 권장합니다.
        const response = await fetch(
          `${API_BASE_URL}/posts/workspace/${workspaceId}/members`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch members: ${response.statusText}`);
        }

        const data: WorkspaceMember[] = await response.json();
        // 각 멤버에게 고유 색상을 할당합니다.
        const membersWithColor = data.map((member) => ({
          ...member,
          color: generateColorFromString(member.id),
        }));
        setMembers(membersWithColor);
      } catch (e) {
        setError(
          e instanceof Error ? e : new Error('An unknown error occurred')
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [workspaceId]);

  return { members, isLoading, error };
}
