const STORAGE_KEY = "greenVizagComplaints";
const USERS_KEY = "greenVizagUsers";
const SESSION_KEY = "greenVizagSession";
const CARBON_KEY = "greenVizagCarbon";
const ADMIN_EMAIL = "admin@greenvizag.demo";
const ADMIN_PASSWORD = "GreenVizag123";

let selectedPhoto = "";
let authMode = "login";
let currentFilter = "All";

const $ = (id) => document.getElementById(id);
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getComplaints = () => read(STORAGE_KEY, []);
const getUsers = () => read(USERS_KEY, []);
const session = () => read(SESSION_KEY, null);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}
function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove("show"), 3000);
}
function formatDate(value) {
  return new Date(value).toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" });
}
function makeId() {
  return "GV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function statusClass(status) {
  return status === "Resolved" ? "resolved" : status === "In Progress" ? "in-progress" : "";
}

function go(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  const target = $(view + "View");
  if (target) target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  document.querySelector("nav").classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
  if (view === "admin") renderAdmin();
  if (view === "home") updateStats();
}
document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => go(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => go(btn.dataset.go)));
$("menuToggle").addEventListener("click", () => document.querySelector("nav").classList.toggle("open"));

function updateStats() {
  const list = getComplaints();
  $("statTotal").textContent = list.length;
  const carbon = read(CARBON_KEY, 0);
  $("statCarbon").textContent = carbon.toFixed(1) + " kg";
  $("statScanned").textContent = read("greenVizagScans", 12);
  $("userCarbonDisplay").textContent = carbon.toFixed(1) + " kg";
}

function updateAccountUI() {
  const user = session();
  const box = $("accountActions");
  if (!user) {
    box.innerHTML = '<button class="btn btn-light" id="loginOpen">Login</button><button class="btn btn-primary" id="registerOpen">Join us</button>';
    $("loginOpen").addEventListener("click", () => openAuth("login"));
    $("registerOpen").addEventListener("click", () => openAuth("register"));
  } else if (user.role === "admin") {
    box.innerHTML = '<button class="btn btn-light" id="adminOpen">Admin panel</button><button class="btn btn-primary" id="logoutTop">Log out</button>';
    $("adminOpen").addEventListener("click", () => go("admin"));
    $("logoutTop").addEventListener("click", logout);
  } else {
    box.innerHTML = `<span class="welcome-user">Hi, ${escapeHTML(user.name)}</span><button class="btn btn-light" id="logoutTop">Log out</button>`;
    $("logoutTop").addEventListener("click", logout);
  }
}

function openAuth(mode) {
  authMode = mode;
  $("authTitle").textContent = mode === "login" ? "Login" : "Create your account";
  $("authSubmit").textContent = mode === "login" ? "Login" : "Create account";
  $("nameField").classList.toggle("hidden", mode === "login");
  $("authName").required = mode === "register";
  $("authSwitch").innerHTML = mode === "login"
    ? 'New here? <button type="button" class="text-button" id="switchMode">Create an account</button>'
    : 'Already registered? <button type="button" class="text-button" id="switchMode">Login</button>';
  $("switchMode").addEventListener("click", () => openAuth(mode === "login" ? "register" : "login"));
  $("authModal").classList.remove("hidden");
}
$("loginOpen").addEventListener("click", () => openAuth("login"));
$("registerOpen").addEventListener("click", () => openAuth("register"));
$("modalClose").addEventListener("click", () => $("authModal").classList.add("hidden"));
$("authModal").addEventListener("click", e => { if (e.target === $("authModal")) $("authModal").classList.add("hidden"); });

$("authForm").addEventListener("submit", e => {
  e.preventDefault();
  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  if (authMode === "login") {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      save(SESSION_KEY, {name:"Administrator", email, role:"admin"});
      finishLogin("Admin login successful.");
      return;
    }
    const user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) return toast("Incorrect email or password.");
    save(SESSION_KEY, {name:user.name, email:user.email, role:"citizen"});
    finishLogin("Welcome back, " + user.name + "!");
  } else {
    const name = $("authName").value.trim();
    if (name.length < 2) return toast("Please enter your name.");
    const users = getUsers();
    if (users.some(u => u.email === email)) return toast("An account with this email already exists.");
    users.push({name, email, password});
    save(USERS_KEY, users);
    save(SESSION_KEY, {name, email, role:"citizen"});
    finishLogin("Your account has been created.");
  }
});
function finishLogin(message) {
  $("authModal").classList.add("hidden");
  $("authForm").reset();
  updateAccountUI();
  toast(message);
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  updateAccountUI();
  go("home");
  toast("You have logged out.");
}

// AI SCANNER FEATURE SIMULATION
$("scanPhoto").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $("scanPreviewImg").src = reader.result;
    $("scanPreviewBox").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});
$("scanBtn")?.addEventListener("click", () => {
  simulateScan("dry");
});

function simulateScan(type) {
  const resultsBox = $("scanResults");
  resultsBox.classList.remove("hidden");
  let currentScans = read("greenVizagScans", 12) + 1;
  save("greenVizagScans", currentScans);
  
  if (type === "wet") {
    resultsBox.innerHTML = `
      <div class="result-card" style="border-left: 5px solid #2e9460;">
        <h3>🥬 Category Detected: Organic / Wet Waste</h3>
        <p><strong>Action:</strong> Place in the Green Bin for composting.</p>
        <p><strong>Environmental Benefit:</strong> Reduces landfill methane gas by 85%.</p>
      </div>`;
  } else if (type === "dry") {
    resultsBox.innerHTML = `
      <div class="result-card" style="border-left: 5px solid #3767a3;">
        <h3>📦 Category Detected: Recyclable / Dry Waste</h3>
        <p><strong>Action:</strong> Clean, dry, and place in Blue Bin for municipal recycling.</p>
        <p><strong>Impact:</strong> Offsets ~0.4 kg CO₂ per item recycled.</p>
      </div>`;
  } else {
    resultsBox.innerHTML = `
      <div class="result-card" style="border-left: 5px solid #d9534f;">
        <h3>🔋 Category Detected: Hazardous / E-Waste</h3>
        <p><strong>Action:</strong> Deposit at designated GVMC E-waste collection centers.</p>
        <p><strong>Warning:</strong> Contains heavy metals; do not throw in standard dustbins.</p>
      </div>`;
  }
  updateStats();
  toast("Waste analyzed successfully!");
}

// CARBON TRACKER LOGIC
$("carbonForm").addEventListener("submit", e => {
  e.preventDefault();
  const segregateScore = parseFloat($("cSegregate").value);
  const commuteScore = parseFloat($("cCommute").value);
  const trees = (parseInt($("cTrees").value) || 0) * 2.0;
  const plastics = (parseInt($("cPlastics").value) || 0) * 0.1;
  
  const totalOffset = segregateScore + commuteScore + trees + plastics;
  const prevCarbon = read(CARBON_KEY, 0);
  save(CARBON_KEY, prevCarbon + totalOffset);
  
  updateStats();
  toast(`Logged! You saved ${totalOffset.toFixed(1)} kg of CO₂ today!`);
});

// MAP FILTERING
document.querySelectorAll(".filter-map").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-map").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mode = btn.dataset.map;
    document.querySelectorAll(".pin-tree").forEach(p => p.style.display = (mode === "all" || mode === "trees") ? "block" : "none");
    document.querySelectorAll(".pin-heat").forEach(p => p.style.display = (mode === "all" || mode === "heat") ? "block" : "none");
  });
});

// EXISTING REPORT FORM LOGIC
$("photo").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Please select an image file.");
  if (file.size > 5 * 1024 * 1024) return toast("Image must be smaller than 5 MB.");
  try {
    selectedPhoto = await compressImage(file);
    $("previewImage").src = selectedPhoto;
    $("photoPreview").classList.remove("hidden");
  } catch {
    toast("Could not read that image. Please try another.");
  }
});
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.68));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
$("removePhoto")?.addEventListener("click", () => {
  selectedPhoto = "";
  $("photo").value = "";
  $("photoPreview").classList.add("hidden");
});
$("useLocation").addEventListener("click", () => {
  const status = $("geoStatus");
  if (!navigator.geolocation) return status.textContent = "Location is not supported by this browser.";
  status.textContent = "Getting your location...";
  navigator.geolocation.getCurrentPosition(position => {
    const {latitude, longitude} = position.coords;
    $("coordinates").value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    status.textContent = `Captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    if (!$("location").value) $("location").value = `GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
  }, () => {
    status.textContent = "Could not get location. Enter manually.";
  }, {enableHighAccuracy:true, timeout:10000});
});

$("reportForm").addEventListener("submit", e => {
  e.preventDefault();
  const user = session();
  if (!user || user.role !== "citizen") {
    openAuth("login");
    return toast("Please log in with a citizen account before reporting.");
  }
  const list = getComplaints();
  const complaint = {
    id: makeId(), category:$("category").value, area:$("area").value.trim(),
    location:$("location").value.trim(), description:$("description").value.trim(),
    photo:selectedPhoto, coordinates:$("coordinates").value, status:"Pending",
    createdAt:new Date().toISOString(), reporter:user.name, email:user.email
  };
  list.unshift(complaint);
  save(STORAGE_KEY, list);
  $("reportForm").reset();
  selectedPhoto = "";
  $("photoPreview").classList.add("hidden");
  updateStats();
  $("trackId").value = complaint.id;
  showTrackResult(complaint);
  go("track");
  toast("Report submitted. Your ID is " + complaint.id);
});

$("trackForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("trackId").value.trim().toUpperCase();
  const complaint = getComplaints().find(item => item.id === id);
  if (!complaint) {
    $("trackResult").innerHTML = '<div class="empty-state"><span>🧐</span><h3>No complaint found</h3><p>Check the ID and try again.</p></div>';
    return;
  }
  showTrackResult(complaint);
});
function showTrackResult(c) {
  $("trackResult").innerHTML = `
    <article class="result-card">
      <div class="result-head"><h3>${escapeHTML(c.category)}</h3><span class="status ${statusClass(c.status)}">${escapeHTML(c.status)}</span></div>
      <p>${escapeHTML(c.description)}</p>
      <div class="result-meta"><span>🆔 ${escapeHTML(c.id)}</span><span>📍 ${escapeHTML(c.area)}, ${escapeHTML(c.location)}</span><span>🗓 ${formatDate(c.createdAt)}</span></div>
      ${c.photo ? `<p><img src="${c.photo}" alt="Garbage" style="max-width:180px;border-radius:9px;"></p>` : ""}
      <p><b>Reported by:</b> ${escapeHTML(c.reporter)}</p>
    </article>`;
}

function renderAdmin() {
  if (session()?.role !== "admin") {
    go("home");
    openAuth("login");
    toast("Please log in as administrator.");
    return;
  }
  const list = getComplaints().filter(c => currentFilter === "All" || c.status === currentFilter);
  $("adminList").innerHTML = list.length ? list.map(c => `
    <article class="admin-card">
      ${c.photo ? `<img src="${c.photo}" alt="Complaint">` : `<div class="admin-placeholder">🗑️</div>`}
      <div><span class="report-id">${escapeHTML(c.id)}</span><h3>${escapeHTML(c.category)} · ${escapeHTML(c.area)}</h3>
      <p>${escapeHTML(c.location)} — ${escapeHTML(c.description)}</p></div>
      <select aria-label="Update status" data-status-id="${escapeHTML(c.id)}">
        ${["Pending","In Progress","Resolved"].map(s => `<option ${c.status===s?"selected":""}>${s}</option>`).join("")}
      </select>
    </article>`).join("") : '<div class="empty-state panel"><h3>No reports here</h3></div>';
  document.querySelectorAll("[data-status-id]").forEach(select => select.addEventListener("change", () => {
    const reports = getComplaints();
    const item = reports.find(c => c.id === select.dataset.statusId);
    if (item) {
      item.status = select.value;
      save(STORAGE_KEY, reports);
      updateStats();
      renderAdmin();
      toast("Status updated.");
    }
  }));
}
document.querySelectorAll(".filter-btn").forEach(btn => btn.addEventListener("click", () => {
  currentFilter = btn.dataset.filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b === btn));
  renderAdmin();
}));
$("adminLogout").addEventListener("click", logout);

updateAccountUI();
updateStats();


// CUSTOMER SERVICE CHATBOT (offline FAQ assistant)
(() => {
  const launcher = $("chatLauncher"), panel = $("chatPanel");
  const closeButton = $("chatClose"), form = $("chatForm");
  const input = $("chatInput"), messages = $("chatMessages");
  if (!launcher || !panel || !form || !input || !messages) return;

  const openChat = () => { panel.classList.remove("hidden"); launcher.setAttribute("aria-expanded", "true"); input.focus(); };
  const closeChat = () => { panel.classList.add("hidden"); launcher.setAttribute("aria-expanded", "false"); launcher.focus(); };
  launcher.addEventListener("click", () => panel.classList.contains("hidden") ? openChat() : closeChat());
  closeButton?.addEventListener("click", closeChat);

  function addMessage(text, sender) {
    const row = document.createElement("div");
    row.className = `chat-message ${sender === "user" ? "user-message" : "bot-message"}`;
    if (sender !== "user") {
      const avatar = document.createElement("span");
      avatar.className = "chat-message-avatar"; avatar.textContent = "🌱"; row.appendChild(avatar);
    }
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble"; bubble.textContent = text; row.appendChild(bubble);
    messages.appendChild(row); messages.scrollTop = messages.scrollHeight;
  }

  function getReply(raw) {
    const q = raw.toLowerCase().replace(/[^\\w\\s-]/g, " ");
    if (/\\b(hello|hi|hey|good morning|good evening)\\b/.test(q)) return "Hello! How can I help you make Vizag cleaner and greener today?";
    if (/(report|complaint|dump|garbage|dustbin|waste issue)/.test(q) && /(track|status|id|where is|check)/.test(q))
      return "To track a complaint, open “Track Complaint”, enter the GV complaint ID received after submitting your report, and select “Track report”.";
    if (/(report|complaint|dump|garbage|overflow)/.test(q))
      return "To report a waste issue: 1) Log in with a citizen account. 2) Open “Report Waste”. 3) Choose the category and enter your area, exact location, and description. 4) Add a photo if available. 5) Submit. Keep the GV complaint ID to track progress.";
    if (/(track|status|complaint id|report id)/.test(q))
      return "Open “Track Complaint”, enter your GV-… complaint ID, and press “Track report”. The page will show the status if the report is available in this browser.";
    if (/(wet|organic|food|banana|kitchen)/.test(q))
      return "Wet or organic waste, such as food scraps and banana peels, should go into the green bin for composting. Keep it separate from dry and hazardous waste.";
    if (/(dry|plastic|paper|bottle|recycl)/.test(q))
      return "Dry recyclable waste such as clean plastic bottles and paper should be kept clean and dry, then placed in the blue bin for recycling.";
    if (/(battery|electronic|e-waste|hazard|charger|mobile)/.test(q))
      return "Batteries and electronic waste need special handling. Do not put them in regular dustbins; use a designated e-waste collection centre.";
    if (/(segregat|separate|bins|bin)/.test(q))
      return "Quick guide: green bin = wet/organic waste; blue bin = clean, dry recyclable waste. Batteries and electronic items should go to designated e-waste collection points.";
    if (/(carbon|co2|footprint|emission)/.test(q))
      return "Open “Carbon Footprint” from the menu. Record waste segregation, commute mode, trees planted or adopted, and single-use plastics avoided. The page estimates your CO₂ savings.";
    if (/(tree|plant|map|heat|hotspot|canopy)/.test(q))
      return "Open “Tree Cover Map” to explore the prototype's tree-planting locations and urban heat hotspots. Use the All Zones, Tree Plantings, and Urban Heat Hotspots filters.";
    if (/(login|register|account|sign in|password)/.test(q))
      return "Use “Login” if you already have an account, or “Join us” to create a citizen account. You need a citizen account to submit a waste report. Never share your password in this chat.";
    if (/(admin|administrator)/.test(q))
      return "The Admin panel is for authorized administrators to review reports and update their status. Citizen users can submit and track complaints.";
    if (/(contact|phone|email|human|person|support team|talk to)/.test(q))
      return "This prototype currently provides automated help only and does not list a verified phone number or support email. Please use the Report Waste and Track Complaint sections for the available services.";
    if (/(thank|thanks)/.test(q)) return "You're welcome! Thank you for supporting a cleaner, greener Vizag. 🌱";
    return "I can help with reporting waste, tracking a complaint, waste segregation, the carbon tracker, tree cover map, and login. Try: “How do I report waste?”";
  }

  function sendQuestion(question) {
    const clean = question.trim(); if (!clean) return;
    addMessage(clean, "user"); input.value = "";
    window.setTimeout(() => addMessage(getReply(clean), "bot"), 250);
  }
  form.addEventListener("submit", event => { event.preventDefault(); sendQuestion(input.value); });
  document.querySelectorAll("[data-chat-question]").forEach(button =>
    button.addEventListener("click", () => sendQuestion(button.dataset.chatQuestion || "")));
})();
