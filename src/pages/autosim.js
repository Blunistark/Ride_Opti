import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://myypzqhpbzoiwrpyxcrl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXB6cWhwYnpvaXdycHl4Y3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzYyMTQsImV4cCI6MjA1NjgxMjIxNH0.7p26u_p7WATcZlpR4JfOaZCOBZBcKoC0pyBlvnlVvK4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Heatmap layer component
const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      minOpacity: 0.5,
      gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);

    return () => map.removeLayer(heat);
  }, [points, map]);

  return null;
};

// Customer icon generator
const customerIcon = (status) => new L.Icon({
  iconUrl: `https://ucarecdn.com/457662cd-d8a8-4a7c-a427-ff3172f635ad/customer.png${
    status === 'waiting' ? 'blue' : 
    status === 'picked' ? 'green' : 
    'red'
  }.png`,
  iconSize: [25, 25],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://ucarecdn.com/12c704bf-2821-43ad-9817-1e274ef220fc/drivericon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function Map() {
  const [hotspots, setHotspots] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const { data: hotspots } = await supabase.from('hotspots').select('*');
      const { data: customers } = await supabase.from('customers').select('*');
      const { data: drivers } = await supabase.from('drivers').select('*');
      
      setHotspots(hotspots || []);
      setCustomers(customers || []);
      setDrivers(drivers || []);
    };
    fetchData();
  }, []);

  // Real-time customer updates
  useEffect(() => {
    const customerChannel = supabase
      .channel('customers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers',
      }, (payload) => {
        setCustomers(prev => {
          const existingIndex = prev.findIndex(c => c.id === payload.new.id);
          if (payload.eventType === 'DELETE') {
            return prev.filter(c => c.id !== payload.old.id);
          }
          if (existingIndex >= 0) {
            const newCustomers = [...prev];
            newCustomers[existingIndex] = payload.new;
            return newCustomers;
          }
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(customerChannel);
  }, []);

  // Driver simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setDrivers(prev => prev.map(driver => {
        const target = hotspots[Math.floor(Math.random() * hotspots.length)];
        const step = 0.0005;
        
        return {
          ...driver,
          latitude: driver.latitude + (target.latitude - driver.latitude) * step,
          longitude: driver.longitude + (target.longitude - driver.longitude) * step
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, hotspots]);

  // Prepare heatmap data
  const heatmapPoints = customers
    .filter(c => !c.picked_up && !c.dropped_off)
    .map(c => [c.latitude, c.longitude, 0.5]);

  return (
    <div className="map-container">
      <div className="controls">
        <button onClick={() => setIsSimulating(!isSimulating)}>
          {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        <button onClick={() => setShowHeatmap(!showHeatmap)}>
          {showHeatmap ? 'Show Customers' : 'Show Heatmap'}
        </button>
      </div>

      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

        {!showHeatmap && customers.map(customer => (
          <Marker
            key={`customer-${customer.id}`}
            position={[customer.latitude, customer.longitude]}
            icon={customerIcon(
              customer.dropped_off ? 'dropped' : 
              customer.picked_up ? 'picked' : 'waiting'
            )}
          >
            <Popup>
              <div className="customer-popup">
                <h3>{customer.name}</h3>
                <p>Status: {customer.dropped_off ? 'Dropped Off' : 
                  customer.picked_up ? 'Picked Up' : 'Waiting'}</p>
                <p>Destination: {customer.destination_latitude}, {customer.destination_longitude}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {drivers.map(driver => (
          <Marker
            key={`driver-${driver.id}`}
            position={[driver.latitude, driver.longitude]}
            icon={driverIcon}
          >
            <Popup>
              <h3>Driver {driver.id}</h3>
              <p>Status: {isSimulating ? 'Moving' : 'Idle'}</p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}