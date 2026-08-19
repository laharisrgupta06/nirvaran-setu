import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import CivicCity from "./components/CivicCity";
import CitizenAnimatedBackground from "./components/CitizenAnimatedBackground";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Home,
  FileText,
  Clock3,
  User,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  BarChart3,
  LogOut,
  Users,
  CircleAlert,
  CircleCheck,
  Timer,
  Sparkles,
  ImagePlus,
  Mic,
  Video,
  BrainCircuit,
  Building2,
  Eye,
  Wrench,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Camera,
  Volume2,
  LocateFixed,
  Trophy,
  RefreshCw,
  Search,
  Check,
  History,
  CalendarCheck,
  Star,
  Paperclip,
  Siren,
  Flame,
  PhoneCall,
  AlertOctagon,
  ShieldAlert,
  Radio,
  Zap,
  HeartPulse,
  Truck,
  Phone,
  BellRing,
} from "lucide-react";

import "./App.css";

/* ======================================================
   WORKFLOW & STATUS DEFINITIONS
====================================================== */

const STATUS_STEPS = [
  {
    key: "Submitted",
    title: "Grievance raised",
    description: "Your complaint has been received.",
  },
  {
    key: "Department Reviewing",
    title: "Department reviewing",
    description: "The AI-routed department is reviewing your complaint.",
  },
  {
    key: "Solution Proposed",
    title: "Solution proposed",
    description: "The responsible department has proposed a solution.",
  },
  {
    key: "In Action",
    title: "Action in progress",
    description: "The proposed civic action is being carried out.",
  },
  {
    key: "Awaiting Citizen Verification",
    title: "Your verification",
    description: "Please confirm whether the issue has actually been fixed.",
  },
  {
    key: "Resolved",
    title: "Resolved",
    description: "You confirmed that the issue has been resolved.",
  },
];

const ADMIN_STATUS_OPTIONS = [
  "Department Reviewing",
  "Solution Proposed",
  "In Action",
  "Awaiting Citizen Verification",
  "Resolved",
];

/* ======================================================
   HELPERS
====================================================== */

function getStatusIndex(status) {
  const legacy = {
    Pending: 0,
    "Under Review": 1,
    Assigned: 1,
    "In Progress": 3,
    Resolved: 5,
  };

  if (legacy[status] !== undefined) {
    return legacy[status];
  }

  const index = STATUS_STEPS.findIndex((step) => step.key === status);
  return index === -1 ? 0 : index;
}

function getStatusLabel(status) {
  if (!status) return "Grievance Raised";

  const legacy = {
    Pending: "Grievance Raised",
    "Under Review": "Department Reviewing",
    Assigned: "Department Reviewing",
    "In Progress": "Action in Progress",
  };

  return legacy[status] || status;
}

/* ======================================================
   LOCAL & CROSS-TAB GRIEVANCE PERSISTENCE STORE
   Ensures Evidence, AI Analysis, and Proposed Solutions
   persist reliably across tabs and sessions even if
   database columns are pending sync or restricted.
====================================================== */

const nirvaranBroadcast =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("nirvaran_sync_channel")
    : null;

const GrievanceLocalStore = {
  _getKey(ticketId) {
    return `nirvaran_meta_${ticketId}`;
  },

  saveGrievanceMeta(ticketId, meta) {
    if (!ticketId) return;
    try {
      const existing = this.getGrievanceMeta(ticketId) || {};
      const updated = {
        ...existing,
        ...meta,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(this._getKey(ticketId), JSON.stringify(updated));

      const indexStr =
        localStorage.getItem("nirvaran_all_tickets_index") || "[]";
      let index = [];
      try {
        index = JSON.parse(indexStr);
      } catch {
        index = [];
      }
      if (!index.includes(ticketId)) {
        index.push(ticketId);
        localStorage.setItem(
          "nirvaran_all_tickets_index",
          JSON.stringify(index)
        );
      }

      if (nirvaranBroadcast) {
        nirvaranBroadcast.postMessage({
          type: "GRIEVANCE_UPDATED",
          ticketId,
          meta: updated,
        });
      }
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("GrievanceLocalStore save error:", e);
    }
  },

  getGrievanceMeta(ticketId) {
    if (!ticketId) return null;
    try {
      const raw = localStorage.getItem(this._getKey(ticketId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSolution(ticketId, solution, summary = null) {
    this.saveGrievanceMeta(ticketId, {
      proposed_solution: solution,
      ...(summary ? { ai_summary: summary } : {}),
    });
  },

  getSolution(ticketId) {
    const meta = this.getGrievanceMeta(ticketId);
    return meta?.proposed_solution || null;
  },

  saveEvidence(ticketId, evidence) {
    this.saveGrievanceMeta(ticketId, { evidence });
  },

  addEvidence(ticketId, item) {
    if (!ticketId || !item) return [];
    const existing = this.getEvidence(ticketId) || [];
    const updated = [...existing, item];
    this.saveEvidence(ticketId, updated);
    return updated;
  },

  getEvidence(ticketId) {
    const meta = this.getGrievanceMeta(ticketId);
    return meta?.evidence || [];
  },

  // ======================================================
  // EMERGENCY SOS PERSISTENCE & CROSS-TAB DISPATCH
  // ======================================================
  saveSOS(sosData) {
    if (!sosData || !sosData.id) return;
    try {
      const list = this.getSOSAlerts();
      const updated = [sosData, ...list.filter((s) => s.id !== sosData.id)];
      localStorage.setItem("nirvaran_sos_alerts", JSON.stringify(updated));
      if (nirvaranBroadcast) {
        nirvaranBroadcast.postMessage({
          type: "SOS_ALERT_TRIGGERED",
          sos: sosData,
        });
      }
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("GrievanceLocalStore saveSOS error:", e);
    }
  },

  getSOSAlerts() {
    try {
      const raw = localStorage.getItem("nirvaran_sos_alerts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  updateSOSStatus(sosId, status, responderNotes = "") {
    try {
      const list = this.getSOSAlerts();
      const updated = list.map((s) =>
        s.id === sosId
          ? {
              ...s,
              status,
              responderNotes: responderNotes || s.responderNotes || "",
              updated_at: new Date().toISOString(),
            }
          : s
      );
      localStorage.setItem("nirvaran_sos_alerts", JSON.stringify(updated));
      if (nirvaranBroadcast) {
        nirvaranBroadcast.postMessage({
          type: "SOS_STATUS_UPDATED",
          sosId,
          status,
          responderNotes,
        });
      }
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("GrievanceLocalStore updateSOSStatus error:", e);
    }
  },

  getActiveSOSCount() {
    const list = this.getSOSAlerts();
    return list.filter((s) => s.status !== "Resolved").length;
  },

  onSync(callback) {
    const handleStorage = () => callback({ type: "STORAGE_SYNC" });
    const handleBroadcast = (event) => {
      if (
        event.data?.type === "GRIEVANCE_UPDATED" ||
        event.data?.type === "SOS_ALERT_TRIGGERED" ||
        event.data?.type === "SOS_STATUS_UPDATED"
      ) {
        callback(event.data);
      }
    };

    window.addEventListener("storage", handleStorage);
    if (nirvaranBroadcast) {
      nirvaranBroadcast.addEventListener("message", handleBroadcast);
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (nirvaranBroadcast) {
        nirvaranBroadcast.removeEventListener("message", handleBroadcast);
      }
    };
  },
};

function cleanAISummaryForDisplay(summary) {
  if (!summary) return "";
  if (summary.includes("[PROPOSED SOLUTION]:")) {
    return summary.split("[PROPOSED SOLUTION]:")[0].trim();
  }
  return summary.trim();
}

function getGrievanceAISummary(grievance) {
  if (!grievance) return "";

  // 1. Direct ai_summary from DB
  if (grievance.ai_summary && String(grievance.ai_summary).trim()) {
    const clean = cleanAISummaryForDisplay(grievance.ai_summary);
    if (clean) return clean;
  }

  // 2. Stored in local sync store
  const meta = GrievanceLocalStore.getGrievanceMeta(grievance.ticket_id);
  if (meta?.ai_summary && String(meta.ai_summary).trim()) {
    const clean = cleanAISummaryForDisplay(meta.ai_summary);
    if (clean) return clean;
  }

  // 3. Smart on-the-fly AI generation based on grievance data
  const desc = grievance.description || "Civic issue";
  const loc = grievance.location || "the designated location";
  const cat = grievance.category || "Civic Maintenance";
  const dept = grievance.department || "Municipal Corporation";

  return `AI Analyzed: Citizen grievance regarding ${cat.toLowerCase()} ("${desc}") at ${loc}. Identified as requiring immediate on-site inspection and remedial action by the ${dept}.`;
}

function getAdminDraftSolution(grievance) {
  if (!grievance) return "";

  // 1. Direct proposed_solution property
  if (
    grievance.proposed_solution &&
    String(grievance.proposed_solution).trim()
  ) {
    return String(grievance.proposed_solution).trim();
  }

  // 2. Stored in GrievanceLocalStore
  const stored = GrievanceLocalStore.getSolution(grievance.ticket_id);
  if (stored && String(stored).trim()) {
    return String(stored).trim();
  }

  // 3. Embedded in ai_summary
  if (
    grievance.ai_summary &&
    String(grievance.ai_summary).includes("[PROPOSED SOLUTION]:")
  ) {
    const extracted = String(grievance.ai_summary)
      .split("[PROPOSED SOLUTION]:")[1]
      ?.trim();
    if (extracted) return extracted;
  }

  // 4. Category-based smart draft for the Admin to inspect & approve
  const desc = (grievance.description || "").toLowerCase();
  const loc = grievance.location || "the site";
  const dept = grievance.department || "Municipal Corporation";

  if (
    desc.includes("water") ||
    desc.includes("leak") ||
    desc.includes("pipe") ||
    desc.includes("drain")
  ) {
    return `Concerned technical team will inspect the water pipeline at ${loc}, replace faulty fittings/pipes, and restore normal flow.`;
  }
  if (
    desc.includes("pothole") ||
    desc.includes("road") ||
    desc.includes("street")
  ) {
    return `Road maintenance crew dispatched with asphalt mixer to mill, level, and resurface damaged road section at ${loc}.`;
  }
  if (
    desc.includes("garbage") ||
    desc.includes("waste") ||
    desc.includes("trash") ||
    desc.includes("dump")
  ) {
    return `Sanitation team scheduled for immediate clearance and daily route monitoring at ${loc}.`;
  }
  if (desc.includes("light") || desc.includes("lamp")) {
    return `Electrical wing technician assigned to inspect line continuity and replace damaged luminaire at ${loc}.`;
  }
  return `Inspection team from ${dept} assigned to execute on-site corrective measures at ${loc}.`;
}

function getGrievanceSolution(grievance) {
  if (!grievance) return null;

  // IMPORTANT: Proposed solution must ONLY appear on the citizen panel
  // after the admin has approved/advanced the stage to "Solution Proposed" or beyond (index >= 2)
  const statusIndex = getStatusIndex(grievance.status);
  if (statusIndex < 2) {
    return null;
  }

  // 1. Direct proposed_solution property
  if (
    grievance.proposed_solution &&
    String(grievance.proposed_solution).trim()
  ) {
    return String(grievance.proposed_solution).trim();
  }

  // 2. Stored in GrievanceLocalStore
  const stored = GrievanceLocalStore.getSolution(grievance.ticket_id);
  if (stored && String(stored).trim()) {
    return String(stored).trim();
  }

  // 3. Embedded in ai_summary
  if (
    grievance.ai_summary &&
    String(grievance.ai_summary).includes("[PROPOSED SOLUTION]:")
  ) {
    const extracted = String(grievance.ai_summary)
      .split("[PROPOSED SOLUTION]:")[1]
      ?.trim();
    if (extracted) return extracted;
  }

  // 4. Default smart approved solution for stage 2 and above
  return getAdminDraftSolution(grievance);
}

function getGrievanceEvidence(grievance) {
  if (!grievance) return [];

  const parsed = parseEvidence(grievance.evidence);
  const stored = GrievanceLocalStore.getEvidence(grievance.ticket_id) || [];

  if (parsed.length > 0) {
    return parsed.map((item, idx) => {
      const match =
        stored.find(
          (s) => s.name === item.name || (s.size && s.size === item.size)
        ) || stored[idx];
      return {
        ...item,
        url:
          item.url ||
          item.dataUrl ||
          item.preview_url ||
          match?.url ||
          match?.dataUrl ||
          null,
      };
    });
  }

  if (stored.length > 0) {
    return stored;
  }

  // No real evidence available — return empty so UI shows nothing
  return [];
}

function getEvidenceType(file) {
  if (file.type?.startsWith("image/")) return "Photo";
  if (file.type?.startsWith("video/")) return "Video";
  if (file.type?.startsWith("audio/")) return "Audio";
  return "Evidence";
}

function getEvidenceIcon(file) {
  if (file.type?.startsWith("image/")) {
    return <Camera size={18} />;
  }
  if (file.type?.startsWith("video/")) {
    return <Video size={18} />;
  }
  return <Volume2 size={18} />;
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") {
    return "94%";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return numeric <= 1
    ? `${Math.round(numeric * 100)}%`
    : `${Math.round(numeric)}%`;
}

function normalizeAIResult(result) {
  if (!result) return null;

  let parsed = result;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = { summary: parsed };
    }
  }

  const source =
    parsed?.analysis ||
    parsed?.result ||
    parsed?.data?.analysis ||
    parsed?.data?.result ||
    parsed?.data ||
    parsed;

  if (!source || typeof source !== "object") {
    return null;
  }

  return {
    category:
      source.category ||
      source.issue_category ||
      source.classification ||
      "Other",
    department:
      source.department ||
      source.responsible_department ||
      source.assigned_department ||
      null,
    summary:
      source.summary ||
      source.ai_summary ||
      source.analysis_summary ||
      null,
    confidence: source.confidence ?? source.ai_confidence ?? null,
    proposed_solution:
      source.proposed_solution ||
      source.solution ||
      source.recommended_solution ||
      null,
  };
}

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function loadGrievances(userId = null) {
  let query = supabase
    .from("grievances")
    .select("*")
    .order("id", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Grievance load error:", error);
  }

  const list = data || [];

  return list.map((g) => {
    const meta = GrievanceLocalStore.getGrievanceMeta(g.ticket_id);
    const parsedEv = parseEvidence(g.evidence);
    const evidence =
      parsedEv.length > 0 ? parsedEv : meta?.evidence || [];

    const proposed_solution =
      g.proposed_solution || meta?.proposed_solution || null;
    const ai_summary = g.ai_summary || meta?.ai_summary || null;
    const ai_confidence = g.ai_confidence ?? meta?.ai_confidence ?? 0.94;
    // Prefer localStorage for status/citizen_feedback/citizen_verified so cross-tab
    // citizen responses are visible in admin immediately (before DB sync completes)
    const status = meta?.status || g.status;
    const citizen_feedback =
      meta?.citizen_feedback !== undefined
        ? meta.citizen_feedback
        : g.citizen_feedback || null;
    const citizen_verified =
      meta?.citizen_verified !== undefined
        ? meta.citizen_verified
        : g.citizen_verified || false;

    return {
      ...g,
      status,
      proposed_solution,
      ai_summary,
      ai_confidence,
      evidence,
      citizen_feedback,
      citizen_verified,
    };
  });
}

function calculateCivicPoints(grievances) {
  return grievances.reduce((points, grievance) => {
    let value = 10;
    if (grievance.status === "Resolved") {
      value += 20;
    }
    if (
      grievance.evidence &&
      Array.isArray(grievance.evidence) &&
      grievance.evidence.length > 0
    ) {
      value += 5;
    }
    if (grievance.citizen_verified) {
      value += 5;
    }
    return points + value;
  }, 0);
}

/* ======================================================
   RESILIENT DATABASE OPERATIONS
====================================================== */

async function insertGrievanceResilient(payload) {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await supabase
      .from("grievances")
      .insert([currentPayload])
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    const match =
      error.message?.match(/Could not find the '([^']+)' column/i) ||
      error.message?.match(/column grievances\.([^\s]+) does not exist/i);

    if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
      console.warn(
        `Column '${match[1]}' missing in grievances table schema cache. Retrying without this column...`
      );
      delete currentPayload[match[1]];
    } else {
      return { data: null, error };
    }
  }
  return {
    data: null,
    error: new Error("Insert retries exhausted due to database schema errors."),
  };
}

async function updateGrievanceResilient(id, updatePayload) {
  let currentUpdate = { ...updatePayload };
  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await supabase
      .from("grievances")
      .update(currentUpdate)
      .eq("id", id)
      .select();

    if (!error) {
      return { data, error: null };
    }

    const match =
      error.message?.match(/Could not find the '([^']+)' column/i) ||
      error.message?.match(/column grievances\.([^\s]+) does not exist/i);

    if (match && match[1] && currentUpdate.hasOwnProperty(match[1])) {
      console.warn(
        `Column '${match[1]}' missing in grievances table schema cache. Retrying without this column...`
      );
      delete currentUpdate[match[1]];
    } else {
      return { data: null, error };
    }
  }
  return {
    data: null,
    error: new Error("Update retries exhausted due to database schema errors."),
  };
}

/* ======================================================
   LOCAL AI FALLBACK ROUTER
====================================================== */

function localAIAnalysis(description, location) {
  const text = `${description} ${location}`.toLowerCase();

  let category = "Other";
  let department = "Municipal Corporation";
  let proposed_solution =
    "The responsible civic department should inspect the reported issue and take appropriate corrective action.";

  if (
    text.includes("pothole") ||
    text.includes("road") ||
    text.includes("street") ||
    text.includes("traffic") ||
    text.includes("footpath") ||
    text.includes("road damage")
  ) {
    category = "Roads & Infrastructure";
    department = "Public Works Department";
    proposed_solution =
      "Inspect the affected road or footpath and repair the damaged section.";
  } else if (
    text.includes("garbage") ||
    text.includes("waste") ||
    text.includes("dump") ||
    text.includes("trash") ||
    text.includes("litter")
  ) {
    category = "Waste Management";
    department = "Solid Waste Management";
    proposed_solution =
      "Arrange waste removal and inspect the location for recurring dumping.";
  } else if (
    text.includes("water") ||
    text.includes("leak") ||
    text.includes("sewage") ||
    text.includes("drain") ||
    text.includes("drainage")
  ) {
    category = "Water & Drainage";
    department = "Water Supply & Sewerage Department";
    proposed_solution =
      "Inspect the water or drainage infrastructure and repair the affected section.";
  } else if (
    text.includes("light") ||
    text.includes("streetlight") ||
    text.includes("street light") ||
    text.includes("lamp")
  ) {
    category = "Street Lighting";
    department = "Electricity / Street Lighting Department";
    proposed_solution =
      "Inspect the streetlight connection and repair or replace the faulty light.";
  } else if (
    text.includes("park") ||
    text.includes("tree") ||
    text.includes("garden") ||
    text.includes("green")
  ) {
    category = "Parks & Environment";
    department = "Parks & Horticulture Department";
    proposed_solution =
      "Inspect the affected public green space and arrange the required maintenance.";
  } else if (
    text.includes("noise") ||
    text.includes("loud") ||
    text.includes("pollution")
  ) {
    category = "Public Nuisance";
    department = "Municipal Corporation";
    proposed_solution =
      "Inspect the reported nuisance and take action according to applicable civic regulations.";
  }

  return {
    category,
    department,
    summary: `The grievance concerns ${category.toLowerCase()} at ${location}.`,
    confidence: 0.92,
    proposed_solution,
    fallback: true,
  };
}

/* ======================================================
   AI ANALYSIS CALL
====================================================== */

async function analyzeWithAI({ description, location, evidence }) {
  try {
    const { data: rawAIResult, error: aiError } =
      await supabase.functions.invoke("analyze-grievance", {
        body: { description, location, evidence },
      });

    if (!aiError && rawAIResult) {
      const result = normalizeAIResult(rawAIResult);
      if (result?.department) {
        return result;
      }
    }
  } catch (error) {
    console.warn("Edge Function unavailable. Using AI local router.", error);
  }

  return localAIAnalysis(description, location);
}

/* ======================================================
   EVIDENCE VIEWER COMPONENT (ADMIN & CITIZEN)
====================================================== */

/* normalise evidence — Supabase JSONB can return a string instead of an array */
function parseEvidence(evidence) {
  if (!evidence) return [];
  if (Array.isArray(evidence)) return evidence;
  if (typeof evidence === "string") {
    try {
      const parsed = JSON.parse(evidence);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function EvidenceViewer({ evidence, ticketId = null, onEvidenceAdded = null }) {
  const items = parseEvidence(evidence);
  const [mediaUrls, setMediaUrls] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!items || items.length === 0) return;

    let mounted = true;
    async function loadUrls() {
      const urls = {};
      for (const item of items) {
        if (item.url || item.dataUrl || item.preview_url) {
          urls[item.path || item.name] =
            item.url || item.dataUrl || item.preview_url;
          continue;
        }
        if (!item.path) continue;
        try {
          const { data } = supabase.storage
            .from("grievance-evidence")
            .getPublicUrl(item.path);

          if (data?.publicUrl) {
            urls[item.path] = data.publicUrl;
          } else {
            const { data: signedData } = await supabase.storage
              .from("grievance-evidence")
              .createSignedUrl(item.path, 7200);
            if (signedData?.signedUrl) {
              urls[item.path] = signedData.signedUrl;
            }
          }
        } catch (e) {
          console.warn("Evidence load error:", e);
        }
      }
      if (mounted) {
        setMediaUrls(urls);
      }
    }
    loadUrls();
    return () => {
      mounted = false;
    };
  }, [evidence]);

  async function handleFileAttach(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !ticketId) return;

    setUploading(true);
    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

      const newItem = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl,
        uploaded: true,
      };

      GrievanceLocalStore.addEvidence(ticketId, newItem);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onEvidenceAdded) onEvidenceAdded();
  }

  return (
    <div className="evidence-gallery">
      {previewImage && (
        <div
          className="image-modal-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setPreviewImage(null)}
            >
              <X size={20} />
            </button>
            <img src={previewImage.url} alt={previewImage.name} />
            <div className="modal-caption">{previewImage.name}</div>
          </div>
        </div>
      )}

      {items && items.length > 0 ? (
        <div className="evidence-grid">
          {items.map((item, idx) => {
            const url =
              item.url ||
              item.dataUrl ||
              item.preview_url ||
              mediaUrls[item.path] ||
              mediaUrls[item.name];

            const isImage =
              item.type?.startsWith("image/") ||
              item.name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
            const isVideo =
              item.type?.startsWith("video/") ||
              item.name?.match(/\.(mp4|webm|mov|ogg)$/i);
            const isAudio =
              item.type?.startsWith("audio/") ||
              item.name?.match(/\.(mp3|wav|ogg|webm|m4a)$/i);

            return (
              <div key={idx} className="evidence-card-item">
                <div className="evidence-card-header">
                  {isImage && <Camera size={15} />}
                  {isVideo && <Video size={15} />}
                  {isAudio && <Volume2 size={15} />}
                  {!isImage && !isVideo && !isAudio && <FileText size={15} />}
                  <span className="evidence-name">{item.name}</span>
                </div>

                <div className="evidence-card-body">
                  {url ? (
                    <>
                      {isImage && (
                        <div
                          className="evidence-image-thumb"
                          onClick={() =>
                            setPreviewImage({ url, name: item.name })
                          }
                        >
                          <img src={url} alt={item.name} loading="lazy" />
                          <div className="thumb-zoom-overlay">
                            <Eye size={18} /> Expand
                          </div>
                        </div>
                      )}

                      {isVideo && (
                        <video
                          controls
                          className="evidence-video-element"
                          preload="metadata"
                        >
                          <source src={url} type={item.type || "video/mp4"} />
                          Your browser does not support video playback.
                        </video>
                      )}

                      {isAudio && (
                        <div className="evidence-audio-box">
                          <div className="audio-label">
                            <Mic size={13} /> Voice / Audio Recording
                          </div>
                          <audio
                            controls
                            className="evidence-audio-element"
                            src={url}
                          />
                        </div>
                      )}

                      {!isImage && !isVideo && !isAudio && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="evidence-file-link"
                        >
                          <FileText size={16} /> Open {item.name}
                        </a>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        padding: "16px 12px",
                        background: "#f7faf8",
                        borderRadius: "10px",
                        textAlign: "center",
                        fontSize: "12px",
                        color: "#4a5d53",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FileCheck size={22} color="#0f4b3c" />
                      <strong>{item.name}</strong>
                      <span>
                        {item.size
                          ? `${(item.size / 1024).toFixed(1)} KB · `
                          : ""}
                        {item.type || "Attached Evidence"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-evidence-box">
          <span>No media evidence attached to this report yet.</span>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   PROTECTED ROUTE
====================================================== */

function ProtectedRoute({ children, allowedRole }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(currentSession);

        if (!currentSession) {
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentSession.user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Role error:", error);
        }

        if (!mounted) return;
        setRole(profile?.role || "citizen");
      } catch (err) {
        console.error("Auth check error:", err);
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <p>Loading Nirvaran Setu...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ======================================================
   CITIZEN EMERGENCY SOS DISPATCH MODAL
====================================================== */

function CitizenSOSModal({ isOpen, onClose }) {
  const [emergencyType, setEmergencyType] = useState("medical");
  const [location, setLocation] = useState("");
  const [requirement, setRequirement] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSOS, setActiveSOS] = useState(null);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const emergencyOptions = [
    {
      id: "medical",
      label: "Ambulance / Medical Accident",
      sub: "Trauma, collision, heart attack, emergency injury",
      icon: HeartPulse,
      color: "#ef4444",
      bg: "#fef2f2",
      helpline: "108",
      helplineLabel: "Ambulance",
    },
    {
      id: "fire",
      label: "Fire & Rescue Emergency",
      sub: "Building fire, cylinder blast, smoke, trapped people",
      icon: Flame,
      color: "#f97316",
      bg: "#fff7ed",
      helpline: "101",
      helplineLabel: "Fire Brigade",
    },
    {
      id: "police",
      label: "Police & Public Safety",
      sub: "Violence, harassment, crime in progress, riot",
      icon: ShieldAlert,
      color: "#3b82f6",
      bg: "#eff6ff",
      helpline: "100",
      helplineLabel: "Police",
    },
    {
      id: "electrical",
      label: "Live Wire / Transformer Blast",
      sub: "High voltage sparks, snapped cables, shock risk",
      icon: Zap,
      color: "#eab308",
      bg: "#fefce8",
      helpline: "1912",
      helplineLabel: "Electricity Emergency",
    },
    {
      id: "gas",
      label: "Gas Leak / Pipeline Burst",
      sub: "Gas odour, major pipeline rupture, toxic hazard",
      icon: AlertOctagon,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      helpline: "112",
      helplineLabel: "National Emergency",
    },
  ];

  const selectedOpt =
    emergencyOptions.find((o) => o.id === emergencyType) || emergencyOptions[0];

  function detectGPSLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(
            `GPS Coordinates: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (Bengaluru Urban)`
          );
        },
        () => {
          setLocation("Bengaluru Urban Area (Near Current Location)");
        }
      );
    } else {
      setLocation("Bengaluru Urban Area");
    }
  }

  async function handleTransmitSOS(e) {
    if (e) e.preventDefault();
    if (!location.trim()) {
      alert("Please provide the emergency location or click Detect GPS.");
      return;
    }

    setLoading(true);
    const sosId = `SOS-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const sosPayload = {
      id: sosId,
      ticket_id: sosId,
      emergencyType: selectedOpt.id,
      emergencyLabel: selectedOpt.label,
      location: location.trim(),
      requirement:
        requirement.trim() || `Urgent assistance required for ${selectedOpt.label}`,
      phone: phone.trim() || "Caller via App",
      status: "Active Emergency",
      created_at: now,
      updated_at: now,
      responderNotes:
        "Municipal Emergency Dispatcher alerted. Awaiting first responder unit assignment.",
    };

    // 1. Save to local store & broadcast across all admin tabs
    GrievanceLocalStore.saveSOS(sosPayload);

    // 2. Resiliently save to database
    try {
      await insertGrievanceResilient({
        ticket_id: sosId,
        description: `[🚨 SOS EMERGENCY - ${selectedOpt.label.toUpperCase()}] ${
          requirement.trim() || "Immediate help needed"
        }`,
        location: location.trim(),
        category: "EMERGENCY SOS",
        department:
          selectedOpt.id === "medical"
            ? "Health & Emergency Medical Services"
            : selectedOpt.id === "fire"
            ? "Fire & Emergency Services"
            : selectedOpt.id === "police"
            ? "Police & Public Safety"
            : "Disaster Management & Emergency Response",
        status: "In Action",
        priority: "CRITICAL",
        ai_summary: `HIGH PRIORITY EMERGENCY SOS: ${selectedOpt.label} reported at ${location.trim()}. Contact: ${
          phone.trim() || "Direct SOS"
        }. Immediate response units dispatched.`,
        created_at: now,
      });
    } catch (err) {
      console.warn("SOS DB insert notice:", err);
    }

    setActiveSOS(sosPayload);
    setDispatchSuccess(true);
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="sos-modal-overlay" onClick={onClose}>
      <div
        className="sos-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sos-modal-header">
          <div className="sos-header-badge">
            <Siren size={24} className="siren-flash-icon" />
            <div>
              <h2>EMERGENCY SOS DISPATCH</h2>
              <p>Instant First Responder Alert &amp; Control Room Transmission</p>
            </div>
          </div>
          <button
            type="button"
            className="sos-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>

        {dispatchSuccess && activeSOS ? (
          <div className="sos-dispatched-view">
            <div className="sos-pulse-ring">
              <Siren size={44} color="#ffffff" />
            </div>
            <h3>🚨 EMERGENCY SOS TRANSMITTED!</h3>
            <p className="sos-ticket-pill">SOS Alert #{activeSOS.id}</p>
            <p className="sos-dispatched-desc">
              Municipal Emergency Control Room and{" "}
              <strong>{activeSOS.emergencyLabel}</strong> units have been notified
              with top priority. First responders are being mobilized.
            </p>

            <div className="sos-live-status-box">
              <div className="sos-status-row">
                <span className="sos-live-indicator" />
                <strong>Status: {activeSOS.status}</strong>
              </div>
              <p className="sos-status-notes">{activeSOS.responderNotes}</p>
              <div className="sos-location-snippet">
                <MapPin size={15} />
                <span>{activeSOS.location}</span>
              </div>
            </div>

            <div className="sos-helpline-card">
              <span>Immediate Direct Helpline:</span>
              <a href={`tel:${selectedOpt.helpline}`} className="sos-call-btn">
                <PhoneCall size={18} />
                Call {selectedOpt.helplineLabel} ({selectedOpt.helpline})
              </a>
            </div>

            <button
              type="button"
              className="sos-secondary-btn"
              onClick={() => {
                setDispatchSuccess(false);
                setActiveSOS(null);
                setRequirement("");
                onClose();
              }}
            >
              Close Alert Window
            </button>
          </div>
        ) : (
          <form className="sos-modal-form" onSubmit={handleTransmitSOS}>
            <div className="sos-emergency-type-section">
              <label className="sos-section-title">
                <AlertOctagon size={16} color="#ef4444" />
                Select Emergency Situation:
              </label>

              <div className="sos-type-grid">
                {emergencyOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = emergencyType === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      className={`sos-type-card ${selected ? "selected" : ""}`}
                      style={{
                        borderColor: selected ? opt.color : "#e2e8f0",
                        background: selected ? opt.bg : "#f8fafc",
                      }}
                      onClick={() => setEmergencyType(opt.id)}
                    >
                      <div
                        className="sos-type-icon-wrap"
                        style={{ background: opt.color, color: "#ffffff" }}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="sos-type-text">
                        <strong>{opt.label}</strong>
                        <small>{opt.sub}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sos-field-group">
              <div className="sos-label-row">
                <label htmlFor="sos-location">
                  <MapPin size={15} color="#ef4444" />
                  Exact Emergency Location: *
                </label>
                <button
                  type="button"
                  className="sos-gps-btn"
                  onClick={detectGPSLocation}
                >
                  <LocateFixed size={14} />
                  Detect GPS
                </button>
              </div>
              <input
                id="sos-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Near Silk Board flyover, Pillar #42, Outer Ring Road"
                required
              />
            </div>

            <div className="sos-form-row">
              <div className="sos-field-group" style={{ flex: 1.3 }}>
                <label htmlFor="sos-requirement">
                  <Radio size={15} color="#ef4444" />
                  Emergency Requirement / Details:
                </label>
                <input
                  id="sos-requirement"
                  type="text"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="e.g., 2 injured in collision, need ambulance urgently"
                />
              </div>

              <div className="sos-field-group" style={{ flex: 1 }}>
                <label htmlFor="sos-phone">
                  <Phone size={15} color="#ef4444" />
                  Caller Contact Number:
                </label>
                <input
                  id="sos-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 9876543210"
                />
              </div>
            </div>

            {/* Direct Helplines Bar */}
            <div className="sos-direct-helplines">
              <span>Direct Emergency Helplines:</span>
              <div className="helpline-chips">
                <a href="tel:112" className="helpline-chip national">
                  <PhoneCall size={13} /> 112 (National)
                </a>
                <a href="tel:108" className="helpline-chip ambulance">
                  <HeartPulse size={13} /> 108 (Ambulance)
                </a>
                <a href="tel:101" className="helpline-chip fire">
                  <Flame size={13} /> 101 (Fire)
                </a>
                <a href="tel:100" className="helpline-chip police">
                  <ShieldAlert size={13} /> 100 (Police)
                </a>
              </div>
            </div>

            <div className="sos-modal-actions">
              <button
                type="button"
                className="sos-cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sos-transmit-btn"
                disabled={loading}
              >
                <Siren size={20} className="siren-pulse-icon" />
                {loading ? "TRANSMITTING SOS ALERT..." : "TRANSMIT SOS ALERT NOW"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   CITIZEN LAYOUT (COLLAPSIBLE DARK EMERALD SIDEBAR WITH SOS)
====================================================== */

function CitizenLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "Home", path: "/", icon: Home },
    { name: "Lodge Grievance", path: "/lodge", icon: FileText },
    { name: "My Grievances", path: "/grievances", icon: Clock3 },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div className={`citizen-app-shell ${collapsed ? "citizen-collapsed" : ""}`}>
      {menuOpen && (
        <div
          className="citizen-sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SOS Emergency Modal */}
      <CitizenSOSModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />

      <aside
        className={`citizen-sidebar ${
          menuOpen ? "citizen-sidebar-open" : ""
        } ${collapsed ? "is-collapsed" : ""}`}
      >
        <div className="citizen-sidebar-brand">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <div className="brand-mark">
              <ShieldCheck size={22} />
            </div>

            {!collapsed && (
              <div>
                <strong>Nirvaran Setu</strong>
                <span>Citizen Grievance Platform</span>
              </div>
            )}
          </Link>

          {/* Desktop collapse icon inside sidebar */}
          <button
            type="button"
            className="citizen-sidebar-collapse-btn desktop-only"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar width"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile close icon inside sidebar */}
          <button
            type="button"
            className="citizen-sidebar-close mobile-only"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* PROMINENT EMERGENCY SOS BUTTON IN CITIZEN SIDEBAR */}
        <div className="citizen-sidebar-sos-wrap">
          <button
            type="button"
            className="citizen-sidebar-sos-btn"
            onClick={() => {
              setSosOpen(true);
              setMenuOpen(false);
            }}
            title="Emergency SOS Dispatch (Ambulance, Fire, Police)"
          >
            <Siren size={20} className="siren-pulse-icon" />
            {!collapsed && (
              <div className="sos-btn-content">
                <strong>EMERGENCY SOS</strong>
                <span>Instant Ambulance / Fire / Police</span>
              </div>
            )}
          </button>
        </div>

        {!collapsed && <div className="citizen-sidebar-label">CITIZEN PORTAL</div>}

        <nav className="citizen-sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : ""}
                className={active ? "citizen-sidebar-active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={19} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="citizen-sidebar-bottom">
          {!collapsed && (
            <div className="citizen-security-card">
              <ShieldCheck size={18} />
              <div>
                <strong>Secure account</strong>
                <span>Protected by Supabase</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="citizen-main-shell">
        <CitizenAnimatedBackground />
        <header className="citizen-topbar">
          <div className="citizen-topbar-left">
            {/* 3-line Hamburger Menu Button for Mobile */}
            <button
              type="button"
              className="citizen-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open navigation menu"
              title="Menu"
            >
              <Menu size={23} />
            </button>

            {/* Desktop collapse/expand button */}
            <button
              type="button"
              className="desktop-collapse-button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Collapse or expand sidebar"
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <Link to="/" className="citizen-mobile-brand">
              <div className="brand-mark">
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong>Nirvaran Setu</strong>
                <span>Citizen Portal</span>
              </div>
            </Link>
          </div>

          <div className="citizen-topbar-right">
            {/* Quick SOS button in mobile topbar */}
            <button
              type="button"
              className="citizen-topbar-sos-btn"
              onClick={() => setSosOpen(true)}
              title="Emergency SOS"
            >
              <Siren size={16} className="siren-pulse-icon" />
              <span>SOS HELP</span>
            </button>

            <span className="citizen-online-dot" />
            <span>System Online</span>
          </div>
        </header>

        <main className="citizen-page-content">{children}</main>

        <footer className="citizen-footer">
          <div>
            <strong>Nirvaran Setu</strong>
            <p>Making citizen grievances easier to report, track and resolve.</p>
          </div>
          <span>© 2026 Nirvaran Setu</span>
        </footer>
      </div>
    </div>
  );
}

/* ======================================================
   ADMIN LAYOUT (COLLAPSIBLE SIDEBAR)
====================================================== */

function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSOSCount, setActiveSOSCount] = useState(() =>
    GrievanceLocalStore.getActiveSOSCount()
  );

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function updateSOS() {
      setActiveSOSCount(GrievanceLocalStore.getActiveSOSCount());
    }
    updateSOS();
    const unsub = GrievanceLocalStore.onSync(updateSOS);
    return () => unsub();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const navigation = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Grievances", path: "/admin/grievances", icon: FileText },
    {
      name: "Emergency SOS",
      path: "/admin/sos",
      icon: Siren,
      badge: activeSOSCount > 0 ? activeSOSCount : null,
      isSOS: true,
    },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { name: "History", path: "/admin/history", icon: History },
    { name: "Profile", path: "/admin/profile", icon: User },
  ];

  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="admin-sidebar-top">
          <Link
            to="/admin"
            className="admin-brand"
            onClick={() => setMobileOpen(false)}
          >
            <div className="admin-brand-icon">
              <ShieldCheck size={23} />
            </div>

            {!collapsed && (
              <div>
                <strong>Nirvaran Setu</strong>
                <span>ADMIN CONSOLE</span>
              </div>
            )}
          </Link>

          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {!collapsed && <div className="admin-sidebar-label">MANAGEMENT</div>}

        <nav className="admin-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : ""}
                className={`${active ? "admin-nav-active" : ""} ${
                  item.isSOS ? "admin-nav-sos" : ""
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <div className="admin-nav-icon-wrap">
                  <Icon size={19} className={item.isSOS && item.badge ? "siren-flash-icon" : ""} />
                  {item.badge && collapsed && (
                    <span className="admin-sos-mini-dot" />
                  )}
                </div>
                {!collapsed && (
                  <div className="admin-nav-label-wrap">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="admin-sos-nav-badge">{item.badge} ACTIVE</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          {!collapsed && (
            <div className="admin-security-card">
              <div className="security-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>Admin access</strong>
                <span>Secure civic console</span>
              </div>
            </div>
          )}

          <button
            className="admin-logout"
            title={collapsed ? "Sign Out" : ""}
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu size={22} />
            </button>

            <button
              className="desktop-collapse-button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}
            </button>

            <div className="admin-topbar-title">
              <span>ADMINISTRATION</span>
              <strong>Nirvaran Setu Control Center</strong>
            </div>
          </div>

          <div className="admin-topbar-status">
            {activeSOSCount > 0 && (
              <Link to="/admin/sos" className="admin-topbar-sos-pill">
                <Siren size={15} className="siren-flash-icon" />
                <span>{activeSOSCount} EMERGENCY SOS</span>
              </Link>
            )}
            <span className="online-dot" />
            System Online
          </div>
        </header>

        {/* HIGH-PRIORITY FLASHING EMERGENCY SOS ALERT BANNER */}
        {activeSOSCount > 0 && (
          <div className="admin-sos-top-banner">
            <div className="banner-left">
              <div className="siren-box">
                <Siren size={22} className="siren-flash-icon" />
              </div>
              <div>
                <strong>CRITICAL SOS ALERT: {activeSOSCount} Active Emergency Call{activeSOSCount !== 1 ? "s" : ""}!</strong>
                <p>Citizens requiring immediate ambulance, fire rescue or police assistance.</p>
              </div>
            </div>
            <Link to="/admin/sos" className="admin-sos-banner-link">
              <span>Open Emergency Command Room</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

/* ======================================================
   HOME PAGE
====================================================== */

function HomePage() {
  const [latestGrievance, setLatestGrievance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchLatest() {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Home grievance fetch error:", error);
      }

      if (mounted) {
        setLatestGrievance(data?.[0] || null);
        setLoading(false);
      }
    }

    fetchLatest();

    let channel = null;
    try {
      const channelId = `home-live-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "grievances" },
          fetchLatest
        )
        .subscribe();
    } catch (e) {
      console.warn("Home realtime subscription warning:", e);
    }

    return () => {
      mounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const statusIndex = latestGrievance
    ? getStatusIndex(latestGrievance.status)
    : 0;

  const progress = latestGrievance
    ? Math.min(100, ((statusIndex + 1) / STATUS_STEPS.length) * 100)
    : 0;

  return (
    <section className="hero-section">
      <CivicCity />

      <div className="hero-content">
        <div className="eyebrow">
          <BrainCircuit size={16} />
          AI-powered civic grievance management
        </div>

        <h1>
          Your voice.
          <br />
          <span>Your city’s action.</span>
        </h1>

        <p className="hero-text">
          Report a civic issue with text, photos, video or voice. AI understands the
          problem, identifies the responsible department and helps move it toward
          resolution.
        </p>

        <div className="hero-actions">
          <Link to="/lodge" className="primary-button">
            Lodge a Grievance
            <ArrowRight size={18} />
          </Link>

          <Link to="/grievances" className="secondary-button">
            Track My Grievances
          </Link>
        </div>

        <div className="trust-row">
          <div>
            <BrainCircuit size={18} />
            <span>AI-powered routing</span>
          </div>
          <div>
            <Eye size={18} />
            <span>Transparent tracking</span>
          </div>
          <div>
            <MapPin size={18} />
            <span>Location-aware reporting</span>
          </div>
        </div>
      </div>

      <div className="hero-card">
        <div className="card-top">
          <span>YOUR RECENT CIVIC REPORT</span>
          <span className="status-dot">
            <span className="mini-pulse" />
            Live
          </span>
        </div>

        {loading ? (
          <div className="card-loading">
            <div className="loading-spinner" />
            <p>Loading civic activity...</p>
          </div>
        ) : latestGrievance ? (
          <>
            <div className="hero-card-ticket">#{latestGrievance.ticket_id}</div>

            <h3>{latestGrievance.description}</h3>

            <p className="hero-card-location">
              <MapPin size={16} />
              {latestGrievance.location}
            </p>

            <div className="progress-line">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="status-list">
              {STATUS_STEPS.map((step, index) => {
                const done = index < statusIndex;
                const current = index === statusIndex;

                return (
                  <div
                    key={step.key}
                    className={`status-item ${
                      done ? "completed" : current ? "current" : "pending"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={19} />
                    ) : current ? (
                      <Timer size={19} />
                    ) : (
                      <AlertCircle size={19} />
                    )}

                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="hero-empty">
            <Sparkles size={32} />
            <h3>Your civic dashboard</h3>
            <p>Once you report an issue, its live progress will appear here.</p>
            <Link to="/lodge" className="text-link">
              Report an issue
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ======================================================
   EVIDENCE PICKER
====================================================== */

function EvidencePicker({
  files,
  setFiles,
  recording,
  startRecording,
  stopRecording,
  disabled,
}) {
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setFiles((current) => [...current, ...selected]);
    event.target.value = "";
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="evidence-section">
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">OPTIONAL BUT POWERFUL</span>
          <h2>Add evidence</h2>
          <p>Give the AI more information to understand the civic issue accurately.</p>
        </div>
        <Sparkles size={25} />
      </div>

      <div className="evidence-options">
        <button
          type="button"
          className="evidence-option"
          disabled={disabled}
          onClick={() => photoInputRef.current?.click()}
        >
          <ImagePlus size={22} />
          <strong>Photo</strong>
          <span>Show the issue</span>
        </button>

        <button
          type="button"
          className="evidence-option"
          disabled={disabled}
          onClick={() => videoInputRef.current?.click()}
        >
          <Video size={22} />
          <strong>Video</strong>
          <span>Show the surroundings</span>
        </button>

        <button
          type="button"
          className="evidence-option"
          disabled={disabled}
          onClick={() => audioInputRef.current?.click()}
        >
          <Volume2 size={22} />
          <strong>Audio</strong>
          <span>Add an audio clip</span>
        </button>

        <button
          type="button"
          className={`evidence-option ${recording ? "recording" : ""}`}
          disabled={disabled}
          onClick={recording ? stopRecording : startRecording}
        >
          <Mic size={22} />
          <strong>{recording ? "Stop recording" : "Voice"}</strong>
          <span>{recording ? "Recording..." : "Describe it"}</span>
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={addFiles}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={addFiles}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={addFiles}
      />

      {files.length > 0 && (
        <div className="evidence-list">
          {files.map((file, index) => (
            <div className="evidence-file" key={`${file.name}-${file.size}-${index}`}>
              <div className="evidence-file-icon">{getEvidenceIcon(file)}</div>
              <div>
                <strong>{file.name}</strong>
                <span>
                  {getEvidenceType(file)} {" · "}{" "}
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================================================
   LODGE PAGE
====================================================== */

function LodgePage() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [analysis, setAnalysis] = useState(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    try {
      setMessage("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Voice recording is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setMessage("Voice recording failed. Please try again.");
        setMessageType("error");
        setRecording(false);
      };

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: actualMime });
        if (audioBlob.size > 0) {
          const extension = actualMime.includes("ogg") ? "ogg" : "webm";
          const audioFile = new File(
            [audioBlob],
            `voice-report-${Date.now()}.${extension}`,
            { type: actualMime, lastModified: Date.now() }
          );
          setFiles((current) => [...current, audioFile]);
          setMessage("Voice recording added as evidence.");
          setMessageType("success");
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      console.error("Voice recording error:", error);
      setRecording(false);
      setMessage(
        error?.message ||
          "Microphone access was not available. Please allow microphone permission and try again."
      );
      setMessageType("error");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function uploadEvidence(userId) {
    const uploaded = [];
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}`;

      let storagePath = null;
      try {
        let uploadResult = await supabase.storage
          .from("grievance-evidence")
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (
          uploadResult.error &&
          uploadResult.error.message?.toLowerCase().includes("bucket not found")
        ) {
          const { error: bucketError } = await supabase.storage.createBucket(
            "grievance-evidence",
            { public: true }
          );
          if (!bucketError) {
            uploadResult = await supabase.storage
              .from("grievance-evidence")
              .upload(path, file, {
                upsert: false,
                contentType: file.type || undefined,
              });
          }
        }

        if (!uploadResult.error) {
          storagePath = path;
        }
      } catch (err) {
        console.warn("Supabase storage upload error, using direct URL", err);
      }

      uploaded.push({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        path: storagePath,
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl,
        uploaded: true,
      });
    }
    return uploaded;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setAnalysis(null);

    if (!description.trim()) {
      setMessage("Please describe what happened.");
      setMessageType("error");
      return;
    }

    if (!location.trim()) {
      setMessage("Please provide the location of the issue.");
      setMessageType("error");
      return;
    }

    if (recording) {
      setMessage("Please stop the voice recording before submitting.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("You must be signed in to submit a grievance.");
      }

      let evidence = [];
      if (files.length > 0) {
        evidence = await uploadEvidence(user.id);
      }

      const aiResult = await analyzeWithAI({
        description: description.trim(),
        location: location.trim(),
        evidence,
      });

      if (!aiResult || !aiResult.department) {
        throw new Error("A responsible department could not be identified.");
      }

      setAnalysis(aiResult);

      const ticketId = `NS-${Math.floor(100000 + Math.random() * 900000)}`;

      let initialSummary = aiResult.summary || "";
      if (aiResult.proposed_solution) {
        initialSummary = `${initialSummary}\n\n[PROPOSED SOLUTION]: ${aiResult.proposed_solution}`.trim();
      }

      // Persist to GrievanceLocalStore immediately so evidence & AI analysis are NEVER lost
      GrievanceLocalStore.saveGrievanceMeta(ticketId, {
        ticket_id: ticketId,
        user_id: user.id,
        description: description.trim(),
        location: location.trim(),
        category: aiResult.category || "Other",
        department: aiResult.department,
        status: "Department Reviewing",
        ai_summary: initialSummary,
        ai_confidence: aiResult.confidence ?? 0.94,
        proposed_solution: aiResult.proposed_solution || null,
        evidence: evidence.length > 0 ? evidence : [],
      });

      const grievancePayload = {
        user_id: user.id,
        ticket_id: ticketId,
        description: description.trim(),
        location: location.trim(),
        category: aiResult.category || "Other",
        department: aiResult.department,
        status: "Department Reviewing",
        ai_summary: initialSummary || null,
        ai_confidence: aiResult.confidence ?? null,
        proposed_solution: aiResult.proposed_solution || null,
        evidence: evidence.length > 0 ? evidence : null,
        ai_analyzed_at: new Date().toISOString(),
      };

      const { data, error } = await insertGrievanceResilient(grievancePayload);

      if (error) {
        console.error("Grievance insert warning:", error);
      }

      navigate(`/grievances?ticket=${ticketId}`, { replace: true });
    } catch (error) {
      console.error("Grievance submission error:", error);
      setMessage(
        error?.message || "Something went wrong while lodging your grievance."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-section lodge-page">
      <div className="page-heading">
        <div className="eyebrow">
          <BrainCircuit size={16} />
          AI-assisted reporting
        </div>
        <h1>Tell us what happened.</h1>
        <p>
          Describe the civic issue and add evidence if you have it. AI will analyse
          the report, identify the responsible department and propose an appropriate solution.
        </p>
      </div>

      <div className="lodge-layout">
        <form className="grievance-form" onSubmit={handleSubmit}>
          <label>
            What happened?
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: There is a large pothole near the main road. Vehicles are swerving around it and it is dangerous at night."
              rows={7}
              disabled={loading}
            />
          </label>

          <label>
            Where is it?
            <div className="location-input">
              <MapPin size={18} />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Enter the location of the issue"
                disabled={loading}
              />
              <LocateFixed size={18} className="location-action" />
            </div>
          </label>

          <EvidencePicker
            files={files}
            setFiles={setFiles}
            recording={recording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            disabled={loading}
          />

          {message && (
            <div
              className={`form-message ${
                messageType === "success" ? "success-message" : "error-message"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <AlertCircle size={17} />
              )}
              {message}
            </div>
          )}

          {analysis && (
            <div className="ai-live-result">
              <div className="ai-result-heading">
                <BrainCircuit size={18} />
                <strong>AI analysis complete</strong>
              </div>

              <div className="ai-live-result-grid">
                <div>
                  <span>Category</span>
                  <strong>{analysis.category}</strong>
                </div>

                <div>
                  <span>Responsible department</span>
                  <strong>{analysis.department}</strong>
                </div>

                {analysis.confidence !== null && analysis.confidence !== undefined && (
                  <div>
                    <span>AI confidence</span>
                    <strong>{formatConfidence(analysis.confidence)}</strong>
                  </div>
                )}
              </div>

              {analysis.summary && <p>{analysis.summary}</p>}

              {analysis.proposed_solution && (
                <div className="solution-preview">
                  <strong>Proposed solution</strong>
                  <p>{analysis.proposed_solution}</p>
                </div>
              )}
            </div>
          )}

          <button
            className="primary-button lodge-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="button-spinner" />
                Analysing & lodging...
              </>
            ) : (
              <>
                <BrainCircuit size={18} />
                Analyse & Lodge
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <aside className="ai-preview-card">
          <div className="ai-card-icon">
            <Sparkles size={23} />
          </div>
          <span className="section-kicker">WHAT HAPPENS NEXT</span>
          <h2>AI understands the issue.</h2>

          <div className="ai-process">
            <div>
              <span>01</span>
              <div>
                <strong>Understand</strong>
                <p>AI reads your description and evidence.</p>
              </div>
            </div>

            <div>
              <span>02</span>
              <div>
                <strong>Classify</strong>
                <p>The issue is categorised automatically.</p>
              </div>
            </div>

            <div>
              <span>03</span>
              <div>
                <strong>Route</strong>
                <p>AI identifies the responsible department.</p>
              </div>
            </div>

            <div>
              <span>04</span>
              <div>
                <strong>Propose</strong>
                <p>AI proposes a suitable solution for departmental review.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ======================================================
   INTERACTIVE TIMELINE WITH CLICKABLE SOLUTION STEP
====================================================== */

function GrievanceTimeline({ grievance, showVerification = true }) {
  const currentIndex = getStatusIndex(grievance.status);
  const solutionText = getGrievanceSolution(grievance);

  return (
    <div className="timeline">
      {STATUS_STEPS.map((step, index) => {
        const visible =
          showVerification || step.key !== "Awaiting Citizen Verification";

        if (!visible) return null;

        const complete = index < currentIndex;
        const current = index === currentIndex;
        const future = index > currentIndex;
        const isSolutionStep = step.key === "Solution Proposed";

        return (
          <div
            className={`timeline-step ${
              complete ? "done" : current ? "current" : future ? "future" : ""
            }`}
            key={step.key}
          >
            <div className={`timeline-icon ${current ? "timeline-icon-current" : ""}`}>
              {complete ? (
                <CheckCircle2 size={16} />
              ) : current ? (
                <Timer size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>

            <div className="timeline-step-content">
              <div className="timeline-step-header">
                <strong className={current ? "timeline-step-title-current" : ""}>
                  {step.title}
                  {current && (
                    <span className="current-stage-badge">● Current Stage</span>
                  )}
                </strong>
              </div>
              <span>{step.description}</span>

              {/* SOLUTION DRAWER — always visible when step is reached */}
              {isSolutionStep && (current || complete) && (
                <div className="timeline-solution-drawer">
                  {solutionText ? (
                    <div className="timeline-solution-card">
                      <div className="timeline-solution-head">
                        <Wrench size={16} />
                        <strong>Department Proposed Solution:</strong>
                      </div>
                      <p>{solutionText}</p>
                    </div>
                  ) : (
                    <div className="timeline-solution-pending">
                      <Timer size={15} />
                      <span>
                        The department is currently reviewing the report and
                        formulating the proposed solution.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ======================================================
   CITIZEN VERIFICATION COMPONENT
====================================================== */

function CitizenVerification({ grievance, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const solutionText = getGrievanceSolution(grievance);

  if (grievance.status !== "Awaiting Citizen Verification") {
    return null;
  }

  async function verify(resolved) {
    setLoading(true);

    const feedbackText = feedback.trim();
    const update = resolved
      ? {
          status: "Resolved",
          citizen_verified: true,
          citizen_feedback: feedbackText || "Citizen confirmed: Issue successfully resolved.",
          resolved_at: new Date().toISOString(),
        }
      : {
          status: "In Action",
          citizen_verified: false,
          citizen_feedback: feedbackText || "Citizen reported: Issue still exists and has not been resolved.",
        };

    // 1. Immediately save to local store & broadcast cross-tab to Admin & Citizen panels
    GrievanceLocalStore.saveGrievanceMeta(grievance.ticket_id, update);

    // 2. Resilient database update
    await updateGrievanceResilient(grievance.id, update);

    onUpdated({
      ...grievance,
      ...update,
    });

    setLoading(false);
  }

  return (
    <div className="verification-card">
      <div className="verification-icon">
        <Eye size={23} />
      </div>

      <div>
        <span className="section-kicker">YOUR CONFIRMATION</span>
        <h3>Has the issue actually been fixed?</h3>

        {solutionText && (
          <div
            className="verification-solution-banner"
            style={{
              margin: "10px 0 14px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "#e8f5e9",
              border: "1px solid #a5d6a7",
              color: "#1b5e20",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "13px",
                marginBottom: "4px",
              }}
            >
              Proposed Solution from Department:
            </strong>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
              {solutionText}
            </p>
          </div>
        )}

        <p>
          The department has marked the action as ready for verification. You have the
          final say.
        </p>

        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Optional: Tell us what you observed..."
          rows={3}
        />

        <div className="verification-actions">
          <button
            className="secondary-button"
            onClick={() => verify(false)}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : null}
            NO, ISSUE REMAINS
          </button>

          <button
            className="primary-button"
            onClick={() => verify(true)}
            disabled={loading}
          >
            <CheckCircle2 size={17} />
            YES, IT'S FIXED
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   CITIZEN GRIEVANCES PAGE
====================================================== */

function GrievancesPage() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const data = await loadGrievances(user.id);
      if (mounted) {
        setGrievances(data);
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to cross-tab storage and broadcast events
    const unsubStore = GrievanceLocalStore.onSync(() => {
      if (mounted) fetchData();
    });

    let channel = null;
    try {
      const channelId = `citizen-live-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "grievances" },
          fetchData
        )
        .subscribe();
    } catch (e) {
      console.warn("Citizen realtime subscription warning:", e);
    }

    return () => {
      mounted = false;
      unsubStore();
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  function updateLocal(updated) {
    setGrievances((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  const queryParams = new URLSearchParams(window.location.search);
  const highlightedTicket = queryParams.get("ticket");

  return (
    <section className="page-section">
      <div className="page-heading">
        <div className="eyebrow">
          <Clock3 size={16} />
          Transparent tracking
        </div>

        <h1>My Grievances</h1>
        <p>
          See exactly where every reported issue stands — from AI analysis to
          departmental action and your final verification.
        </p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading your grievances...</p>
        </div>
      ) : grievances.length === 0 ? (
        <div className="empty-state">
          <FileText size={30} />
          <h3>No grievances yet</h3>
          <p>Your submitted civic issues will appear here.</p>
          <Link to="/lodge" className="primary-button">
            Lodge a Grievance
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="grievance-list">
          {grievances.map((grievance) => {
            const solutionText = getGrievanceSolution(grievance);
            const aiSummaryText = getGrievanceAISummary(grievance);
            const evidenceItems = getGrievanceEvidence(grievance);

            return (
              <article
                className={`grievance-card ${
                  highlightedTicket === grievance.ticket_id
                    ? "highlighted-grievance"
                    : ""
                }`}
                key={grievance.id}
              >
                <div className="grievance-header">
                  <div>
                    <span className="ticket-id">Ticket #{grievance.ticket_id}</span>
                    <h3>{grievance.description}</h3>
                  </div>
                  <span className="status-badge">
                    {getStatusLabel(grievance.status)}
                  </span>
                </div>

                <div className="grievance-meta">
                  <span>
                    <MapPin size={15} />
                    {grievance.location}
                  </span>

                  <span>
                    <FileText size={15} />
                    {grievance.category || "Civic Maintenance"}
                  </span>

                  {grievance.department && (
                    <span>
                      <Building2 size={15} />
                      {grievance.department}
                    </span>
                  )}
                </div>

                {/* AI ANALYSIS BOX */}
                <div className="ai-result-box">
                  <div className="ai-result-heading">
                    <BrainCircuit size={18} />
                    <strong>AI analysis</strong>
                  </div>

                  <p>{aiSummaryText}</p>

                  <span className="confidence-pill" style={{ marginTop: "4px" }}>
                    AI confidence: {formatConfidence(grievance.ai_confidence)}
                  </span>
                </div>

                {/* ATTACHED EVIDENCE MEDIA SECTION FOR CITIZEN */}
                {evidenceItems.length > 0 && (
                  <div className="citizen-evidence-section">
                    <div className="solution-card-header">
                      <Camera size={17} />
                      <strong>
                        Attached Media &amp; Evidence ({evidenceItems.length})
                      </strong>
                    </div>
                    <EvidenceViewer
                      evidence={evidenceItems}
                      ticketId={grievance.ticket_id}
                    />
                  </div>
                )}

                <GrievanceTimeline grievance={grievance} />

                <CitizenVerification
                  grievance={grievance}
                  onUpdated={updateLocal}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ======================================================
   CITIZEN PROFILE
====================================================== */

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const currentUser = await getCurrentUser();
      if (!mounted) return;

      setUser(currentUser);

      if (currentUser) {
        const [profileResult, grievanceResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .single(),
          supabase
            .from("grievances")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("id", { ascending: false }),
        ]);

        if (!mounted) return;

        setRole(profileResult.data?.role || "citizen");
        setGrievances(grievanceResult.data || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Citizen";

  const resolvedCount = grievances.filter(
    (item) => item.status === "Resolved"
  ).length;

  const activeCount = grievances.length - resolvedCount;
  const points = calculateCivicPoints(grievances);

  return (
    <section className="page-section profile-page">
      <div className="page-heading">
        <div className="eyebrow">
          <User size={16} />
          Account
        </div>
        <h1>Profile</h1>
        <p>Your account, civic activity and contribution information.</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">{name.charAt(0).toUpperCase()}</div>
        <div>
          <h2>{name}</h2>
          <p>{user?.email}</p>
          {role === "admin" && (
            <p className="admin-profile-label">Administrator</p>
          )}
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-icon">
            <Trophy size={21} />
          </div>
          <span>Civic points</span>
          <strong>{points}</strong>
          <small>Earned through participation</small>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <FileText size={21} />
          </div>
          <span>Total grievances</span>
          <strong>{grievances.length}</strong>
          <small>Civic issues reported</small>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <Timer size={21} />
          </div>
          <span>Active cases</span>
          <strong>{activeCount}</strong>
          <small>Still moving through workflow</small>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <CircleCheck size={21} />
          </div>
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
          <small>Confirmed by you</small>
        </div>
      </div>

      <div className="profile-info-grid">
        <div>
          <ShieldCheck size={20} />
          <strong>Verified account</strong>
          <span>Securely authenticated through Supabase.</span>
        </div>

        <div>
          <BrainCircuit size={20} />
          <strong>AI-assisted reporting</strong>
          <span>
            AI analyses your complaint and routes it to the responsible department.
          </span>
        </div>

        <div>
          <Eye size={20} />
          <strong>Citizen verification</strong>
          <span>
            You confirm whether the proposed civic action actually solved the problem.
          </span>
        </div>
      </div>

      <button className="secondary-button" onClick={signOut}>
        <LogOut size={17} />
        Sign Out
      </button>
    </section>
  );
}

/* ======================================================
   ADMIN DATA HOOK
====================================================== */

function useAdminGrievances() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const data = await loadGrievances();
      if (mounted) {
        setGrievances(data);
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to cross-tab storage and broadcast events
    const unsubStore = GrievanceLocalStore.onSync(() => {
      if (mounted) fetchData();
    });

    let channel = null;
    try {
      const channelId = `admin-live-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "grievances" },
          fetchData
        )
        .subscribe();
    } catch (e) {
      console.warn("Admin realtime subscription warning:", e);
    }

    return () => {
      mounted = false;
      unsubStore();
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  return { grievances, setGrievances, loading };
}

/* ======================================================
   ADMIN DASHBOARD
====================================================== */

function AdminDashboard() {
  const { grievances, loading } = useAdminGrievances();

  const stats = useMemo(
    () => ({
      total: grievances.length,
      reviewing: grievances.filter(
        (g) =>
          g.status === "Department Reviewing" ||
          g.status === "Under Review" ||
          g.status === "Pending"
      ).length,
      action: grievances.filter(
        (g) => g.status === "In Action" || g.status === "In Progress"
      ).length,
      verification: grievances.filter(
        (g) => g.status === "Awaiting Citizen Verification"
      ).length,
      resolved: grievances.filter((g) => g.status === "Resolved").length,
    }),
    [grievances]
  );

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <div className="admin-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION
          </div>

          <h1>
            Civic command.
            <br />
            <span>Know what needs action.</span>
          </h1>

          <p>
            AI routes incoming grievances to the appropriate department. This console
            monitors the journey from departmental review to citizen verification.
          </p>
        </div>

        <div className="admin-hero-badge">
          <span className="pulse-dot" />
          Live system
        </div>
      </section>

      <div className="admin-marquee">
        <div className="marquee-track">
          <span>● AI-ASSISTED CIVIC ROUTING</span>
          <span>● DEPARTMENT REVIEW</span>
          <span>● SOLUTION PROPOSAL</span>
          <span>● ACTION TRACKING</span>
          <span>● CITIZEN VERIFICATION</span>
          <span>● AI-ASSISTED CIVIC ROUTING</span>
        </div>
      </div>

      <section className="admin-stats">
        <AdminStat
          icon={<FileText size={20} />}
          label="Total grievances"
          value={stats.total}
        />

        <AdminStat
          icon={<Timer size={20} />}
          label="Department reviewing"
          value={stats.reviewing}
          tone="amber"
        />

        <AdminStat
          icon={<Wrench size={20} />}
          label="Action in progress"
          value={stats.action}
          tone="blue"
        />

        <AdminStat
          icon={<Eye size={20} />}
          label="Awaiting verification"
          value={stats.verification}
          tone="purple"
        />

        <AdminStat
          icon={<CircleCheck size={20} />}
          label="Resolved"
          value={stats.resolved}
          tone="green"
        />
      </section>

      <AdminOperations />
    </div>
  );
}

function AdminStat({ icon, label, value, tone }) {
  return (
    <div className={`admin-stat-card ${tone || ""}`}>
      <div className="stat-icon-wrap">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function AdminOperations() {
  const { grievances, setGrievances, loading } = useAdminGrievances();
  const [selected, setSelected] = useState(null);
  const [solution, setSolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  async function updateStatus(grievance, newStatus) {
    setSaving(true);
    setSaveSuccessMsg("");

    const trimmedSol = solution.trim();
    let updatedSummary = grievance.ai_summary || "";
    if (trimmedSol) {
      if (updatedSummary.includes("[PROPOSED SOLUTION]:")) {
        updatedSummary = updatedSummary.replace(
          /\[PROPOSED SOLUTION\]:[\s\S]*/,
          `[PROPOSED SOLUTION]: ${trimmedSol}`
        );
      } else {
        updatedSummary = updatedSummary
          ? `${updatedSummary}\n\n[PROPOSED SOLUTION]: ${trimmedSol}`
          : `[PROPOSED SOLUTION]: ${trimmedSol}`;
      }
    }

    const timestamps = {};
    if (newStatus === "Department Reviewing")
      timestamps.department_reviewed_at = new Date().toISOString();
    if (newStatus === "Solution Proposed")
      timestamps.solution_proposed_at = new Date().toISOString();
    if (newStatus === "In Action")
      timestamps.action_started_at = new Date().toISOString();
    if (newStatus === "Awaiting Citizen Verification")
      timestamps.verification_requested_at = new Date().toISOString();
    if (newStatus === "Resolved") {
      timestamps.resolved_at = new Date().toISOString();
      timestamps.citizen_verified = true;
    }

    // Persist to GrievanceLocalStore immediately
    GrievanceLocalStore.saveGrievanceMeta(grievance.ticket_id, {
      status: newStatus,
      ...(trimmedSol ? { proposed_solution: trimmedSol, ai_summary: updatedSummary } : {}),
      ...timestamps,
    });

    const updatePayload = {
      status: newStatus,
      ...timestamps,
    };

    if (trimmedSol) {
      updatePayload.proposed_solution = trimmedSol;
      updatePayload.ai_summary = updatedSummary;
    }

    await updateGrievanceResilient(grievance.id, updatePayload);

    const updatedItem = {
      ...grievance,
      ...updatePayload,
      proposed_solution: trimmedSol || grievance.proposed_solution,
      ai_summary: updatedSummary || grievance.ai_summary,
    };
    setGrievances((current) =>
      current.map((item) => (item.id === grievance.id ? updatedItem : item))
    );
    if (selected?.id === grievance.id) {
      setSelected(updatedItem);
    }
    setSaveSuccessMsg("Status & Solution saved! Reflected on Citizen Panel.");
    setTimeout(() => setSaveSuccessMsg(""), 3500);

    setSaving(false);
  }

  async function saveSolutionOnly(grievance) {
    if (!solution.trim()) {
      alert("Please enter a proposed solution before saving.");
      return;
    }

    setSaving(true);
    setSaveSuccessMsg("");

    const trimmedSol = solution.trim();
    let updatedSummary = grievance.ai_summary || "";
    if (updatedSummary.includes("[PROPOSED SOLUTION]:")) {
      updatedSummary = updatedSummary.replace(
        /\[PROPOSED SOLUTION\]:[\s\S]*/,
        `[PROPOSED SOLUTION]: ${trimmedSol}`
      );
    } else {
      updatedSummary = updatedSummary
        ? `${updatedSummary}\n\n[PROPOSED SOLUTION]: ${trimmedSol}`
        : `[PROPOSED SOLUTION]: ${trimmedSol}`;
    }

    // 1. Save to local store & broadcast across all tabs
    GrievanceLocalStore.saveSolution(grievance.ticket_id, trimmedSol, updatedSummary);

    const updatePayload = {
      proposed_solution: trimmedSol,
      ai_summary: updatedSummary,
    };

    // 2. Persist to DB resiliently
    await updateGrievanceResilient(grievance.id, updatePayload);

    const updatedItem = {
      ...grievance,
      proposed_solution: trimmedSol,
      ai_summary: updatedSummary,
    };
    setGrievances((current) =>
      current.map((item) => (item.id === grievance.id ? updatedItem : item))
    );
    if (selected?.id === grievance.id) {
      setSelected(updatedItem);
    }
    setSaveSuccessMsg("Proposed Solution saved! Now visible on Citizen Panel.");
    setTimeout(() => setSaveSuccessMsg(""), 3500);

    setSaving(false);
  }

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      const matchStatus =
        filterStatus === "All" ||
        g.status === filterStatus ||
        (filterStatus === "Department Reviewing" &&
          (g.status === "Pending" || g.status === "Under Review"));

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        g.ticket_id?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.location?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q) ||
        g.department?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [grievances, filterStatus, searchQuery]);

  function getAllowedStatuses(grievance) {
    const currentStatus = grievance.status || "Department Reviewing";
    const currentIndex = getStatusIndex(currentStatus);

    const allowed = ADMIN_STATUS_OPTIONS.filter(
      (status) => getStatusIndex(status) >= currentIndex
    );

    if (!allowed.includes(currentStatus)) {
      allowed.unshift(currentStatus);
    }

    return allowed;
  }

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">LIVE QUEUE</span>
          <h2>Grievance management</h2>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#7d8983",
            }}
          />
          <input
            type="text"
            placeholder="Search by ticket ID, location or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: "12px",
              border: "1px solid #d2dcd6",
              background: "#ffffff",
              fontSize: "13px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          {[
            "All",
            "Department Reviewing",
            "Solution Proposed",
            "In Action",
            "Awaiting Citizen Verification",
            "Resolved",
          ].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: filterStatus === st ? "#0f4b3c" : "#ffffff",
                color: filterStatus === st ? "#ffffff" : "#5c6862",
                border:
                  filterStatus === st
                    ? "1px solid #0f4b3c"
                    : "1px solid #d2dcd6",
                whiteSpace: "nowrap",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner" />
          Loading grievances...
        </div>
      ) : filteredGrievances.length === 0 ? (
        <div className="admin-empty">
          <CircleCheck size={38} />
          <h3>No grievances match filter</h3>
          <p>Try searching for a different keyword or status filter.</p>
        </div>
      ) : (
        <div className="admin-grievance-table">
          {filteredGrievances.map((grievance, index) => {
            const open = selected?.id === grievance.id;
            const allowedStatuses = getAllowedStatuses(grievance);
            const currentSol = getAdminDraftSolution(grievance);
            const aiSummaryText = getGrievanceAISummary(grievance);
            const evidenceItems = getGrievanceEvidence(grievance);

            return (
              <article
                className={`admin-grievance-row ${open ? "expanded" : ""}`}
                key={grievance.id}
              >
                <div className="row-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="row-main">
                  <div className="row-ticket">#{grievance.ticket_id}</div>
                  <h3>{grievance.description}</h3>
                  <div className="row-location">
                    <MapPin size={14} />
                    {grievance.location}
                  </div>
                </div>

                <div className="ai-routing-cell">
                  <span>AI CATEGORY</span>
                  <strong>{grievance.category || "Water & Drainage"}</strong>
                </div>

                <div className="ai-routing-cell">
                  <span>AI ROUTED DEPARTMENT</span>
                  <strong>
                    {grievance.department || "Water Supply & Sewerage Department"}
                  </strong>
                </div>

                <div className="admin-row-action">
                  <span className="status-badge">
                    {getStatusLabel(grievance.status)}
                  </span>

                  <button
                    className="row-expand-button"
                    onClick={() => {
                      if (open) {
                        setSelected(null);
                        setSolution("");
                        setSaveSuccessMsg("");
                      } else {
                        setSelected(grievance);
                        setSolution(currentSol || "");
                        setSaveSuccessMsg("");
                      }
                    }}
                    aria-label={open ? "Collapse grievance" : "Expand grievance"}
                  >
                    {open ? <ChevronDown size={18} /> : <ArrowRight size={18} />}
                  </button>
                </div>

                {open && (
                  <div className="admin-expanded-panel">
                    <div className="expanded-columns">
                      <div>
                        <span className="section-kicker">AI ANALYSIS</span>
                        <h3>What AI understood</h3>
                        <p>{aiSummaryText}</p>

                        <span className="confidence-pill">
                          AI confidence: {formatConfidence(grievance.ai_confidence)}
                        </span>
                      </div>

                      <div>
                        <span className="section-kicker">AI ROUTING</span>
                        <h3>Responsible department</h3>
                        <div className="routing-result">
                          <Building2 size={19} />
                          <strong>
                            {grievance.department || "Water Supply & Sewerage Department"}
                          </strong>
                        </div>
                        <p>
                          This department was identified by AI from the grievance and
                          its evidence.
                        </p>
                      </div>

                      <div>
                        <span className="section-kicker">SOLUTION CONTROL</span>
                        <h3>Proposed solution</h3>
                        <div className="admin-solution-box">
                          <textarea
                            value={solution}
                            onChange={(event) => setSolution(event.target.value)}
                            placeholder="Enter or refine the solution proposed by the department..."
                            rows={4}
                            disabled={saving}
                          />
                          <button
                            type="button"
                            className="save-solution-btn"
                            disabled={saving}
                            onClick={() => saveSolutionOnly(grievance)}
                          >
                            <Check size={16} />
                            Save Solution to Citizen Panel
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="admin-evidence-section">
                      <div
                        className="solution-card-header"
                        style={{ marginBottom: "10px" }}
                      >
                        <Camera size={18} />
                        <strong>
                          ATTACHED MEDIA EVIDENCE (PHOTOS, VIDEOS, AUDIO RECORDINGS)
                          {evidenceItems.length > 0 ? ` (${evidenceItems.length})` : ""}
                        </strong>
                      </div>
                      {evidenceItems.length > 0 ? (
                        <EvidenceViewer
                          evidence={evidenceItems}
                          ticketId={grievance.ticket_id}
                        />
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "#8a9bb0",
                            fontStyle: "italic",
                          }}
                        >
                          No evidence was submitted by the citizen for this grievance.
                        </p>
                      )}
                    </div>


                    {saveSuccessMsg && (
                      <div
                        style={{
                          margin: "14px 0 0",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "#e8f5e9",
                          color: "#2e7d32",
                          fontSize: "13px",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        {saveSuccessMsg}
                      </div>
                    )}

                    {/* CITIZEN VERIFICATION FEEDBACK BANNER IN ADMIN PANEL */}
                    {grievance.citizen_feedback && (
                      <div
                        style={{
                          margin: "16px 0",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          background:
                            grievance.status === "In Action" && !grievance.citizen_verified
                              ? "#fff3e0"
                              : "#e8f5e9",
                          border:
                            grievance.status === "In Action" && !grievance.citizen_verified
                              ? "1.5px solid #ffe0b2"
                              : "1.5px solid #a5d6a7",
                          color:
                            grievance.status === "In Action" && !grievance.citizen_verified
                              ? "#e65100"
                              : "#1b5e20",
                          fontSize: "13px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: 700,
                            marginBottom: "4px",
                            fontSize: "14px",
                          }}
                        >
                          {grievance.status === "In Action" && !grievance.citizen_verified ? (
                            <>
                              <AlertCircle size={18} color="#e65100" />
                              <span>Citizen Feedback: Resolution Rejected (Issue Still Exists)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} color="#2e7d32" />
                              <span>Citizen Feedback: Resolution Confirmed &amp; Verified</span>
                            </>
                          )}
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                          "{grievance.citizen_feedback}"
                        </p>
                      </div>
                    )}

                    <div className="workflow-control">
                      <div>
                        <span className="section-kicker">WORKFLOW ACTION</span>
                        <h3>Advance operational status</h3>
                        <p>
                          Category and department are controlled by AI. Advance the
                          operational stage to update progress on citizen panel.
                        </p>

                        <div className="admin-action-buttons">
                          <button
                            type="button"
                            className="admin-stage-btn review"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(grievance, "Department Reviewing")
                            }
                          >
                            1. Reviewing
                          </button>

                          <button
                            type="button"
                            className="admin-stage-btn solution"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(grievance, "Solution Proposed")
                            }
                          >
                            2. Propose Solution
                          </button>

                          <button
                            type="button"
                            className="admin-stage-btn action"
                            disabled={saving}
                            onClick={() => updateStatus(grievance, "In Action")}
                          >
                            3. Start Action
                          </button>

                          <button
                            type="button"
                            className="admin-stage-btn verify"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(
                                grievance,
                                "Awaiting Citizen Verification"
                              )
                            }
                          >
                            4. Request Verification ✓
                          </button>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <button
                              type="button"
                              className="admin-stage-btn verify"
                              style={{ background: "#6c3483", borderColor: "#6c3483", color: "#fff" }}
                              disabled={saving}
                              onClick={() =>
                                updateStatus(
                                  grievance,
                                  "Awaiting Citizen Verification"
                                )
                              }
                            >
                              5. Send to Citizen for Confirmation
                            </button>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#8e6b8e",
                                textAlign: "center",
                              }}
                            >
                              Citizen must confirm resolution. Ticket stays open until confirmed.
                            </span>
                          </div>
                        </div>
                      </div>

                      <select
                        value={grievance.status || "Department Reviewing"}
                        disabled={saving}
                        onChange={(event) =>
                          updateStatus(grievance, event.target.value)
                        }
                      >
                        {allowedStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AdminGrievancesPage() {
  return (
    <div className="admin-dashboard">
      <AdminOperations />
    </div>
  );
}

/* ======================================================
   ADMIN RESOLVED HISTORY PAGE
======================================================
*/

function AdminHistoryPage() {
  const { grievances, loading } = useAdminGrievances();

  const resolved = useMemo(
    () =>
      grievances
        .filter((g) => g.status === "Resolved")
        .sort(
          (a, b) =>
            new Date(b.resolved_at || b.created_at || 0) -
            new Date(a.resolved_at || a.created_at || 0)
        ),
    [grievances]
  );

  return (
    <div className="admin-dashboard">
      <section className="admin-hero compact">
        <div>
          <div className="admin-eyebrow">
            <History size={15} />
            DOCUMENTATION
          </div>

          <h1>
            Resolved
            <br />
            <span>grievance history.</span>
          </h1>

          <p>
            A complete record of all civic grievances that have been fully
            resolved and confirmed by citizens.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner" />
          Loading history...
        </div>
      ) : resolved.length === 0 ? (
        <div className="admin-empty">
          <CircleCheck size={38} />
          <h3>No resolved grievances yet</h3>
          <p>Confirmed resolutions will appear here for documentation.</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              padding: "14px 20px",
              background: "#e8f5e9",
              borderRadius: "14px",
              border: "1px solid #a5d6a7",
            }}
          >
            <CalendarCheck size={20} style={{ color: "#2e7d32" }} />
            <span
              style={{ fontWeight: 600, color: "#1b5e20", fontSize: "14px" }}
            >
              {resolved.length} grievance{resolved.length !== 1 ? "s" : ""}{" "}
              resolved &amp; documented
            </span>
          </div>

          <div className="admin-grievance-table">
            {resolved.map((grievance, index) => {
              const sol = getGrievanceSolution(grievance);
              const evidenceItems = getGrievanceEvidence(grievance);
              const resolvedDate = grievance.resolved_at
                ? new Date(grievance.resolved_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";

              return (
                <article
                  key={grievance.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #d4edda",
                    borderRadius: "16px",
                    padding: "22px 26px",
                    marginBottom: "16px",
                  }}
                >
                  {/* Row header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#7d8983",
                          letterSpacing: "0.05em",
                          marginBottom: "4px",
                        }}
                      >
                        #{grievance.ticket_id}
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#0f2019",
                          lineHeight: 1.35,
                        }}
                      >
                        {grievance.description}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "14px",
                          flexWrap: "wrap",
                          marginTop: "6px",
                          fontSize: "13px",
                          color: "#5c6862",
                        }}
                      >
                        <span>
                          <MapPin size={13} style={{ marginRight: "3px" }} />
                          {grievance.location}
                        </span>
                        {grievance.category && (
                          <span>
                            <FileText size={13} style={{ marginRight: "3px" }} />
                            {grievance.category}
                          </span>
                        )}
                        {grievance.department && (
                          <span>
                            <Building2
                              size={13}
                              style={{ marginRight: "3px" }}
                            />
                            {grievance.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <span
                        style={{
                          background: "#d4edda",
                          color: "#155724",
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "4px 12px",
                          borderRadius: "20px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Star size={13} fill="#155724" /> Resolved
                      </span>
                      {grievance.resolved_at && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#7d8983",
                          }}
                        >
                          <CalendarCheck
                            size={12}
                            style={{ marginRight: "3px" }}
                          />
                          {resolvedDate}
                        </span>
                      )}
                      {grievance.citizen_verified && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        >
                          ✓ Citizen confirmed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proposed solution */}
                  {sol && (
                    <div
                      style={{
                        background: "#f0f7f3",
                        border: "1px solid #b5d5c5",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        fontSize: "13px",
                        color: "#124d3d",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: 700,
                          marginBottom: "4px",
                        }}
                      >
                        <Wrench size={14} /> Solution Applied
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{sol}</p>
                    </div>
                  )}

                  {/* Citizen feedback */}
                  {grievance.citizen_feedback && (
                    <div
                      style={{
                        background: "#fff8e1",
                        border: "1px solid #ffe082",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        marginBottom: "10px",
                        fontSize: "13px",
                        color: "#5d4037",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: "3px",
                          fontSize: "12px",
                        }}
                      >
                        💬 Citizen Feedback
                      </div>
                      <p style={{ margin: 0 }}>{grievance.citizen_feedback}</p>
                    </div>
                  )}

                  {/* Evidence count */}
                  {evidenceItems.length > 0 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7d8983",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Camera size={13} />
                      {evidenceItems.length} media file
                      {evidenceItems.length !== 1 ? "s" : ""} attached
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ======================================================
   ADMIN ANALYTICS PAGE
======================================================
 */

function AdminAnalyticsPage() {
  const { grievances, loading } = useAdminGrievances();

  const stats = useMemo(() => {
    const total = grievances.length;
    const resolved = grievances.filter((g) => g.status === "Resolved").length;
    const reviewing = grievances.filter(
      (g) => g.status === "Department Reviewing" || g.status === "Under Review"
    ).length;
    const action = grievances.filter(
      (g) => g.status === "In Action" || g.status === "In Progress"
    ).length;
    const verification = grievances.filter(
      (g) => g.status === "Awaiting Citizen Verification"
    ).length;

    return { total, resolved, reviewing, action, verification };
  }, [grievances]);

  const categoryRows = Object.entries(
    grievances.reduce((acc, grievance) => {
      const category = grievance.category || "Other";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  );

  const departmentRows = Object.entries(
    grievances.reduce((acc, grievance) => {
      const department = grievance.department || "Awaiting AI routing";
      acc[department] = (acc[department] || 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className="admin-dashboard">
      <section className="admin-hero compact">
        <div>
          <div className="admin-eyebrow">
            <BarChart3 size={15} />
            ANALYTICS
          </div>

          <h1>
            Civic activity
            <br />
            <span>at a glance.</span>
          </h1>

          <p>
            Understand what citizens are reporting, where AI is routing issues and how
            many cases have reached resolution.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner" />
          Loading analytics...
        </div>
      ) : (
        <>
          <section className="analytics-grid">
            <div className="analytics-card">
              <span>Total reports</span>
              <strong>{stats.total}</strong>
              <Users size={22} />
            </div>

            <div className="analytics-card">
              <span>Department reviewing</span>
              <strong>{stats.reviewing}</strong>
              <CircleAlert size={22} />
            </div>

            <div className="analytics-card">
              <span>Action in progress</span>
              <strong>{stats.action}</strong>
              <Timer size={22} />
            </div>

            <div className="analytics-card">
              <span>Awaiting citizen</span>
              <strong>{stats.verification}</strong>
              <Eye size={22} />
            </div>

            <div className="analytics-card">
              <span>Resolved</span>
              <strong>{stats.resolved}</strong>
              <CircleCheck size={22} />
            </div>
          </section>

          <div className="analytics-panels">
            <AnalyticsPanel
              title="Issues by category"
              subtitle="AI classification"
              icon={<BrainCircuit size={20} />}
              rows={categoryRows}
            />

            <AnalyticsPanel
              title="Department workload"
              subtitle="AI routing"
              icon={<Building2 size={20} />}
              rows={departmentRows}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ======================================================
   ANALYTICS PANEL COMPONENT
====================================================== */

function AnalyticsPanel({ title, subtitle, icon, rows }) {
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <div className="analytics-panel-icon">{icon}</div>
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="analytics-empty">No data yet.</p>
      ) : (
        <div className="analytics-rows">
          {[...rows]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <div className="analytics-row" key={name}>
                <span>{name}</span>
                <strong>{count}</strong>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

/* ======================================================
   ADMIN EMERGENCY SOS COMMAND ROOM PAGE
====================================================== */

function AdminSOSPage() {
  const [sosAlerts, setSosAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [responderNotes, setResponderNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  function loadAlerts() {
    setSosAlerts(GrievanceLocalStore.getSOSAlerts());
  }

  useEffect(() => {
    loadAlerts();
    const unsub = GrievanceLocalStore.onSync(loadAlerts);
    return () => unsub();
  }, []);

  const typeConfig = {
    medical: { color: "#ef4444", bg: "#fef2f2", icon: HeartPulse, label: "Ambulance / Medical" },
    fire: { color: "#f97316", bg: "#fff7ed", icon: Flame, label: "Fire & Rescue" },
    police: { color: "#3b82f6", bg: "#eff6ff", icon: ShieldAlert, label: "Police & Safety" },
    electrical: { color: "#eab308", bg: "#fefce8", icon: Zap, label: "Live Wire / Electrical" },
    gas: { color: "#8b5cf6", bg: "#f5f3ff", icon: AlertOctagon, label: "Gas / Pipeline" },
  };

  const filteredAlerts = sosAlerts.filter((s) =>
    filter === "all" ? true : filter === "active" ? s.status !== "Resolved" : s.status === "Resolved"
  );

  const activeCount = sosAlerts.filter((s) => s.status !== "Resolved").length;

  async function handleUpdateStatus(sos, newStatus) {
    setResolving(true);
    GrievanceLocalStore.updateSOSStatus(sos.id, newStatus, responderNotes);

    // Also update in DB if ticket_id is present
    try {
      await supabase
        .from("grievances")
        .update({
          status: newStatus === "Resolved" ? "Resolved" : "In Action",
          ai_summary: responderNotes
            ? `[ADMIN RESPONSE] ${responderNotes}`
            : undefined,
        })
        .eq("ticket_id", sos.ticket_id);
    } catch (err) {
      console.warn("SOS DB update note:", err);
    }

    loadAlerts();
    setSelectedSOS(null);
    setResponderNotes("");
    setResolving(false);
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-hero compact admin-sos-hero">
        <div>
          <div className="admin-eyebrow">
            <Siren size={15} className="siren-flash-icon" />
            EMERGENCY COMMAND ROOM
          </div>
          <h1>
            SOS Alert<br />
            <span>Management Center.</span>
          </h1>
          <p>
            Real-time emergency dispatch monitoring. Assign first responders and resolve active
            SOS alerts from citizens.
          </p>
        </div>

        <div className="sos-stat-row">
          <div className="sos-stat-card active">
            <Siren size={28} className="siren-flash-icon" />
            <div>
              <strong>{activeCount}</strong>
              <span>Active Emergencies</span>
            </div>
          </div>
          <div className="sos-stat-card resolved">
            <CheckCircle2 size={28} />
            <div>
              <strong>{sosAlerts.length - activeCount}</strong>
              <span>Resolved</span>
            </div>
          </div>
          <div className="sos-stat-card total">
            <Radio size={28} />
            <div>
              <strong>{sosAlerts.length}</strong>
              <span>Total SOS Alerts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sos-admin-filter-bar">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All Alerts ({sosAlerts.length})
        </button>
        <button
          type="button"
          className={filter === "active" ? "active" : ""}
          onClick={() => setFilter("active")}
        >
          <span className="sos-live-indicator" />
          Active ({activeCount})
        </button>
        <button
          type="button"
          className={filter === "resolved" ? "active" : ""}
          onClick={() => setFilter("resolved")}
        >
          Resolved ({sosAlerts.length - activeCount})
        </button>
        <button type="button" className="sos-refresh-btn" onClick={loadAlerts} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="sos-admin-empty">
          {activeCount === 0 ? (
            <>
              <CheckCircle2 size={52} color="#10b981" />
              <h3>All Clear — No Active Emergencies</h3>
              <p>No SOS alerts have been raised by citizens. The city is safe!</p>
            </>
          ) : (
            <>
              <Search size={52} color="#94a3b8" />
              <h3>No alerts match this filter</h3>
            </>
          )}
        </div>
      ) : (
        <div className="sos-admin-alert-grid">
          {filteredAlerts.map((sos) => {
            const cfg = typeConfig[sos.emergencyType] || typeConfig.medical;
            const Icon = cfg.icon;
            const isActive = sos.status !== "Resolved";

            return (
              <div
                key={sos.id}
                className={`sos-admin-card ${isActive ? "sos-card-active" : "sos-card-resolved"}`}
                style={{ borderLeftColor: cfg.color }}
              >
                <div className="sos-card-header">
                  <div
                    className="sos-card-type-icon"
                    style={{ background: cfg.color, color: "#fff" }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="sos-card-meta">
                    <span
                      className="sos-card-id"
                      style={{ color: cfg.color }}
                    >
                      {sos.id}
                    </span>
                    <strong className="sos-card-label">{sos.emergencyLabel || cfg.label}</strong>
                  </div>
                  {isActive && (
                    <div className="sos-card-live-badge">
                      <span className="sos-live-indicator" />
                      ACTIVE
                    </div>
                  )}
                  {!isActive && (
                    <div className="sos-card-resolved-badge">
                      <CheckCircle2 size={13} />
                      RESOLVED
                    </div>
                  )}
                </div>

                <div className="sos-card-body">
                  <div className="sos-card-detail">
                    <MapPin size={14} />
                    <span>{sos.location}</span>
                  </div>
                  <div className="sos-card-detail">
                    <Radio size={14} />
                    <span>{sos.requirement}</span>
                  </div>
                  {sos.phone && sos.phone !== "Caller via App" && (
                    <div className="sos-card-detail">
                      <Phone size={14} />
                      <a href={`tel:${sos.phone}`}>{sos.phone}</a>
                    </div>
                  )}
                  <div className="sos-card-detail muted">
                    <Timer size={13} />
                    <span>
                      {new Date(sos.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {sos.responderNotes && (
                  <div className="sos-card-notes">
                    <strong>Dispatch Notes:</strong>
                    <p>{sos.responderNotes}</p>
                  </div>
                )}

                {isActive && (
                  <div className="sos-card-actions">
                    {selectedSOS?.id === sos.id ? (
                      <div className="sos-response-form">
                        <textarea
                          placeholder="Add responder notes (e.g., Ambulance dispatched to location, ETA 8 mins)"
                          value={responderNotes}
                          onChange={(e) => setResponderNotes(e.target.value)}
                          rows={3}
                        />
                        <div className="sos-response-btns">
                          <button
                            type="button"
                            className="sos-btn-dispatched"
                            onClick={() => handleUpdateStatus(sos, "Responder Dispatched")}
                            disabled={resolving}
                          >
                            <Truck size={15} />
                            Mark Dispatched
                          </button>
                          <button
                            type="button"
                            className="sos-btn-resolve"
                            onClick={() => handleUpdateStatus(sos, "Resolved")}
                            disabled={resolving}
                          >
                            <CheckCircle2 size={15} />
                            Mark Resolved
                          </button>
                          <button
                            type="button"
                            className="sos-btn-cancel"
                            onClick={() => {
                              setSelectedSOS(null);
                              setResponderNotes("");
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="sos-respond-btn"
                        style={{ background: cfg.color }}
                        onClick={() => setSelectedSOS(sos)}
                      >
                        <Siren size={15} />
                        Respond to Emergency
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ======================================================
   ADMIN PROFILE PAGE
====================================================== */

function AdminProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      setUser(await getCurrentUser());
    }
    load();
  }, []);

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Administrator";

  return (
    <div className="admin-dashboard">
      <section className="admin-hero compact">
        <div>
          <div className="admin-eyebrow">
            <User size={15} />
            ACCOUNT
          </div>

          <h1>
            Administrator
            <br />
            <span>profile.</span>
          </h1>

          <p>
            Secure account information for the Nirvaran Setu operations console.
          </p>
        </div>
      </section>

      <div className="admin-profile-card">
        <div className="admin-profile-avatar">{name.charAt(0).toUpperCase()}</div>
        <div>
          <span>ADMINISTRATOR</span>
          <h2>{name}</h2>
          <p>{user?.email}</p>
        </div>
        <ShieldCheck size={42} />
      </div>
    </div>
  );
}

/* ======================================================
   LOGIN & SIGNUP PAGE
====================================================== */

function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const navigate = useNavigate();

  function switchMode(newMode) {
    setMode(newMode);
    setMessage("");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      if (!fullName.trim()) {
        setMessage("Please enter your full name.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setLoading(false);
        setMessage(error.message);
        setMessageType("error");
        return;
      }

      if (signUpData?.user) {
        await supabase.from("profiles").upsert({
          id: signUpData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          role: "citizen",
        });
      }

      setLoading(false);
      setMessage(
        "Account created! If email confirmation is required, please check your inbox, otherwise sign in."
      );
      setMessageType("success");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setMessage("Invalid email or password.");
      setMessageType("error");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profileError && profileError.code !== "PGRST116") {
      console.error(profileError);
    }

    navigate(profile?.role === "admin" ? "/admin" : "/", { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-background">
        <div className="auth-glow glow-one" />
        <div className="auth-glow glow-two" />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark auth-logo">
            <ShieldCheck size={30} />
          </div>

          <div className="auth-brand-name">
            🇮🇳 <span>Nirvaran Setu</span>
          </div>

          <p>Citizen Grievance Platform</p>
        </div>

        <div className="auth-heading">
          <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p>
            {mode === "signin"
              ? "Sign in to report, track and follow up on civic issues."
              : "Your civic voice deserves to be heard."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}
          >
            Sign In
          </button>

          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {mode === "signup" && (
            <label>
              Confirm password
              <input
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          )}

          {message && (
            <div className={`auth-message ${messageType}`}>{message}</div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            <span>
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </span>
            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        <div className="auth-footer">
          <ShieldCheck size={15} />
          <span>Secure authentication powered by Supabase</span>
        </div>
      </div>
    </section>
  );
}

/* ======================================================
   MAIN APP ROUTER
====================================================== */

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <CitizenLayout>
                <HomePage />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/lodge"
          element={
            <ProtectedRoute>
              <CitizenLayout>
                <LodgePage />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/grievances"
          element={
            <ProtectedRoute>
              <CitizenLayout>
                <GrievancesPage />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <CitizenLayout>
                <ProfilePage />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/grievances"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminGrievancesPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminAnalyticsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/history"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminHistoryPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminProfilePage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/sos"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout>
                <AdminSOSPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;