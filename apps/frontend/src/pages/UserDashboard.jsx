import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import client from "../api/client";
import useAuthStore from "../store/authStore";

const S = {
  page:    { minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" },
  nav:     { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  card:    { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 },
  badge:   (color) => ({ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: color + "22", color }),
  btn:     (bg) => ({ padding: "8px 20px", borderRadius: 10, border: "none", background: bg, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }),
  tab:     (active) => ({
    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s",
    background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
    color: active ? "#fff" : "#64748b",
  }),
  input:   { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "#f1f5f9", fontSize: 14, outline: "none" },
  th:      { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1 },
  td:      { padding: "14px 16px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" },
};

const PLAN_COLOR = { FREE: "#94a3b8", PREMIUM: "#6366f1", PRO: "#8b5cf6", UNLIMITED: "#10b981" };

export default function UserDashboard() {
  const { user, logout }      = useAuthStore();
  const navigate              = useNavigate();
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage]     = useState(null);
  const [sub, setSub]         = useState(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [k, u, s] = await Promise.all([
        client.get("/user/api-keys"),
        client.get("/user/usage"),
        client.get("/user/subscription"),
      ]);
      setApiKeys(k.data.data);
      setUsage(u.data.data);
      setSub(s.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const generateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await client.post("/user/api-keys", { name: newKeyName });
      setNewKey(res.data.data);
      setNewKeyName("");
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
  };

  const revokeKey = async (id) => {
    if (!confirm("Revoke this key?")) return;
    try { await client.delete(`/user/api-keys/${id}`); fetchAll(); }
    catch (err) { alert("Failed to revoke"); }
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ color: "#64748b" }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const planColor = PLAN_COLOR[user?.planType] || "#94a3b8";
  const pct = Math.min(usage?.today?.percentUsed || 0, 100);

  return (
    <div style={S.page}>
      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <span style={{ fontWeight: 700, color: "#f1f5f9" }}>India Geo API</span>
          <span style={{ color: "#1e293b" }}>|</span>
          <span style={{ fontSize: 13, color: "#64748b" }}>{user?.businessName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={S.badge(planColor)}>{user?.planType}</span>
          <button onClick={() => { logout(); navigate("/login"); }}
            style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {["overview", "api-keys", "usage"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={S.tab(tab === t)}>
              {t === "api-keys" ? "API Keys" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { label: "Today's Requests", value: usage?.today?.count?.toLocaleString() || "0", sub: `of ${usage?.today?.limit?.toLocaleString()} limit`, icon: "📊" },
                { label: "This Month", value: usage?.month?.count?.toLocaleString() || "0", sub: "total requests", icon: "📅" },
                { label: "Active Keys", value: apiKeys.filter(k => k.isActive).length, sub: "of 5 maximum", icon: "🔑" },
              ].map(c => (
                <div key={c.label} style={S.card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{c.label}</span>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{c.sub}</div>
                  {c.label === "Today's Requests" && (
                    <div style={{ marginTop: 12, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#ef4444" : "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 3, transition: "width 0.6s" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Plan card */}
            <div style={S.card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1 }}>
                Current Plan
              </h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 700, color: planColor }}>{sub?.plan}</span>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "8px 0 0" }}>
                    {sub?.limits?.daily?.toLocaleString()} requests / day
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Burst: {sub?.limits?.burst}/min</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>States: {sub?.limits?.states}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API KEYS */}
        {tab === "api-keys" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {newKey && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16, padding: 24 }}>
                <p style={{ color: "#fbbf24", fontWeight: 600, margin: "0 0 12px" }}>⚠️ Save this key now — shown only once!</p>
                <code style={{ display: "block", background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 16, fontSize: 13, color: "#fde68a", wordBreak: "break-all" }}>
                  {newKey.key}
                </code>
                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button onClick={() => { navigator.clipboard.writeText(newKey.key); alert("Copied!"); }}
                    style={S.btn("#f59e0b")}>
                    Copy Key
                  </button>
                  <button onClick={() => setNewKey(null)}
                    style={{ background: "none", border: "none", color: "#92400e", fontSize: 13, cursor: "pointer" }}>
                    I've saved it ✓
                  </button>
                </div>
              </div>
            )}

            <div style={S.card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
                Generate New Key
              </h3>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  type="text" value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name e.g. Production Server"
                  style={S.input}
                  onKeyDown={(e) => e.key === "Enter" && generateKey()}
                />
                <button onClick={generateKey} style={{ ...S.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), whiteSpace: "nowrap" }}>
                  Generate
                </button>
              </div>
            </div>

            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
                  Your API Keys
                </h3>
              </div>
              {apiKeys.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "#334155" }}>
                  No API keys yet. Generate one above.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      {["Name", "Key", "Created", "Status", "Action"].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map(key => (
                      <tr key={key.id}>
                        <td style={S.td}><span style={{ color: "#e2e8f0", fontWeight: 500 }}>{key.name}</span></td>
                        <td style={S.td}><code style={{ color: "#6366f1", fontSize: 12 }}>{key.prefix}****</code></td>
                        <td style={S.td}><span style={{ color: "#64748b" }}>{new Date(key.createdAt).toLocaleDateString()}</span></td>
                        <td style={S.td}>
                          <span style={S.badge(key.isActive ? "#10b981" : "#475569")}>
                            {key.isActive ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td style={S.td}>
                          {key.isActive && (
                            <button onClick={() => revokeKey(key.id)}
                              style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "4px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* USAGE */}
        {tab === "usage" && (
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 24px", textTransform: "uppercase", letterSpacing: 1 }}>
              Requests by Endpoint — Last 30 Days
            </h3>
            {usage?.byEndpoint?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {usage.byEndpoint.map(e => {
                  const pct = Math.round((e.count / (usage.byEndpoint[0]?.count || 1)) * 100);
                  return (
                    <div key={e.endpoint} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <code style={{ fontSize: 12, color: "#6366f1", width: 180, flexShrink: 0 }}>{e.endpoint}</code>
                      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b", width: 60, textAlign: "right" }}>{e.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#334155", textAlign: "center", padding: 32 }}>
                No usage data yet. Make some API calls first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}