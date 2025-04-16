import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

const supabase = createClient(
  "https://myypzqhpbzoiwrpyxcrl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXB6cWhwYnpvaXdycHl4Y3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzYyMTQsImV4cCI6MjA1NjgxMjIxNH0.7p26u_p7WATcZlpR4JfOaZCOBZBcKoC0pyBlvnlVvK4"
);

export default function Home() {
  const [hotspots, setHotspots] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showDrivers, setShowDrivers] = useState(true);

  useEffect(() => {
    const fetchHotspots = async () => {
      let { data } = await supabase.from('hotspots').select('*');
      setHotspots(data || []);
    };
    
    const fetchDrivers = async () => {
      let { data } = await supabase.from('drivers').select('*');
      setDrivers(data || []);
    };

    fetchHotspots();
    fetchDrivers();

    // Subscribe to real-time updates
    const hotspotSubscription = supabase
      .channel('hotspots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspots' }, fetchHotspots)
      .subscribe();
    
    const driverSubscription = supabase
      .channel('drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchDrivers)
      .subscribe();

    return () => {
      supabase.removeChannel(hotspotSubscription);
      supabase.removeChannel(driverSubscription);
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-center my-4">Hotspot Simulation</h1>
      <button 
        onClick={() => setShowDrivers(!showDrivers)}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-4">
        {showDrivers ? 'Hide' : 'Show'} Drivers
      </button>
      <Map hotspots={hotspots} drivers={showDrivers ? drivers : []} />
    </div>
  );
}
