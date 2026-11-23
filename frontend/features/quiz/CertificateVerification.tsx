import { useState } from "react";
import { API_URL } from "../staff/courseApi";
import { supabase } from "../../supabaseClient";

export function CertificateVerification() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/staff/certificates/${encodeURIComponent(identifier.trim())}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok && payload.valid ? `Certificate verified. Identifier: ${payload.certificate.certificate_identifier}` : payload.error || "No valid certificate was found for that identifier.");
    } catch {
      setMessage("We could not verify the certificate. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="content-card" aria-labelledby="certificate-verification-title">
    <h2 id="certificate-verification-title">Verify a certificate</h2>
    <p>Confirm a learner’s certificate using its unique identifier.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input aria-label="Certificate identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Certificate ID" />
      <button className="btn primary" disabled={busy || !identifier.trim()} onClick={() => void verify()}>{busy ? "Checking…" : "Verify"}</button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
