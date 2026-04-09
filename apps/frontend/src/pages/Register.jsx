import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

export default function Register() {
  const [form, setForm]       = useState({ email: "", password: "", businessName: "", phone: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await client.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
    background: "rgba(255,255,255,0.07)", color: "#f1f5f9",
    border: "1px solid rgba(255,255,255,0.1)", outline: "none",
  };

  const pageStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };

  const cardStyle = {
    width: "100%", maxWidth: 480,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24, padding: 48,
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  };

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px" }}>
            Registration Submitted!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>
            Your account is pending admin approval. You'll be notified once approved.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "12px 32px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>🏢</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>
            Create Account
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Register for API access</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#fca5a5", fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: "Business Name", key: "businessName", type: "text",     placeholder: "Acme Corp" },
            { label: "Business Email", key: "email",        type: "email",    placeholder: "you@company.com" },
            { label: "Phone Number",   key: "phone",        type: "tel",      placeholder: "+91 98765 43210" },
            { label: "Password",       key: "password",     type: "password", placeholder: "Min 8 characters" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#cbd5e1", marginBottom: 8 }}>
                {label}
              </label>
              <input
                type={type} placeholder={placeholder}
                required={key !== "phone"}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", marginTop: 8,
            }}
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 24 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}