import React, { useState, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { CapaBitacora } from '../../types/data';

interface BitacoraPuntoProps {
  punto: CapaBitacora;
  onSelect: (info: any) => void;
  color?: string;
}

export const BitacoraPunto: React.FC<BitacoraPuntoProps> = ({ punto, onSelect, color = '#000000' }) => {
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
            background-color: ${color};
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
          minWidth: '320px',
          maxWidth: '400px',
          padding: '16px',
          fontFamily: 'var(--mantine-font-family)',
          lineHeight: '1.2',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          {/* Header con título y coordenadas */}
          <div style={{
            borderBottom: '2px solid var(--mantine-color-blue-6)',
            paddingBottom: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--mantine-color-blue-8)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📋 Registro Bitácora
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--mantine-color-gray-6)',
              fontFamily: 'monospace',
              backgroundColor: 'var(--mantine-color-gray-0)',
              padding: '4px 6px',
              borderRadius: '4px',
              border: '1px solid var(--mantine-color-gray-3)'
            }}>
              {punto.latitud.toFixed(6)}, {punto.longitud.toFixed(6)}
            </div>
          </div>

          {/* Contenido de datos */}
          <div style={{
            display: 'grid',
            gap: '4px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '3px 0',
              borderBottom: '1px solid var(--mantine-color-gray-2)'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--mantine-color-gray-8)',
                minWidth: '80px',
                marginRight: '12px'
              }}>
                Atestado:
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--mantine-color-gray-7)',
                textAlign: 'right',
                flex: '1',
                wordBreak: 'break-word',
                lineHeight: '1.3'
              }}>
                {punto.atestado}
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '3px 0',
              borderBottom: '1px solid var(--mantine-color-gray-2)'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--mantine-color-gray-8)',
                minWidth: '80px',
                marginRight: '12px'
              }}>
                Fecha:
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--mantine-color-gray-7)',
                textAlign: 'right',
                flex: '1',
                wordBreak: 'break-word',
                lineHeight: '1.3'
              }}>
                {new Date(punto.fecha).toLocaleString()}
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '3px 0',
              borderBottom: '1px solid var(--mantine-color-gray-2)'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--mantine-color-gray-8)',
                minWidth: '80px',
                marginRight: '12px'
              }}>
                Dirección:
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--mantine-color-gray-7)',
                wordBreak: 'break-word',
                lineHeight: '1.3',
                flex: '1'
              }}>
                {punto.direccion}
              </div>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}; 