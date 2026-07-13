import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  Shield, LogOut, Download, Flag, FlagOff, Search, Filter,
  MessageSquare, Upload, FileDown, AlertTriangle, BarChart3,
  Eye, ChevronDown, ChevronUp, RefreshCw, Lock
} from "lucide-react";
import { format } from "date-fns";

type ActivityLog = {
  id: number;
  actionType: string;
  senderName: string | null;
  receiverName: string | null;
  messageContent: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  publicId: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  isFlagged: boolean;
  flagReason: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  chats: number;
  uploads: number;
  downloads: number;
  flagged: number;
};

function adminFetch(url: string, token: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
      ...(options?.headers || {}),
    },
  });
}

// ---- Login Screen ----
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Invalid password");
      } else {
        const data = await res.json();
        onLogin(data.token);
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">PrivLink — Restricted Access</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Admin Password</label>
            <input
              data-testid="input-admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter admin password"
              required
            />
          </div>
          {error && (
            <p data-testid="text-login-error" className="text-red-400 text-sm">{error}</p>
          )}
          <button
            data-testid="button-admin-login"
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- Stat Card ----
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-slate-400 text-sm">{label}</div>
      </div>
    </div>
  );
}

// ---- Log Row ----
function LogRow({ log, token, onRefresh }: { log: ActivityLog; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const flagMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/api/admin/logs/${log.id}/flag`, token, {
        method: "POST",
        body: JSON.stringify({ reason: "Manually flagged by admin" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: onRefresh,
  });

  const unflagMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/api/admin/logs/${log.id}/unflag`, token, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: onRefresh,
  });

  const actionColor = {
    chat_message: "bg-blue-500/20 text-blue-300",
    file_upload: "bg-green-500/20 text-green-300",
    file_download: "bg-purple-500/20 text-purple-300",
  }[log.actionType] || "bg-slate-500/20 text-slate-300";

  const actionIcon = {
    chat_message: MessageSquare,
    file_upload: Upload,
    file_download: FileDown,
  }[log.actionType] || Eye;
  const ActionIcon = actionIcon;

  return (
    <div
      data-testid={`row-log-${log.id}`}
      className={`border rounded-xl overflow-hidden transition-all ${log.isFlagged ? "border-red-500/50 bg-red-950/20" : "border-slate-700 bg-slate-800"}`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-700/50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${actionColor}`}>
          <ActionIcon className="w-3 h-3" />
          {log.actionType.replace("_", " ")}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">
            {log.actionType === "chat_message" && (
              <><span className="text-slate-400">From:</span> {log.senderName || "Unknown"} — <span className="text-slate-300 italic">"{log.messageContent?.slice(0, 60)}{(log.messageContent?.length || 0) > 60 ? "..." : ""}"</span></>
            )}
            {log.actionType !== "chat_message" && (
              <><span className="text-slate-400">File:</span> {log.fileName || "Unknown"}</>
            )}
          </p>
          <p className="text-slate-500 text-xs">{log.ipAddress} · {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}</p>
        </div>
        
        {log.isFlagged && (
          <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" /> Flagged
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            data-testid={`button-${log.isFlagged ? "unflag" : "flag"}-${log.id}`}
            onClick={e => { e.stopPropagation(); log.isFlagged ? unflagMutation.mutate() : flagMutation.mutate(); }}
            className={`p-1.5 rounded-lg text-xs transition-colors ${log.isFlagged ? "text-slate-400 hover:text-white hover:bg-slate-600" : "text-red-400 hover:bg-red-900/40"}`}
            title={log.isFlagged ? "Unflag" : "Flag as suspicious"}
          >
            {log.isFlagged ? <FlagOff className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {log.senderName && <Detail label="Sender" value={log.senderName} />}
          {log.receiverName && <Detail label="Receiver" value={log.receiverName} />}
          {log.messageContent && <Detail label="Message" value={log.messageContent} full />}
          {log.fileName && <Detail label="File Name" value={log.fileName} />}
          {log.fileType && <Detail label="File Type" value={log.fileType} />}
          {log.fileSize && <Detail label="File Size" value={`${(log.fileSize / 1024).toFixed(1)} KB`} />}
          {log.publicId && <Detail label="Public ID" value={log.publicId} />}
          <Detail label="IP Address" value={log.ipAddress || "N/A"} />
          <Detail label="Device / Browser" value={log.deviceInfo || "N/A"} full />
          {log.isFlagged && <Detail label="Flag Reason" value={log.flagReason || "N/A"} full warn />}
          <Detail label="Timestamp" value={format(new Date(log.createdAt), "PPpp")} />
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full, warn }: { label: string; value: string; full?: boolean; warn?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <span className="text-slate-500 text-xs">{label}</span>
      <p className={`text-sm mt-0.5 break-all ${warn ? "text-red-400 font-semibold" : "text-slate-200"}`}>{value}</p>
    </div>
  );
}

// ---- Main Dashboard ----
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const statsQuery = useQuery<Stats>({
    queryKey: ["/api/admin/stats", token],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/stats", token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const logsQuery = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/logs", token, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("actionType", actionFilter);
      const res = await adminFetch(`/api/admin/logs?${params}`, token);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const handleExport = async () => {
    const res = await adminFetch("/api/admin/logs/export", token);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `privlink-logs-${Date.now()}.csv`;
    a.click();
  };

  const handleLogout = async () => {
    await adminFetch("/api/admin/logout", token, { method: "POST" });
    onLogout();
  };

  const filtered = (logsQuery.data || []).filter(log => {
    if (flaggedOnly && !log.isFlagged) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.senderName?.toLowerCase().includes(q) ||
      log.fileName?.toLowerCase().includes(q) ||
      log.messageContent?.toLowerCase().includes(q) ||
      log.ipAddress?.toLowerCase().includes(q)
    );
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Admin Panel</h1>
            <p className="text-slate-400 text-xs">PrivLink Activity Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="button-refresh-logs"
            onClick={refresh}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            data-testid="button-export-csv"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            data-testid="button-admin-logout"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {statsQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Events" value={statsQuery.data.total} icon={BarChart3} color="bg-blue-500/20 text-blue-300" />
            <StatCard label="Chat Messages" value={statsQuery.data.chats} icon={MessageSquare} color="bg-cyan-500/20 text-cyan-300" />
            <StatCard label="Uploads" value={statsQuery.data.uploads} icon={Upload} color="bg-green-500/20 text-green-300" />
            <StatCard label="Downloads" value={statsQuery.data.downloads} icon={FileDown} color="bg-purple-500/20 text-purple-300" />
            <StatCard label="Flagged" value={statsQuery.data.flagged} icon={AlertTriangle} color="bg-red-500/20 text-red-300" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="input-search-logs"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, file, message, IP..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <select
            data-testid="select-action-filter"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Activities</option>
            <option value="chat_message">Chat Messages</option>
            <option value="file_upload">File Uploads</option>
            <option value="file_download">File Downloads</option>
          </select>
          <button
            data-testid="button-toggle-flagged"
            onClick={() => setFlaggedOnly(f => !f)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${flaggedOnly ? "bg-red-700 border-red-600 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"}`}
          >
            <AlertTriangle className="w-4 h-4" /> {flaggedOnly ? "Showing Flagged" : "Show Flagged Only"}
          </button>
        </div>

        {/* Log List */}
        <div className="space-y-3">
          {logsQuery.isLoading && (
            <div className="text-center py-16 text-slate-500">Loading activity logs...</div>
          )}
          {!logsQuery.isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No activity logs found</p>
              {(search || flaggedOnly) && <p className="text-sm mt-1">Try adjusting your filters</p>}
            </div>
          )}
          {filtered.map(log => (
            <LogRow key={log.id} log={log} token={token} onRefresh={refresh} />
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-center text-slate-500 text-sm">
            Showing {filtered.length} of {logsQuery.data?.length || 0} logs
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Root Admin Page ----
export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("admin_token"));

  const handleLogin = (t: string) => {
    sessionStorage.setItem("admin_token", t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(null);
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
