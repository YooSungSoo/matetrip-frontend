import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  User,
  Users,
  Video,
  VideoOff,
  WifiOff,
} from 'lucide-react';
import {
  type Attendee,
  type AudioVideoFacade,
  type AudioVideoObserver,
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  type Meeting,
  MeetingSessionConfiguration,
  type VideoTileState,
  LogLevel,
} from 'amazon-chime-sdk-js';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';

// amazon-chime-sdk-js는 브라우저 환경에서 node의 global 객체를 기대하므로 안전하게 polyfill
if (typeof global === 'undefined' && typeof window !== 'undefined') {
  (window as unknown as { global: typeof window }).global = window;
}

interface Props {
  workspaceId: string;
  onClose: () => void;
  activeMembers?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}

interface JoinResponse {
  meeting: Meeting;
  attendee: Attendee;
}

type MeetingStatus = 'idle' | 'joining' | 'joined' | 'error';

interface TileInfo {
  tileId: number;
  attendeeId: string;
  name: string;
  externalUserId?: string;
  isLocal: boolean;
  isVideoActive: boolean;
}

export const VideoChat = ({
  workspaceId: initialWorkspaceId,
  onClose,
  activeMembers = [],
}: Props) => {
  const { user } = useAuthStore();

  const workspaceId = initialWorkspaceId || '';
  const userId = user?.userId ?? '';
  const username = user?.profile.nickname ?? '';
  const [status, setStatus] = useState<MeetingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isOverlayCollapsed, setIsOverlayCollapsed] = useState(false);

  const audioVideoRef = useRef<AudioVideoFacade | null>(null);
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const videoElementRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const observerRef = useRef<AudioVideoObserver | null>(null);
  const attendeePresenceHandlerRef =
    useRef<
      | ((
          attendeeId: string,
          present: boolean,
          externalUserId?: string,
          dropped?: boolean
        ) => void)
      | null
    >(null);
  const attendeeNamesRef = useRef<Record<string, string>>({});

  const localDisplayName = useMemo(
    () => username?.trim() || 'Me',
    [username]
  );

  const resetSessionState = useCallback(() => {
    setIsMicMuted(true);
    setIsCameraOn(false);
    setTiles([]);
    setParticipantCount(0);
    attendeeNamesRef.current = {};
  }, []);

  const cleanupMeeting = useCallback(() => {
    const audioVideo = audioVideoRef.current;

    if (audioVideo) {
      if (attendeePresenceHandlerRef.current) {
        audioVideo.realtimeUnsubscribeToAttendeeIdPresence(
          attendeePresenceHandlerRef.current
        );
      }
      if (observerRef.current) {
        audioVideo.removeObserver(observerRef.current);
      }
      audioVideo.stopLocalVideoTile();
      audioVideo.stop();
    }

    audioVideoRef.current = null;
    meetingSessionRef.current = null;
    observerRef.current = null;
    attendeePresenceHandlerRef.current = null;
    resetSessionState();
  }, [resetSessionState]);

  useEffect(() => cleanupMeeting, [cleanupMeeting]);

  const bindVideoElement = useCallback((tileId: number, el: HTMLVideoElement | null) => {
    videoElementRefs.current[tileId] = el;
    if (audioVideoRef.current && el) {
      audioVideoRef.current.bindVideoElement(tileId, el);
    }
  }, []);

  const updateParticipantCount = useCallback((names: Record<string, string>) => {
    const uniqueIds = Object.keys(names);
    setParticipantCount(uniqueIds.length);
  }, []);

  const handleJoin = async () => {
    if (!workspaceId || !userId) {
      setErrorMessage('workspaceId와 userId는 필수입니다.');
      setStatus('error');
      return;
    }

    setStatus('joining');
    setErrorMessage(null);
    cleanupMeeting();

    try {
      const { data } = await client.post<JoinResponse>(
        `/workspace/${workspaceId}/chime/join`,
        {
          userId,
          username: username?.trim() || undefined,
        }
      );

      const logger = new ConsoleLogger('ChimeMeeting', LogLevel.WARN);
      const deviceController = new DefaultDeviceController(logger);
      const configuration = new MeetingSessionConfiguration(
        data.meeting,
        data.attendee
      );
      const meetingSession = new DefaultMeetingSession(
        configuration,
        logger,
        deviceController
      );
      meetingSessionRef.current = meetingSession;

      const audioVideo = meetingSession.audioVideo;
      audioVideoRef.current = audioVideo;

      const audioInputs = await audioVideo.listAudioInputDevices();
      if (audioInputs.length > 0) {
        await audioVideo.startAudioInput(audioInputs[0].deviceId);
      }

      const videoInputs = await audioVideo.listVideoInputDevices();
      if (videoInputs.length > 0) {
        await audioVideo.startVideoInput(videoInputs[0].deviceId);
      }

      const observer: AudioVideoObserver = {
        audioVideoDidStart: () => setStatus('joined'),
        videoTileDidUpdate: (tileState: VideoTileState) => {
          if (!tileState.boundAttendeeId || tileState.isContent) return;

          const isLocal =
            tileState.boundAttendeeId ===
            meetingSession.configuration.credentials.attendeeId;
          const name = resolveParticipantName(
            tileState.boundAttendeeId,
            tileState.boundExternalUserId,
            isLocal
          );
          const isVideoActive = !!tileState.active && !tileState.paused;

          if (!isLocal) {
            attendeeNamesRef.current[tileState.boundAttendeeId] = name;
            updateParticipantCount(attendeeNamesRef.current);
          }

          setTiles((prev) => {
            const others = prev.filter((t) => t.tileId !== tileState.tileId);
            return [
              ...others,
              {
                tileId: tileState.tileId,
                attendeeId: tileState.boundAttendeeId,
                name,
                externalUserId: tileState.boundExternalUserId || undefined,
                isLocal,
                isVideoActive,
              },
            ];
          });

          const videoEl = videoElementRefs.current[tileState.tileId];
          if (videoEl) {
            audioVideo.bindVideoElement(tileState.tileId, videoEl);
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          setTiles((prev) => prev.filter((t) => t.tileId !== tileId));
        },
        audioVideoDidStop: () => {
          setStatus('idle');
          cleanupMeeting();
        },
      };

      observerRef.current = observer;
      audioVideo.addObserver(observer);

      attendeeNamesRef.current[data.attendee.attendeeId] = localDisplayName;
      updateParticipantCount(attendeeNamesRef.current);

      const presenceHandler = (
        attendeeId: string,
        present: boolean,
        externalUserId?: string
      ) => {
      const externalMatch =
        nameFromExternal(externalUserId) ||
        activeMemberNameMap[attendeeId] ||
        activeMemberNameMap[attendeeId.toLowerCase()];

        attendeeNamesRef.current = {
          ...attendeeNamesRef.current,
          ...(present
            ? {
                [attendeeId]: resolveParticipantName(
                  attendeeId,
                  externalUserId || externalMatch || undefined,
                  attendeeId === meetingSession.configuration.credentials.attendeeId
                ),
              }
            : {}),
        };

        if (!present) {
          const { [attendeeId]: _, ...rest } = attendeeNamesRef.current;
          attendeeNamesRef.current = rest;
        }

        updateParticipantCount(attendeeNamesRef.current);
      };

      attendeePresenceHandlerRef.current = presenceHandler;
      audioVideo.realtimeSubscribeToAttendeeIdPresence(presenceHandler);

      if (audioElementRef.current) {
        audioVideo.bindAudioElement(audioElementRef.current);
      }

      audioVideo.start();
      audioVideo.realtimeMuteLocalAudio();
      setIsMicMuted(true);
      setIsCameraOn(false);
    } catch (error: any) {
      console.error('Amazon Chime 회의 접속 실패:', error);
      setStatus('error');
      setErrorMessage(
        error?.response?.data?.message ||
          '회의 연결에 실패했습니다. 입력값을 확인하고 다시 시도해주세요.'
      );
      cleanupMeeting();
      onClose();
    }
  };

  const handleLeave = useCallback(() => {
    cleanupMeeting();
    setStatus('idle');
    onClose();
  }, [cleanupMeeting, onClose]);

  const toggleMic = () => {
    if (!audioVideoRef.current) return;
    const audioVideo = audioVideoRef.current;
    if (isMicMuted) {
      const success = audioVideo.realtimeUnmuteLocalAudio();
      if (success) setIsMicMuted(false);
    } else {
      const success = audioVideo.realtimeMuteLocalAudio();
      if (success) setIsMicMuted(true);
    }
  };

  const toggleCamera = async () => {
    if (!audioVideoRef.current) return;
    const audioVideo = audioVideoRef.current;
    if (isCameraOn) {
      await audioVideo.stopVideoInput();
      audioVideo.stopLocalVideoTile();
      setIsCameraOn(false);
      return;
    }

    const videoInputs = await audioVideo.listVideoInputDevices();
    if (videoInputs.length === 0) {
      setErrorMessage('사용 가능한 카메라가 없습니다.');
      setStatus('error');
      return;
    }

    await audioVideo.startVideoInput(videoInputs[0].deviceId);
    audioVideo.startLocalVideoTile();
    setIsCameraOn(true);
  };

  const activeMemberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    const addKey = (key?: string, name?: string) => {
      if (!key || !name) return;
      map[key] = name;
      map[key.toLowerCase()] = name;
    };

    activeMembers.forEach((member) => {
      addKey(member.id, member.name);
      addKey(member.userId, member.name);
      addKey(member.profileId, member.name);
      addKey(member.email, member.name);
      addKey(member.name, member.name);
    });
    return map;
  }, [activeMembers]);

  const isUuid = useCallback((value?: string) => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    );
  }, []);

  const nameFromExternal = useCallback(
    (externalUserId?: string) => {
      if (!externalUserId) return null;
      const trimmed = externalUserId.trim();
      const byId = activeMemberNameMap[trimmed] || activeMemberNameMap[trimmed.toLowerCase()];
      if (byId) return byId;
      if (!isUuid(trimmed)) return trimmed;
      return null;
    },
    [activeMemberNameMap, isUuid]
  );

  const resolveParticipantName = useCallback(
    (
      attendeeId: string,
      externalUserId: string | undefined,
      isLocal: boolean
    ) => {
      if (isLocal) return localDisplayName;

      const extName = nameFromExternal(externalUserId);
      if (extName) return extName;

      const mappedByAttendeeId =
        activeMemberNameMap[attendeeId] ||
        activeMemberNameMap[attendeeId.toLowerCase()];
      if (mappedByAttendeeId) return mappedByAttendeeId;

      const stored = attendeeNamesRef.current[attendeeId];
      if (stored && !isUuid(stored)) return stored;

      if (externalUserId && !isUuid(externalUserId)) return externalUserId.trim();

      return '참가자';
    },
    [activeMemberNameMap, isUuid, localDisplayName, nameFromExternal]
  );

  const isBusy = status === 'joining';
  const overlayRoot =
    typeof document !== 'undefined'
      ? document.getElementById('map-video-overlay-root')
      : null;

  useEffect(() => {
    if (tiles.length === 0) return;

    let changed = false;
    const updated = tiles.map((tile) => {
      const newName = resolveParticipantName(
        tile.attendeeId,
        tile.externalUserId,
        tile.isLocal
      );
      if (newName !== tile.name) {
        attendeeNamesRef.current[tile.attendeeId] = newName;
        changed = true;
        return { ...tile, name: newName };
      }
      return tile;
    });

    if (changed) {
      setTiles(updated);
      updateParticipantCount(attendeeNamesRef.current);
    }
  }, [activeMembers, tiles, resolveParticipantName, updateParticipantCount]);

  const renderVideoTiles = () => {
    if (tiles.length === 0) {
      return (
        <div className="col-span-1 flex aspect-video w-full max-h-[220px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500">
          {status === 'joining' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <WifiOff className="h-6 w-6" />
          )}
          <p className="text-sm text-gray-600">
            회의에 접속하면 영상 타일이 나타납니다.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 max-h-[440px] overflow-y-auto">
        {tiles.map((tile) => (
          <div
            key={tile.tileId}
            className="relative flex aspect-video w-full min-h-[160px] max-h-[220px] overflow-hidden rounded-md bg-gray-900 text-white shadow-inner"
          >
            <video
              ref={(el) => bindVideoElement(tile.tileId, el)}
              className={`h-full w-full object-cover ${
                tile.isLocal
                  ? !isCameraOn
                    ? 'hidden'
                    : ''
                  : !tile.isVideoActive
                    ? 'hidden'
                    : ''
              }`}
              autoPlay
              playsInline
              muted={tile.isLocal}
            />
            {((tile.isLocal && !isCameraOn) ||
              (!tile.isLocal && !tile.isVideoActive)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <User className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/40 px-3 py-2 text-xs">
              <span className="truncate text-white">{tile.name}</span>
              <Badge
                variant={tile.isLocal ? 'secondary' : 'default'}
                className="flex items-center gap-1 border-none bg-white/20 text-white"
              >
                {tile.isLocal ? '나' : '참가자'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const overlayContent =
    overlayRoot && (status === 'joining' || status === 'joined')
      ? createPortal(
          <div className="pointer-events-auto w-[320px] max-w-[88vw] mt-14">
            <div className="mb-1 flex justify-end">
              {isOverlayCollapsed && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full bg-gray-900 text-white hover:bg-gray-800"
                  onClick={() => setIsOverlayCollapsed(false)}
                >
                  <Video className="h-4 w-4 mr-2" />
                  영상 다시 보기
                </Button>
              )}
            </div>
            <div
              className={`overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-lg backdrop-blur ${
                isOverlayCollapsed ? 'hidden' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 bg-gray-900 px-3 py-2 text-white">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span className="text-sm font-semibold">화상 통화</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    참가자 {participantCount}명
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-white/80 hover:bg-white/10"
                    onClick={() => setIsOverlayCollapsed(true)}
                  >
                    접기
                  </Button>
                </div>
              </div>
              <div className="bg-gray-50 p-2">{renderVideoTiles()}</div>
            </div>
          </div>,
          overlayRoot
        )
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-row gap-2 md:w-auto md:min-w-[160px] md:flex-nowrap">
            <Button
              onClick={handleJoin}
              disabled={isBusy}
              className="flex-1 md:w-32"
            >
              {isBusy ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  접속 중...
                </span>
              ) : (
                '회의 접속'
              )}
            </Button>
            <Button
              onClick={handleLeave}
              variant="secondary"
              className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 md:w-28"
            >
              종료
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={status === 'joined' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            <Users className="h-4 w-4" />
            <span>참가자 {participantCount}명</span>
          </Badge>
          {status === 'joining' && (
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              연결 중입니다...
            </span>
          )}
          {status === 'joined' && (
            <span className="flex items-center gap-2 text-sm text-green-700">
              <Video className="h-4 w-4" />
              Amazon Chime에 연결됨
            </span>
          )}
          {status === 'error' && errorMessage && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="flex-1">{errorMessage}</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 hover:bg-red-100"
                onClick={handleJoin}
              >
                재시도
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {overlayRoot ? (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-gray-500" />
            <span>영상은 지도 오른쪽 상단 레이어에서 표시됩니다.</span>
          </div>
        ) : (
          renderVideoTiles()
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="icon"
          variant={isMicMuted ? 'destructive' : 'secondary'}
          onClick={toggleMic}
          disabled={status !== 'joined'}
          className="h-10 w-10 rounded-full"
        >
          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button
          size="icon"
          variant={isCameraOn ? 'secondary' : 'destructive'}
          onClick={toggleCamera}
          disabled={status !== 'joined'}
          className="h-10 w-10 rounded-full"
        >
          {isCameraOn ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex items-center gap-2 text-gray-600 hover:bg-gray-100"
          onClick={handleJoin}
          disabled={isBusy}
        >
          <RefreshCw className="h-4 w-4" />
          재접속
        </Button>
      </div>
      <audio ref={audioElementRef} className="hidden" />
      {overlayContent}
    </div>
  );
};
