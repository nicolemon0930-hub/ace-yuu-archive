let records = [];
let mode = "all";
let showTimelineView = false;

const STORAGE_KEY = "ay_archive_v3";

/* ========== 初始化 ========== */
load();
render();

/* ========== 存储 ========== */
function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ========== 渲染 ========== */
function render() {
  if (showTimelineView) {
    renderTimeline();
    return;
  }

  const list = document.getElementById("list");
  const keyword = document.getElementById("search").value.toLowerCase();

  let filtered = records.filter(r => {
    const text = (
      r.title +
      r.chapter +
      r.objectiveNote +
      (r.tags || []).join(" ") +
      (r.characters || []).join(" ")
    ).toLowerCase();

    return text.includes(keyword);
  });

  if (mode === "ace") {
    filtered = filtered.filter(r => r.characters?.includes("Ace"));
  }

  if (mode === "yuu") {
    filtered = filtered.filter(r => r.characters?.includes("Yuu"));
  }

  list.innerHTML = filtered.map(r => `
    <div class="card">
      <h3>${r.title}</h3>
      <div>${r.chapter}</div>
      <div>${(r.tags || []).join(" ")}</div>
      <p>${r.objectiveNote || ""}</p>
    </div>
  `).join("");
}

/* ========== 新增记录 ========== */
function addRecord() {
  const title = prompt("标题");
  if (!title) return;

  const chapter = prompt("Chapter（Main Story｜Episode x-y）");
  const note = prompt("客观记录");

  const record = {
    id: Date.now().toString(),
    title,
    chapter,
    source: "主线",
    characters: ["Ace", "Yuu"],
    tags: [],
    originalText: "",
    objectiveNote: note,
    personalAnalysis: "",
    createdAt: new Date().toISOString()
  };

  records.push(record);
  save();
  render();
}

/* ========== 筛选模式 ========== */
function setMode(m) {
  mode = m;
  render();
}

/* ========== Timeline ========== */
function toggleTimeline() {
  showTimelineView = !showTimelineView;

  document.getElementById("list").style.display =
    showTimelineView ? "none" : "block";

  document.getElementById("timeline").style.display =
    showTimelineView ? "block" : "none";

  render();
}

function renderTimeline() {
  const el = document.getElementById("timeline");

  const sorted = [...records].sort((a, b) =>
    (a.chapter || "").localeCompare(b.chapter || "")
  );

  el.innerHTML = sorted.map(r => `
    <div class="card">
      <b>${r.chapter}</b>
      <div>${r.title}</div>
    </div>
  `).join("");
}

/* ========== JSON导出 ========== */
function exportJSON() {
  const blob = new Blob([JSON.stringify(records, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "archive.json";
  a.click();
}

/* ========== JSON导入 ========== */
function importJSON(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    records = JSON.parse(reader.result);
    save();
    render();
  };

  reader.readAsText(file);
}
