import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://myypzqhpbzoiwrpyxcrl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXB6cWhwYnpvaXdycHl4Y3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzYyMTQsImV4cCI6MjA1NjgxMjIxNH0.7p26u_p7WATcZlpR4JfOaZCOBZBcKoC0pyBlvnlVvK4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const driverIcon = (imageUrl) => new L.Icon({
  iconUrl: imageUrl || 'https://ucarecdn.com/12c704bf-2821-43ad-9817-1e274ef220fc/drivericon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const hotspotIcons = {
  Static: new L.Icon({
    iconUrl: 'https://ucarecdn.com/948e111f-e1e6-4846-9a39-b38059ab3340/hotspoticon2.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }),
  Dynamic: new L.Icon({
    iconUrl: 'https://ucarecdn.com/948e111f-e1e6-4846-9a39-b38059ab3340/hotspoticon2.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
};

export default function Map() {
  const [hotspots, setHotspots] = useState([]);
  const [simulatedDrivers, setSimulatedDrivers] = useState([]);
  const [isSimulatingDrivers, setIsSimulatingDrivers] = useState(false);
  const [showDrivers, setShowDrivers] = useState(true);

  useEffect(() => {
    const fetchHotspots = async () => {
      const { data, error } = await supabase.from('hotspots').select('*');
      if (!error) setHotspots(data || []);
    };
    fetchHotspots();
  }, []);

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase.from('drivers').select('*');
      if (!error) setSimulatedDrivers(data || []);
    };
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (!isSimulatingDrivers) return;
    const moveInterval = setInterval(() => {
      setSimulatedDrivers(prev => prev.map(driver => ({
        ...driver,
        latitude: driver.latitude + (Math.random() - 0.5) * 0.001,
        longitude: driver.longitude + (Math.random() - 0.5) * 0.001,
      })));
    }, 2000);
    return () => clearInterval(moveInterval);
  }, [isSimulatingDrivers]);

  return (
    <div>
      <button onClick={() => setIsSimulatingDrivers(!isSimulatingDrivers)}>
        {isSimulatingDrivers ? "Stop Auto Driver Simulation" : "Start Auto Driver Simulation"}
      </button>
      <button onClick={() => setShowDrivers(!showDrivers)}>
        {showDrivers ? "Hide Auto Drivers" : "Show Auto Drivers"}
      </button>

      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {hotspots.map(hotspot => (
          <Marker key={hotspot.id} position={[hotspot.latitude, hotspot.longitude]} 
            icon={hotspotIcons[hotspot.hotspot_type] || hotspotIcons.Static}>
            <Popup>
              <strong>{hotspot.name}</strong> <br />
              Type: {hotspot.hotspot_type} <br />
              Density: {hotspot.density?.toFixed(2)}
            </Popup>
          </Marker>
        ))}

        {showDrivers && Array.isArray(simulatedDrivers) && simulatedDrivers.map(driver => (
          <Marker key={driver.id} position={[driver.latitude, driver.longitude]} icon={driverIcon(driver.imageUrl)}>
            <Popup>
              <strong>Auto Driver</strong> <br />
              ID: {driver.id} <br />
              Heading to: {driver.targetZone || "Unknown"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
