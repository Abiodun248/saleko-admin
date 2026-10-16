/* Saleko Delivery — shared core for every Delivery screen.
 *
 * One store (localStorage), one fee engine (DL.quote) and one admin shell.
 * Checkout, the apps, the Fee Calculator and admin order creation all call DL.quote,
 * mirroring the PRD's single backend Delivery Quote Service. Money is whole kobo.
 * Requires delivery_seed.js (generated from the workbook) to be loaded first.
 */
(function () {
  const KEY = "saleko_delivery_v1";
  const N = 100; // kobo per naira
  const ALL_ZONES = [1, 2, 3, 4, 5, 6, 7];
  const CITY_ZONES = [1, 2, 3, 4, 5];
  const CHANNELS = ["web", "ios", "android"];
  const LEVELS = [100, 75, 50, 25];

  // ------------------ Permissions (PRD 7.11) ------------------
  const PERMISSIONS = [
    { group: "Tools & history", key: "delivery.view", desc: "See the Delivery menu (read-only). Required by every other delivery permission." },
    { group: "Pricing", key: "delivery.zones.edit", desc: "Edit zone base fees, distance ranges, carrier and availability" },
    { group: "Pricing", key: "delivery.surcharges.edit", desc: "Edit weight bands, per-kg rate, rounding, consolidation % and minimum units, heavy-order limits" },
    { group: "Pricing", key: "delivery.prices.schedule", desc: "Schedule a future price change, and edit or cancel one" },
    { group: "Pricing", key: "delivery.prices.restore", desc: "Restore an earlier price from history" },
    { group: "Locations", key: "delivery.lgas.edit", desc: "Edit LGA default zone and status" },
    { group: "Locations", key: "delivery.landmarks.edit", desc: "Add, edit, override and deactivate landmarks" },
    { group: "Locations", key: "delivery.landmarks.import", desc: "Import and export landmark CSVs" },
    { group: "Free-delivery rules", key: "delivery.rules.edit", desc: "Create, edit and duplicate product, order value, landmark and classification rules" },
    { group: "Free-delivery rules", key: "delivery.rules.activate", desc: "Activate or deactivate rules" },
    { group: "Free-delivery rules", key: "delivery.universal.toggle", desc: "Turn the universal switch on or off and change its level" },
    { group: "Customers", key: "customers.classifications.manage", desc: "Create, rename and deactivate classifications" },
    { group: "Customers", key: "customers.classifications.assign", desc: "Add or remove classifications on customers (by hand or CSV)" },
    { group: "Orders", key: "orders.delivery.waive", desc: "Waive the delivery fee on orders they create for a customer" },
    { group: "Tools & history", key: "delivery.calculator.use", desc: "Use the Fee Calculator" },
    { group: "Tools & history", key: "delivery.history.view", desc: "View Change History and the Waived delivery report" },
    { group: "Tools & history", key: "delivery.history.export", desc: "Export Change History and reports as CSV" },
  ];
  const P = PERMISSIONS.map((p) => p.key);
  const pick = (...keys) => keys;
  const DEFAULT_ROLES = [
    { id: "super_admin", name: "Super Admin", locked: true, perms: P.slice() },
    { id: "logistics_manager", name: "Logistics Manager", perms: pick("delivery.view", "delivery.zones.edit", "delivery.surcharges.edit", "delivery.prices.schedule", "delivery.prices.restore", "delivery.lgas.edit", "delivery.landmarks.edit", "delivery.landmarks.import", "delivery.calculator.use", "delivery.history.view", "delivery.history.export") },
    { id: "logistics_officer", name: "Logistics Officer", perms: pick("delivery.view", "delivery.landmarks.edit", "delivery.landmarks.import", "delivery.calculator.use", "delivery.history.view") },
    { id: "marketing_manager", name: "Marketing Manager", perms: pick("delivery.view", "delivery.rules.edit", "delivery.rules.activate", "customers.classifications.manage", "customers.classifications.assign", "delivery.calculator.use", "delivery.history.view", "delivery.history.export") },
    { id: "customer_support", name: "Customer Support", perms: pick("delivery.view", "customers.classifications.assign", "orders.delivery.waive", "delivery.calculator.use", "delivery.history.view") },
  ];
  const USERS = [
    { id: "u1", name: "Ada Okafor", roles: ["super_admin"] },
    { id: "u2", name: "Kunle Adeyemi", roles: ["super_admin"] },
    { id: "u3", name: "Bola Martins", roles: ["logistics_manager"] },
    { id: "u4", name: "Emeka Eze", roles: ["logistics_manager"] },
    { id: "u5", name: "Yusuf Bello", roles: ["logistics_officer"] },
    { id: "u6", name: "Grace Ojo", roles: ["logistics_officer"] },
    { id: "u7", name: "Simi Lawal", roles: ["logistics_officer"] },
    { id: "u8", name: "Markson Udo", roles: ["marketing_manager"] },
    { id: "u9", name: "Tola Bankole", roles: ["marketing_manager"] },
    { id: "u10", name: "Ngozi Umeh", roles: ["marketing_manager", "customer_support"] },
    { id: "u11", name: "Femi Ajayi", roles: ["marketing_manager"] },
    { id: "u12", name: "Halima Sani", roles: ["customer_support"] },
    { id: "u13", name: "Chidi Okeke", roles: ["customer_support"] },
  ];

  // ------------------ Default state ------------------
  function iso(s) { return new Date(s).toISOString(); }
  function defaults() {
    const seed = window.DELIVERY_SEED;
    return {
      version: 1,
      actingUserId: "u1",
      zones: [
        { id: 1, code: "Z1", definition: "Same / nearby area", from: 0, to: 5, carrier: "van", baseFee: 1000 * N, table: "std", available: true, examples: "Lagos Island; Eti-Osa (Ikoyi/VI)", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 2, code: "Z2", definition: "Nearby areas", from: 5, to: 15, carrier: "van", baseFee: 1300 * N, table: "std", available: true, examples: "Eti-Osa (Lekki Ph 1), Lagos Mainland, Surulere, Shomolu", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 3, code: "Z3", definition: "Medium distance", from: 15, to: 25, carrier: "van", baseFee: 1600 * N, table: "std", available: true, examples: "Kosofe, Apapa, Mushin, Oshodi-Isolo, Ikeja", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 4, code: "Z4", definition: "Long distance within city", from: 25, to: 35, carrier: "van", baseFee: 2000 * N, table: "std", available: true, examples: "Ojo, Alimosho (Ayobo), Ikorodu (Maya), Ibeju-Lekki (Ajah end)", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 5, code: "Z5", definition: "Far / outer areas", from: 35, to: null, carrier: "van", baseFee: 2500 * N, table: "std", available: true, examples: "Ikorodu town, Ibeju-Lekki (FTZ), Badagry, Epe", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 6, code: "Z6", definition: "Inter-state", from: null, to: null, carrier: "partner", baseFee: null, table: "z6", available: true, examples: "Sagamu, Abeokuta, Ibadan", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
        { id: 7, code: "Z7", definition: "Ogun fringe corridor", from: 35, to: 52, carrier: "partner", baseFee: null, table: "z7", available: true, examples: "Arepo, Kara Bridge, Akute, Sango-Ota", v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
      ],
      tables: {
        std: { id: "std", name: "Standard (Zones 1–5)", perKg: 50 * N, v: 1, bands: [
          { id: "b1", label: "0–2 kg", above: 0, upTo: 2, surcharge: 0 },
          { id: "b2", label: ">2–5 kg", above: 2, upTo: 5, surcharge: 200 * N },
          { id: "b3", label: ">5–10 kg", above: 5, upTo: 10, surcharge: 500 * N },
          { id: "b4", label: ">10–20 kg", above: 10, upTo: 20, surcharge: 1000 * N },
          { id: "b5", label: ">20–30 kg", above: 20, upTo: 30, surcharge: 1500 * N },
          { id: "b6", label: "Above 30 kg", above: 30, upTo: null, surcharge: 1500 * N },
        ] },
        z6: { id: "z6", name: "Zone 6", perKg: null, v: 1, bands: [] },
        z7: { id: "z7", name: "Zone 7", perKg: null, v: 1, bands: [] },
      },
      settings: { perKgRounding: "exact", consolidationPct: 40, consolidationMinUnits: 2, vanCheckKg: 30, largeVehicleKg: 50, origin: "27 Ribadu Road, Ikoyi", v: 1 },
      priceChanges: [],
      lgas: seed.lgas.map((l, i) => ({ id: "lga" + (i + 1), ...l })),
      landmarks: seed.landmarks.map((l) => ({ ...l })),
      classifications: [
        { id: "first_time", name: "First-time customer", system: true, status: "active" },
        { id: "vip", name: "VIP", system: false, status: "active" },
        { id: "staff", name: "Staff", system: false, status: "active" },
        { id: "corporate", name: "Corporate buyer", system: false, status: "inactive" },
      ],
      customers: [
        { id: "c1", name: "Chiamaka Obi", email: "chiamaka.obi@example.com", phone: "0803 111 2233", classes: ["first_time"], paidOrders: 0, usage: {} },
        { id: "c2", name: "Tunde Bakare", email: "tunde.b@example.com", phone: "0806 555 1010", classes: ["vip"], paidOrders: 23, usage: {} },
        { id: "c3", name: "Ifeoma Nwosu", email: "ifeoma.n@example.com", phone: "0812 404 7788", classes: ["staff"], paidOrders: 6, usage: {} },
        { id: "c4", name: "Musa Ibrahim", email: "musa.i@example.com", phone: "0701 909 3344", classes: [], paidOrders: 2, usage: {} },
        { id: "c5", name: "Blessing Etim", email: "blessing.e@example.com", phone: "0905 222 6611", classes: ["first_time"], paidOrders: 0, usage: { r6: 1 } },
      ],
      products: [
        { id: "p1", name: "Golden Penny Semovita 10kg", sku: "GP-SEM-10", category: "Groceries", brand: "Golden Penny", merchant: "Mama Put Stores", price: 12000 * N, weightKg: 10, deliveryLevel: 100 },
        { id: "p2", name: "Peak Milk 400g", sku: "PK-MLK-400", category: "Groceries", brand: "Peak", merchant: "Mama Put Stores", price: 3500 * N, weightKg: 0.4, deliveryLevel: 50 },
        { id: "p3", name: "Mama's Pride Rice 25kg", sku: "MP-RCE-25", category: "Groceries", brand: "Mama's Pride", merchant: "Mama Put Stores", price: 45000 * N, weightKg: 25, deliveryLevel: 0 },
        { id: "p4", name: "Kings Vegetable Oil 5L", sku: "KG-OIL-5L", category: "Groceries", brand: "Kings", merchant: "Mama Put Stores", price: 14000 * N, weightKg: 4.6, deliveryLevel: 0 },
        { id: "p5", name: "Indomie Chicken (carton, 40)", sku: "IND-CHK-40", category: "Groceries", brand: "Indomie", merchant: "Mama Put Stores", price: 9800 * N, weightKg: 3, deliveryLevel: 0 },
        { id: "p6", name: "Samsung 43\" Smart TV", sku: "SAM-TV-43", category: "Electronics", brand: "Samsung", merchant: "Slot Ikeja", price: 280000 * N, weightKg: 9, deliveryLevel: 0 },
        { id: "p7", name: "Thermocool Chest Freezer 200L", sku: "TC-FRZ-200", category: "Appliances", brand: "Thermocool", merchant: "Slot Ikeja", price: 380000 * N, weightKg: 35, deliveryLevel: 0 },
        { id: "p8", name: "Dangote Cement 50kg", sku: "DG-CEM-50", category: "Building", brand: "Dangote", merchant: "BuildRite", price: 9500 * N, weightKg: 50, deliveryLevel: 0 },
        { id: "p9", name: "Nivea Body Lotion 400ml", sku: "NV-LOT-400", category: "Beauty", brand: "Nivea", merchant: "Glow Hub", price: 4800 * N, weightKg: 0.45, deliveryLevel: 0 },
        { id: "p10", name: "HP 250 G9 Laptop", sku: "HP-250-G9", category: "Electronics", brand: "HP", merchant: "Slot Ikeja", price: 650000 * N, weightKg: 2.1, deliveryLevel: 0 },
        { id: "p11", name: "Ergonomic Office Chair", sku: "OF-CHR-01", category: "Furniture", brand: "Saleko Home", merchant: "BuildRite", price: 85000 * N, weightKg: 15, deliveryLevel: 0 },
        { id: "p12", name: "Ankara Fabric (6 yards)", sku: "ANK-6Y", category: "Fashion", brand: "Vlisco", merchant: "Balogun Textiles", price: 18000 * N, weightKg: null, deliveryLevel: 0 },
        { id: "p13", name: "JBL Go 3 Speaker", sku: "JBL-GO3", category: "Electronics", brand: "JBL", merchant: "Slot Ikeja", price: 38000 * N, weightKg: null, deliveryLevel: 0 },
      ],
      universal: { level: 0, startsAt: null, endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), v: 1, updatedBy: "System (seed)", updatedAt: iso("2026-10-01T09:00:00+01:00") },
      rules: [
        { id: "r1", name: "Free delivery – orders above ₦50k", type: "order_value", level: 100, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: [1, 2, 3], channels: CHANNELS.slice(), minOrder: 50000 * N, message: "Free delivery on orders above ₦50,000", note: "Always-on threshold agreed with Finance.", targets: [], perCustomerLimit: null, createdBy: "Markson Udo", createdAt: iso("2026-10-01T10:00:00+01:00"), v: 1 },
        { id: "r2", name: "50% off delivery – orders above ₦30k", type: "order_value", level: 50, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: [1, 2, 3], channels: CHANNELS.slice(), minOrder: 30000 * N, message: "50% off delivery: orders above ₦30,000", note: "", targets: [], perCustomerLimit: null, createdBy: "Markson Udo", createdAt: iso("2026-10-01T10:05:00+01:00"), v: 1 },
        { id: "r3", name: "Always-free products", type: "product", level: 100, system: true, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: null, message: "", note: "System rule – managed from Products → Edit product.", targets: [{ type: "product", id: "p1" }], perCustomerLimit: null, createdBy: "System", createdAt: iso("2026-10-01T10:06:00+01:00"), v: 1 },
        { id: "r4", name: "Always 50% off products", type: "product", level: 50, system: true, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: null, message: "", note: "System rule – managed from Products → Edit product.", targets: [{ type: "product", id: "p2" }], perCustomerLimit: null, createdBy: "System", createdAt: iso("2026-10-01T10:07:00+01:00"), v: 1 },
        { id: "r5", name: "Yaba landmarks – free over ₦10k", type: "landmark", level: 100, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: 10000 * N, message: "Free delivery to Yaba", note: "Student campaign (YABATECH / UNILAG).", targets: [{ type: "landmark", id: "lm191" }, { type: "landmark", id: "lm192" }], perCustomerLimit: null, createdBy: "Tola Bankole", createdAt: iso("2026-10-02T11:00:00+01:00"), v: 1 },
        { id: "r6", name: "Welcome – first order ships free", type: "customer_class", level: 100, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: null, message: "Your first delivery is on us", note: "Acquisition – Q4.", targets: [{ type: "classification", id: "first_time" }], perCustomerLimit: 1, createdBy: "Markson Udo", createdAt: iso("2026-10-03T09:00:00+01:00"), v: 1 },
        { id: "r7", name: "Detty December – 75% off Zones 4–5", type: "order_value", level: 75, status: "active", startsAt: iso("2026-12-01T00:00:00+01:00"), endsAt: iso("2027-01-01T00:00:00+01:00"), zones: [4, 5], channels: CHANNELS.slice(), minOrder: 40000 * N, message: "75% off delivery – December treat", note: "Requested by Growth.", targets: [], perCustomerLimit: null, createdBy: "Tola Bankole", createdAt: iso("2026-10-08T15:20:00+01:00"), v: 1 },
        { id: "r8", name: "Independence Day – free delivery", type: "order_value", level: 100, status: "active", startsAt: iso("2026-10-01T00:00:00+01:00"), endsAt: iso("2026-10-02T00:00:00+01:00"), zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: 1 * N, message: "Happy Independence Day – free delivery", note: "", targets: [], perCustomerLimit: null, createdBy: "Markson Udo", createdAt: iso("2026-09-28T12:00:00+01:00"), v: 1 },
        { id: "r9", name: "VIP – 25% off delivery", type: "customer_class", level: 25, status: "inactive", startsAt: iso("2026-10-10T00:00:00+01:00"), endsAt: null, zones: CITY_ZONES.slice(), channels: CHANNELS.slice(), minOrder: null, message: "VIP delivery saving", note: "Pending sign-off from Finance.", targets: [{ type: "classification", id: "vip" }], perCustomerLimit: null, createdBy: "Femi Ajayi", createdAt: iso("2026-10-09T16:40:00+01:00"), v: 1 },
      ],
      orders: [
        { id: "SLK-104233", customer: "Tunde Bakare", at: iso("2026-10-11T13:05:00+01:00"), zone: 3, fee: 0, standardFee: 2160 * N, winningRuleId: "r1", source: "rule" },
        { id: "SLK-104219", customer: "Musa Ibrahim", at: iso("2026-10-11T09:12:00+01:00"), zone: 2, fee: 1080 * N, standardFee: 2160 * N, winningRuleId: "r2", source: "rule" },
        { id: "SLK-104201", customer: "Ifeoma Nwosu", at: iso("2026-10-10T18:44:00+01:00"), zone: 2, fee: 0, standardFee: 1500 * N, winningRuleId: "r5", source: "rule" },
        { id: "SLK-104188", customer: "Chiamaka Obi", at: iso("2026-10-10T11:30:00+01:00"), zone: 1, fee: 0, standardFee: 1000 * N, winningRuleId: "r6", source: "rule" },
        { id: "SLK-104150", customer: "Musa Ibrahim", at: iso("2026-10-08T15:02:00+01:00"), zone: 3, fee: 0, standardFee: 3100 * N, winningRuleId: "r1", source: "rule" },
        { id: "SLK-104122", customer: "Blessing Etim", at: iso("2026-10-07T10:20:00+01:00"), zone: 4, fee: 0, standardFee: 3000 * N, winningRuleId: null, source: "waiver", waivedBy: "Halima Sani", waiverReason: "Customer complaint", waiverText: "Previous order arrived 3 days late" },
        { id: "SLK-104098", customer: "Dangote Staff Coop (corporate)", at: iso("2026-10-05T12:00:00+01:00"), zone: 3, fee: 0, standardFee: 9420 * N, winningRuleId: null, source: "waiver", waivedBy: "Ada Okafor", waiverReason: "Bulk / corporate deal", waiverText: "Q4 bulk agreement" },
        { id: "SLK-104061", customer: "Tunde Bakare", at: iso("2026-10-02T09:40:00+01:00"), zone: 2, fee: 0, standardFee: 1300 * N, winningRuleId: null, source: "waiver", waivedBy: "Chidi Okeke", waiverReason: "Pricing error", waiverText: "Shown ₦0 on app banner" },
        { id: "SLK-104010", customer: "Musa Ibrahim", at: iso("2026-10-01T14:10:00+01:00"), zone: 2, fee: 0, standardFee: 1300 * N, winningRuleId: "r8", source: "rule" },
      ],
      changeLog: [
        { id: "log1", at: iso("2026-10-01T09:00:00+01:00"), actor: "System", screen: "Zones & Base Fees", item: "All zones", field: "Seed", old: "—", new: "Imported from workbook (Zones 1–5)", reason: "Launch seed" },
        { id: "log2", at: iso("2026-10-01T09:00:00+01:00"), actor: "System", screen: "Landmarks", item: "235 landmarks", field: "Seed", old: "—", new: "Imported from workbook", reason: "Launch seed" },
        { id: "log3", at: iso("2026-10-01T10:00:00+01:00"), actor: "Markson Udo", screen: "Free Delivery", item: "Free delivery – orders above ₦50k", field: "Created", old: "—", new: "Order value · Free · Min ₦50,000 · Zones 1–3", reason: "" },
        { id: "log4", at: iso("2026-10-01T10:01:00+01:00"), actor: "Markson Udo", screen: "Free Delivery", item: "Free delivery – orders above ₦50k", field: "Status", old: "Inactive", new: "Active", reason: "" },
      ],
      roles: DEFAULT_ROLES.map((r) => ({ ...r, perms: r.perms.slice() })),
      users: USERS.map((u) => ({ ...u, roles: u.roles.slice() })),
    };
  }

  // ------------------ Store ------------------
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.version === 1) return s; }
    } catch (e) { /* fall through to defaults */ }
    return defaults();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
  }
  function reset() { localStorage.removeItem(KEY); S = defaults(); save(); }
  // Another tab saved: keep in sync (and lets the "someone else edited first" check fire).
  window.addEventListener("storage", (e) => { if (e.key === KEY) { S = load(); document.dispatchEvent(new CustomEvent("dl:external-change")); } });

  // ------------------ Helpers ------------------
  const TZ = "Africa/Lagos";
  const naira = (k) => (k == null ? "—" : "₦" + Math.round(k / N).toLocaleString("en-NG"));
  const nairaExact = (k) => (k == null ? "—" : "₦" + (k / N).toLocaleString("en-NG", { minimumFractionDigits: k % N ? 2 : 0, maximumFractionDigits: 2 }));
  function fmtDate(isoStr, opts) {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleString("en-GB", Object.assign({ timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }, opts || {}));
  }
  const fmtDay = (s) => fmtDate(s, { hour: undefined, minute: undefined, year: undefined });
  // <input type="datetime-local"> values are Lagos wall time (WAT = UTC+1, no DST).
  const fromLocalInput = (v) => (v ? new Date(v + ":00+01:00").toISOString() : null);
  function toLocalInput(isoStr) {
    if (!isoStr) return "";
    const d = new Date(new Date(isoStr).getTime() + 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const levelLabel = (l) => (l === 100 ? "Free" : l ? l + "% off" : "Off");
  const zonesLabel = (zs) => {
    const z = (zs || []).slice().sort((a, b) => a - b);
    if (!z.length) return "No zones";
    const contiguous = z.every((v, i) => i === 0 || v === z[i - 1] + 1);
    return contiguous && z.length > 1 ? `Zones ${z[0]}–${z[z.length - 1]}` : (z.length === 1 ? `Zone ${z[0]}` : "Zones " + z.join(", "));
  };
  const TYPE_META = {
    product: { label: "Product", chip: "bg-sky-50 text-sky-700 border-sky-200" },
    order_value: { label: "Order value", chip: "bg-violet-50 text-violet-700 border-violet-200" },
    landmark: { label: "Landmark", chip: "bg-amber-50 text-amber-800 border-amber-200" },
    customer_class: { label: "Customer classification", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  // ------------------ Users & permissions ------------------
  const me = () => S.users.find((u) => u.id === S.actingUserId) || S.users[0];
  function permsOf(user) {
    const set = new Set();
    user.roles.forEach((rid) => { const r = S.roles.find((x) => x.id === rid); if (r) (r.locked ? P : r.perms).forEach((p) => set.add(p)); });
    return set;
  }
  const can = (perm) => permsOf(me()).has(perm);
  function applyPerms(root) {
    (root || document).querySelectorAll("[data-perm]").forEach((el) => {
      const ok = el.dataset.perm.split("|").some((p) => can(p.trim()));
      el.classList.toggle("dl-noperm", !ok);
    });
  }

  // ------------------ Change log + price changes ------------------
  function log(screen, item, field, oldV, newV, reason) {
    S.changeLog.unshift({ id: uid("log"), at: new Date().toISOString(), actor: me().name, screen, item, field, old: oldV == null ? "—" : String(oldV), new: newV == null ? "—" : String(newV), reason: reason || "" });
  }
  // entity: zone | band | table | setting.  Returns the setter target.
  function entityRef(entity, entityId) {
    if (entity === "zone") return S.zones.find((z) => String(z.id) === String(entityId));
    if (entity === "table") return S.tables[entityId];
    if (entity === "band") { for (const t of Object.values(S.tables)) { const b = t.bands.find((x) => x.id === entityId); if (b) return b; } return null; }
    if (entity === "setting") return S.settings;
    return null;
  }
  const SCREEN_OF = { zone: "Zones & Base Fees", band: "Weight Surcharges", table: "Weight Surcharges", setting: "Weight Surcharges" };
  /** Record a price/config change. effectiveAt null = now. */
  function priceChange({ entity, entityId, field, label, item, newValue, effectiveAt, fmt, reason, restoredFrom }) {
    const target = entityRef(entity, entityId);
    const oldValue = target ? target[field] : null;
    const now = new Date();
    const scheduled = effectiveAt && new Date(effectiveAt) > now;
    const ch = { id: uid("pc"), entity, entityId: String(entityId), field, label, item, oldValue, newValue, fmt: fmt || "raw", effectiveAt: effectiveAt || now.toISOString(), status: scheduled ? "scheduled" : "applied", createdBy: me().name, createdAt: now.toISOString(), appliedAt: scheduled ? null : now.toISOString(), restoredFrom: restoredFrom || null };
    S.priceChanges.unshift(ch);
    if (!scheduled) applyChange(ch);
    log(SCREEN_OF[entity], item, label + (scheduled ? ` (scheduled for ${fmtDate(ch.effectiveAt)})` : restoredFrom ? " (restored)" : ""), fmtValue(oldValue, ch.fmt), fmtValue(newValue, ch.fmt), reason);
    return ch;
  }
  function applyChange(ch) {
    const target = entityRef(ch.entity, ch.entityId);
    if (!target) return;
    target[ch.field] = ch.newValue;
    target.v = (target.v || 1) + 1;
    target.updatedBy = ch.createdBy; target.updatedAt = new Date().toISOString();
    ch.status = "applied"; ch.appliedAt = ch.appliedAt || new Date().toISOString();
  }
  function fmtValue(v, kind) {
    if (v == null) return kind === "km" ? "No limit" : "Not set";
    if (kind === "money") return naira(v);
    if (kind === "pct") return v + "%";
    if (kind === "kg") return v + " kg";
    if (kind === "km") return v + " km";
    if (kind === "bool") return v ? "Available" : "Not available online";
    if (kind === "carrier") return v === "van" ? "Saleko van" : "Logistics partner";
    if (kind === "rounding") return v === "ceil" ? "Round up to next whole kg" : "Exact";
    return String(v);
  }
  // Stand-in for the every-minute job (PRD 8.3): apply due scheduled changes.
  function runScheduler() {
    const now = Date.now(); let applied = 0;
    S.priceChanges.filter((c) => c.status === "scheduled" && new Date(c.effectiveAt).getTime() <= now)
      .sort((a, b) => new Date(a.effectiveAt) - new Date(b.effectiveAt))
      .forEach((c) => { applyChange(c); applied++; S.changeLog.unshift({ id: uid("log"), at: new Date().toISOString(), actor: "System (scheduler)", screen: SCREEN_OF[c.entity], item: c.item, field: c.label + " (scheduled change went live)", old: fmtValue(c.oldValue, c.fmt), new: fmtValue(c.newValue, c.fmt), reason: "" }); });
    if (applied) save();
    return applied;
  }

  // ------------------ Zone resolution (PRD 3.2) ------------------
  function zoneFromKm(km) {
    const city = S.zones.filter((z) => z.id <= 5).sort((a, b) => a.from - b.from);
    for (const z of city) if (km <= (z.to == null ? Infinity : z.to) && (km > z.from || z.from === 0)) return z.id;
    return 5;
  }
  const autoZone = (lm) => (lm.ogun ? 7 : zoneFromKm(lm.km));
  const finalZone = (lm) => lm.override || autoZone(lm);
  function resolveZone(lgaId, landmarkId) {
    const lga = S.lgas.find((l) => l.id === lgaId);
    const lm = landmarkId ? S.landmarks.find((l) => l.id === landmarkId) : null;
    if (lm) return { zone: finalZone(lm), lga: S.lgas.find((l) => l.name === lm.lga), landmark: lm, via: lm.override ? "landmark override" : lm.ogun ? "Ogun State landmark" : `landmark distance ${lm.km} km` };
    if (lga) return { zone: lga.defaultZone, lga, landmark: null, via: "LGA default (landmark not listed)" };
    return null;
  }

  // ------------------ Surcharge ------------------
  function zonePricing(zoneId) {
    const z = S.zones.find((x) => x.id === zoneId);
    const t = z && S.tables[z.table];
    const ready = z && z.baseFee != null && t && t.bands.length > 0;
    return { zone: z, table: t, ready };
  }
  function surchargeFor(weightKg, table) {
    const bands = table.bands.slice().sort((a, b) => a.above - b.above);
    for (const b of bands) {
      const top = b.upTo == null ? Infinity : b.upTo;
      if ((weightKg > b.above || (b.above === 0 && weightKg >= 0)) && weightKg <= top) {
        if (b.upTo == null && weightKg > b.above) {
          let extra = weightKg - b.above;
          if (S.settings.perKgRounding === "ceil") extra = Math.ceil(extra - 1e-9);
          const perKg = table.perKg || 0;
          return { band: b, kobo: b.surcharge + Math.round(extra * perKg), perKgPart: Math.round(extra * perKg), extraKg: extra };
        }
        return { band: b, kobo: b.surcharge, perKgPart: 0, extraKg: 0 };
      }
    }
    // Weight above the last fixed band with no open band defined
    const last = bands[bands.length - 1];
    let extra = weightKg - (last ? last.upTo : 0);
    if (S.settings.perKgRounding === "ceil") extra = Math.ceil(extra - 1e-9);
    return { band: last, kobo: (last ? last.surcharge : 0) + Math.round(extra * (table.perKg || 0)), perKgPart: Math.round(extra * (table.perKg || 0)), extraKg: extra };
  }

  // ------------------ Rules ------------------
  function ruleState(r, at) {
    const now = (at || new Date()).getTime();
    if (r.endsAt && new Date(r.endsAt).getTime() <= now) return "expired";
    if (r.status !== "active") return "inactive";
    if (new Date(r.startsAt).getTime() > now) return "scheduled";
    return "live";
  }
  function universalLive(at) {
    const u = S.universal; if (!u.level) return false;
    const now = (at || new Date()).getTime();
    if (u.startsAt && new Date(u.startsAt).getTime() > now) return false;
    if (u.endsAt && new Date(u.endsAt).getTime() <= now) return false;
    return true;
  }
  function universalState(at) {
    const u = S.universal;
    if (!u.level) return "off";
    const now = (at || new Date()).getTime();
    if (u.endsAt && new Date(u.endsAt).getTime() <= now) return "ended";
    if (u.startsAt && new Date(u.startsAt).getTime() > now) return "scheduled";
    return "live";
  }
  function productRuleTargets(r, p) {
    return r.targets.some((t) => (t.type === "product" && t.id === p.id) || (t.type === "category" && t.id === p.category) || (t.type === "brand" && t.id === p.brand) || (t.type === "merchant" && t.id === p.merchant));
  }
  /** Live product rules covering product p (optionally for a zone/channel). Highest level first. */
  function productRulesFor(p, { zone, channel, at } = {}) {
    return S.rules.filter((r) => r.type === "product" && ruleState(r, at) === "live" && productRuleTargets(r, p) && (zone == null || r.zones.includes(zone)) && (!channel || r.channels.includes(channel)))
      .sort((a, b) => b.level - a.level || new Date(a.createdAt) - new Date(b.createdAt));
  }
  /** Storefront tag for a product card (PRD 6.3). defaultZone = the customer's saved address zone, if any. */
  function productTag(p, { channel = "web", defaultZone = null, at } = {}) {
    const best = productRulesFor(p, { channel, at }).find((r) => (defaultZone ? r.zones.includes(defaultZone) : r.zones.some((z) => z <= 5)));
    if (!best) return null;
    if (universalLive(at) && S.universal.level === 100) return null; // site-wide strip replaces tags
    return { level: best.level, text: best.level === 100 ? "Free Delivery" : `${best.level}% off delivery`, rule: best };
  }

  // ------------------ The engine (PRD 5.1) ------------------
  /**
   * input: { lines:[{productId?, name?, weightKg, qty}], lgaId, landmarkId|null, subtotal (kobo, qualifying),
   *          customerId|null (null = guest), channel, waive: {by, reason}|null, at: Date }
   */
  function quote(input) {
    const at = input.at || new Date();
    const channel = input.channel || "web";
    const trace = [];
    const step = (title, detail, kind) => trace.push({ title, detail, kind: kind || "info" });
    const result = { ok: false, trace, checks: [], lines: [], feeKobo: null, standardFeeKobo: null, flags: [] };

    // 1. Deliverable?
    const loc = resolveZone(input.lgaId, input.landmarkId);
    if (!loc) { result.error = "Pick an LGA to calculate delivery."; step("Address", result.error, "stop"); return result; }
    result.zone = loc.zone; result.lga = loc.lga; result.landmark = loc.landmark; result.zoneVia = loc.via;
    const pricing = zonePricing(loc.zone);
    step("Address → zone", `${loc.lga ? loc.lga.name : ""}${loc.landmark ? " · " + loc.landmark.name : " · landmark not listed"} → Zone ${loc.zone} (${loc.via})`);
    if (loc.lga && loc.lga.status !== "active") { result.error = "This LGA is not available for delivery."; step("Deliverable?", result.error, "stop"); return result; }
    if (!pricing.zone.available) { result.error = `Zone ${loc.zone} is turned off. Delivery isn't available to this address.`; step("Deliverable?", result.error, "stop"); return result; }
    if (!pricing.ready) { result.error = "Delivery price not set for this area. Contact support"; step("Deliverable?", `Zone ${loc.zone} has no base fee or weight bands yet → payment blocked`, "stop"); return result; }
    step("Deliverable?", `Zone ${loc.zone} is available and priced`, "pass");

    const totalWeight = input.lines.reduce((s, l) => s + (l.weightKg || 0) * (l.qty || 1), 0);
    if (input.lines.some((l) => l.weightKg == null)) { result.error = "A product in this cart has no weight. It can't be priced."; step("Weights", result.error, "stop"); return result; }
    if (totalWeight > S.settings.largeVehicleKg) result.flags.push(`Over ${S.settings.largeVehicleKg} kg: dispatch must confirm a larger vehicle before confirming the order`);
    else if (totalWeight > S.settings.vanCheckKg) result.flags.push(`Over ${S.settings.vanCheckKg} kg: flagged “Check van availability” for dispatch`);
    result.totalWeight = totalWeight;

    // Base breakdown for every line (shown even when the order ends up free)
    const base = pricing.zone.baseFee;
    result.lines = input.lines.map((l) => {
      const p = l.productId ? S.products.find((x) => x.id === l.productId) : null;
      const sur = surchargeFor(l.weightKg, pricing.table);
      const prodRules = p ? productRulesFor(p, { zone: loc.zone, channel, at }) : [];
      const pr = prodRules[0] || null;
      return { productId: l.productId || null, name: l.name || (p ? p.name : `Item ${l.weightKg} kg`), qty: l.qty || 1, weightKg: l.weightKg, base, surcharge: sur.kobo, band: sur.band ? sur.band.label : "", perKgPart: sur.perKgPart, unitFee: base + sur.kobo, productRule: pr, productPct: pr ? pr.level : 0, exempt: !!(pr && pr.level === 100), unitAfter: null, lineTotal: 0 };
    });
    const ruleChecks = result.checks;

    // 2. Admin waiver
    if (input.waive) {
      const std = computeUnits(result, { silent: true });
      result.feeKobo = 0; result.standardFeeKobo = std; result.waived = { fee: std, by: input.waive.by, reason: input.waive.reason };
      result.freeReason = `Waived by admin: ${input.waive.reason}`; result.ok = true; result.source = "waiver";
      step("Admin waiver", `Waived by ${input.waive.by} (${input.waive.reason}). Calculated fee ${naira(std)} → ₦0`, "free");
      return result;
    }
    step("Admin waiver", "Not an admin-created waived order", "skip");

    // 3. Order-level discount
    let orderPct = 0, winner = null;
    const uLive = universalLive(at) && S.universal.zones.includes(loc.zone) && S.universal.channels.includes(channel);
    const wholeOrder = S.rules.filter((r) => r.type !== "product").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (uLive) {
      orderPct = S.universal.level; result.source = "universal";
      ruleChecks.push({ name: "Universal delivery discount", level: S.universal.level, matched: true, reason: `${levelLabel(S.universal.level)} for ${zonesLabel(S.universal.zones)} is live` });
      wholeOrder.forEach((r) => ruleChecks.push({ id: r.id, name: r.name, level: r.level, type: r.type, matched: false, paused: true, reason: "Paused: universal switch is live" }));
      step("Order-level discount", `Universal switch live → ${levelLabel(orderPct)}; whole-order rules skipped`, orderPct === 100 ? "free" : "pass");
    } else {
      if (S.universal.level) ruleChecks.push({ name: "Universal delivery discount", level: S.universal.level, matched: false, reason: universalState(at) !== "live" ? `Not live (${universalState(at)})` : `Doesn't cover Zone ${loc.zone} / ${channel}` });
      wholeOrder.forEach((r) => {
        const m = matchWholeOrderRule(r, { zone: loc.zone, lga: loc.lga, landmark: loc.landmark, subtotal: input.subtotal || 0, customerId: input.customerId, channel, at });
        ruleChecks.push({ id: r.id, name: r.name, level: r.level, type: r.type, matched: m.ok, reason: m.reason });
        if (m.ok && (!winner || r.level > winner.level)) winner = r; // ties → created first (list is sorted)
      });
      if (winner) { orderPct = winner.level; result.source = "rule"; result.winningRule = winner; }
      step("Order-level discount", winner ? `Winning rule “${winner.name}” → ${levelLabel(winner.level)}` : "No whole-order rule matched", winner ? (winner.level === 100 ? "free" : "pass") : "skip");
    }
    result.orderPct = orderPct;
    if (orderPct === 100) {
      result.standardFeeKobo = computeUnits(result, { silent: true });
      result.feeKobo = 0; result.ok = true;
      result.freeReason = result.source === "universal" ? "Free delivery on all orders" : (winner.message || winner.name);
      return finish(result, input, at);
    }

    // 4. Free product rules
    result.lines.forEach((l) => l.productRule && ruleChecks.push({ id: l.productRule.id, name: l.productRule.name, level: l.productRule.level, type: "product", matched: true, reason: `${l.name}: ${levelLabel(l.productRule.level)}` }));
    const exemptUnits = result.lines.filter((l) => l.exempt).reduce((s, l) => s + l.qty, 0);
    result.chargeableUnits = result.lines.filter((l) => !l.exempt).reduce((s, l) => s + l.qty, 0);
    step("Free product rules", exemptUnits ? `${exemptUnits} unit(s) exempt; ${result.chargeableUnits} chargeable` : "No free products in cart", exemptUnits ? "pass" : "skip");
    if (result.chargeableUnits === 0) {
      result.standardFeeKobo = 0; result.feeKobo = 0; result.ok = true; result.freeReason = "All items have free delivery";
      result.lines.forEach((l) => { l.unitAfter = 0; l.lineTotal = 0; });
      step("Result", "All items have free delivery → ₦0", "free");
      return finish(result, input, at);
    }

    // 5–6. Unit fees, product %, consolidation
    const std = computeUnits(result, { silent: false, step });
    result.standardFeeKobo = std;
    // 7. Order-level partial discount, round to nearest naira (half up)
    let fee = orderPct ? std * (1 - orderPct / 100) : std;
    fee = Math.floor(fee / N + 0.5) * N;
    result.feeKobo = fee; result.ok = true;
    step("Fee charged", orderPct ? `${naira(std)} × ${100 - orderPct}% = ${naira(fee)}` : `${naira(fee)} (rounded to the nearest naira)`, "result");
    return finish(result, input, at);
  }

  function computeUnits(result, { silent, step } = {}) {
    const minUnits = S.settings.consolidationMinUnits, pct = S.settings.consolidationPct;
    const chargeable = result.lines.filter((l) => !l.exempt).reduce((s, l) => s + l.qty, 0);
    const consolidate = chargeable >= minUnits && pct > 0;
    if (!silent) result.consolidation = consolidate ? pct : 0;
    let total = 0;
    result.lines.forEach((l) => {
      if (l.exempt) { if (!silent) { l.unitAfter = 0; l.lineTotal = 0; } return; }
      let u = l.unitFee * (1 - l.productPct / 100);
      if (consolidate) u = u * (1 - pct / 100);
      u = Math.round(u);
      if (!silent) { l.unitAfter = u; l.lineTotal = u * l.qty; }
      total += u * l.qty;
    });
    if (step) {
      step("Unit fees", result.lines.filter((l) => !l.exempt).map((l) => `${l.name}: ${naira(l.base)} + ${naira(l.surcharge)}${l.productPct ? ` − ${l.productPct}%` : ""}`).join("; "));
      step("Route consolidation", consolidate ? `${chargeable} chargeable units ≥ ${minUnits} → ${pct}% off each unit` : `${chargeable} chargeable unit → no consolidation`, consolidate ? "pass" : "skip");
      step("Standard fee", naira(total));
    }
    return total;
  }

  function matchWholeOrderRule(r, ctx) {
    const st = ruleState(r, ctx.at);
    if (st !== "live") return { ok: false, reason: st === "scheduled" ? `Not started (starts ${fmtDate(r.startsAt)})` : st === "expired" ? "Expired" : "Inactive" };
    if (!r.zones.includes(ctx.zone)) return { ok: false, reason: `Zone ${ctx.zone} not covered (${zonesLabel(r.zones)})` };
    if (!r.channels.includes(ctx.channel)) return { ok: false, reason: `Channel ${ctx.channel} not covered` };
    if (r.minOrder && ctx.subtotal < r.minOrder) return { ok: false, reason: `Order value ${naira(ctx.subtotal)} is below ${naira(r.minOrder)}` };
    if (r.type === "order_value") return { ok: true, reason: `Order value ${naira(ctx.subtotal)} ≥ ${naira(r.minOrder)}` };
    if (r.type === "landmark") {
      const hit = r.targets.find((t) => (t.type === "zone" && Number(t.id) === ctx.zone) || (t.type === "lga" && ctx.lga && t.id === ctx.lga.id) || (t.type === "landmark" && ctx.landmark && t.id === ctx.landmark.id));
      if (!hit) return { ok: false, reason: ctx.landmark ? `${ctx.landmark.name} isn't a targeted location` : "Landmark not listed; LGA/zone not targeted" };
      return { ok: true, reason: `Address matches ${hit.type} target` };
    }
    if (r.type === "customer_class") {
      if (!ctx.customerId) return { ok: false, reason: "Guest checkout never matches classification rules" };
      const c = S.customers.find((x) => x.id === ctx.customerId);
      const classes = customerClasses(c);
      const hit = r.targets.find((t) => classes.includes(t.id));
      if (!hit) return { ok: false, reason: `${c.name} isn't in ${r.targets.map((t) => className(t.id)).join(", ")}` };
      if (r.perCustomerLimit && (c.usage[r.id] || 0) >= r.perCustomerLimit) return { ok: false, reason: `Usage limit reached (${c.usage[r.id]}/${r.perCustomerLimit})` };
      return { ok: true, reason: `${c.name} is ${className(hit.id)}` };
    }
    return { ok: false, reason: "Unknown rule type" };
  }
  // First-time customer is evaluated live: no successful payment yet.
  function customerClasses(c) {
    const set = new Set(c.classes.filter((id) => id !== "first_time" && (S.classifications.find((k) => k.id === id) || {}).status === "active"));
    if (c.paidOrders === 0) set.add("first_time");
    return [...set];
  }
  const className = (id) => (S.classifications.find((k) => k.id === id) || { name: id }).name;

  // Nudge (PRD 6.4) + snapshot-ish summary line
  function finish(result, input, at) {
    result.savings = [];
    if (result.consolidation) result.savings.push(`${result.consolidation}% multi-item saving`);
    if (result.orderPct && result.orderPct < 100) result.savings.push(result.source === "universal" ? `${result.orderPct}% off delivery on all orders` : `${result.orderPct}% off: ${result.winningRule.message || result.winningRule.name}`);
    const exempt = result.lines.filter((l) => l.exempt).reduce((s, l) => s + l.qty, 0);
    if (exempt && result.feeKobo > 0) result.savings.push(`${exempt} item${exempt > 1 ? "s ship" : " ships"} free`);
    result.nudge = null;
    const uLive = universalLive(at) && S.universal.zones.includes(result.zone);
    if (!uLive && !(result.feeKobo === 0 && result.source !== "rule")) {
      const ovr = S.rules.filter((r) => r.type === "order_value" && ruleState(r, at) === "live" && r.zones.includes(result.zone) && r.channels.includes(input.channel || "web")).sort((a, b) => a.minOrder - b.minOrder);
      if (ovr.length) {
        const sub = input.subtotal || 0;
        const next = ovr.find((r) => r.minOrder > sub && r.level > (result.orderPct || 0));
        const reached = ovr.filter((r) => r.minOrder <= sub).pop();
        if (next) result.nudge = { remaining: next.minOrder - sub, target: next.minOrder, level: next.level, progress: Math.min(1, sub / next.minOrder), unlockedLevel: reached && result.winningRule === reached ? reached.level : 0 };
        else if (reached && result.winningRule === reached) result.nudge = { unlocked: true, level: reached.level };
      }
    }
    result.trace.push({ title: "Snapshot", detail: "Saved on the order when payment succeeds; later admin changes never alter it.", kind: "info" });
    return result;
  }

  // ------------------ UI shell ------------------
  const NAV = [
    { group: "Operations", items: [["Create Order", "create_order.html"], ["Fleet", "fleet.html"]] },
    { group: "Delivery", perm: "delivery.view", items: [
      ["Zones & Base Fees", "delivery_zones.html"], ["Weight Surcharges", "delivery_surcharges.html"], ["LGAs", "delivery_lgas.html"],
      ["Landmarks", "delivery_landmarks.html"], ["Fee Calculator", "delivery_calculator.html"], ["Free Delivery", "delivery_free.html"],
      ["Change History", "delivery_history.html"]] },
    { group: "Customers", items: [["Classifications", "customer_classifications.html"]] },
    { group: "Finance", items: [["Escrow Ledger", "escrow.html"], ["Escrow Settings", "escrow_settings.html"]] },
    { group: "Payroll", items: [["Companies", "payroll_companies.html"], ["Staff & Payroll", "payroll_staff.html"], ["Payroll Upload", "payroll_upload.html"], ["Upload History", "payroll_history.html"]] },
    { group: "Catalog", items: [["Product Delivery Fields", "product_delivery.html"], ["Tag Service", "tags.html"]] },
    { group: "Marketing", items: [["Flash Sales", "marketing_flashsale.html"], ["Banners", "marketing_banners.html"], ["Campaigns", "marketing_campaigns.html"], ["Banner Log", "marketing_banner_log.html"]] },
    { group: "Settings", items: [["Roles & Permissions", "delivery_roles.html"]] },
    { group: "Design", items: [["Delivery: overview", "delivery_overview.html"], ["Storefront tag & checkout", "delivery_storefront.html"]] },
  ];
  function sidebarHtml(active) {
    let h = `<div class="px-6 py-5 flex items-center gap-2"><div class="h-8 w-8 rounded-lg bg-emerald-700"></div><div class="font-semibold text-lg">Saleko</div></div><nav class="px-3 pb-6 text-sm">`;
    NAV.forEach((g, gi) => {
      if (g.perm && !can(g.perm)) return;
      h += `<div class="${gi ? "mt-3 " : ""}px-3 py-2 text-slate-400">${g.group}</div>`;
      g.items.forEach(([label, href]) => {
        const on = href === active;
        h += `<a class="block px-3 py-2 rounded-lg ${on ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-50"}" href="${href}">${esc(label)}</a>`;
      });
    });
    return h + `</nav>`;
  }
  /** Mounts sidebar, topbar (title + acting-as switcher), universal banner, toast, drawer & modal hosts. */
  function mount({ active, title, subtitle, actions, needs }) {
    runScheduler();
    const style = document.createElement("style");
    style.textContent = `::-webkit-scrollbar{height:10px;width:10px}::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:999px}::-webkit-scrollbar-track{background:transparent}
      .dl-noperm{display:none!important}.dl-skel{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 37%,#f1f5f9 63%);background-size:400% 100%;animation:dlsk 1.2s ease infinite}@keyframes dlsk{0%{background-position:100% 50%}100%{background-position:0 50%}}
      .dl-drawer{transition:transform .2s ease}.dl-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:12px;font-weight:600;padding:4px 8px;border-radius:4px;height:20px;white-space:nowrap}
      .dl-tag-free{background:#1A6B3C;color:#fff}.dl-tag-part{background:#fff;color:#1A6B3C;border:1px solid #1A6B3C}`;
    document.head.appendChild(style);
    document.getElementById("sidebar").innerHTML = sidebarHtml(active);
    const u = me();
    const roleNames = u.roles.map((r) => (S.roles.find((x) => x.id === r) || {}).name).join(" + ");
    document.getElementById("topbar").innerHTML = `
      <div class="px-4 md:px-8 py-4 flex items-center gap-3 flex-wrap">
        <div><h1 class="text-xl font-semibold">${esc(title)}</h1>${subtitle ? `<div class="text-sm text-slate-500">${subtitle}</div>` : ""}</div>
        <div class="ml-auto flex items-center gap-2 flex-wrap">
          ${actions || ""}
          <label class="flex items-center gap-2 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg px-2 py-1.5" title="Prototype only: preview the screen as another admin to see permission-gated controls">
            Preview as
            <select id="dlActingAs" class="bg-transparent text-slate-800 text-xs font-medium focus:outline-none">
              ${S.users.map((x) => `<option value="${x.id}" ${x.id === u.id ? "selected" : ""}>${esc(x.name)} — ${esc(x.roles.map((r) => (S.roles.find((y) => y.id === r) || {}).name).join(" + "))}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>
      <div id="dlBanner"></div>`;
    document.getElementById("dlActingAs").addEventListener("change", (e) => { S.actingUserId = e.target.value; save(); location.reload(); });
    renderBanner();
    const host = document.createElement("div");
    host.innerHTML = `
      <div id="dlToast" class="fixed bottom-4 left-1/2 -translate-x-1/2 hidden z-50"><div id="dlToastText" class="text-white text-sm px-4 py-2 rounded-full shadow-lg"></div></div>
      <div id="dlDrawerWrap" class="fixed inset-0 z-40 hidden"><div class="absolute inset-0 bg-slate-900/30" data-close-drawer></div>
        <aside id="dlDrawer" class="dl-drawer absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col translate-x-full"></aside></div>
      <div id="dlModalWrap" class="fixed inset-0 z-50 hidden items-center justify-center p-4"><div class="absolute inset-0 bg-slate-900/40"></div>
        <div id="dlModal" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"></div></div>`;
    document.body.appendChild(host);
    document.querySelector("[data-close-drawer]").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });
    if (needs && !can(needs)) {
      document.getElementById("content").innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center"><div class="font-semibold">You don't have permission to see this screen</div><div class="text-sm text-slate-500 mt-1">Ask a Super Admin to add <code class="text-xs bg-slate-100 px-1 rounded">${needs}</code> to your role.</div></div>`;
      return false;
    }
    applyPerms();
    return true;
  }
  function renderBanner() {
    const el = document.getElementById("dlBanner"); if (!el) return;
    const st = universalState();
    if (st !== "live" && st !== "scheduled") { el.innerHTML = ""; return; }
    const u = S.universal;
    el.innerHTML = st === "live"
      ? `<div class="bg-amber-100 border-t border-amber-200 text-amber-900 text-sm px-4 md:px-8 py-2">⚠️ Universal ${levelLabel(u.level)} delivery is <b>ON</b>${u.endsAt ? " until " + fmtDate(u.endsAt) : ""} for ${zonesLabel(u.zones)}. Whole-order rules are paused. <a href="delivery_free.html" class="underline">Manage</a></div>`
      : `<div class="bg-amber-50 border-t border-amber-200 text-amber-800 text-sm px-4 md:px-8 py-2">Universal ${levelLabel(u.level)} delivery is scheduled to start ${fmtDate(u.startsAt)}.</div>`;
  }
  let toastT;
  function toast(msg, kind) {
    const t = document.getElementById("dlToastText");
    t.textContent = msg;
    t.className = "text-white text-sm px-4 py-2 rounded-full shadow-lg " + (kind === "error" ? "bg-rose-600" : kind === "ok" ? "bg-emerald-700" : "bg-slate-900");
    document.getElementById("dlToast").classList.remove("hidden");
    clearTimeout(toastT); toastT = setTimeout(() => document.getElementById("dlToast").classList.add("hidden"), kind === "error" ? 4000 : 2200);
  }
  function openDrawer(html) {
    const d = document.getElementById("dlDrawer");
    d.innerHTML = html; applyPerms(d);
    document.getElementById("dlDrawerWrap").classList.remove("hidden");
    requestAnimationFrame(() => d.classList.remove("translate-x-full"));
    d.querySelectorAll("[data-close-drawer]").forEach((b) => b.addEventListener("click", closeDrawer));
    return d;
  }
  function closeDrawer() {
    const d = document.getElementById("dlDrawer"); if (!d) return;
    d.classList.add("translate-x-full");
    setTimeout(() => document.getElementById("dlDrawerWrap").classList.add("hidden"), 180);
  }
  function drawerFrame(title, sub, body, footer) {
    return `<div class="p-5 border-b border-slate-200 flex items-start gap-3"><div class="flex-1"><div class="font-semibold text-lg">${title}</div>${sub ? `<div class="text-sm text-slate-500 mt-0.5">${sub}</div>` : ""}</div>
      <button data-close-drawer class="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50" aria-label="Close">✕</button></div>
      <div class="flex-1 overflow-y-auto p-5 space-y-4">${body}</div>
      ${footer ? `<div class="p-4 border-t border-slate-200 flex items-center gap-2 justify-end bg-slate-50">${footer}</div>` : ""}`;
  }
  /** confirm({title, body, ok, danger}) → Promise<boolean> */
  function confirmModal({ title, body, ok, danger }) {
    return new Promise((resolve) => {
      const m = document.getElementById("dlModal");
      m.innerHTML = `<div class="font-semibold text-lg">${title}</div><div class="text-sm text-slate-600 mt-2">${body}</div>
        <div class="mt-6 flex justify-end gap-2"><button data-no class="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button data-yes class="rounded-lg ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800"} text-white px-3 py-2 text-sm">${ok || "Confirm"}</button></div>`;
      const w = document.getElementById("dlModalWrap"); w.classList.remove("hidden"); w.classList.add("flex");
      m.querySelector("[data-no]").onclick = () => { closeModal(); resolve(false); };
      m.querySelector("[data-yes]").onclick = () => { closeModal(); resolve(true); };
    });
  }
  function closeModal() { const w = document.getElementById("dlModalWrap"); if (w) { w.classList.add("hidden"); w.classList.remove("flex"); } }
  /** Optimistic-lock check (PRD 7.9): returns true if the record changed since `loadedV`. */
  function staleCheck(obj, loadedV) {
    if ((obj.v || 1) !== loadedV) {
      toast(`This item was changed by ${obj.updatedBy || "someone"} at ${fmtDate(obj.updatedAt, { day: undefined, month: undefined, year: undefined })}. Reload to see the latest version`, "error");
      return true;
    }
    return false;
  }
  function trySave(okMsg) {
    if (save()) { toast(okMsg, "ok"); renderBanner(); return true; }
    toast("Couldn't save. Your changes are still here – try again", "error"); return false;
  }
  function tagHtml(level, { dark } = {}) {
    const van = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
    if (level === 100) return `<span class="dl-tag dl-tag-free" aria-label="Free delivery">${van}Free Delivery</span>`;
    return `<span class="dl-tag dl-tag-part" style="${dark ? "background:#0f172a" : ""}" aria-label="${level} percent off delivery">${van}${level}% off delivery</span>`;
  }
  function csvDownload(filename, rows) {
    const csv = rows.map((r) => r.map((c) => { const s = String(c == null ? "" : c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
  }
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }
  function skeleton(el, rows, cols) {
    el.innerHTML = Array.from({ length: rows }).map(() => `<tr>${Array.from({ length: cols }).map(() => `<td class="p-3"><div class="dl-skel h-4 rounded w-3/4"></div></td>`).join("")}</tr>`).join("");
  }

  // ------------------ Shared pricing UI: scheduled changes + history/restore ------------------
  function scheduledPanel(el, entities, rerender) {
    const list = S.priceChanges.filter((c) => c.status === "scheduled" && entities.includes(c.entity)).sort((a, b) => new Date(a.effectiveAt) - new Date(b.effectiveAt));
    if (!list.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<section class="bg-white border border-amber-200 rounded-2xl">
      <div class="p-4 border-b border-amber-100 flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-amber-500"></span><div class="font-semibold">Scheduled changes</div><div class="text-sm text-slate-500">(${list.length}) go live automatically at the time shown (WAT)</div></div>
      <div class="divide-y divide-slate-100">${list.map((c) => `
        <div class="p-4 flex items-center gap-3 flex-wrap text-sm">
          <div class="flex-1 min-w-[240px]"><div class="font-medium">${esc(c.item)} · ${esc(c.label)}</div>
            <div class="text-slate-500">${fmtValue(c.oldValue, c.fmt)} → <b class="text-slate-800">${fmtValue(c.newValue, c.fmt)}</b> · from <b class="text-slate-800">${fmtDate(c.effectiveAt)}</b> · by ${esc(c.createdBy)}</div></div>
          <div class="flex gap-2" data-perm="delivery.prices.schedule">
            <button data-edit-sched="${c.id}" class="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Edit</button>
            <button data-cancel-sched="${c.id}" class="rounded-lg border border-rose-200 text-rose-700 px-3 py-1.5 hover:bg-rose-50">Cancel</button></div>
        </div>`).join("")}</div></section>`;
    applyPerms(el);
    el.querySelectorAll("[data-cancel-sched]").forEach((b) => b.onclick = async () => {
      const c = S.priceChanges.find((x) => x.id === b.dataset.cancelSched);
      if (!(await confirmModal({ title: "Cancel scheduled change?", body: `${esc(c.item)} · ${esc(c.label)} will stay at ${fmtValue(c.oldValue, c.fmt)}.`, ok: "Cancel change", danger: true }))) return;
      c.status = "cancelled"; log(SCREEN_OF[c.entity], c.item, c.label + " (scheduled change cancelled)", fmtValue(c.newValue, c.fmt), "—", "");
      trySave("Scheduled change cancelled"); rerender();
    });
    el.querySelectorAll("[data-edit-sched]").forEach((b) => b.onclick = () => {
      const c = S.priceChanges.find((x) => x.id === b.dataset.editSched);
      const isMoney = c.fmt === "money";
      const d = openDrawer(drawerFrame("Edit scheduled change", `${esc(c.item)} · ${esc(c.label)}`, `
        <label class="block text-sm"><span class="text-slate-600">New value${isMoney ? " (₦)" : ""}</span>
          <input id="schVal" type="${c.fmt === "rounding" ? "text" : "number"}" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value="${isMoney ? c.newValue / N : c.newValue}"></label>
        <label class="block text-sm"><span class="text-slate-600">Effective from (WAT)</span>
          <input id="schAt" type="datetime-local" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value="${toLocalInput(c.effectiveAt)}"></label>
        <div id="schErr" class="text-sm text-rose-600"></div>`,
        `<button data-close-drawer class="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white hover:bg-slate-50">Close</button><button id="schSave" class="rounded-lg bg-emerald-700 text-white px-3 py-2 text-sm hover:bg-emerald-800">Save</button>`));
      d.querySelector("#schSave").onclick = () => {
        const at = fromLocalInput(d.querySelector("#schAt").value);
        if (!at || new Date(at) <= new Date()) { d.querySelector("#schErr").textContent = "Pick a time in the future."; return; }
        const raw = d.querySelector("#schVal").value;
        const v = c.fmt === "rounding" ? raw : isMoney ? Math.round(Number(raw) * N) : Number(raw);
        log(SCREEN_OF[c.entity], c.item, c.label + " (scheduled change edited)", `${fmtValue(c.newValue, c.fmt)} from ${fmtDate(c.effectiveAt)}`, `${fmtValue(v, c.fmt)} from ${fmtDate(at)}`, "");
        c.newValue = v; c.effectiveAt = at;
        trySave("Scheduled change updated"); closeDrawer(); rerender();
      };
    });
  }
  function historyDrawer({ entity, entityId, field, title, rerender }) {
    const rows = S.priceChanges.filter((c) => c.entity === entity && c.entityId === String(entityId) && (!field || c.field === field)).sort((a, b) => new Date(b.effectiveAt) - new Date(a.effectiveAt));
    const target = entityRef(entity, entityId);
    const body = rows.length ? `<ol class="relative border-l border-slate-200 ml-2 space-y-4">${rows.map((c) => `
      <li class="ml-4"><div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${c.status === "applied" ? "bg-emerald-600" : c.status === "scheduled" ? "bg-amber-500" : "bg-slate-300"}"></div>
        <div class="text-sm"><b>${esc(c.label)}</b>: ${fmtValue(c.oldValue, c.fmt)} → <b>${fmtValue(c.newValue, c.fmt)}</b>${c.restoredFrom ? ' <span class="text-xs rounded bg-sky-50 text-sky-700 px-1.5 py-0.5">restore</span>' : ""}</div>
        <div class="text-xs text-slate-500 mt-0.5">${c.status === "scheduled" ? "Scheduled" : c.status === "cancelled" ? "Cancelled" : "Effective"} ${fmtDate(c.effectiveAt)} · by ${esc(c.createdBy)} · saved ${fmtDate(c.createdAt)}</div>
        ${c.status === "applied" && target && target[c.field] !== c.oldValue ? `<button data-restore="${c.id}" data-perm="delivery.prices.restore" class="mt-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50">Restore ${fmtValue(c.oldValue, c.fmt)}</button>` : ""}
      </li>`).join("")}</ol>`
      : `<div class="text-sm text-slate-500">No changes since the launch seed. Current: ${field && target ? fmtValue(target[field], "money") : "see table"}.</div>`;
    const d = openDrawer(drawerFrame("History", esc(title), body + `<div class="text-xs text-slate-400">Restoring writes a new change, so history is never rewritten. Placed orders keep the price in their snapshot.</div>`));
    d.querySelectorAll("[data-restore]").forEach((b) => b.onclick = async () => {
      const c = S.priceChanges.find((x) => x.id === b.dataset.restore);
      if (!(await confirmModal({ title: "Restore earlier price?", body: `${esc(c.item)} · ${esc(c.label)}: ${fmtValue(target[c.field], c.fmt)} → <b>${fmtValue(c.oldValue, c.fmt)}</b>, effective now. This is recorded as a new change.`, ok: "Restore" }))) return;
      priceChange({ entity: c.entity, entityId: c.entityId, field: c.field, label: c.label, item: c.item, newValue: c.oldValue, fmt: c.fmt, restoredFrom: c.id });
      trySave(`${c.item} restored`); closeDrawer(); rerender();
    });
  }
  /** "Effective" control used in every pricing drawer. Returns html; read with readEffective(root). */
  const effectiveHtml = () => `<fieldset class="border border-slate-200 rounded-xl p-3"><legend class="text-sm text-slate-600 px-1">Effective</legend>
      <label class="flex items-center gap-2 text-sm"><input type="radio" name="eff" value="now" checked class="h-4 w-4"> Now <span class="text-slate-400">(new quotes within 60 seconds)</span></label>
      <label class="flex items-center gap-2 text-sm mt-1.5 ${can("delivery.prices.schedule") ? "" : "opacity-50"}"><input type="radio" name="eff" value="later" class="h-4 w-4" ${can("delivery.prices.schedule") ? "" : "disabled"}> Schedule for a date and time (WAT)</label>
      <input type="datetime-local" id="effAt" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm hidden">
      ${can("delivery.prices.schedule") ? "" : '<div class="text-xs text-slate-400 mt-1">Scheduling needs the “Schedule price changes” permission.</div>'}
      <div id="effErr" class="text-xs text-rose-600 mt-1"></div></fieldset>`;
  function wireEffective(root) {
    root.querySelectorAll('input[name="eff"]').forEach((r) => r.onchange = () => root.querySelector("#effAt").classList.toggle("hidden", root.querySelector('input[name="eff"]:checked').value !== "later"));
  }
  function readEffective(root) {
    const later = root.querySelector('input[name="eff"]:checked').value === "later";
    if (!later) return { ok: true, at: null, label: "effective now" };
    const at = fromLocalInput(root.querySelector("#effAt").value);
    if (!at || new Date(at) <= new Date()) { root.querySelector("#effErr").textContent = "Pick a date and time in the future."; return { ok: false }; }
    return { ok: true, at, label: "from " + fmtDate(at) };
  }

  window.DL = {
    scheduledPanel, historyDrawer, effectiveHtml, wireEffective, readEffective,
    get S() { return S; }, save, reset, trySave, N, ALL_ZONES, CITY_ZONES, CHANNELS, LEVELS, PERMISSIONS, TYPE_META,
    naira, nairaExact, fmtDate, fmtDay, fromLocalInput, toLocalInput, esc, uid, levelLabel, zonesLabel, fmtValue,
    me, can, permsOf, applyPerms, log, priceChange, runScheduler,
    zoneFromKm, autoZone, finalZone, resolveZone, zonePricing, surchargeFor,
    ruleState, universalLive, universalState, productRulesFor, productTag, quote, customerClasses, className,
    mount, renderBanner, toast, openDrawer, closeDrawer, drawerFrame, confirmModal, closeModal, staleCheck, tagHtml, csvDownload, parseCsv, skeleton,
  };
})();
