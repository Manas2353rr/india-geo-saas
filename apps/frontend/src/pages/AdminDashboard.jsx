import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import client from "../api/client";
import useAuthStore from "../store/authStore";

const S = {
  page: { minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" },
  nav:  { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 },
  badge: (color) => ({ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: color + "22", color }),
  tab:  (active) => ({ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: active ? "#fff" : "#64748b" }),
  th:   { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1 },
  td:   { padding: "14px 16px", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" },
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6"];

export default function AdminDashboard() {
  const { user, logout }          = useAuthStore();
  const navigate                  = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("overview");
  const [search, setSearch]       = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        client.get("/admin/analytics"),
        client.get("/admin/users"),
      ]);
      setAnalytics(a.data.data);
      setUsers(u.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const changeStatus = async (userId, status) => {
    try { await client.patch(`/admin/users/${userId}/status`, { status }); fetchAll(); }
    catch (err) { alert(err.response?.data?.error || "Failed"); }
  };

  const changePlan = async (userId, plan) => {
    try { await client.patch(`/admin/users/${userId}/plan`, { plan }); fetchAll(); }
    catch (err) { alert("Failed"); }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.businessName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <p style={{ color: "#64748b" }}>Loading admin dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <span style={{ fontWeight: 700, color: "#f1f5f9" }}>India Geo API</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            ADMIN
          </span>
        </div>
        <button onClick={() => { logout(); navigate("/login"); }}
          style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
          Logout
        </button>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {["overview", "users"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={S.tab(tab === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && analytics && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { label: "Total Users",       value: analytics.users.total,          icon: "👥", color: "#6366f1" },
                { label: "Active Users",      value: analytics.users.active,         icon: "✅", color: "#10b981" },
                { label: "Today's Requests",  value: analytics.requests.today,       icon: "📊", color: "#8b5cf6" },
                { label: "Total Villages",    value: analytics.data.villages,        icon: "🏘️", color: "#f59e0b" },
              ].map(c => (
                <div key={c.label} style={S.card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{c.label}</span>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: c.color }}>
                    {c.value?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Pie chart */}
              <div style={S.card}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Users by Plan
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analytics.planBreakdown} dataKey="count" nameKey="plan"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ plan, count }) => `${plan}: ${count}`}
                    >
                      {analytics.planBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart */}
              <div style={S.card}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Top Endpoints
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.topEndpoints} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="endpoint" type="category" tick={{ fontSize: 10, fill: "#475569" }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 6, 6, 0]}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DB Summary */}
            <div style={S.card}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1 }}>
                Database Summary
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, textAlign: "center" }}>
                {[
                  { label: "States",    value: analytics.data.states,    color: "#6366f1" },
                  { label: "Districts", value: analytics.data.districts, color: "#8b5cf6" },
                  { label: "Villages",  value: analytics.data.villages,  color: "#10b981" },
                ].map(item => (
                  <div key={item.label} style={{ padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value?.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={S.card}>
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or business name..."
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "#f1f5f9", fontSize: 14, outline: "none" }}
              />
            </div>

            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Business", "Email", "Status", "Plan", "Requests", "Actions"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={S.td}><span style={{ color: "#e2e8f0", fontWeight: 500 }}>{u.businessName}</span></td>
                      <td style={S.td}><span style={{ color: "#64748b" }}>{u.email}</span></td>
                      <td style={S.td}>
                        <span style={S.badge(
                          u.status === "ACTIVE" ? "#10b981" :
                          u.status === "PENDING" ? "#f59e0b" : "#ef4444"
                        )}>
                          {u.status}
                        </span>
                      </td>
                      <td style={S.td}>
                        <select value={u.planType}
                          onChange={(e) => changePlan(u.id, e.target.value)}
                          style={{ fontSize: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
                          {["FREE", "PREMIUM", "PRO", "UNLIMITED"].map(p => (
                            <option key={p} value={p} style={{ background: "#1e293b" }}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}><span style={{ color: "#64748b" }}>{u._count?.usageLogs?.toLocaleString() || 0}</span></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {u.status === "PENDING" && (
                            <button onClick={() => changeStatus(u.id, "ACTIVE")}
                              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", cursor: "pointer" }}>
                              Approve
                            </button>
                          )}
                          {u.status === "ACTIVE" && (
                            <button onClick={() => changeStatus(u.id, "SUSPENDED")}
                              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.15)", color: "#ef4444", cursor: "pointer" }}>
                              Suspend
                            </button>
                          )}
                          {u.status === "SUSPENDED" && (
                            <button onClick={() => changeStatus(u.id, "ACTIVE")}
                              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", background: "rgba(99,102,241,0.15)", color: "#818cf8", cursor: "pointer" }}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}