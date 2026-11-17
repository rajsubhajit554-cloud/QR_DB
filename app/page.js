"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  Sliders,
  Settings,
  Shield,
  HelpCircle,
  FileSpreadsheet,
  Link2,
  BarChart2,
  Image as ImageIcon,
  Palette,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Globe,
  Zap,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";

// Default template project
const DEFAULT_PROJECT = {
  code: "demo01",
  name: "আমার প্রথম QR প্রজেক্ট",
  url: "https://google.com",
  style: {
    dotsType: "rounded",
    dotsColor: "#15152F",
    cornerSquareType: "extra-rounded",
    cornerSquareColor: "#FF6B4A",
    cornerDotType: "dot",
    cornerDotColor: "#00C2A8",
    bgColor: "#FFFFFF",
    margin: 10,
    logoUrl: "",
    logoSize: 0.25,
  },
  scans: 0,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
};

// Preset color palettes
const COLOR_PRESETS = [
  { name: "মডার্ন ইন্ডিগো", dots: "#15152F", corner: "#FF6B4A", dot: "#00C2A8", bg: "#FFFFFF" },
  { name: "ক্লাসিক ব্ল্যাক", dots: "#000000", corner: "#000000", dot: "#000000", bg: "#FFFFFF" },
  { name: "ওশান ব্লু", dots: "#0284C7", corner: "#0369A1", dot: "#0284C7", bg: "#F0F9FF" },
  { name: "এমেরাল্ড গ্রিন", dots: "#059669", corner: "#047857", dot: "#10B981", bg: "#F0FDF4" },
  { name: "সানসেট কোরাল", dots: "#EA580C", corner: "#DC2626", dot: "#F97316", bg: "#FFF7ED" },
  { name: "রয়্যাল পার্পল", dots: "#7C3AED", corner: "#6D28D9", dot: "#8B5CF6", bg: "#FAF5FF" },
];

export default function QRStudioApp() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // QR Mode: 'dynamic' (302 redirect via /r/[code]) OR 'direct' (direct target URL encoded in QR)
  const [qrMode, setQrMode] = useState("dynamic");

  // Authentication & Configuration state (STRICT GATE: Locked by default)
  const [adminPassword, setAdminPassword] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [gasConfigured, setGasConfigured] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // New project modal form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("https://");
  const [newProjectCode, setNewProjectCode] = useState("");

  // Download settings
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [downloadSize, setDownloadSize] = useState(1000);

  // Active right tab: 'info' | 'style' | 'logo'
  const [activeTab, setActiveTab] = useState("info");

  // QR Code styling ref and instance
  const qrRef = useRef(null);
  const qrCodeInstance = useRef(null);

  // Check saved session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const locOrigin = window.location.origin;
      setOrigin(locOrigin);

      const savedPw = sessionStorage.getItem("qr_admin_pw");
      try {
        const cached = localStorage.getItem("qr_projects_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setSelectedProject(parsed[0]);
          }
        }
      } catch (e) {}

      if (savedPw) {
        // Verify saved session with server
        fetch("/api/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": savedPw,
          },
          body: JSON.stringify({ action: "check-auth" }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok && data.authenticated) {
              setAdminPassword(savedPw);
              setIsUnlocked(true);
              setGasConfigured(Boolean(data.gasConfigured));
              fetchProjects(savedPw);
            } else {
              sessionStorage.removeItem("qr_admin_pw");
              setIsUnlocked(false);
            }
          })
          .catch(() => {
            sessionStorage.removeItem("qr_admin_pw");
            setIsUnlocked(false);
          })
          .finally(() => {
            setAuthChecking(false);
          });
      } else {
        setAuthChecking(false);
        setIsUnlocked(false);
      }

      const savedDomain = localStorage.getItem("qr_custom_domain");
      if (savedDomain) {
        setCustomDomain(savedDomain);
      }
    }
  }, []);

  // Compute active base domain for dynamic QR
  const effectiveDomain = (customDomain.trim() || origin || "https://yourapp.vercel.app").replace(/\/$/, "");
  const dynamicShortUrl = `${effectiveDomain}/r/${selectedProject?.code || "demo01"}`;
  
  // The actual text/link encoded inside the QR
  const encodedQrData = qrMode === "dynamic" ? dynamicShortUrl : (selectedProject?.url || "https://google.com");

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!inputPassword) return;

    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": inputPassword,
        },
        body: JSON.stringify({ action: "check-auth" }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminPassword(inputPassword);
        sessionStorage.setItem("qr_admin_pw", inputPassword);
        setIsUnlocked(true);
        setGasConfigured(Boolean(data.gasConfigured));
        fetchProjects(inputPassword);
      } else {
        setLoginError("ভুল পাসওয়ার্ড! দয়া করে সঠিক এডমিন পাসওয়ার্ড দিন।");
      }
    } catch (err) {
      setLoginError("সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি।");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem("qr_admin_pw");
    setAdminPassword("");
    setInputPassword("");
    setIsUnlocked(false);
    setProjects([]);
  };

  // Fetch projects from Admin API
  const fetchProjects = async (passwordToUse) => {
    setLoading(true);
    const pw = passwordToUse || adminPassword;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pw,
        },
        body: JSON.stringify({ action: "list" }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setIsUnlocked(true);
        setGasConfigured(true);
        if (data.projects && data.projects.length > 0) {
          const merged = data.projects.map((p) => ({
            ...p,
            style: {
              ...DEFAULT_PROJECT.style,
              ...(p.style || {}),
            },
          }));
          setProjects(merged);
          setSelectedProject((prev) => {
            const found = merged.find((p) => p.code === prev?.code);
            return found || merged[0];
          });
          try {
            localStorage.setItem("qr_projects_cache", JSON.stringify(merged));
          } catch (e) {}
        } else {
          setProjects([DEFAULT_PROJECT]);
          setSelectedProject(DEFAULT_PROJECT);
        }
      } else if (data.error === "gas_not_configured") {
        setGasConfigured(false);
        setProjects([DEFAULT_PROJECT]);
      } else if (res.status === 401) {
        setIsUnlocked(false);
      }
    } catch (err) {
      console.error("Fetch projects error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to build robust QR options with complete styling
  const getQrOptions = (project, dataToEncode, size = 320) => {
    const style = {
      ...DEFAULT_PROJECT.style,
      ...(project?.style || {}),
    };

    return {
      width: size,
      height: size,
      type: "canvas",
      data: dataToEncode || "https://google.com",
      image: style.logoUrl && String(style.logoUrl).trim() !== "" ? style.logoUrl : undefined,
      margin: style.margin !== undefined ? Number(style.margin) : 10,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: style.logoUrl ? "H" : "Q",
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: Number(style.logoSize) || 0.25,
        margin: 4,
        crossOrigin: "anonymous",
      },
      dotsOptions: {
        color: style.dotsColor || "#15152F",
        type: style.dotsType || "rounded",
      },
      backgroundOptions: {
        color: style.bgColor || "#FFFFFF",
      },
      cornersSquareOptions: {
        color: style.cornerSquareColor || style.dotsColor || "#15152F",
        type: style.cornerSquareType || "extra-rounded",
      },
      cornersDotOptions: {
        color: style.cornerDotColor || style.dotsColor || "#15152F",
        type: style.cornerDotType || "dot",
      },
    };
  };

  // Initialize and update qr-code-styling
  useEffect(() => {
    if (!isUnlocked) return;

    let isMounted = true;

    async function initQR() {
      if (typeof window === "undefined" || !qrRef.current) return;

      const QRCodeStyling = (await import("qr-code-styling")).default;
      const qrOptions = getQrOptions(selectedProject, encodedQrData, 320);

      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling(qrOptions);
        if (qrRef.current) {
          qrRef.current.innerHTML = "";
          qrCodeInstance.current.append(qrRef.current);
        }
      } else {
        qrCodeInstance.current.update(qrOptions);
      }
    }

    initQR();

    return () => {
      isMounted = false;
    };
  }, [selectedProject, encodedQrData, isUnlocked]);

  // Handle Style updates with instant state & local cache sync
  const handleStyleChange = (key, value) => {
    setSelectedProject((prev) => {
      const updatedStyle = {
        ...(prev?.style || DEFAULT_PROJECT.style),
        [key]: value,
      };
      const updated = {
        ...prev,
        style: updatedStyle,
      };

      setProjects((currentProjects) =>
        currentProjects.map((p) => (p.code === prev?.code ? { ...p, style: updatedStyle } : p))
      );

      try {
        const cached = JSON.parse(localStorage.getItem("qr_projects_cache") || "[]");
        if (Array.isArray(cached) && cached.length > 0) {
          const newCache = cached.map((p) => (p.code === prev?.code ? { ...p, style: updatedStyle } : p));
          localStorage.setItem("qr_projects_cache", JSON.stringify(newCache));
        }
      } catch (e) {}

      return updated;
    });
  };

  // Apply color presets
  const applyColorPreset = (preset) => {
    setSelectedProject((prev) => {
      const updatedStyle = {
        ...(prev?.style || DEFAULT_PROJECT.style),
        dotsColor: preset.dots,
        cornerSquareColor: preset.corner,
        cornerDotColor: preset.dot,
        bgColor: preset.bg,
      };
      const updated = {
        ...prev,
        style: updatedStyle,
      };

      setProjects((currentProjects) =>
        currentProjects.map((p) => (p.code === prev?.code ? { ...p, style: updatedStyle } : p))
      );

      try {
        const cached = JSON.parse(localStorage.getItem("qr_projects_cache") || "[]");
        if (Array.isArray(cached) && cached.length > 0) {
          const newCache = cached.map((p) => (p.code === prev?.code ? { ...p, style: updatedStyle } : p));
          localStorage.setItem("qr_projects_cache", JSON.stringify(newCache));
        }
      } catch (e) {}

      return updated;
    });
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (!selectedProject) return;
    setSaving(true);
    setStatusMessage(null);

    const projectToSave = {
      ...selectedProject,
      style: {
        ...DEFAULT_PROJECT.style,
        ...(selectedProject.style || {}),
      },
    };

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          action: "update",
          code: projectToSave.code,
          name: projectToSave.name,
          url: projectToSave.url,
          style: projectToSave.style,
        }),
      });

      const data = await res.json();
      const updatedList = projects.map((p) =>
        p.code === projectToSave.code ? { ...projectToSave, updated: new Date().toISOString() } : p
      );
      setProjects(updatedList);
      setSelectedProject({ ...projectToSave, updated: new Date().toISOString() });

      try {
        localStorage.setItem("qr_projects_cache", JSON.stringify(updatedList));
      } catch (e) {}

      if (res.ok && data.ok) {
        setStatusMessage({ type: "success", text: "কালার ও সম্পূর্ণ ডিজাইন গুগল শিটে সেভ হয়েছে!" });
      } else {
        setStatusMessage({
          type: "warning",
          text: data.message || "ব্রাউজারে সেভ হয়েছে, তবে গুগল শিটে কানেক্ট হতে পারেনি।",
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "সার্ভারে ত্রুটি হয়েছে।" });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Create New Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectUrl) return;

    const generatedCode = (newProjectCode || Math.random().toString(36).slice(2, 8)).toLowerCase().trim();
    const newProj = {
      code: generatedCode,
      name: newProjectName.trim() || `QR-${generatedCode}`,
      url: newProjectUrl.trim(),
      style: { ...DEFAULT_PROJECT.style },
      scans: 0,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          action: "create",
          ...newProj,
        }),
      });
      const data = await res.json();

      setProjects((prev) => [newProj, ...prev]);
      setSelectedProject(newProj);
      setShowNewModal(false);
      setNewProjectName("");
      setNewProjectUrl("https://");
      setNewProjectCode("");

      if (res.ok && data.ok) {
        setStatusMessage({ type: "success", text: `নতুন প্রজেক্ট (${generatedCode}) শিটে যুক্ত হয়েছে!` });
      } else {
        setStatusMessage({
          type: "warning",
          text: data.message || "প্রজেক্ট লোকালভাবে তৈরি হয়েছে।",
        });
      }
    } catch (err) {
      setProjects((prev) => [newProj, ...prev]);
      setSelectedProject(newProj);
      setShowNewModal(false);
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Delete Project
  const handleDeleteProject = async (code) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে এই প্রজেক্টটি (${code}) মুছে ফেলতে চান?`)) return;

    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ action: "delete", code }),
      });

      const updated = projects.filter((p) => p.code !== code);
      setProjects(updated);
      if (selectedProject?.code === code) {
        setSelectedProject(updated[0] || DEFAULT_PROJECT);
      }
      setStatusMessage({ type: "success", text: "প্রজেক্ট মুছে ফেলা হয়েছে।" });
    } catch (err) {
      console.error(err);
    }
  };

  // Copy encoded link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(encodedQrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR Code with complete styling retained
  const handleDownload = async () => {
    if (!qrCodeInstance.current || !selectedProject) return;

    const currentSize = 320;
    const downloadOpts = getQrOptions(selectedProject, encodedQrData, Number(downloadSize));
    await qrCodeInstance.current.update(downloadOpts);

    await qrCodeInstance.current.download({
      name: `${selectedProject.code}_qr_${downloadSize}px`,
      extension: downloadFormat,
    });

    // Restore preview size with complete options so styling never reverts
    const previewOpts = getQrOptions(selectedProject, encodedQrData, currentSize);
    await qrCodeInstance.current.update(previewOpts);
  };

  // Logo file upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      handleStyleChange("logoUrl", event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Filtered projects
  const filteredProjects = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =========================================================================
  // 1. LOADING SCREEN DURING INITIAL AUTH CHECK
  // =========================================================================
  if (authChecking) {
    return (
      <div className="h-screen w-screen bg-[#15152F] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse mb-3">
          <QrCode className="w-6 h-6 text-[#00C2A8]" />
        </div>
        <p className="text-xs text-[#A4A4B8]">সুরক্ষা যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  // =========================================================================
  // 2. STRICT FULL-SCREEN LOCK GATE (Renders ONLY this when !isUnlocked)
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-screen bg-[#0E0E1F] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#15152F] rounded-3xl border border-white/10 p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
          {/* Subtle glowing background orb */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#00C2A8]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#FF6B4A]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center space-y-2 relative">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8 text-[#00C2A8]" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight pt-2">
              QR STUDIO <span className="text-[#FF6B4A] text-sm">0.2</span>
            </h1>
            <p className="text-xs text-[#A4A4B8] max-w-xs leading-relaxed">
              এই ড্যাশবোর্ডটি সুরক্ষিত। QR কোড ও ডেটাবেস দেখতে আপনার এডমিন পাসওয়ার্ড দিন।
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left relative">
            <div>
              <label className="block text-xs font-medium text-[#A4A4B8] mb-1.5">
                এডমিন পাসওয়ার্ড (Admin Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  required
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  className="w-full px-4 py-3 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00C2A8] focus:ring-1 focus:ring-[#00C2A8] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00C2A8]/20 transition-all active:scale-98"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 stroke-[2.5]" />
                  <span>ড্যাশবোর্ড আনলক করুন</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 text-[11px] text-white/30">
            QR Studio Cloud • Google Apps Script + Vercel
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. UNLOCKED 3-PANEL STUDIO DASHBOARD
  // =========================================================================
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F5] text-[#14141E]">
      {/* Top Bar / Header */}
      <header className="h-14 border-b border-[#E8DFD5] bg-white px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#15152F] text-white flex items-center justify-center shadow-sm">
            <QrCode className="w-5 h-5 text-[#00C2A8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg leading-none tracking-tight text-[#15152F]">
                QR STUDIO <span className="text-[#FF6B4A] text-sm font-semibold">0.2</span>
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#E6FAF6] text-[#00A892] border border-[#B3F2E7]">
                ডাইনামিক Google Sheet DB
              </span>
            </div>
            <p className="text-[11px] text-[#6C6C82] leading-tight">
              স্থায়ী QR কোড • ইনস্ট্যান্ট 302 রিডাইরেক্ট • আনলিমিটেড ফ্রি ডাটাবেস
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* GAS Status indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              gasConfigured
                ? "bg-[#E6FAF6] text-[#008A77] border-[#9EE7DC]"
                : "bg-[#FFF4E5] text-[#B45309] border-[#FED7AA]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${gasConfigured ? "bg-[#00C2A8] animate-pulse" : "bg-[#F59E0B]"}`}
            />
            {gasConfigured ? "Google Sheet সংযুক্ত" : "Google Sheet সেটআপ প্রয়োজন"}
          </div>

          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E8DFD5] hover:bg-[#F4EFEA] text-xs font-medium text-[#15152F] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#6C6C82]" />
            <span>সেটআপ গাইড</span>
          </button>

          {/* Strict Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 border border-[#FF6B4A]/30 text-[#FF6B4A] text-xs font-semibold transition-colors shadow-xs"
            title="ড্যাশবোর্ড লক করে বের হন"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট (লক করুন)</span>
          </button>
        </div>
      </header>

      {/* Main 3-Panel Grid */}
      <div className="app-container flex-1 overflow-hidden">
        {/* ======================================================== */}
        {/* PANEL 1 (LEFT): Projects List, Search, New Project */}
        {/* ======================================================== */}
        <aside className="border-r border-[#E8DFD5] bg-[#F9F6F0] flex flex-col h-full overflow-hidden">
          {/* Top Actions in Left Panel */}
          <div className="p-3.5 border-b border-[#E8DFD5] space-y-2.5 bg-white shrink-0">
            <button
              onClick={() => {
                setNewProjectCode(Math.random().toString(36).slice(2, 8));
                setShowNewModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] text-white font-semibold text-sm transition-all shadow-sm active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>নতুন প্রজেক্ট তৈরি করুন</span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8B8794] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="প্রজেক্ট খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-lg focus:outline-none focus:border-[#00C2A8]"
              />
            </div>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className="px-2 pt-1 pb-1 flex items-center justify-between text-[11px] font-semibold text-[#8B8794] uppercase tracking-wider">
              <span>প্রজেক্ট তালিকা ({filteredProjects.length})</span>
              <button
                onClick={() => fetchProjects()}
                className="hover:text-[#15152F] flex items-center gap-1"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8B8794]">কোনো প্রজেক্ট পাওয়া যায়নি</div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = selectedProject?.code === p.code;
                return (
                  <div
                    key={p.code}
                    onClick={() => setSelectedProject(p)}
                    className={`group relative p-3 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-white border-[#00C2A8] shadow-md ring-1 ring-[#00C2A8]/30"
                        : "bg-white/80 border-[#E8DFD5] hover:bg-white hover:border-[#D2C7B8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-[#15152F] truncate pr-2">
                        {p.name || "Untitled Project"}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#FF6B4A] font-bold border border-[#E8DFD5]">
                        /{p.code}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-[#6C6C82] truncate flex items-center gap-1 font-mono">
                      <Link2 className="w-3 h-3 shrink-0 text-[#8B8794]" />
                      <span className="truncate">{p.url}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#F4EFEA] flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-[#00A892] font-semibold bg-[#E6FAF6] px-2 py-0.5 rounded-full">
                        <BarChart2 className="w-3 h-3" />
                        {p.scans || 0} স্ক্যান
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(p.code);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FFF0EC] text-[#FF6B4A] transition-all"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Left panel footer */}
          <div className="p-3 border-t border-[#E8DFD5] bg-white text-[11px] text-[#6C6C82] flex items-center justify-between">
            <span>স্টুডিও v0.2</span>
            <span>সুরক্ষিত ড্যাশবোর্ড</span>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* PANEL 2 (MIDDLE): Live QR Preview, Test Link, Downloads */}
        {/* ======================================================== */}
        <main className="bg-[#FAF8F5] flex flex-col h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full p-6 flex flex-col items-center justify-center my-auto space-y-5">
            {/* Status message alert */}
            {statusMessage && (
              <div
                className={`w-full max-w-md p-3 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm ${
                  statusMessage.type === "success"
                    ? "bg-[#E6FAF6] text-[#008A77] border border-[#9EE7DC]"
                    : statusMessage.type === "warning"
                    ? "bg-[#FFF4E5] text-[#B45309] border border-[#FED7AA]"
                    : "bg-[#FFF0EC] text-[#C2410C] border border-[#FDBA74]"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* QR Mode Switcher: Dynamic vs Direct */}
            <div className="w-full max-w-md bg-white p-1.5 rounded-2xl border border-[#E8DFD5] shadow-xs flex gap-1">
              <button
                onClick={() => setQrMode("dynamic")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  qrMode === "dynamic"
                    ? "bg-[#15152F] text-white shadow-sm"
                    : "text-[#6C6C82] hover:bg-[#FAF8F5]"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#00C2A8]" />
                <span>ডাইনামিক মোড (স্থায়ী 302)</span>
              </button>

              <button
                onClick={() => setQrMode("direct")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  qrMode === "direct"
                    ? "bg-[#15152F] text-white shadow-sm"
                    : "text-[#6C6C82] hover:bg-[#FAF8F5]"
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-[#FF6B4A]" />
                <span>সরাসরি স্ট্যাটিক লিংক</span>
              </button>
            </div>

            {/* Main QR Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E8DFD5] shadow-xl flex flex-col items-center relative transition-all">
              <div className="absolute -top-3 px-3 py-1 rounded-full bg-[#15152F] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-[#00C2A8]" />
                <span>
                  {qrMode === "dynamic" ? "লাইভ ডাইনামিক QR" : "লাইভ সরাসরি লিংক QR"}
                </span>
              </div>

              {/* QR Container Canvas */}
              <div
                ref={qrRef}
                className="w-[320px] h-[320px] flex items-center justify-center rounded-2xl overflow-hidden bg-white p-2 border border-[#F4EFEA]"
              />

              <div className="mt-3 text-center">
                <div className="font-bold text-sm text-[#15152F]">{selectedProject?.name}</div>
                <div className="text-xs text-[#6C6C82] flex items-center justify-center gap-1 mt-0.5">
                  <span>গুগল শিট ট্র্যাকিং:</span>
                  <span className="font-bold text-[#FF6B4A]">{selectedProject?.scans || 0} বার স্ক্যান</span>
                </div>
              </div>
            </div>

            {/* Link Preview and Test Card */}
            <div className="w-full max-w-md bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-sm space-y-3">
              {/* Encoded Data */}
              <div>
                <div className="flex items-center justify-between text-xs text-[#6C6C82] mb-1">
                  <span className="font-semibold text-[#15152F]">
                    {qrMode === "dynamic" ? "QR কোডের ভেতরের রিডাইরেক্ট লিংক:" : "QR কোডের ভেতরের আসল লিংক:"}
                  </span>
                  <span className="text-[11px] text-[#00A892] font-semibold">
                    {qrMode === "dynamic" ? "302 Permanent" : "Direct URL"}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 pl-3 rounded-xl border border-[#E8DFD5]">
                  <span className="text-xs font-mono font-medium text-[#15152F] truncate flex-1 select-all">
                    {encodedQrData}
                  </span>

                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E8DFD5] hover:bg-[#F4EFEA] text-xs font-medium text-[#15152F] flex items-center gap-1 shadow-sm shrink-0 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00C2A8]" />
                        <span className="text-[#00C2A8]">কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#6C6C82]" />
                        <span>কপি</span>
                      </>
                    )}
                  </button>

                  <a
                    href={encodedQrData}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-[#00C2A8] hover:bg-[#00A892] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                    title="লিংক টেস্ট করুন"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>টেস্ট করুন</span>
                  </a>
                </div>
              </div>

              {/* Dynamic Target Destination Banner */}
              {qrMode === "dynamic" && (
                <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DFD5] text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[#6C6C82]">
                    <span className="font-semibold text-[#15152F]">স্ক্যান করলে যাবে যেখানে (Target):</span>
                    <a
                      href={selectedProject?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00A892] hover:underline flex items-center gap-0.5"
                    >
                      আসল সাইট <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="font-mono text-[#FF6B4A] truncate font-medium">
                    {selectedProject?.url || "কোনো লিংক সেট করা নেই"}
                  </div>
                </div>
              )}

              {/* Custom Domain Input for Vercel testing */}
              {qrMode === "dynamic" && (
                <div className="pt-2 border-t border-[#F4EFEA] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#6C6C82]">
                    <span className="flex items-center gap-1 font-medium text-[#15152F]">
                      <Globe className="w-3 h-3 text-[#00C2A8]" />
                      লাইভ Vercel ডোমেইন (ঐচ্ছিক):
                    </span>
                    {customDomain && (
                      <button
                        onClick={() => {
                          setCustomDomain("");
                          localStorage.removeItem("qr_custom_domain");
                        }}
                        className="text-[10px] text-[#FF6B4A] hover:underline"
                      >
                        রিসেট
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value);
                      localStorage.setItem("qr_custom_domain", e.target.value);
                    }}
                    placeholder="যেমন: https://qr-db.vercel.app"
                    className="w-full px-2.5 py-1 text-xs font-mono bg-[#FAF8F5] border border-[#E8DFD5] rounded-lg focus:outline-none focus:border-[#00C2A8]"
                  />
                  <p className="text-[10px] text-[#8B8794]">
                    লোকালহোস্টে কাজ করার সময় আপনার লাইভ Vercel ডোমেইন বসালে QR কোড স্ক্যান করলে সরাসরি ফোনে কাজ করবে।
                  </p>
                </div>
              )}
            </div>

            {/* Download Options Toolbar */}
            <div className="w-full max-w-md bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#15152F]">
                <span>ডাউনলোড অপশন (প্রিন্ট ও ডিজিটাল)</span>
                <span className="text-[11px] text-[#8B8794]">High-Resolution</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Format selection */}
                <div>
                  <label className="text-[11px] text-[#6C6C82] block mb-1">ফরমেট</label>
                  <select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    className="w-full py-1.5 px-2 bg-[#FAF8F5] border border-[#E8DFD5] rounded-lg text-xs font-medium text-[#15152F]"
                  >
                    <option value="png">PNG (রেগুলার)</option>
                    <option value="svg">SVG (ভেক্টর প্রিন্ট)</option>
                    <option value="jpeg">JPEG (ছবি)</option>
                    <option value="webp">WEBP (ওয়েব)</option>
                  </select>
                </div>

                {/* Resolution size */}
                <div>
                  <label className="text-[11px] text-[#6C6C82] block mb-1">রেজোলিউশন</label>
                  <select
                    value={downloadSize}
                    onChange={(e) => setDownloadSize(Number(e.target.value))}
                    className="w-full py-1.5 px-2 bg-[#FAF8F5] border border-[#E8DFD5] rounded-lg text-xs font-medium text-[#15152F]"
                  >
                    <option value="500">500 x 500 px (ওয়েব)</option>
                    <option value="1000">1000 x 1000 px (এইচডি)</option>
                    <option value="2000">2000 x 2000 px (প্রিন্ট রেডি)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#15152F] hover:bg-[#1F2044] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-[#00C2A8]" />
                <span>ডাউনলোড করুন ({downloadFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>
        </main>

        {/* ======================================================== */}
        {/* PANEL 3 (RIGHT): Editing Section, Style, Color, Logo */}
        {/* ======================================================== */}
        <aside className="border-l border-[#E8DFD5] bg-white flex flex-col h-full overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-[#E8DFD5] bg-[#F9F6F0] p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "info"
                  ? "bg-white text-[#15152F] shadow-xs"
                  : "text-[#6C6C82] hover:text-[#15152F]"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>টার্গেট লিংক</span>
            </button>

            <button
              onClick={() => setActiveTab("style")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "style"
                  ? "bg-white text-[#15152F] shadow-xs"
                  : "text-[#6C6C82] hover:text-[#15152F]"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>স্টাইল ও কালার</span>
            </button>

            <button
              onClick={() => setActiveTab("logo")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "logo"
                  ? "bg-white text-[#15152F] shadow-xs"
                  : "text-[#6C6C82] hover:text-[#15152F]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>লোগো</span>
            </button>
          </div>

          {/* Tab Content scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* TAB 1: INFO & TARGET URL */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">প্রজেক্ট নাম</label>
                  <input
                    type="text"
                    value={selectedProject?.name || ""}
                    onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl focus:outline-none focus:border-[#00C2A8]"
                    placeholder="যেমন: রেস্তোরাঁ মেন্যু কার্ড"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#15152F]">
                      আসল টার্গেট লিংক (Destination URL)
                    </label>
                    <span className="text-[10px] text-[#00A892] font-semibold bg-[#E6FAF6] px-2 py-0.5 rounded-full">
                      লাইভ এডিটেবল
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={selectedProject?.url || ""}
                    onChange={(e) => setSelectedProject({ ...selectedProject, url: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#FAF8F5] border-2 border-[#00C2A8] rounded-xl focus:outline-none"
                    placeholder="https://yourwebsite.com/destination"
                  />
                  
                  {/* Immediate Save button right below URL */}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>লিংক সেভ করুন (Save URL)</span>
                    </button>

                    <a
                      href={selectedProject?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-[#15152F] hover:bg-[#1F2044] text-white flex items-center justify-center"
                      title="লিংক ওপেন করুন"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-[11px] text-[#6C6C82] mt-2 leading-normal bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8DFD5]">
                    💡 <strong>ডাইনামিক সুবিধা:</strong> এখানে লিংক পরিবর্তন করে "লিংক সেভ করুন" এ চাপলেই গুগল শিটে আপডেট হয়ে যাবে। আপনার প্রিন্ট করা QR কোড বদলাবে না, কিন্তু স্ক্যান করলে সাথে সাথে এই নতুন লিংকে নিয়ে যাবে!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">শর্ট কোড (স্থায়ী)</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedProject?.code || ""}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4EFEA] border border-[#E8DFD5] rounded-xl text-[#FF6B4A]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-[#F4EFEA]">
                  <label className="block text-xs font-semibold text-[#15152F] mb-2">দ্রুত কালার প্রিসেট</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => applyColorPreset(p)}
                        type="button"
                        className="p-2 rounded-xl border border-[#E8DFD5] bg-[#FAF8F5] hover:bg-white text-left text-[11px] font-medium flex items-center gap-2 transition-colors"
                      >
                        <div className="flex -space-x-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dots }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.corner }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dot }} />
                        </div>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: QR STYLE & COLORS */}
            {activeTab === "style" && (
              <div className="space-y-4">
                {/* Presets in Style Tab */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1.5">কালার প্রিসেট বেছে নিন</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => applyColorPreset(p)}
                        type="button"
                        className="p-2 rounded-xl border border-[#E8DFD5] bg-[#FAF8F5] hover:bg-white text-left text-[11px] font-medium flex items-center gap-2 transition-colors"
                      >
                        <div className="flex -space-x-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dots }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.corner }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dot }} />
                        </div>
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Save Style button at top of style options */}
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  type="button"
                  className="w-full py-2 px-3 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>কালার ও স্টাইল সেভ করুন (Save Style)</span>
                </button>
                {/* Dots Style */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">QR ডটস আকার (Dots Type)</label>
                  <select
                    value={selectedProject?.style?.dotsType || "rounded"}
                    onChange={(e) => handleStyleChange("dotsType", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                  >
                    <option value="rounded">Rounded (গোলাকার কোণা)</option>
                    <option value="dots">Dots (বিন্দু)</option>
                    <option value="classy">Classy (মার্জিত)</option>
                    <option value="classy-rounded">Classy Rounded</option>
                    <option value="square">Square (ক্লাসিক চারকোনা)</option>
                    <option value="extra-rounded">Extra Rounded</option>
                  </select>
                </div>

                {/* Dots Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">ডটস কালার (Dots Color)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedProject?.style?.dotsColor || "#15152F"}
                      onChange={(e) => handleStyleChange("dotsColor", e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-[#E8DFD5] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={selectedProject?.style?.dotsColor || "#15152F"}
                      onChange={(e) => handleStyleChange("dotsColor", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                    />
                  </div>
                </div>

                {/* Corner Square Type */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">কর্নার ফ্রেম (Corner Square)</label>
                  <select
                    value={selectedProject?.style?.cornerSquareType || "extra-rounded"}
                    onChange={(e) => handleStyleChange("cornerSquareType", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                  >
                    <option value="extra-rounded">Extra Rounded</option>
                    <option value="square">Square (চারকোনা)</option>
                    <option value="dot">Circle (বৃত্ত)</option>
                  </select>
                </div>

                {/* Corner Square Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">কর্নার ফ্রেম কালার</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedProject?.style?.cornerSquareColor || "#FF6B4A"}
                      onChange={(e) => handleStyleChange("cornerSquareColor", e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-[#E8DFD5] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={selectedProject?.style?.cornerSquareColor || "#FF6B4A"}
                      onChange={(e) => handleStyleChange("cornerSquareColor", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                    />
                  </div>
                </div>

                {/* Corner Dot Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">কর্নার ভেতরের ডট কালার</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedProject?.style?.cornerDotColor || "#00C2A8"}
                      onChange={(e) => handleStyleChange("cornerDotColor", e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-[#E8DFD5] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={selectedProject?.style?.cornerDotColor || "#00C2A8"}
                      onChange={(e) => handleStyleChange("cornerDotColor", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">ব্যাকগ্রাউন্ড কালার</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedProject?.style?.bgColor || "#FFFFFF"}
                      onChange={(e) => handleStyleChange("bgColor", e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-[#E8DFD5] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={selectedProject?.style?.bgColor || "#FFFFFF"}
                      onChange={(e) => handleStyleChange("bgColor", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl"
                    />
                  </div>
                </div>

                {/* Save Style Button at bottom of tab */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>কালার ও স্টাইল সেভ করুন (Save Style)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: LOGO & MARGIN */}
            {activeTab === "logo" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#15152F] mb-1">মাঝখানে লোগো যুক্ত করুন</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs text-[#6C6C82] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#15152F] file:text-white hover:file:bg-[#1F2044] cursor-pointer"
                  />
                </div>

                {selectedProject?.style?.logoUrl && (
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFD5] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedProject.style.logoUrl}
                        alt="Logo Preview"
                        className="w-10 h-10 object-contain rounded border border-[#E8DFD5] bg-white p-0.5"
                      />
                      <span className="text-xs text-[#15152F] font-medium">লোগো সংযুক্ত</span>
                    </div>
                    <button
                      onClick={() => handleStyleChange("logoUrl", "")}
                      className="text-xs text-[#FF6B4A] hover:underline"
                    >
                      মুছে ফেলুন
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#15152F] mb-1">
                    <span>লোগো সাইজ</span>
                    <span>{Math.round((selectedProject?.style?.logoSize || 0.25) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.05"
                    value={selectedProject?.style?.logoSize || 0.25}
                    onChange={(e) => handleStyleChange("logoSize", parseFloat(e.target.value))}
                    className="w-full accent-[#00C2A8]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#15152F] mb-1">
                    <span>QR মার্জিন (Margin)</span>
                    <span>{selectedProject?.style?.margin ?? 10}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="2"
                    value={selectedProject?.style?.margin ?? 10}
                    onChange={(e) => handleStyleChange("margin", parseInt(e.target.value))}
                    className="w-full accent-[#00C2A8]"
                  />
                </div>

                {/* Save Logo & Margin button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>লোগো ও মার্জিন সেভ করুন (Save Settings)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Footer: Save changes button */}
          <div className="p-4 border-t border-[#E8DFD5] bg-[#FAF8F5] shrink-0">
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C2A8] hover:bg-[#00A892] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
              <span>সব পরিবর্তন ডাটাবেসে সেভ করুন</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* MODAL: New Project */}
      {/* ======================================================== */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8DFD5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#15152F]">নতুন ডাইনামিক QR প্রজেক্ট</h3>
              <button onClick={() => setShowNewModal(false)} className="text-[#8B8794] hover:text-[#15152F]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#15152F] mb-1">প্রজেক্ট নাম</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="যেমন: রেস্তোরাঁ মেন্যু কার্ড"
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl focus:outline-none focus:border-[#00C2A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#15152F] mb-1">টার্গেট লিংক (Destination URL)</label>
                <input
                  type="url"
                  required
                  value={newProjectUrl}
                  onChange={(e) => setNewProjectUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E8DFD5] rounded-xl focus:outline-none focus:border-[#00C2A8]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#15152F]">কাস্টম শর্ট কোড (ঐচ্ছিক)</label>
                  <button
                    type="button"
                    onClick={() => setNewProjectCode(Math.random().toString(36).slice(2, 8))}
                    className="text-[11px] text-[#00A892] hover:underline"
                  >
                    র্যান্ডম কোড
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-[#FAF8F5] px-3 py-1.5 border border-[#E8DFD5] rounded-xl">
                  <span className="text-xs text-[#8B8794]">/r/</span>
                  <input
                    type="text"
                    value={newProjectCode}
                    onChange={(e) => setNewProjectCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="যেমন: menu2026"
                    className="w-full bg-transparent text-xs font-mono font-bold text-[#FF6B4A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6C6C82] hover:bg-[#FAF8F5] rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-[#00C2A8] hover:bg-[#00A892] text-white rounded-xl shadow-sm"
                >
                  {saving ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Step-by-Step Setup Guide */}
      {/* ======================================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#E8DFD5]">
            <div className="p-4 border-b border-[#E8DFD5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00C2A8]" />
                <h3 className="font-bold text-sm text-[#15152F]">গুগল শিট ও Vercel সেটআপ গাইড</h3>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="text-[#8B8794] hover:text-[#15152F]">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#14141E] leading-relaxed">
              <div className="p-3 bg-[#E6FAF6] rounded-xl border border-[#B3F2E7] space-y-1">
                <div className="font-bold text-[#008A77]">কিভাবে কাজ করে?</div>
                <p className="text-[#005B4E]">
                  QR কোড স্ক্যান করলে সরাসরি ভিজিটর Vercel-এর <code>/r/[code]</code> রুটে পৌঁছায়। Vercel তখন গুগল শিট থেকে দ্রুত টার্গেট URL জেনে নিয়ে একটি ইনস্ট্যান্ট <strong>302 Redirect</strong> পাঠায়।
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm text-[#15152F]">ধাপ ১: গুগল শিট তৈরি করুন</div>
                <p className="text-[#6C6C82]">
                  একটি নতুন গুগল শিট খুলুন (নাম দিন <strong>QR_DB</strong>)। প্রথম সারিতে এই হেডারগুলো দিন:
                </p>
                <div className="p-2 bg-[#FAF8F5] rounded-lg font-mono text-[11px] border border-[#E8DFD5]">
                  code | name | url | style | created | updated | scans
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm text-[#15152F]">ধাপ ২: Apps Script কোড পেস্ট করুন</div>
                <p className="text-[#6C6C82]">
                  শিটের <code>Extensions &gt; Apps Script</code> এ যান। এই প্রজেক্টের <code>google-apps-script.js</code> ফাইলের সম্পূর্ণ কোড সেখানে পেস্ট করুন।
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm text-[#15152F]">ধাপ ৩: Web App হিসেবে Deploy করুন</div>
                <ul className="list-disc pl-4 space-y-1 text-[#6C6C82]">
                  <li>Deploy &gt; New deployment নির্বাচন করুন।</li>
                  <li>Type: <strong>Web app</strong></li>
                  <li>Execute as: <strong>Me</strong></li>
                  <li>Who has access: <strong>Anyone</strong> (খুবই গুরুত্বপূর্ণ)</li>
                  <li>Deploy সম্পন্ন হলে পাওয়া <code>https://script.google.com/macros/s/.../exec</code> URL কপি করুন।</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm text-[#15152F]">ধাপ ৪: Environment Variable সেট করুন</div>
                <p className="text-[#6C6C82]">
                  আপনার প্রজেক্টের <code>.env.local</code> ফাইলে বা Vercel Settings &gt; Environment Variables-এ দিন:
                </p>
                <pre className="p-3 bg-[#15152F] text-[#00C2A8] rounded-xl font-mono text-[11px] overflow-x-auto">
{`GAS_URL=https://script.google.com/macros/s/.../exec
GAS_SECRET=qr_studio_super_secret_2026
ADMIN_PASSWORD=admin123`}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD5] bg-[#FAF8F5] flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-[#15152F] hover:bg-[#1F2044] text-white text-xs font-semibold rounded-xl"
              >
                বুঝেছি, বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
