import { useState, useEffect, useRef, useCallback } from “react”;

// ─── Database Layer (IndexedDB for offline) ─────────────────────────────────
const DB_NAME = “BarberOilDB”;
const DB_VERSION = 3;

function openDB() {
return new Promise((resolve, reject) => {
const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onupgradeneeded = (e) => {
const db = e.target.result;
if (!db.objectStoreNames.contains(“customers”)) {
const cs = db.createObjectStore(“customers”, { keyPath: “accountNumber” });
cs.createIndex(“name”, “name”, { unique: false });
}
if (!db.objectStoreNames.contains(“products”)) {
db.createObjectStore(“products”, { keyPath: “id” });
}
if (!db.objectStoreNames.contains(“invoices”)) {
const inv = db.createObjectStore(“invoices”, { keyPath: “invoiceNumber” });
inv.createIndex(“customerId”, “customerId”, { unique: false });
inv.createIndex(“date”, “date”, { unique: false });
inv.createIndex(“driverId”, “driverId”, { unique: false });
}
if (!db.objectStoreNames.contains(“users”)) {
db.createObjectStore(“users”, { keyPath: “id” });
}
if (!db.objectStoreNames.contains(“settings”)) {
db.createObjectStore(“settings”, { keyPath: “key” });
}
};
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}

async function dbGet(store, key) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, “readonly”);
const req = tx.objectStore(store).get(key);
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
}

async function dbGetAll(store) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, “readonly”);
const req = tx.objectStore(store).getAll();
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
}

async function dbPut(store, data) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, “readwrite”);
tx.objectStore(store).put(data);
tx.oncomplete = () => resolve();
tx.onerror = () => reject(tx.error);
});
}

async function dbDelete(store, key) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, “readwrite”);
tx.objectStore(store).delete(key);
tx.oncomplete = () => resolve();
tx.onerror = () => reject(tx.error);
});
}

async function dbClear(store) {
const db = await openDB();
return new Promise((resolve, reject) => {
const tx = db.transaction(store, “readwrite”);
tx.objectStore(store).clear();
tx.oncomplete = () => resolve();
tx.onerror = () => reject(tx.error);
});
}

// ─── Default Data ───────────────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
{ id: “REG87”, name: “Regular Gasoline 87 Octane (No Ethanol)”, shortName: “Reg 87 No-Eth”, pricePerGallon: 0, taxable: false },
{ id: “PLUS90”, name: “Unleaded Plus 90 Octane (No Ethanol)”, shortName: “Plus 90 No-Eth”, pricePerGallon: 0, taxable: false },
{ id: “ULSD”, name: “Clear ULSD”, shortName: “Clear ULSD”, pricePerGallon: 0, taxable: false },
{ id: “REGETH”, name: “Unleaded Regular (With Ethanol)”, shortName: “Reg w/ Ethanol”, pricePerGallon: 0, taxable: false },
{ id: “DYED”, name: “Dyed Diesel (Off-Road Use Only)”, shortName: “Dyed Diesel”, pricePerGallon: 0, taxable: true },
{ id: “KERO”, name: “Kerosene”, shortName: “Kerosene”, pricePerGallon: 0, taxable: false },
];

const DEFAULT_USERS = [
{ id: “admin”, name: “Admin”, pin: “1234”, role: “admin” },
{ id: “driver1”, name: “Driver 1”, pin: “1111”, role: “driver” },
];

const TAX_RATE = 0.07;

// ─── Utility ────────────────────────────────────────────────────────────────
function generateInvoiceNumber() {
const d = new Date();
const yr = d.getFullYear().toString().slice(2);
const mo = String(d.getMonth() + 1).padStart(2, “0”);
const dy = String(d.getDate()).padStart(2, “0”);
const rand = Math.floor(Math.random() * 9000 + 1000);
return `BO-${yr}${mo}${dy}-${rand}`;
}

function formatCurrency(n) {
return “$” + Number(n || 0).toFixed(2);
}

function formatDate(d) {
if (!d) return “”;
const date = new Date(d);
return date.toLocaleDateString(“en-US”, { month: “short”, day: “numeric”, year: “numeric” });
}

function formatDateTime(d) {
if (!d) return “”;
const date = new Date(d);
return date.toLocaleDateString(“en-US”, { month: “short”, day: “numeric”, year: “numeric”, hour: “numeric”, minute: “2-digit” });
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const COLORS = {
bg: “#0F1117”,
surface: “#1A1D27”,
surfaceAlt: “#222633”,
border: “#2D3348”,
borderLight: “#3A4060”,
primary: “#D4A44C”,
primaryDark: “#B8882E”,
primaryLight: “#E8C87A”,
accent: “#C44B2C”,
accentLight: “#E8633F”,
text: “#E8E6E1”,
textMuted: “#9B9DAB”,
textDim: “#6B6D7B”,
success: “#3B9B6A”,
warning: “#D4A44C”,
danger: “#C44B2C”,
white: “#FFFFFF”,
};

const styles = {
app: {
fontFamily: “‘Courier Prime’, ‘Courier New’, monospace”,
background: COLORS.bg,
color: COLORS.text,
minHeight: “100vh”,
maxWidth: 480,
margin: “0 auto”,
position: “relative”,
paddingBottom: 80,
},
header: {
background: `linear-gradient(135deg, ${COLORS.surface} 0%, #1E2130 100%)`,
borderBottom: `2px solid ${COLORS.primary}`,
padding: “16px 20px”,
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
position: “sticky”,
top: 0,
zIndex: 100,
},
headerTitle: {
fontSize: 18,
fontWeight: 700,
color: COLORS.primary,
letterSpacing: 2,
textTransform: “uppercase”,
},
headerSub: {
fontSize: 10,
color: COLORS.textMuted,
letterSpacing: 3,
textTransform: “uppercase”,
marginTop: 2,
},
nav: {
position: “fixed”,
bottom: 0,
left: “50%”,
transform: “translateX(-50%)”,
width: “100%”,
maxWidth: 480,
background: COLORS.surface,
borderTop: `1px solid ${COLORS.border}`,
display: “flex”,
justifyContent: “space-around”,
padding: “8px 0 12px”,
zIndex: 100,
},
navItem: (active) => ({
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
gap: 2,
padding: “6px 12px”,
cursor: “pointer”,
color: active ? COLORS.primary : COLORS.textDim,
fontSize: 10,
letterSpacing: 1,
textTransform: “uppercase”,
background: “none”,
border: “none”,
fontFamily: “inherit”,
transition: “color 0.2s”,
}),
card: {
background: COLORS.surface,
border: `1px solid ${COLORS.border}`,
borderRadius: 8,
margin: “12px 16px”,
padding: 16,
},
cardTitle: {
fontSize: 11,
letterSpacing: 2,
textTransform: “uppercase”,
color: COLORS.primary,
marginBottom: 12,
fontWeight: 700,
},
input: {
width: “100%”,
background: COLORS.surfaceAlt,
border: `1px solid ${COLORS.border}`,
borderRadius: 6,
padding: “12px 14px”,
color: COLORS.text,
fontSize: 15,
fontFamily: “inherit”,
outline: “none”,
boxSizing: “border-box”,
marginBottom: 10,
},
inputLabel: {
fontSize: 10,
letterSpacing: 1.5,
textTransform: “uppercase”,
color: COLORS.textMuted,
marginBottom: 4,
display: “block”,
},
btn: (variant = “primary”) => ({
width: “100%”,
padding: “14px 20px”,
borderRadius: 6,
border: “none”,
fontSize: 13,
fontWeight: 700,
letterSpacing: 2,
textTransform: “uppercase”,
cursor: “pointer”,
fontFamily: “inherit”,
transition: “all 0.2s”,
…(variant === “primary” && { background: COLORS.primary, color: COLORS.bg }),
…(variant === “danger” && { background: COLORS.danger, color: COLORS.white }),
…(variant === “outline” && { background: “transparent”, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }),
…(variant === “ghost” && { background: “transparent”, color: COLORS.textMuted }),
…(variant === “success” && { background: COLORS.success, color: COLORS.white }),
}),
select: {
width: “100%”,
background: COLORS.surfaceAlt,
border: `1px solid ${COLORS.border}`,
borderRadius: 6,
padding: “12px 14px”,
color: COLORS.text,
fontSize: 15,
fontFamily: “inherit”,
outline: “none”,
boxSizing: “border-box”,
marginBottom: 10,
appearance: “none”,
},
badge: (color) => ({
display: “inline-block”,
padding: “3px 8px”,
borderRadius: 4,
fontSize: 10,
fontWeight: 700,
letterSpacing: 1,
textTransform: “uppercase”,
background: color + “22”,
color: color,
fontFamily: “inherit”,
}),
divider: {
borderTop: `1px solid ${COLORS.border}`,
margin: “12px 0”,
},
row: {
display: “flex”,
gap: 10,
marginBottom: 10,
},
flex1: { flex: 1 },
signatureCanvas: {
width: “100%”,
height: 120,
background: COLORS.surfaceAlt,
border: `1px solid ${COLORS.border}`,
borderRadius: 6,
cursor: “crosshair”,
touchAction: “none”,
},
toast: (show) => ({
position: “fixed”,
top: 20,
left: “50%”,
transform: `translateX(-50%) translateY(${show ? 0 : -100}px)`,
background: COLORS.success,
color: COLORS.white,
padding: “12px 24px”,
borderRadius: 8,
fontSize: 13,
fontWeight: 700,
letterSpacing: 1,
zIndex: 999,
transition: “transform 0.3s ease”,
fontFamily: “inherit”,
textTransform: “uppercase”,
}),
onlineIndicator: (online) => ({
width: 8,
height: 8,
borderRadius: “50%”,
background: online ? COLORS.success : COLORS.danger,
display: “inline-block”,
marginRight: 6,
}),
};

// ─── Icons (SVG) ────────────────────────────────────────────────────────────
const Icon = ({ name, size = 22, color = “currentColor” }) => {
const icons = {
invoice: <><rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5"/><line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1.5"/><line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="1.5"/></>,
customers: <><circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.5" fill="none"/><path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke={color} strokeWidth="1.5" fill="none"/></>,
products: <><path d="M12 2L3 7v10l9 5 9-5V7z" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 12L3 7" stroke={color} strokeWidth="1.5"/><path d="M12 12l9-5" stroke={color} strokeWidth="1.5"/><path d="M12 12v10" stroke={color} strokeWidth="1.5"/></>,
history: <><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="12,7 12,12 16,14" stroke={color} strokeWidth="1.5" fill="none"/></>,
dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none"/></>,
settings: <><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke={color} strokeWidth="1.5"/></>,
plus: <><line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2"/><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2"/></>,
search: <><circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.5" fill="none"/><line x1="16" y1="16" x2="21" y2="21" stroke={color} strokeWidth="1.5"/></>,
back: <><polyline points="15,18 9,12 15,6" stroke={color} strokeWidth="2" fill="none"/></>,
logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="16,17 21,12 16,7" stroke={color} strokeWidth="1.5" fill="none"/><line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5"/></>,
upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="17,8 12,3 7,8" stroke={color} strokeWidth="1.5" fill="none"/><line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth="1.5"/></>,
trash: <><polyline points="3,6 5,6 21,6" stroke={color} strokeWidth="1.5" fill="none"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color} strokeWidth="1.5" fill="none"/></>,
check: <><polyline points="20,6 9,17 4,12" stroke={color} strokeWidth="2" fill="none"/></>,
edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="1.5" fill="none"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.5" fill="none"/></>,
fuel: <><path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16" stroke={color} strokeWidth="1.5" fill="none"/><path d="M15 10h2a2 2 0 012 2v3a2 2 0 002 2v0a2 2 0 002-2V8l-3-3" stroke={color} strokeWidth="1.5" fill="none"/><rect x="6" y="8" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none"/></>,
};
return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{icons[name]}</svg>;
};

// ─── Signature Pad Component ────────────────────────────────────────────────
function SignaturePad({ value, onChange }) {
const canvasRef = useRef(null);
const [drawing, setDrawing] = useState(false);

const getPos = (e) => {
const rect = canvasRef.current.getBoundingClientRect();
const touch = e.touches ? e.touches[0] : e;
return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
};

const startDraw = (e) => {
e.preventDefault();
const ctx = canvasRef.current.getContext(“2d”);
const pos = getPos(e);
ctx.beginPath();
ctx.moveTo(pos.x, pos.y);
setDrawing(true);
};

const draw = (e) => {
e.preventDefault();
if (!drawing) return;
const ctx = canvasRef.current.getContext(“2d”);
const pos = getPos(e);
ctx.lineTo(pos.x, pos.y);
ctx.strokeStyle = COLORS.text;
ctx.lineWidth = 2;
ctx.lineCap = “round”;
ctx.stroke();
};

const endDraw = (e) => {
e.preventDefault();
setDrawing(false);
if (canvasRef.current) {
onChange(canvasRef.current.toDataURL());
}
};

const clearSig = () => {
const canvas = canvasRef.current;
const ctx = canvas.getContext(“2d”);
ctx.clearRect(0, 0, canvas.width, canvas.height);
onChange(””);
};

useEffect(() => {
const canvas = canvasRef.current;
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
}, []);

return (
<div>
<canvas
ref={canvasRef}
style={styles.signatureCanvas}
onMouseDown={startDraw}
onMouseMove={draw}
onMouseUp={endDraw}
onMouseLeave={endDraw}
onTouchStart={startDraw}
onTouchMove={draw}
onTouchEnd={endDraw}
/>
<button style={{ …styles.btn(“ghost”), padding: “8px”, marginTop: 4, fontSize: 10 }} onClick={clearSig}>Clear Signature</button>
</div>
);
}

// ─── CSV Import Parser ──────────────────────────────────────────────────────
function parseCSV(text) {
const lines = text.split(”\n”).filter(l => l.trim());
if (lines.length < 2) return [];
const headers = lines[0].split(”,”).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, “”));
const rows = [];
for (let i = 1; i < lines.length; i++) {
const vals = lines[i].split(”,”).map(v => v.trim().replace(/^”|”$/g, “”));
const obj = {};
headers.forEach((h, idx) => { obj[h] = vals[idx] || “”; });
rows.push(obj);
}
return rows;
}

function mapCSVToCustomer(row) {
return {
accountNumber: row.accountnumber || row.account || row.acctno || row.id || (“IMPORT-” + Math.random().toString(36).slice(2, 8)),
name: row.name || row.customername || row.customer || “”,
address: row.address || row.street || “”,
city: row.city || “”,
state: row.state || “”,
zip: row.zip || row.zipcode || row.postalcode || “”,
phone: row.phone || row.telephone || row.tel || “”,
email: row.email || row.emailaddress || “”,
taxExempt: (row.taxexempt || row.exempt || “”).toLowerCase() === “yes” || (row.taxexempt || row.exempt || “”).toLowerCase() === “true”,
notes: row.notes || “”,
};
}

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, show }) {
return <div style={styles.toast(show)}>{message}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── MAIN APP ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function BarberOilApp() {
const [ready, setReady] = useState(false);
const [user, setUser] = useState(null);
const [page, setPage] = useState(“invoice”);
const [subPage, setSubPage] = useState(null);
const [customers, setCustomers] = useState([]);
const [products, setProducts] = useState([]);
const [invoices, setInvoices] = useState([]);
const [users, setUsers] = useState([]);
const [toast, setToast] = useState({ show: false, message: “” });
const [online, setOnline] = useState(navigator.onLine);

const showToast = (message) => {
setToast({ show: true, message });
setTimeout(() => setToast({ show: false, message: “” }), 2500);
};

// ─── Init DB ────────────────────────────────────────────────────
useEffect(() => {
async function init() {
const prods = await dbGetAll(“products”);
if (prods.length === 0) {
for (const p of DEFAULT_PRODUCTS) await dbPut(“products”, p);
}
const usrs = await dbGetAll(“users”);
if (usrs.length === 0) {
for (const u of DEFAULT_USERS) await dbPut(“users”, u);
}
await refreshData();
setReady(true);
}
init();
window.addEventListener(“online”, () => setOnline(true));
window.addEventListener(“offline”, () => setOnline(false));
}, []);

const refreshData = async () => {
setCustomers(await dbGetAll(“customers”));
setProducts(await dbGetAll(“products”));
setInvoices(await dbGetAll(“invoices”));
setUsers(await dbGetAll(“users”));
};

// ─── Login Screen ──────────────────────────────────────────────
if (!user) {
return <LoginScreen users={users} onLogin={setUser} ready={ready} />;
}

const navItems = [
{ id: “invoice”, icon: “invoice”, label: “New” },
{ id: “history”, icon: “history”, label: “History” },
{ id: “customers”, icon: “customers”, label: “Customers” },
…(user.role === “admin” ? [
{ id: “products”, icon: “products”, label: “Products” },
{ id: “dashboard”, icon: “dashboard”, label: “Dashboard” },
{ id: “settings”, icon: “settings”, label: “Settings” },
] : []),
];

return (
<div style={styles.app}>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
<Toast message={toast.message} show={toast.show} />

```
  {/* Header */}
  <div style={styles.header}>
    <div>
      {subPage ? (
        <button style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.primary, padding: 0 }} onClick={() => setSubPage(null)}>
          <Icon name="back" size={20} color={COLORS.primary} />
        </button>
      ) : (
        <>
          <div style={styles.headerTitle}>Barber Oil</div>
          <div style={styles.headerSub}>Hohenwald, Tennessee</div>
        </>
      )}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 10, color: COLORS.textMuted, display: "flex", alignItems: "center" }}>
        <span style={styles.onlineIndicator(online)} />
        {online ? "Online" : "Offline"}
      </span>
      <span style={{ fontSize: 10, color: COLORS.textDim }}>{user.name}</span>
      <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setUser(null)}>
        <Icon name="logout" size={18} color={COLORS.textDim} />
      </button>
    </div>
  </div>

  {/* Pages */}
  {page === "invoice" && (
    <InvoicePage
      customers={customers}
      products={products}
      user={user}
      onSave={async (inv) => {
        await dbPut("invoices", inv);
        await refreshData();
        showToast("Invoice saved!");
      }}
    />
  )}
  {page === "history" && (
    <HistoryPage
      invoices={invoices}
      customers={customers}
      products={products}
      users={users}
      subPage={subPage}
      setSubPage={setSubPage}
    />
  )}
  {page === "customers" && (
    <CustomersPage
      customers={customers}
      onRefresh={refreshData}
      showToast={showToast}
      subPage={subPage}
      setSubPage={setSubPage}
      isAdmin={user.role === "admin"}
    />
  )}
  {page === "products" && user.role === "admin" && (
    <ProductsPage products={products} onRefresh={refreshData} showToast={showToast} />
  )}
  {page === "dashboard" && user.role === "admin" && (
    <DashboardPage invoices={invoices} products={products} customers={customers} users={users} />
  )}
  {page === "settings" && user.role === "admin" && (
    <SettingsPage users={users} onRefresh={refreshData} showToast={showToast} />
  )}

  {/* Nav */}
  <div style={styles.nav}>
    {navItems.map(n => (
      <button key={n.id} style={styles.navItem(page === n.id)} onClick={() => { setPage(n.id); setSubPage(null); }}>
        <Icon name={n.icon} size={20} />
        <span>{n.label}</span>
      </button>
    ))}
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin, ready }) {
const [pin, setPin] = useState(””);
const [selectedUser, setSelectedUser] = useState(””);
const [error, setError] = useState(””);

const handleLogin = () => {
const u = users.find(u => u.id === selectedUser && u.pin === pin);
if (u) { onLogin(u); setError(””); }
else { setError(“Invalid PIN”); setPin(””); }
};

return (
<div style={{ …styles.app, display: “flex”, flexDirection: “column”, justifyContent: “center”, minHeight: “100vh”, padding: 24 }}>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
<div style={{ textAlign: “center”, marginBottom: 40 }}>
<div style={{ display: “inline-flex”, alignItems: “center”, justifyContent: “center”, width: 64, height: 64, borderRadius: 16, background: COLORS.primary + “22”, marginBottom: 16 }}>
<Icon name="fuel" size={32} color={COLORS.primary} />
</div>
<div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary, letterSpacing: 4, textTransform: “uppercase” }}>Barber Oil</div>
<div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 3, marginTop: 4, textTransform: “uppercase” }}>Hohenwald, Tennessee</div>
</div>

```
  {!ready ? (
    <div style={{ textAlign: "center", color: COLORS.textDim }}>Loading...</div>
  ) : (
    <div style={styles.card}>
      <div style={styles.cardTitle}>Driver Login</div>
      <label style={styles.inputLabel}>Select Driver</label>
      <select style={styles.select} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
        <option value="">-- Select --</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </select>
      <label style={styles.inputLabel}>PIN</label>
      <input
        style={styles.input}
        type="password"
        maxLength={6}
        placeholder="Enter PIN"
        value={pin}
        onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleLogin()}
      />
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button style={styles.btn("primary")} onClick={handleLogin}>Login</button>
    </div>
  )}
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── INVOICE PAGE (POS) ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function InvoicePage({ customers, products, user, onSave }) {
const emptyInvoice = {
invoiceNumber: generateInvoiceNumber(),
date: new Date().toISOString(),
driverId: user.id,
driverName: user.name,
customerId: “”,
customerName: “”,
customerAddress: “”,
customerPhone: “”,
customerEmail: “”,
customerTaxExempt: false,
lineItems: [],
subtotal: 0,
taxTotal: 0,
grandTotal: 0,
poNumber: “”,
ticketNumber: “”,
tankReadingBefore: “”,
tankReadingAfter: “”,
deliveryNotes: “”,
signature: “”,
paymentStatus: “invoice”,
paymentMethod: “”,
paymentRef: “”,
status: “draft”,
};

const [inv, setInv] = useState(emptyInvoice);
const [customerSearch, setCustomerSearch] = useState(””);
const [showCustomerList, setShowCustomerList] = useState(false);
const [showAddLine, setShowAddLine] = useState(false);
const [newLine, setNewLine] = useState({ productId: “”, gallons: “”, priceOverride: “” });

const filteredCustomers = customers.filter(c =>
c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
c.accountNumber.toLowerCase().includes(customerSearch.toLowerCase())
);

const selectCustomer = (c) => {
setInv(prev => ({
…prev,
customerId: c.accountNumber,
customerName: c.name,
customerAddress: [c.address, c.city, c.state, c.zip].filter(Boolean).join(”, “),
customerPhone: c.phone,
customerEmail: c.email,
customerTaxExempt: c.taxExempt,
}));
setShowCustomerList(false);
setCustomerSearch(””);
};

const addLineItem = () => {
const prod = products.find(p => p.id === newLine.productId);
if (!prod || !newLine.gallons) return;
const gallons = parseFloat(newLine.gallons);
const price = newLine.priceOverride ? parseFloat(newLine.priceOverride) : prod.pricePerGallon;
const lineTotal = gallons * price;
const taxable = prod.taxable && !inv.customerTaxExempt;
const lineTax = taxable ? lineTotal * TAX_RATE : 0;

```
const item = {
  id: Date.now().toString(),
  productId: prod.id,
  productName: prod.shortName,
  gallons,
  pricePerGallon: price,
  lineTotal,
  taxable,
  lineTax,
};

const newItems = [...inv.lineItems, item];
const subtotal = newItems.reduce((s, i) => s + i.lineTotal, 0);
const taxTotal = newItems.reduce((s, i) => s + i.lineTax, 0);

setInv(prev => ({ ...prev, lineItems: newItems, subtotal, taxTotal, grandTotal: subtotal + taxTotal }));
setNewLine({ productId: "", gallons: "", priceOverride: "" });
setShowAddLine(false);
```

};

const removeLineItem = (id) => {
const newItems = inv.lineItems.filter(i => i.id !== id);
const subtotal = newItems.reduce((s, i) => s + i.lineTotal, 0);
const taxTotal = newItems.reduce((s, i) => s + i.lineTax, 0);
setInv(prev => ({ …prev, lineItems: newItems, subtotal, taxTotal, grandTotal: subtotal + taxTotal }));
};

const handleSave = async () => {
if (!inv.customerId) { alert(“Please select a customer”); return; }
if (inv.lineItems.length === 0) { alert(“Please add at least one product”); return; }
const saved = { …inv, date: new Date().toISOString(), status: “completed” };
await onSave(saved);
setInv({ …emptyInvoice, invoiceNumber: generateInvoiceNumber() });
};

return (
<div>
{/* Invoice Number & Date */}
<div style={styles.card}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div>
<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 1, textTransform: “uppercase” }}>Invoice</div>
<div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>{inv.invoiceNumber}</div>
</div>
<div style={{ textAlign: “right” }}>
<div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 1, textTransform: “uppercase” }}>Date</div>
<div style={{ fontSize: 13, color: COLORS.text }}>{formatDate(inv.date)}</div>
</div>
</div>
</div>

```
  {/* Customer Selection */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>Customer</div>
    {inv.customerId ? (
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{inv.customerName}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Acct: {inv.customerId}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{inv.customerAddress}</div>
        {inv.customerTaxExempt && <span style={styles.badge(COLORS.warning)}>Tax Exempt</span>}
        <button style={{ ...styles.btn("ghost"), padding: "8px", marginTop: 8, fontSize: 10 }} onClick={() => setInv(prev => ({ ...prev, customerId: "", customerName: "", customerAddress: "", customerPhone: "", customerEmail: "", customerTaxExempt: false }))}>
          Change Customer
        </button>
      </div>
    ) : (
      <div>
        <input
          style={styles.input}
          placeholder="Search by name or account #..."
          value={customerSearch}
          onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
          onFocus={() => setShowCustomerList(true)}
        />
        {showCustomerList && customerSearch && (
          <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 6, background: COLORS.surfaceAlt }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: 12, color: COLORS.textDim, fontSize: 13 }}>No customers found</div>
            ) : filteredCustomers.slice(0, 20).map(c => (
              <div
                key={c.accountNumber}
                style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}
                onClick={() => selectCustomer(c)}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Acct: {c.accountNumber}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>

  {/* Line Items */}
  <div style={styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={styles.cardTitle}>Products</div>
      <button
        style={{ background: COLORS.primary + "22", border: `1px solid ${COLORS.primary}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: COLORS.primary, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit" }}
        onClick={() => setShowAddLine(!showAddLine)}
      >
        <Icon name="plus" size={14} color={COLORS.primary} /> Add
      </button>
    </div>

    {showAddLine && (
      <div style={{ background: COLORS.surfaceAlt, borderRadius: 6, padding: 12, marginBottom: 12, border: `1px solid ${COLORS.borderLight}` }}>
        <label style={styles.inputLabel}>Product</label>
        <select style={styles.select} value={newLine.productId} onChange={e => setNewLine(prev => ({ ...prev, productId: e.target.value }))}>
          <option value="">-- Select Product --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.shortName} — {formatCurrency(p.pricePerGallon)}/gal</option>
          ))}
        </select>
        <div style={styles.row}>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>Gallons</label>
            <input style={styles.input} type="number" step="0.1" placeholder="0.0" value={newLine.gallons} onChange={e => setNewLine(prev => ({ ...prev, gallons: e.target.value }))} />
          </div>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>Price Override (opt)</label>
            <input style={styles.input} type="number" step="0.001" placeholder={newLine.productId ? products.find(p => p.id === newLine.productId)?.pricePerGallon?.toFixed(3) : "0.000"} value={newLine.priceOverride} onChange={e => setNewLine(prev => ({ ...prev, priceOverride: e.target.value }))} />
          </div>
        </div>
        <button style={styles.btn("primary")} onClick={addLineItem}>Add to Invoice</button>
      </div>
    )}

    {inv.lineItems.length === 0 ? (
      <div style={{ textAlign: "center", padding: 20, color: COLORS.textDim, fontSize: 13 }}>No products added yet</div>
    ) : (
      inv.lineItems.map(item => (
        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{item.productName}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>
              {item.gallons} gal × {formatCurrency(item.pricePerGallon)}
              {item.taxable && <span style={{ color: COLORS.warning }}> +tax</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{formatCurrency(item.lineTotal)}</div>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={() => removeLineItem(item.id)}>
              <Icon name="trash" size={16} color={COLORS.danger} />
            </button>
          </div>
        </div>
      ))
    )}

    {inv.lineItems.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.textMuted, padding: "4px 0" }}>
          <span>Subtotal</span><span>{formatCurrency(inv.subtotal)}</span>
        </div>
        {inv.taxTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.warning, padding: "4px 0" }}>
            <span>Tax (7%)</span><span>{formatCurrency(inv.taxTotal)}</span>
          </div>
        )}
        <div style={{ ...styles.divider }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: COLORS.primary, padding: "4px 0" }}>
          <span>Total</span><span>{formatCurrency(inv.grandTotal)}</span>
        </div>
      </div>
    )}
  </div>

  {/* Extra Fields */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>Delivery Details</div>
    <div style={styles.row}>
      <div style={styles.flex1}>
        <label style={styles.inputLabel}>PO Number</label>
        <input style={styles.input} placeholder="Optional" value={inv.poNumber} onChange={e => setInv(prev => ({ ...prev, poNumber: e.target.value }))} />
      </div>
      <div style={styles.flex1}>
        <label style={styles.inputLabel}>Ticket Number</label>
        <input style={styles.input} placeholder="Optional" value={inv.ticketNumber} onChange={e => setInv(prev => ({ ...prev, ticketNumber: e.target.value }))} />
      </div>
    </div>
    <div style={styles.row}>
      <div style={styles.flex1}>
        <label style={styles.inputLabel}>Tank Before</label>
        <input style={styles.input} type="number" placeholder="Gallons" value={inv.tankReadingBefore} onChange={e => setInv(prev => ({ ...prev, tankReadingBefore: e.target.value }))} />
      </div>
      <div style={styles.flex1}>
        <label style={styles.inputLabel}>Tank After</label>
        <input style={styles.input} type="number" placeholder="Gallons" value={inv.tankReadingAfter} onChange={e => setInv(prev => ({ ...prev, tankReadingAfter: e.target.value }))} />
      </div>
    </div>
    <label style={styles.inputLabel}>Delivery Notes</label>
    <textarea style={{ ...styles.input, minHeight: 60, resize: "vertical" }} placeholder="Notes..." value={inv.deliveryNotes} onChange={e => setInv(prev => ({ ...prev, deliveryNotes: e.target.value }))} />
  </div>

  {/* Payment */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>Payment</div>
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {["invoice", "paid"].map(s => (
        <button
          key={s}
          style={{
            flex: 1, padding: "10px", borderRadius: 6, border: `1px solid ${inv.paymentStatus === s ? COLORS.primary : COLORS.border}`,
            background: inv.paymentStatus === s ? COLORS.primary + "22" : "transparent",
            color: inv.paymentStatus === s ? COLORS.primary : COLORS.textDim,
            fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
          }}
          onClick={() => setInv(prev => ({ ...prev, paymentStatus: s }))}
        >
          {s === "invoice" ? "Bill Later" : "Paid Now"}
        </button>
      ))}
    </div>
    {inv.paymentStatus === "paid" && (
      <div style={styles.row}>
        <div style={styles.flex1}>
          <label style={styles.inputLabel}>Method</label>
          <select style={styles.select} value={inv.paymentMethod} onChange={e => setInv(prev => ({ ...prev, paymentMethod: e.target.value }))}>
            <option value="">Select</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="card">Card</option>
          </select>
        </div>
        <div style={styles.flex1}>
          <label style={styles.inputLabel}>Ref / Check #</label>
          <input style={styles.input} placeholder="Optional" value={inv.paymentRef} onChange={e => setInv(prev => ({ ...prev, paymentRef: e.target.value }))} />
        </div>
      </div>
    )}
  </div>

  {/* Signature */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>Customer Signature</div>
    <SignaturePad value={inv.signature} onChange={(sig) => setInv(prev => ({ ...prev, signature: sig }))} />
  </div>

  {/* Save */}
  <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
    <button style={styles.btn("primary")} onClick={handleSave}>Save Invoice</button>
    <button style={styles.btn("outline")} onClick={() => { setInv({ ...emptyInvoice, invoiceNumber: generateInvoiceNumber() }); }}>Clear / New Invoice</button>
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── HISTORY PAGE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function HistoryPage({ invoices, customers, products, users, subPage, setSubPage }) {
const [search, setSearch] = useState(””);
const sorted = […invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
const filtered = sorted.filter(inv =>
inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
inv.customerId.toLowerCase().includes(search.toLowerCase())
);

if (subPage) {
const inv = invoices.find(i => i.invoiceNumber === subPage);
if (!inv) return <div style={styles.card}>Invoice not found</div>;
return <InvoiceDetail invoice={inv} />;
}

return (
<div>
<div style={{ padding: “12px 16px” }}>
<input style={styles.input} placeholder=“Search invoices…” value={search} onChange={e => setSearch(e.target.value)} />
</div>
{filtered.length === 0 ? (
<div style={{ …styles.card, textAlign: “center”, color: COLORS.textDim }}>No invoices found</div>
) : (
filtered.map(inv => (
<div key={inv.invoiceNumber} style={{ …styles.card, cursor: “pointer” }} onClick={() => setSubPage(inv.invoiceNumber)}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start” }}>
<div>
<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{inv.invoiceNumber}</div>
<div style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{inv.customerName}</div>
<div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDateTime(inv.date)}</div>
</div>
<div style={{ textAlign: “right” }}>
<div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{formatCurrency(inv.grandTotal)}</div>
<span style={styles.badge(inv.paymentStatus === “paid” ? COLORS.success : COLORS.warning)}>
{inv.paymentStatus === “paid” ? “Paid” : “Invoiced”}
</span>
</div>
</div>
</div>
))
)}
</div>
);
}

function InvoiceDetail({ invoice }) {
const inv = invoice;
return (
<div>
<div style={styles.card}>
<div style={{ textAlign: “center”, marginBottom: 16 }}>
<div style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary, letterSpacing: 3 }}>BARBER OIL</div>
<div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 }}>HOHENWALD, TENNESSEE</div>
</div>
<div style={styles.divider} />
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 12 }}>
<div>
<div style={{ fontSize: 10, color: COLORS.textDim, textTransform: “uppercase”, letterSpacing: 1 }}>Invoice #</div>
<div style={{ fontSize: 14, fontWeight: 700 }}>{inv.invoiceNumber}</div>
</div>
<div style={{ textAlign: “right” }}>
<div style={{ fontSize: 10, color: COLORS.textDim, textTransform: “uppercase”, letterSpacing: 1 }}>Date</div>
<div style={{ fontSize: 13 }}>{formatDateTime(inv.date)}</div>
</div>
</div>
<div style={{ marginBottom: 12 }}>
<div style={{ fontSize: 10, color: COLORS.textDim, textTransform: “uppercase”, letterSpacing: 1 }}>Customer</div>
<div style={{ fontSize: 14, fontWeight: 700 }}>{inv.customerName}</div>
<div style={{ fontSize: 12, color: COLORS.textMuted }}>Acct: {inv.customerId}</div>
<div style={{ fontSize: 12, color: COLORS.textMuted }}>{inv.customerAddress}</div>
</div>
<div style={{ fontSize: 11, color: COLORS.textMuted }}>Driver: {inv.driverName}</div>
</div>

```
  <div style={styles.card}>
    <div style={styles.cardTitle}>Line Items</div>
    {inv.lineItems.map((item, i) => (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{item.productName}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{item.gallons} gal × {formatCurrency(item.pricePerGallon)}{item.taxable ? " +tax" : ""}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(item.lineTotal)}</div>
      </div>
    ))}
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.textMuted }}><span>Subtotal</span><span>{formatCurrency(inv.subtotal)}</span></div>
      {inv.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.warning }}><span>Tax (7%)</span><span>{formatCurrency(inv.taxTotal)}</span></div>}
      <div style={styles.divider} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: COLORS.primary }}><span>Total</span><span>{formatCurrency(inv.grandTotal)}</span></div>
    </div>
  </div>

  {(inv.poNumber || inv.ticketNumber || inv.tankReadingBefore || inv.tankReadingAfter || inv.deliveryNotes) && (
    <div style={styles.card}>
      <div style={styles.cardTitle}>Delivery Details</div>
      {inv.poNumber && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>PO: {inv.poNumber}</div>}
      {inv.ticketNumber && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Ticket: {inv.ticketNumber}</div>}
      {inv.tankReadingBefore && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Tank Before: {inv.tankReadingBefore} gal</div>}
      {inv.tankReadingAfter && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Tank After: {inv.tankReadingAfter} gal</div>}
      {inv.deliveryNotes && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{inv.deliveryNotes}</div>}
    </div>
  )}

  <div style={styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={styles.badge(inv.paymentStatus === "paid" ? COLORS.success : COLORS.warning)}>
        {inv.paymentStatus === "paid" ? `Paid — ${inv.paymentMethod}${inv.paymentRef ? ` #${inv.paymentRef}` : ""}` : "Invoice — Bill Later"}
      </span>
    </div>
    {inv.signature && (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Customer Signature</div>
        <img src={inv.signature} alt="Signature" style={{ width: "100%", maxHeight: 80, objectFit: "contain", background: COLORS.surfaceAlt, borderRadius: 6, padding: 8 }} />
      </div>
    )}
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── CUSTOMERS PAGE ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function CustomersPage({ customers, onRefresh, showToast, subPage, setSubPage, isAdmin }) {
const [search, setSearch] = useState(””);
const [showAdd, setShowAdd] = useState(false);
const [showImport, setShowImport] = useState(false);
const [editCustomer, setEditCustomer] = useState(null);

const filtered = customers.filter(c =>
c.name.toLowerCase().includes(search.toLowerCase()) ||
c.accountNumber.toLowerCase().includes(search.toLowerCase())
).sort((a, b) => a.name.localeCompare(b.name));

if (editCustomer || showAdd) {
return (
<CustomerForm
customer={editCustomer}
onSave={async (c) => {
await dbPut(“customers”, c);
await onRefresh();
showToast(editCustomer ? “Customer updated!” : “Customer added!”);
setEditCustomer(null);
setShowAdd(false);
}}
onCancel={() => { setEditCustomer(null); setShowAdd(false); }}
/>
);
}

return (
<div>
<div style={{ padding: “12px 16px”, display: “flex”, gap: 8 }}>
<input style={{ …styles.input, flex: 1, marginBottom: 0 }} placeholder=“Search customers…” value={search} onChange={e => setSearch(e.target.value)} />
<button style={{ …styles.btn(“primary”), width: “auto”, padding: “12px” }} onClick={() => setShowAdd(true)}>
<Icon name="plus" size={18} color={COLORS.bg} />
</button>
</div>

```
  {isAdmin && (
    <div style={{ padding: "0 16px 8px" }}>
      <button style={{ ...styles.btn("outline"), fontSize: 10, padding: "8px 12px" }} onClick={() => setShowImport(!showImport)}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="upload" size={14} color={COLORS.primary} /> Import from CSV (Sage Export)
        </span>
      </button>
      {showImport && (
        <CSVImport onImport={async (rows) => {
          for (const row of rows) {
            const cust = mapCSVToCustomer(row);
            if (cust.name) await dbPut("customers", cust);
          }
          await onRefresh();
          setShowImport(false);
          showToast(`Imported ${rows.length} customers!`);
        }} />
      )}
    </div>
  )}

  <div style={{ padding: "0 16px 8px", fontSize: 11, color: COLORS.textDim }}>{filtered.length} customers</div>

  {filtered.map(c => (
    <div key={c.accountNumber} style={{ ...styles.card, cursor: "pointer" }} onClick={() => setEditCustomer(c)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{c.name}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Acct: {c.accountNumber}</div>
          {c.phone && <div style={{ fontSize: 11, color: COLORS.textDim }}>{c.phone}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {c.taxExempt && <span style={styles.badge(COLORS.warning)}>Exempt</span>}
          <Icon name="edit" size={16} color={COLORS.textDim} />
        </div>
      </div>
    </div>
  ))}
</div>
```

);
}

function CustomerForm({ customer, onSave, onCancel }) {
const [form, setForm] = useState(customer || {
accountNumber: “”, name: “”, address: “”, city: “”, state: “”, zip: “”, phone: “”, email: “”, taxExempt: false, notes: “”,
});

const update = (field, val) => setForm(prev => ({ …prev, [field]: val }));

return (
<div>
<div style={styles.card}>
<div style={styles.cardTitle}>{customer ? “Edit Customer” : “New Customer”}</div>
<label style={styles.inputLabel}>Account Number *</label>
<input style={styles.input} value={form.accountNumber} onChange={e => update(“accountNumber”, e.target.value)} placeholder=“Account #” disabled={!!customer} />
<label style={styles.inputLabel}>Name *</label>
<input style={styles.input} value={form.name} onChange={e => update(“name”, e.target.value)} placeholder=“Customer name” />
<label style={styles.inputLabel}>Address</label>
<input style={styles.input} value={form.address} onChange={e => update(“address”, e.target.value)} placeholder=“Street address” />
<div style={styles.row}>
<div style={styles.flex1}>
<label style={styles.inputLabel}>City</label>
<input style={styles.input} value={form.city} onChange={e => update(“city”, e.target.value)} />
</div>
<div style={{ width: 60 }}>
<label style={styles.inputLabel}>State</label>
<input style={styles.input} value={form.state} onChange={e => update(“state”, e.target.value)} maxLength={2} />
</div>
<div style={{ width: 80 }}>
<label style={styles.inputLabel}>Zip</label>
<input style={styles.input} value={form.zip} onChange={e => update(“zip”, e.target.value)} />
</div>
</div>
<label style={styles.inputLabel}>Phone</label>
<input style={styles.input} value={form.phone} onChange={e => update(“phone”, e.target.value)} type=“tel” placeholder=“Phone” />
<label style={styles.inputLabel}>Email</label>
<input style={styles.input} value={form.email} onChange={e => update(“email”, e.target.value)} type=“email” placeholder=“Email” />
<label style={{ …styles.inputLabel, display: “flex”, alignItems: “center”, gap: 8, marginBottom: 12, cursor: “pointer” }}>
<input type=“checkbox” checked={form.taxExempt} onChange={e => update(“taxExempt”, e.target.checked)} />
Tax Exempt
</label>
<label style={styles.inputLabel}>Notes</label>
<textarea style={{ …styles.input, minHeight: 50, resize: “vertical” }} value={form.notes} onChange={e => update(“notes”, e.target.value)} placeholder=“Notes…” />
<div style={{ display: “flex”, gap: 8 }}>
<button style={{ …styles.btn(“ghost”), flex: 1 }} onClick={onCancel}>Cancel</button>
<button style={{ …styles.btn(“primary”), flex: 2 }} onClick={() => {
if (!form.accountNumber || !form.name) { alert(“Account number and name required”); return; }
onSave(form);
}}>Save</button>
</div>
</div>
</div>
);
}

function CSVImport({ onImport }) {
const fileRef = useRef();
const handleFile = (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
const rows = parseCSV(ev.target.result);
onImport(rows);
};
reader.readAsText(file);
};

return (
<div style={{ background: COLORS.surfaceAlt, borderRadius: 6, padding: 12, marginTop: 8, border: `1px solid ${COLORS.borderLight}` }}>
<div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>
CSV should have headers: AccountNumber, Name, Address, City, State, Zip, Phone, Email, TaxExempt
</div>
<input type=“file” accept=”.csv” ref={fileRef} onChange={handleFile} style={{ fontSize: 12, color: COLORS.text }} />
</div>
);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PRODUCTS PAGE (Admin) ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function ProductsPage({ products, onRefresh, showToast }) {
const [editing, setEditing] = useState(null);
const [price, setPrice] = useState(””);

const savePrice = async (prod) => {
await dbPut(“products”, { …prod, pricePerGallon: parseFloat(price) || 0 });
await onRefresh();
setEditing(null);
showToast(“Price updated!”);
};

return (
<div>
<div style={{ padding: “16px 16px 8px” }}>
<div style={{ fontSize: 11, letterSpacing: 2, textTransform: “uppercase”, color: COLORS.primary, fontWeight: 700 }}>Product Pricing</div>
<div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>Tap a product to update its price per gallon</div>
</div>
{products.map(p => (
<div key={p.id} style={styles.card}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{p.shortName}</div>
<div style={{ fontSize: 11, color: COLORS.textDim }}>{p.name}</div>
<div style={{ display: “flex”, gap: 6, marginTop: 4 }}>
{p.taxable && <span style={styles.badge(COLORS.warning)}>7% Tax</span>}
</div>
</div>
{editing === p.id ? (
<div style={{ display: “flex”, alignItems: “center”, gap: 6 }}>
<span style={{ color: COLORS.textMuted, fontSize: 16 }}>$</span>
<input
style={{ …styles.input, width: 80, marginBottom: 0, textAlign: “right” }}
type=“number”
step=“0.001”
value={price}
onChange={e => setPrice(e.target.value)}
onKeyDown={e => e.key === “Enter” && savePrice(p)}
autoFocus
/>
<button style={{ background: COLORS.success, border: “none”, borderRadius: 6, padding: 8, cursor: “pointer” }} onClick={() => savePrice(p)}>
<Icon name="check" size={16} color={COLORS.white} />
</button>
</div>
) : (
<div style={{ cursor: “pointer”, textAlign: “right” }} onClick={() => { setEditing(p.id); setPrice(p.pricePerGallon.toString()); }}>
<div style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}>{formatCurrency(p.pricePerGallon)}</div>
<div style={{ fontSize: 10, color: COLORS.textDim }}>per gallon</div>
</div>
)}
</div>
</div>
))}
</div>
);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── DASHBOARD PAGE (Admin) ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function DashboardPage({ invoices, products, customers, users }) {
const today = new Date().toDateString();
const todayInvoices = invoices.filter(i => new Date(i.date).toDateString() === today);
const todayRevenue = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
const todayGallons = todayInvoices.reduce((s, i) => s + i.lineItems.reduce((g, l) => g + l.gallons, 0), 0);
const totalRevenue = invoices.reduce((s, i) => s + i.grandTotal, 0);
const totalGallons = invoices.reduce((s, i) => s + i.lineItems.reduce((g, l) => g + l.gallons, 0), 0);
const unpaid = invoices.filter(i => i.paymentStatus === “invoice”);
const unpaidTotal = unpaid.reduce((s, i) => s + i.grandTotal, 0);

const gallonsByProduct = {};
invoices.forEach(inv => {
inv.lineItems.forEach(li => {
gallonsByProduct[li.productName] = (gallonsByProduct[li.productName] || 0) + li.gallons;
});
});

return (
<div>
<div style={{ padding: “16px 16px 0” }}>
<div style={{ fontSize: 11, letterSpacing: 2, textTransform: “uppercase”, color: COLORS.primary, fontWeight: 700 }}>Dashboard</div>
</div>

```
  {/* Today Stats */}
  <div style={{ display: "flex", gap: 12, padding: "12px 16px" }}>
    <div style={{ ...styles.card, flex: 1, margin: 0, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Today</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary }}>{formatCurrency(todayRevenue)}</div>
      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{todayInvoices.length} invoices</div>
    </div>
    <div style={{ ...styles.card, flex: 1, margin: 0, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Today Gal</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>{todayGallons.toFixed(1)}</div>
      <div style={{ fontSize: 11, color: COLORS.textMuted }}>gallons</div>
    </div>
  </div>

  {/* All Time */}
  <div style={{ display: "flex", gap: 12, padding: "0 16px" }}>
    <div style={{ ...styles.card, flex: 1, margin: 0, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Total Revenue</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{formatCurrency(totalRevenue)}</div>
    </div>
    <div style={{ ...styles.card, flex: 1, margin: 0, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Outstanding</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.danger }}>{formatCurrency(unpaidTotal)}</div>
      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{unpaid.length} unpaid</div>
    </div>
  </div>

  {/* Gallons by Product */}
  <div style={{ ...styles.card, marginTop: 12 }}>
    <div style={styles.cardTitle}>Gallons by Product</div>
    {Object.entries(gallonsByProduct).sort((a, b) => b[1] - a[1]).map(([name, gal]) => (
      <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ fontSize: 13, color: COLORS.text }}>{name}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{gal.toFixed(1)} gal</span>
      </div>
    ))}
    {Object.keys(gallonsByProduct).length === 0 && (
      <div style={{ fontSize: 13, color: COLORS.textDim, textAlign: "center", padding: 12 }}>No deliveries yet</div>
    )}
  </div>

  {/* Counts */}
  <div style={{ ...styles.card }}>
    <div style={styles.cardTitle}>System</div>
    <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>Customers: {customers.length}</div>
    <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>Total Invoices: {invoices.length}</div>
    <div style={{ fontSize: 13, color: COLORS.textMuted }}>Drivers: {users.filter(u => u.role === "driver").length}</div>
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── SETTINGS PAGE (Admin) ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function SettingsPage({ users, onRefresh, showToast }) {
const [showAddUser, setShowAddUser] = useState(false);
const [newUser, setNewUser] = useState({ id: “”, name: “”, pin: “”, role: “driver” });

const addUser = async () => {
if (!newUser.id || !newUser.name || !newUser.pin) { alert(“All fields required”); return; }
await dbPut(“users”, newUser);
await onRefresh();
setNewUser({ id: “”, name: “”, pin: “”, role: “driver” });
setShowAddUser(false);
showToast(“User added!”);
};

const removeUser = async (id) => {
if (!confirm(“Remove this user?”)) return;
await dbDelete(“users”, id);
await onRefresh();
showToast(“User removed”);
};

const exportInvoices = async () => {
const invs = await dbGetAll(“invoices”);
if (invs.length === 0) { alert(“No invoices to export”); return; }
const headers = [“InvoiceNumber”,“Date”,“CustomerName”,“AccountNumber”,“Product”,“Gallons”,“PricePerGallon”,“LineTotal”,“Tax”,“GrandTotal”,“PaymentStatus”,“Driver”];
const rows = [];
invs.forEach(inv => {
inv.lineItems.forEach(li => {
rows.push([inv.invoiceNumber, inv.date, inv.customerName, inv.customerId, li.productName, li.gallons, li.pricePerGallon, li.lineTotal, li.lineTax, inv.grandTotal, inv.paymentStatus, inv.driverName].join(”,”));
});
});
const csv = [headers.join(”,”), …rows].join(”\n”);
const blob = new Blob([csv], { type: “text/csv” });
const url = URL.createObjectURL(blob);
const a = document.createElement(“a”);
a.href = url;
a.download = `barber-oil-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
a.click();
URL.revokeObjectURL(url);
showToast(“Exported!”);
};

return (
<div>
<div style={{ padding: “16px 16px 0” }}>
<div style={{ fontSize: 11, letterSpacing: 2, textTransform: “uppercase”, color: COLORS.primary, fontWeight: 700 }}>Settings</div>
</div>

```
  {/* Users */}
  <div style={styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={styles.cardTitle}>Drivers / Users</div>
      <button
        style={{ background: COLORS.primary + "22", border: `1px solid ${COLORS.primary}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer", color: COLORS.primary, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit" }}
        onClick={() => setShowAddUser(!showAddUser)}
      >
        Add
      </button>
    </div>

    {showAddUser && (
      <div style={{ background: COLORS.surfaceAlt, borderRadius: 6, padding: 12, marginBottom: 12, border: `1px solid ${COLORS.borderLight}` }}>
        <div style={styles.row}>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>User ID</label>
            <input style={styles.input} value={newUser.id} onChange={e => setNewUser(p => ({ ...p, id: e.target.value }))} placeholder="driver2" />
          </div>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>Name</label>
            <input style={styles.input} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="John" />
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>PIN</label>
            <input style={styles.input} value={newUser.pin} onChange={e => setNewUser(p => ({ ...p, pin: e.target.value }))} placeholder="1234" maxLength={6} />
          </div>
          <div style={styles.flex1}>
            <label style={styles.inputLabel}>Role</label>
            <select style={styles.select} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button style={styles.btn("primary")} onClick={addUser}>Save User</button>
      </div>
    )}

    {users.map(u => (
      <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{u.name}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{u.id} · {u.role} · PIN: {u.pin}</div>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={() => removeUser(u.id)}>
          <Icon name="trash" size={16} color={COLORS.danger} />
        </button>
      </div>
    ))}
  </div>

  {/* Export */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>Data Export</div>
    <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>Export all invoices as CSV for import into Sage 100</div>
    <button style={styles.btn("outline")} onClick={exportInvoices}>Export Invoices to CSV</button>
  </div>

  {/* Danger Zone */}
  <div style={{ ...styles.card, borderColor: COLORS.danger + "44" }}>
    <div style={{ ...styles.cardTitle, color: COLORS.danger }}>Danger Zone</div>
    <button style={{ ...styles.btn("danger"), marginBottom: 8 }} onClick={async () => {
      if (!confirm("Clear ALL invoices? This cannot be undone.")) return;
      await dbClear("invoices");
      await onRefresh();
      showToast("Invoices cleared");
    }}>Clear All Invoices</button>
    <button style={styles.btn("danger")} onClick={async () => {
      if (!confirm("Clear ALL customers? This cannot be undone.")) return;
      await dbClear("customers");
      await onRefresh();
      showToast("Customers cleared");
    }}>Clear All Customers</button>
  </div>
</div>
```

);
}
