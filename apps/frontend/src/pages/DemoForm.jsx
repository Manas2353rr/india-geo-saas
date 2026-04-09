import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const DEMO_API_KEY = import.meta.env.VITE_DEMO_KEY || "ak_13fd62088cc44bf06a3365691e0500c2f1e09a63ee8a79e166f3f4ca09d721bf";

export default function DemoForm() {
  const [query, setSuggestionQuery]   = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted]     = useState(false);
  const [searching, setSearching]     = useState(false);

  const handleSearch = async (val) => {
    setSuggestionQuery(val);
    setSelected(null);
    if (val.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/autocomplete?q=${encodeURIComponent(val)}&limit=8`,
        { headers: { "X-API-Key": DEMO_API_KEY } }
      );
      const data = await res.json();
      setSuggestions(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectVillage = (v) => {
    setSelected(v);
    setSuggestionQuery(v.label);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) { alert("Please select a village first"); return; }
    setSubmitted(true);
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
    background: "rgba(255,255,255,0.07)", color: "#f1f5f9",
    border: "1px solid rgba(255,255,255,0.1)", outline: "none",
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 48, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px" }}>Form Submitted!</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>Full address captured via API:</p>
          <code style={{ display: "block", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 16, fontSize: 13, color: "#818cf8", textAlign: "left", lineHeight: 1.6 }}>
            {selected?.fullAddress}
          </code>
          <button
            onClick={() => { setSubmitted(false); setSelected(null); setSuggestionQuery(""); setForm({ name: "", email: "", phone: "", message: "" }); }}
            style={{ marginTop: 24, padding: "12px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>
            Contact Form Demo
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Powered by India Geo API — type any village name below
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 40, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
          <form onSubmit={handleSubmit}>
            {/* Name, Email, Phone */}
            {[
              { label: "Full Name",    key: "name",    type: "text",  placeholder: "Rahul Sharma",        required: true },
              { label: "Email",        key: "email",   type: "email", placeholder: "rahul@example.com",   required: true },
              { label: "Phone",        key: "phone",   type: "tel",   placeholder: "+91 98765 43210",     required: false },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 8 }}>
                  {f.label}
                </label>
                <input
                  type={f.type} required={f.required} placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            ))}

            {/* Village autocomplete */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 8 }}>
                Village / Area
                <span style={{ marginLeft: 8, fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                  ✨ AI Autocomplete
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text" value={query} autoComplete="off"
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Type village name e.g. Manibeli, Delhi..."
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => setTimeout(() => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; setSuggestions([]); }, 200)}
                />
                {searching && (
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
                    ⏳
                  </span>
                )}
                {suggestions.length > 0 && (
                  <div style={{
                    position: "absolute", zIndex: 100, width: "100%", top: "calc(100% + 8px)",
                    background: "#1e293b", border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 14, overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                  }}>
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        onMouseDown={() => selectVillage(s)}
                        style={{
                          padding: "12px 16px", cursor: "pointer",
                          borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0" }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{s.subtitle}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-filled address */}
            {selected && (
              <div style={{ marginBottom: 20, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 }}>
                  ✅ Address Auto-Filled
                </p>
                {[
                  ["Sub-District", selected.hierarchy.subDistrict],
                  ["District",     selected.hierarchy.district],
                  ["State",        selected.hierarchy.state],
                  ["Country",      selected.hierarchy.country],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#475569" }}>{label}</span>
                    <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Message */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 8 }}>
                Message
              </label>
              <textarea
                rows={3} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Your message..."
                style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%", padding: 16, borderRadius: 14, border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              }}>
              Submit Form →
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 24 }}>
          This demo uses the India Geo API to power village-level address autocomplete
        </p>
      </div>
    </div>
  );
}