import React from "react";

export default function CitizenAnimatedBackground() {
  return (
    <div className="citizen-bg-canvas" aria-hidden="true">
      {/* Dynamic Sky and Ambient Clouds */}
      <div className="citizen-bg-sky">
        <div className="citizen-bg-cloud cloud-1" />
        <div className="citizen-bg-cloud cloud-2" />
        <div className="citizen-bg-cloud cloud-3" />
        <div className="citizen-bg-bird bird-1">
          <svg viewBox="0 0 24 14" width="24" height="14">
            <path d="M0,7 Q6,0 12,7 Q18,0 24,7" fill="none" stroke="rgba(16, 185, 129, 0.45)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="citizen-bg-bird bird-2">
          <svg viewBox="0 0 24 14" width="20" height="12">
            <path d="M0,7 Q6,0 12,7 Q18,0 24,7" fill="none" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Distant Civic Horizon & Municipal Buildings */}
      <div className="citizen-bg-skyline">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="skyline-svg">
          {/* Civic Hall & Clock Tower */}
          <rect x="180" y="70" width="80" height="150" rx="4" fill="#d3e3db" opacity="0.45" />
          <polygon points="180,70 220,20 260,70" fill="#a4c6b8" opacity="0.5" />
          <circle cx="220" cy="55" r="10" fill="#ffffff" opacity="0.8" />
          <line x1="220" y1="55" x2="220" y2="48" stroke="#1b4d3e" strokeWidth="2" />
          <line x1="220" y1="55" x2="226" y2="55" stroke="#1b4d3e" strokeWidth="2" />

          {/* Municipal Office Buildings */}
          <rect x="300" y="90" width="110" height="130" rx="3" fill="#cbdcd4" opacity="0.4" />
          <rect x="320" y="110" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />
          <rect x="350" y="110" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />
          <rect x="380" y="110" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />
          <rect x="320" y="145" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />
          <rect x="350" y="145" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />
          <rect x="380" y="145" width="18" height="22" rx="2" fill="#ffffff" opacity="0.6" />

          {/* Emergency Civic Hospital */}
          <rect x="680" y="100" width="90" height="120" rx="3" fill="#d5e5dc" opacity="0.45" />
          <path d="M725,120 v20 M715,130 h20" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" opacity="0.75" />

          {/* Residential & Green Flats */}
          <rect x="820" y="80" width="120" height="140" rx="3" fill="#c7dcd1" opacity="0.4" />
          <rect x="1000" y="110" width="75" height="110" rx="3" fill="#d2e3da" opacity="0.4" />
          <polygon points="1000,110 1037,70 1075,110" fill="#9dbfb1" opacity="0.48" />

          {/* Civic Water Tower */}
          <rect x="1140" y="110" width="12" height="110" fill="#9dbbb0" opacity="0.5" />
          <rect x="1165" y="110" width="12" height="110" fill="#9dbbb0" opacity="0.5" />
          <ellipse cx="1158" cy="100" rx="36" ry="24" fill="#6ba793" opacity="0.5" />
          <rect x="1130" y="96" width="56" height="8" rx="2" fill="#4d8c77" opacity="0.6" />
        </svg>
      </div>

      {/* Electric Poles with Power Wires & Birds */}
      <div className="citizen-bg-utility-grid">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="utility-svg">
          <path d="M120,40 Q450,110 780,45" fill="none" stroke="#688b7e" strokeWidth="1.2" opacity="0.38" />
          <path d="M120,55 Q450,125 780,60" fill="none" stroke="#688b7e" strokeWidth="1.2" opacity="0.38" />
          <path d="M780,45 Q1110,115 1400,38" fill="none" stroke="#688b7e" strokeWidth="1.2" opacity="0.38" />
          <path d="M780,60 Q1110,130 1400,53" fill="none" stroke="#688b7e" strokeWidth="1.2" opacity="0.38" />

          {/* Electric Utility Poles */}
          <g className="utility-pole" transform="translate(120, 20)">
            <rect x="-4" y="0" width="8" height="160" fill="#58796c" opacity="0.65" />
            <rect x="-24" y="20" width="48" height="5" rx="1" fill="#476559" opacity="0.75" />
            <rect x="-20" y="35" width="40" height="4" rx="1" fill="#476559" opacity="0.75" />
            <circle cx="-20" cy="18" r="3" fill="#cbd5e1" />
            <circle cx="20" cy="18" r="3" fill="#cbd5e1" />
          </g>

          <g className="utility-pole" transform="translate(780, 25)">
            <rect x="-4" y="0" width="8" height="155" fill="#58796c" opacity="0.65" />
            <rect x="-24" y="20" width="48" height="5" rx="1" fill="#476559" opacity="0.75" />
            <rect x="-20" y="35" width="40" height="4" rx="1" fill="#476559" opacity="0.75" />
            <circle cx="-20" cy="18" r="3" fill="#cbd5e1" />
            <circle cx="20" cy="18" r="3" fill="#cbd5e1" />
            {/* Cute Sitting Birds on Wire */}
            <circle cx="90" cy="62" r="3.5" fill="#1b4d3e" opacity="0.75" className="wire-bird" />
            <polygon points="93,61 97,63 93,64" fill="#eab308" opacity="0.85" />
            <circle cx="102" cy="64" r="3" fill="#1b4d3e" opacity="0.75" className="wire-bird" />
          </g>

          <g className="utility-pole" transform="translate(1400, 18)">
            <rect x="-4" y="0" width="8" height="162" fill="#58796c" opacity="0.65" />
            <rect x="-24" y="20" width="48" height="5" rx="1" fill="#476559" opacity="0.75" />
          </g>
        </svg>
      </div>

      {/* Main Ground, Trees, Park & Civic Sightings */}
      <div className="citizen-bg-ground-scenery">
        {/* Public Park Trees & Greenery */}
        <div className="scenery-item tree tree-1">
          <svg viewBox="0 0 100 130" width="85" height="110">
            <rect x="44" y="65" width="12" height="65" rx="3" fill="#6d4c41" />
            <ellipse cx="50" cy="48" rx="38" ry="42" fill="#2e7d32" opacity="0.88" />
            <ellipse cx="38" cy="38" rx="26" ry="28" fill="#388e3c" opacity="0.92" />
            <ellipse cx="62" cy="42" rx="24" ry="26" fill="#4caf50" opacity="0.85" />
          </svg>
        </div>

        <div className="scenery-item tree tree-2">
          <svg viewBox="0 0 80 120" width="70" height="105">
            <rect x="35" y="60" width="10" height="60" rx="3" fill="#5d4037" />
            <circle cx="40" cy="40" r="34" fill="#2d6a4f" opacity="0.88" />
            <circle cx="30" cy="32" r="22" fill="#40916c" opacity="0.92" />
            <circle cx="50" cy="35" r="20" fill="#52b788" opacity="0.85" />
          </svg>
        </div>

        <div className="scenery-item tree tree-3">
          <svg viewBox="0 0 70 100" width="60" height="85">
            <rect x="31" y="45" width="8" height="55" rx="2" fill="#6d4c41" />
            <polygon points="35,10 5,60 65,60" fill="#1b4332" opacity="0.88" />
            <polygon points="35,25 12,65 58,65" fill="#2d6a4f" opacity="0.92" />
          </svg>
        </div>

        {/* Public Street Light with Glowing Night Beam */}
        <div className="scenery-item street-lamp lamp-1">
          <svg viewBox="0 0 60 150" width="50" height="125">
            <path d="M25,150 L25,30 Q25,12 40,12 L45,12" fill="none" stroke="#264653" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M38,12 L52,18 L34,18 Z" fill="#264653" />
            <ellipse cx="43" cy="20" rx="7" ry="3" fill="#fef08a" className="lamp-glow-bulb" />
            <polygon points="36,22 10,150 76,150 50,22" fill="url(#lampLightGradient)" opacity="0.32" className="lamp-light-cone" />
            <defs>
              <linearGradient id="lampLightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Water Pipeline with Animated Leaking Droplets */}
        <div className="scenery-item water-pipeline">
          <svg viewBox="0 0 130 90" width="115" height="80">
            <rect x="0" y="48" width="130" height="18" rx="4" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
            <rect x="35" y="44" width="8" height="26" rx="2" fill="#0369a1" />
            <rect x="85" y="44" width="8" height="26" rx="2" fill="#0369a1" />
            <rect x="58" y="32" width="6" height="16" fill="#334155" />
            <circle cx="61" cy="28" r="9" fill="none" stroke="#ef4444" strokeWidth="3" />
            <line x1="61" y1="19" x2="61" y2="37" stroke="#ef4444" strokeWidth="2.5" />
            <line x1="52" y1="28" x2="70" y2="28" stroke="#ef4444" strokeWidth="2.5" />
            <circle cx="95" cy="36" r="7" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
            <line x1="95" y1="36" x2="98" y2="33" stroke="#dc2626" strokeWidth="1.5" />
            <circle cx="61" cy="70" r="3" fill="#38bdf8" className="water-drop drop-1" />
            <circle cx="62" cy="77" r="2.5" fill="#38bdf8" className="water-drop drop-2" />
            <circle cx="60" cy="84" r="2" fill="#0284c7" className="water-drop drop-3" />
            <ellipse cx="61" cy="88" rx="14" ry="2.5" fill="#bae6fd" opacity="0.75" />
          </svg>
          <span className="scenery-label water-label">Water Pipe</span>
        </div>

        {/* Public Waste / Segregation Bins */}
        <div className="scenery-item dustbins">
          <svg viewBox="0 0 70 60" width="60" height="50">
            <rect x="4" y="16" width="26" height="38" rx="3" fill="#16a34a" />
            <polygon points="2,16 32,16 28,11 6,11" fill="#15803d" />
            <path d="M12,28 L17,23 L22,28 M17,24 L17,38" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <rect x="38" y="16" width="26" height="38" rx="3" fill="#2563eb" />
            <polygon points="36,16 66,16 62,11 40,11" fill="#1d4ed8" />
            <circle cx="51" cy="30" r="5" fill="none" stroke="#ffffff" strokeWidth="2" />
          </svg>
          <span className="scenery-label bin-label">Civic Bins</span>
        </div>

        {/* Pothole with Warning Safety Cones */}
        <div className="scenery-item road-pothole">
          <svg viewBox="0 0 150 70" width="135" height="62">
            <ellipse cx="65" cy="45" rx="42" ry="16" fill="#1e293b" stroke="#334155" strokeWidth="3" />
            <ellipse cx="60" cy="46" rx="30" ry="10" fill="#0f172a" />
            <path d="M38,42 Q50,48 68,44 Q85,49 95,43" stroke="#475569" strokeWidth="2" fill="none" />
            <g transform="translate(108, 12)">
              <polygon points="12,0 0,38 24,38" fill="#ea580c" />
              <polygon points="9,9 3,21 21,21 15,9" fill="#ffffff" />
              <polygon points="7,25 1,35 23,35 17,25" fill="#ffffff" />
              <rect x="-3" y="37" width="30" height="4" rx="1" fill="#c2410c" />
              <circle cx="12" cy="-2" r="3" fill="#facc15" className="cone-pulse-beacon" />
            </g>
            <g transform="translate(4, 20)">
              <polygon points="10,0 0,30 20,30" fill="#ea580c" />
              <polygon points="7,8 2,17 18,17 13,8" fill="#ffffff" />
              <rect x="-2" y="29" width="24" height="3" rx="1" fill="#c2410c" />
            </g>
          </svg>
          <span className="scenery-label pothole-label">Pothole Zone</span>
        </div>

        {/* Cute Animated Stray Dog (Desi Indie Dog) trotting along the sidewalk */}
        <div className="scenery-item animated-stray-dog">
          <div className="dog-wrapper">
            <svg viewBox="0 0 90 60" width="75" height="50" className="dog-svg">
              <ellipse cx="42" cy="30" rx="18" ry="11" fill="#d97706" />
              <ellipse cx="44" cy="32" rx="14" ry="8" fill="#f59e0b" />
              <circle cx="64" cy="20" r="9" fill="#d97706" />
              <polygon points="68,19 80,24 68,27" fill="#b45309" />
              <circle cx="79" cy="24" r="2" fill="#18181b" />
              <circle cx="66" cy="18" r="1.8" fill="#18181b" />
              <circle cx="66.5" cy="17.5" r="0.6" fill="#ffffff" />
              <path d="M59,15 Q54,12 56,24 Q62,22 61,16" fill="#92400e" className="dog-ear" />
              <rect x="58" y="24" width="3" height="7" rx="1" fill="#0284c7" />
              <circle cx="60" cy="30" r="1.8" fill="#facc15" />
              <path d="M25,28 Q14,18 10,22 Q12,28 23,32" fill="#b45309" className="dog-tail" />
              <rect x="30" y="38" width="4.5" height="16" rx="2" fill="#b45309" className="dog-leg leg-back-left" />
              <rect x="36" y="38" width="4.5" height="16" rx="2" fill="#d97706" className="dog-leg leg-back-right" />
              <rect x="49" y="38" width="4.5" height="16" rx="2" fill="#b45309" className="dog-leg leg-front-left" />
              <rect x="55" y="38" width="4.5" height="16" rx="2" fill="#d97706" className="dog-leg leg-front-right" />
            </svg>
            <span className="dog-speech-bubble">Woof! 🐾</span>
          </div>
        </div>

        {/* Public Park Bench & Post Box */}
        <div className="scenery-item park-bench">
          <svg viewBox="0 0 70 45" width="60" height="38">
            <rect x="6" y="16" width="58" height="5" rx="1" fill="#78350f" />
            <rect x="6" y="23" width="58" height="5" rx="1" fill="#78350f" />
            <path d="M12,14 L12,38 M58,14 L58,38 M12,28 L58,28" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="scenery-item post-box">
          <svg viewBox="0 0 35 55" width="30" height="48">
            <rect x="6" y="12" width="22" height="38" rx="8" fill="#dc2626" />
            <rect x="11" y="20" width="12" height="3" fill="#111827" />
            <rect x="4" y="48" width="26" height="5" rx="1" fill="#991b1b" />
          </svg>
        </div>
      </div>

      {/* Animated Road with Traffic (Auto-rickshaw & Municipal Repair Truck) */}
      <div className="citizen-bg-road-track">
        <div className="road-curb" />
        <div className="road-surface">
          <div className="road-lane-markers" />

          {/* Yellow & Green Indian Auto Rickshaw */}
          <div className="road-vehicle auto-rickshaw">
            <svg viewBox="0 0 75 48" width="65" height="42">
              <path d="M15,16 Q20,4 40,4 L55,4 Q68,4 66,22 L15,22 Z" fill="#eab308" />
              <path d="M8,22 L66,22 L62,38 L10,38 Z" fill="#15803d" />
              <polygon points="54,7 64,20 54,20" fill="#e0f2fe" opacity="0.85" />
              <circle cx="48" cy="18" r="4" fill="#334155" />
              <circle cx="20" cy="38" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="55" cy="38" r="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="20" cy="38" r="2.5" fill="#f8fafc" />
              <circle cx="55" cy="38" r="2.5" fill="#f8fafc" />
              <polygon points="66,25 74,27 66,29" fill="#fef08a" />
            </svg>
          </div>

          {/* Nirvaran Setu Municipal Civic Squad Van */}
          <div className="road-vehicle municipal-van">
            <svg viewBox="0 0 110 52" width="95" height="45">
              <rect x="5" y="12" width="70" height="28" rx="4" fill="#0f766e" />
              <path d="M75,18 L92,24 L94,40 L75,40 Z" fill="#115e59" />
              <polygon points="77,20 88,24 88,30 77,30" fill="#ccfbf1" opacity="0.85" />
              <rect x="42" y="7" width="10" height="5" rx="2" fill="#ef4444" className="siren-light" />
              <rect x="14" y="22" width="48" height="8" rx="2" fill="#ffffff" opacity="0.9" />
              <text x="18" y="28" fontSize="6" fontWeight="bold" fill="#0f766e">CIVIC SQUAD</text>
              <circle cx="26" cy="40" r="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <circle cx="78" cy="40" r="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <circle cx="26" cy="40" r="3" fill="#ffffff" />
              <circle cx="78" cy="40" r="3" fill="#ffffff" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
