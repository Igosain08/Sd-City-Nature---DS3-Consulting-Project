import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MarkerData, HeatmapPoint } from '../types';

// Fix for default marker icon issue in react-leaflet
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
}

/**
 * Reusable Leaflet map component centered on San Diego
 */
export function MapWrapper({
  markers = [],
  geoJsonLayer,
  heatmapData: _heatmapData = [],
  center = [32.7157, -117.1611], // San Diego
  zoom = 10,
  height = '500px',
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

        {/* Render markers */}
        {markers.map((marker, idx) => (
          <Marker key={idx} position={[marker.lat, marker.lng]}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        ))}

        {/* Render GeoJSON layer */}
        {geoJsonLayer && <GeoJSON data={geoJsonLayer} />}

        {/* TODO: Add heatmap layer support if needed */}
      </MapContainer>
    </div>
  );
}
