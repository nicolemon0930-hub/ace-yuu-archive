let archive = [];
let editingId = null;

/* =====================
   DOM INIT
===================== */

window.onload = () => {
    initDOM();
    loadData();
    render();
    bindSidebar();
};

/* DOM refs（只初始化一次） */
let modal, btnNew, btnCancel, form, grid, searchInput, timelineView, btnExport, btnImport, importFile;

/* =====================
   INIT DOM
===================== */

function initDOM() {

    modal = document.getElementById("modal");
    btnNew = document.getElementById("btnNew");
    btnCancel = document.getElementById("btnCancel");
    form = document.getElementById("archiveForm");
    grid = document.getElementById("archiveGrid");
    searchInput = document.getElementById("searchInput");
    timelineView = document.getElementById("timelineView");
    btnExport = document.getElementById("btnExport");
    btnImport = document.getElementById("btnImport");
    importFile = document.getElementById("importFile");

    /* 导出 */
    btnExport.onclick = () => {
        console.log("Export clicked");
        const json = JSON.stringify(archive, null, 2);
        console.log("JSON length:", json.length);

        // 尝试直接打开新窗口下载
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ace_yuu_archive_${new Date().toISOString().slice(0,10)}.json`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    /* 导入 */
    btnImport.onclick = () => {
        console.log("Import clicked");
        importFile.click();
    };

    importFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (Array.isArray(data)) {
                    archive = data;
                    saveData();
                    render();
                    alert("Import successful!");
                } else {
                    alert("Invalid data format.");
                }
            } catch (err) {
                alert("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    };

    /* 新建 */
    btnNew.onclick = () => {
        editingId = null;
        form.reset();
        document.getElementById("modalTitle").textContent = "New Record";
        modal.classList.remove("hidden");
    };

    /* 关闭 */
    btnCancel.onclick = () => {
        modal.classList.add("hidden");
        form.reset();
        editingId = null;
    };

    /* 保存 */
    form.onsubmit = (e) => {
        e.preventDefault();

        const data = {
            id: editingId || Date.now(),
            title: document.getElementById("title").value,
            category: document.getElementById("category").value,
            source: document.getElementById("source").value,
            episode: document.getElementById("episode").value,
            characters: document.getElementById("characters").value,
            relationshipStage: document.getElementById("relationshipStage").value,
            timelineSummary: document.getElementById("timelineSummary").value,
            originalText: document.getElementById("originalText").value,
            objectiveNote: document.getElementById("objectiveNote").value,
            personalAnalysis: document.getElementById("personalAnalysis").value,
            createdAt: editingId ? archive.find(a => a.id === editingId)?.createdAt : new Date().toISOString()
        };

        if (editingId) {
            const index = archive.findIndex(a => a.id === editingId);
            if (index !== -1) {
                archive[index] = data;
            }
        } else {
            archive.push(data);
        }

        saveData();
        render();

        modal.classList.add("hidden");
        form.reset();
        editingId = null;
    };

    /* 搜索 */
    searchInput.addEventListener("input", (e) => {

        const keyword = e.target.value.toLowerCase();

        const filtered = archive.filter(item => (
            item.title?.toLowerCase().includes(keyword) ||
            item.characters?.toLowerCase().includes(keyword) ||
            item.timelineSummary?.toLowerCase().includes(keyword) ||
            item.originalText?.toLowerCase().includes(keyword) ||
            item.objectiveNote?.toLowerCase().includes(keyword) ||
            item.personalAnalysis?.toLowerCase().includes(keyword)
        ));

        render(filtered);
    });
}

/* =====================
   SIDEBAR
===================== */

function bindSidebar() {

    const categoryItems = document.querySelectorAll("#categoryFilter li");

    categoryItems.forEach(item => {

        item.addEventListener("click", () => {

            categoryItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const type = item.dataset.val;

            if (type === "Timeline") {
                grid.classList.add("hidden");
                timelineView.classList.remove("hidden");
                renderTimeline();
                return;
            }

            timelineView.classList.add("hidden");
            grid.classList.remove("hidden");

            if (type === "Both") {
                render(archive);
            } else {
                render(archive.filter(a => a.category === type));
            }
        });
    });
}

/* =====================
   RENDER LIST
===================== */

function render(list = archive) {

    grid.innerHTML = "";

    list.forEach(item => {

        const card = document.createElement("div");
        card.className = "archive-card";

        card.addEventListener("click", () => {
            alert("Card clicked!");
            openEditModal(item);
        });
        card.addEventListener("touchstart", () => {});
        card.addEventListener("touchend", function(e) {
            e.preventDefault();
            openEditModal(item);
        }, false);

        const title = document.createElement("h3");
        title.textContent = item.title || "";
        card.appendChild(title);

        const stage = document.createElement("div");
        stage.className = "card-stage";
        stage.textContent = item.relationshipStage || "未分类";
        card.appendChild(stage);

        const summary = document.createElement("div");
        summary.className = "card-summary";
        summary.textContent = item.timelineSummary || "";
        card.appendChild(summary);

        const meta = document.createElement("div");
        meta.className = "card-meta";
        meta.textContent = `${item.source || ""} · ${item.episode || ""}`;
        card.appendChild(meta);

        grid.appendChild(card);
    });
}

function openEditModal(item) {
    alert("openEditModal called!");
    console.log("openEditModal called", item);
    console.log("modal element:", modal);
    editingId = item.id;
    document.getElementById("modalTitle").textContent = "Edit Record";
    document.getElementById("title").value = item.title || "";
    document.getElementById("category").value = item.category || "Both";
    document.getElementById("source").value = item.source || "Main Story";
    document.getElementById("episode").value = item.episode || "";
    document.getElementById("characters").value = item.characters || "";
    document.getElementById("relationshipStage").value = item.relationshipStage || "";
    document.getElementById("timelineSummary").value = item.timelineSummary || "";
    document.getElementById("originalText").value = item.originalText || "";
    document.getElementById("objectiveNote").value = item.objectiveNote || "";
    document.getElementById("personalAnalysis").value = item.personalAnalysis || "";
    modal.classList.remove("hidden");
    alert("Modal should be visible now! Classes: " + modal.className);
}

/* =====================
   TIMELINE
===================== */

function renderTimeline() {

    timelineView.innerHTML = "";

    const sorted = [...archive].sort((a, b) => {
        const parseEpisode = (ep) => {
            if (!ep) return [0, 0, 0];
            const match = ep.match(/(\d+)-(\d+)/);
            if (match) return [parseInt(match[1]), parseInt(match[2])];
            return [0, 0];
        };
        const [a1, a2] = parseEpisode(a.episode);
        const [b1, b2] = parseEpisode(b.episode);
        if (a1 !== b1) return a1 - b1;
        return a2 - b2;
    });

    sorted.forEach(item => {

        const div = document.createElement("div");
        div.className = "timeline-item";

        const h3 = document.createElement("h3");
        h3.textContent = item.episode || "No Episode";
        div.appendChild(h3);

        const stage = document.createElement("div");
        stage.innerHTML = `<strong>${item.relationshipStage || ""}</strong>`;
        div.appendChild(stage);

        const p = document.createElement("p");
        p.textContent = item.timelineSummary || "";
        div.appendChild(p);

        timelineView.appendChild(div);
    });
}

/* =====================
   STORAGE
===================== */

function saveData() {
    localStorage.setItem("ace_yuu_archive", JSON.stringify(archive));
}

function loadData() {
    try {
        const data = localStorage.getItem("ace_yuu_archive");
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                archive = parsed;
            }
        }
    } catch (e) {
        console.warn("Failed to load archive data:", e);
        archive = [];
    }
}
