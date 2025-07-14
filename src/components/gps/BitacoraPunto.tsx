import React, { useState, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { CapaBitacora } from '../../types/data';

interface BitacoraPuntoProps {
  punto: CapaBitacora;
  onSelect: (info: any) => void;
}

export const BitacoraPunto: React.FC<BitacoraPuntoProps> = ({ punto, onSelect }) => {
  const [popupRef, setPopupRef] = useState<L.Popup | null>(null);

  const handleClick = () => {
    const info = {
      info: {
        ...punto,
        Coordenada_Y: punto.latitud,
        Coordenada_X: punto.longitud,
        Fecha_y_Hora: punto.fecha,
        Atestado: punto.atestado,
        Direccion: punto.direccion,
        tipo: 'bitacora'
      },
      isLocalizacion: false
    };
    onSelect(info);
    if (popupRef) {
      popupRef.openPopup();
    }
  };

  return (
    <Marker
      position={[punto.latitud, punto.longitud]}
      icon={L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #000000;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%);
            position: relative;
          "></div>
        `,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      })}
      zIndexOffset={2000}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup
        ref={(r: L.Popup) => setPopupRef(r)}
        closeButton={true}
        autoClose={false}
        closeOnClick={false}
      >
        <div style={{ 
          padding: '10px',
          minWidth: '200px'
        }}>
          <div style={{ 
            marginBottom: '8px',
            display: 'flex',
            gap: '8px'
          }}>
            <strong>Atestado:</strong> 
            <span>{punto.atestado}</span>
          </div>
          <div style={{ 
            marginBottom: '8px',
            display: 'flex',
            gap: '8px'
          }}>
            <strong>Fecha:</strong> 
            <span>{new Date(punto.fecha).toLocaleString()}</span>
          </div>
          <div style={{ 
            display: 'flex',
            gap: '8px'
          }}>
            <strong>Dirección:</strong> 
            <span>{punto.direccion}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}; 