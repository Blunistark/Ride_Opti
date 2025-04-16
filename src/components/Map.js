import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://myypzqhpbzoiwrpyxcrl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXB6cWhwYnpvaXdycHl4Y3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzYyMTQsImV4cCI6MjA1NjgxMjIxNH0.7p26u_p7WATcZlpR4JfOaZCOBZBcKoC0pyBlvnlVvK4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OSRM_API_URL = "https://router.project-osrm.org/route/v1/driving/";

// Custom marker icon for auto drivers
const driverIcon = (imageUrl) => new L.Icon({
  iconUrl: imageUrl || 'https://ucarecdn.com/12c704bf-2821-43ad-9817-1e274ef220fc/drivericon.png', // Fallback image
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Custom marker icon for hotspots
const hotspotIcon = (imageUrl) => new L.Icon({
    iconUrl: imageUrl || 'https://ucarecdn.com/948e111f-e1e6-4846-9a39-b38059ab3340/hotspoticon2.png', // Fallback image
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

function Heatmap({ hotspots }) {
  const map = useMap();

  useEffect(() => {
    if (!hotspots || !Array.isArray(hotspots)) return;
    const heatData = hotspots.map(hotspot => [
      hotspot.latitude, 
      hotspot.longitude, 
      hotspot.density || 1
    ]);

    const heatLayer = L.heatLayer(heatData, { radius: 40, blur: 25, maxZoom: 17 }).addTo(map);
    return () => { map.removeLayer(heatLayer); };
  }, [hotspots, map]);

  return null;
}

export default function Map({ staticHotspots = [] }) {
  const [simulatedHotspots, setSimulatedHotspots] = useState([]);
  const [simulatedDrivers, setSimulatedDrivers] = useState([]);
  const [isSimulatingHotspots, setIsSimulatingHotspots] = useState(false);
  const [isSimulatingDrivers, setIsSimulatingDrivers] = useState(false);
  const [showDrivers, setShowDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase.from('drivers').select('*');
      if (!error) setSimulatedDrivers(data || []);
    };
    fetchDrivers();
  }, []);

  const generateDynamicHotspot = () => {
    return {
      id: `dynamic-${Date.now()}`,
      name: `Dynamic Hotspot ${simulatedHotspots.length + 1}`,
      latitude: 12.9 + Math.random() * 0.1,
      longitude: 77.6 + Math.random() * 0.1,
      density: Math.random() * 10,
      hotspot_type: "Dynamic",
    };
  };

  useEffect(() => {
    if (!isSimulatingHotspots) return;
    const interval = setInterval(() => {
      setSimulatedHotspots(prevHotspots => [
        ...prevHotspots,
        generateDynamicHotspot(),
      ]);
    }, 10000);
    return () => clearInterval(interval);
  }, [isSimulatingHotspots]);

  const fetchRoute = async (start, end) => {
    try {
      const response = await fetch(`${OSRM_API_URL}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await response.json();
      return data.routes[0]?.geometry.coordinates || [];
    } catch (error) {
      console.error("Error fetching route:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!isSimulatingDrivers) return;
  
    const moveInterval = setInterval(async () => {
      setSimulatedDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers)) return []; // Ensure it's always an array
  
        return prevDrivers.map((driver) => ({
          ...driver,
          latitude: driver.latitude + (Math.random() - 0.5) * 0.001, // Simulated movement
          longitude: driver.longitude + (Math.random() - 0.5) * 0.001,
        }));
      });
    }, 2000);
  
    return () => clearInterval(moveInterval);
  }, [isSimulatingDrivers]);
  

  return (
    <div>
      <button onClick={() => setIsSimulatingHotspots(!isSimulatingHotspots)}>
        {isSimulatingHotspots ? "Stop Hotspot Simulation" : "Start Hotspot Simulation"}
      </button>
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
        <Heatmap hotspots={[...(staticHotspots || []), ...simulatedHotspots]} />

        {[...(staticHotspots || []), ...simulatedHotspots].map((hotspot) => (
            <Marker 
            key={hotspot.id} 
            position={[hotspot.latitude, hotspot.longitude]}
            icon={hotspotIcon(hotspot.imageUrl)}  // Add icon prop here
          >            <Popup>
              <strong>Hotspot:</strong> {hotspot.name} <br />
              <strong>Type:</strong> {hotspot.hotspot_type} <br />
              <strong>Density:</strong> {hotspot.density?.toFixed(2)}
            </Popup>
          </Marker>
        ))}

        {showDrivers && Array.isArray(simulatedDrivers) ? simulatedDrivers.map((driver) => (
          <Marker 
            key={driver.id} 
            position={[driver.latitude, driver.longitude]} 
            icon={driverIcon(driver.imageUrl)}
          >
            <Popup>
              <strong>Auto Driver</strong> <br />
              ID: {driver.id} <br />
              Heading to: {driver.targetZone || "Unknown"}
            </Popup>
          </Marker>
        )) : null}
      </MapContainer>
    </div>
  );
}
