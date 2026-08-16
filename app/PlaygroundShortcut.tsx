export function PlaygroundShortcut() {
  return (
    <a
      href="./playground/"
      aria-label="Open UIR Playground"
      style={{
        position: "fixed",
        zIndex: 99,
        left: 24,
        bottom: 24,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "1px solid rgb(21 23 19 / 0.34)",
        borderRadius: 3,
        background: "rgb(243 241 232 / 0.92)",
        boxShadow: "5px 5px 0 rgb(21 23 19 / 0.12)",
        color: "#151713",
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".06em",
        textDecoration: "none",
        textTransform: "uppercase",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ color: "#648112" }}>●</span>
      Playground ↗
    </a>
  );
}
