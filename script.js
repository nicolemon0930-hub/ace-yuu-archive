let archive = [];

/* =====================
   DOM INIT
===================== */

let modal, btnNew, btnCancel, form;
let grid, searchInput, timelineView;
let detailPanel, detailBody, closeDetail;

window.onload = () => {
    initDOM();
    loadData();
    render();
    bindSidebar();
};

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

    detailPanel = document.getElementById("detailPanel");
    detailBody = document.getElementById("detailBody");
    closeDetail = document.getElementById("closeDetail");

    /* 新建 */
    btnNew.onclick = () => {
        modal.classList.remove("hidden");
    };

    /* 关闭 modal */
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
            image: document.getElementById("image")?.value || "",
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

    /* 关闭详情页 */
    if (closeDetail) {
        closeDetail.onclick = () => {
            detailPanel.classList.add("hidden");
        };
    }
}

/* =====================
   SIDEBAR
===================== */

function bindSidebar() {

    const items = document.querySelectorAll("#categoryFilter li");

    items.forEach(item => {

        item.addEventListener("click", () => {

            items.forEach(i => i.classList.remove("active"));
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
   RENDER CARDS
===================== */

function render(list = archive) {

    grid.innerHTML = "";

    list.forEach(item => {

        const card = document.createElement("div");
        card.className = "archive-card";

        card.innerHTML = `
            ${item.image ? `<img src="${item.image}" class="archive-img">` : ""}

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

        /* ⭐点击打开详情 */
        card.addEventListener("click", () => {
            openDetail(item);
        });

        grid.appendChild(card);
    });
}

/* =====================
   DETAIL PANEL
===================== */

function openDetail(item) {

    detailBody.innerHTML = `
        <h2 style="color:#D6B06A">${item.title}</h2>

        ${item.image ? `<img src="${item.image}" style="width:100%;border-radius:8px;margin:10px 0;">` : ""}

        <p><strong>Source:</strong> ${item.source}</p>
        <p><strong>Episode:</strong> ${item.episode}</p>
        <p><strong>Characters:</strong> ${item.characters}</p>
        <p><strong>Stage:</strong> ${item.relationshipStage}</p>

        <hr style="margin:15px 0;border-color:#343946;">

        <h3>Timeline Summary</h3>
        <p>${item.timelineSummary || ""}</p>

        <h3>Original</h3>
        <p style="white-space:pre-wrap">${item.originalText || ""}</p>

        <h3>Objective</h3>
        <p>${item.objectiveNote || ""}</p>

        <h3>Analysis</h3>
        <p>${item.personalAnalysis || ""}</p>
    `;

    detailPanel.classList.remove("hidden");
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
