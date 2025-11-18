import React from 'react';

interface Poi {
  id: string;
  workspaceId: string;
  createdBy: string;
  placeName?: string;
  longitude: number;
  latitude: number;
  address: string;
  status: string;
  sequence: number;
  isPersisted: boolean;
}

interface MarkerStorageProps {
  pois: Poi[];
}

const MarkerStorage: React.FC<MarkerStorageProps> = ({ pois }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <div
        onClick={toggleOpen}
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
        }}
      >
        <span>장소 보관함</span>
        <span>{isOpen ? '숨기기' : '보이기'}</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: '10px' }}>
          {pois.length > 0 ? (
            pois.map((poi) => (
              <div
                key={poi.id}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid #eee',
                  fontSize: '14px',
                }}
              >
                {poi.placeName}
              </div>
            ))
          ) : (
            <div style={{ color: '#888', fontSize: '14px' }}>
              보관된 장소가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarkerStorage;
