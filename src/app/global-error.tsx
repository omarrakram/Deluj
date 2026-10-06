"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fb4e12", color: "#fff7ee", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>Something got stuck in the oven.</h1>
          <p style={{ fontSize: 18, opacity: 0.9 }}>Give it another try and we&apos;ll have it ready.</p>
          <button onClick={reset} style={{ marginTop: 24, height: 52, padding: "0 28px", border: 0, borderRadius: 999, background: "#fff7ee", color: "#c2380a", fontWeight: 700, fontSize: 16 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
