import { MapContainer, TileLayer, Marker, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerData, HeatmapPoint } from '../types';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapWrapperProps {
  markers?: MarkerData[];
  geoJsonLayer?: GeoJSON.FeatureCollection;
  heatmapData?: HeatmapPoint[];
  center?: LatLngExpression;
  zoom?: number;
  height?: string;
  /** When set, renders colored CircleMarkers instead of pin icons */
  markerColor?: string;
}

/**
 * Reusable Leaflet map component centered on San Diego
 */
export function MapWrapper({
  markers = [],
  geoJsonLayer,
  heatmapData: _heatmapData = [],
  center = [32.7157, -117.1611],
  zoom = 10,
  height = '500px',
  markerColor,
}: MapWrapperProps) {
  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker, idx) =>
          markerColor ? (
            <CircleMarker
              key={idx}
              center={[marker.lat, marker.lng]}
              radius={5}
              pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.55, weight: 1 }}
            >
              {marker.popup && <Popup>{marker.popup}</Popup>}
            </CircleMarker>
          ) : (
            <Marker key={idx} position={[marker.lat, marker.lng]}>
              {marker.popup && <Popup>{marker.popup}</Popup>}
            </Marker>
          )
        )}

        {geoJsonLayer && <GeoJSON data={geoJsonLayer} />}
      </MapContainer>
    </div>
  );
}
