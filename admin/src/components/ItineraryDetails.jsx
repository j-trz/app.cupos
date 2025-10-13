import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


export default function ItineraryDetails() {
  const [itinerary, setItinerary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch itinerary details from API
    const fetchItinerary = async () => {
      try {
        const response = await fetch("/api/itinerary");
        const data = await response.json();
        setItinerary(data);
      } catch (error) {
        console.error("Error fetching itinerary:", error);
      }
    };

    fetchItinerary();
  }, []);

  if (!itinerary) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Itinerary Details</h2>
      <pre>{JSON.stringify(itinerary, null, 2)}</pre>
    </div>
  );
}