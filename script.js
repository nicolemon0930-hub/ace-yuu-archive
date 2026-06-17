let archive = [];

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
let modal, btnNew, btnCancel, form, grid, searchInput, timelineView;

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

    /* 新建 */
    btnNew.onclick = () => {
        modal.classList.remove("hidden");
    };

    /* 关闭 */
    btnCancel.onclick = () => {
        modal.classList.add("hidden");
        form.reset();
    };

    /* 保存 */
    form.onsubmit = (e) => {
        e.preventDefault();

        const data = {
            id: Date.now(),
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
            createdAt: new Date().toISOString()
        };

        archive.push(data);
        saveData();
        render();

        modal.classList.add("hidden");
        form.reset();
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

        card.innerHTML = `
            <h3>${item.title}</h3>

            <div class="card-stage">
                ${item.relationshipStage || "未分类"}
            </div>

            <div class="card-summary">
                ${item.timelineSummary || ""}
            </div>

            <div class="card-meta">
                ${item.source} · ${item.episode}
            </div>
        `;

        grid.appendChild(card);
    });
}

/* =====================
   TIMELINE
===================== */

function renderTimeline() {

    timelineView.innerHTML = "";

    const sorted = [...archive].sort((a, b) =>
        (a.episode || "").localeCompare(b.episode || "")
    );

    sorted.forEach(item => {

        const div = document.createElement("div");
        div.className = "timeline-item";

        div.innerHTML = `
            <h3>${item.episode || "No Episode"}</h3>
            <div><strong>${item.relationshipStage || ""}</strong></div>
            <p>${item.timelineSummary || ""}</p>
        `;

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
    const data = localStorage.getItem("ace_yuu_archive");
    if (data) {
        archive = JSON.parse(data);
    }
}
