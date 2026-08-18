import {
  AlertTriangle,
  Droplets,
  Lightbulb,
  Construction,
  Trash2,
  ShieldAlert,
} from "lucide-react";

const civicIssues = [
  {
    icon: AlertTriangle,
    label: "Pothole reported",
    className: "civic-pothole",
  },
  {
    icon: Droplets,
    label: "Water leak",
    className: "civic-water",
  },
  {
    icon: Lightbulb,
    label: "Streetlight fault",
    className: "civic-light",
  },
  {
    icon: Construction,
    label: "Road damage",
    className: "civic-road",
  },
  {
    icon: Trash2,
    label: "Waste hotspot",
    className: "civic-waste",
  },
  {
    icon: ShieldAlert,
    label: "Public safety",
    className: "civic-safety",
  },
];

function CivicMarker({ issue, index }) {
  const Icon = issue.icon;

  return (
    <div
      className={`civic-marker ${issue.className}`}
      style={{
        "--marker-delay": `${index * 0.8}s`,
      }}
    >
      <span className="civic-marker-pulse" />

      <span className="civic-marker-icon">
        <Icon size={15} strokeWidth={2} />
      </span>

      <span className="civic-marker-label">{issue.label}</span>
    </div>
  );
}

export default function CivicCity() {
  return (
    <div className="civic-city" aria-hidden="true">
      {/* =================================================
          CITY IMAGERY
         ================================================= */}

      <div className="civic-photo civic-photo-one" />
      <div className="civic-photo civic-photo-two" />
      <div className="civic-photo civic-photo-three" />

      <div className="civic-photo-shade" />

      {/* =================================================
          BENGALURU LIVE ROAD MAP
         ================================================= */}

      <div className="civic-map">
        <iframe
          title="Bengaluru civic road map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=77.53%2C12.93%2C77.67%2C13.05&layer=mapnik&marker=12.9716%2C77.5946"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="civic-map-wash" />

      {/* =================================================
          INFRASTRUCTURE GRID
         ================================================= */}

      <div className="civic-grid-glow" />

      {/* =================================================
          LIVE CIVIC ACTIVITY
         ================================================= */}

      <div className="civic-live-feed">
        <div className="civic-live-header">
          <span className="live-pulse" />
          <strong>LIVE CIVIC PULSE</strong>
        </div>

        <div className="civic-feed-item">
          <span className="feed-dot" />
          <span>pothole detected</span>
        </div>

        <div className="civic-feed-item">
          <span className="feed-dot" />
          <span>water leak reported</span>
        </div>

        <div className="civic-feed-item">
          <span className="feed-dot" />
          <span>streetlight fault</span>
        </div>

        <div className="civic-feed-item">
          <span className="feed-dot" />
          <span>road repair in action</span>
        </div>
      </div>

      {/* =================================================
          ROAD ROUTES
         ================================================= */}

      <div className="civic-route route-one" />
      <div className="civic-route route-two" />
      <div className="civic-route route-three" />

      {/* =================================================
          MOVING VEHICLES
         ================================================= */}

      <div className="civic-car car-one">
        <span />
      </div>

      <div className="civic-car car-two">
        <span />
      </div>

      <div className="civic-car car-three">
        <span />
      </div>

      {/* =================================================
          CIVIC ISSUE MARKERS
         ================================================= */}

      {civicIssues.map((issue, index) => (
        <CivicMarker
          key={issue.label}
          issue={issue}
          index={index}
        />
      ))}

      {/* =================================================
          MAP ATTRIBUTION
         ================================================= */}

      <div className="civic-attribution">
        Bengaluru road map · OpenStreetMap · civic imagery via Wikimedia Commons
      </div>
    </div>
  );
}