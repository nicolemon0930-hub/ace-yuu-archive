let archive = [];

/* =====================
   DOM
===================== */

let modal, form;
let grid, searchInput, detailPanel, detailBody;

/* =====================
   INIT
===================== */

window.onload = () => {
    cacheDOM();
    load();
    render();
    bindUI();
};

/* =====================
   CACHE
===================== */

function cacheDOM() {

    modal = document.getElementById("modal");
    form = document.getElementById("archiveForm");

    grid = document.getElementById("archiveGrid");
    searchInput = document.getElementById("searchInput");

    detailPanel = document.getElementById("detailPanel");
    detailBody = document.getElementById("detailBody");
}

/* =====================
   CREATE
===================== */

function bindUI() {

    /* New Record */
    document.getElementById("btnNew").onclick = () => {
        modal.classList.remove("hidden");
    };

    document.getElementById("btnCancel").onclick = () => {
        modal.classList.add("hidden");
        form.reset();
    };

    form.onsubmit = (e) => {
        e.preventDefault();

        const data = {
            id: Date.now(),
            title: get("title"),
            category: get("category"),
            source: get("source"),
            episode: get("episode"),
            characters: get("characters"),
            stage: get("stage"),
            summary: get("summary"),
            original: get("original"),
            note: get("note"),
            analysis: get("analysis"),
            image: get("image"),
            createdAt: new Date().toISOString()
        };

        archive.push(data);
        save();
        render();

        modal.classList.add("hidden");
        form.reset();
    };

    /* Search */
    searchInput.addEventListener("input", (e) => {

        const k = e.target.value.toLowerCase();

        const filtered = archive.filter(a =>
            (a.title || "").toLowerCase().includes(k) ||
            (a.characters || "").toLowerCase().includes(k) ||
            (a.summary || "").toLowerCase().includes(k)
        );

        render(filtered);
    });

    document.addEventListener("click", (e) => {

    const del = e.target.closest(".delete");
    if (del) {
        deleteItem(Number(del.dataset.id));
        return;
    }

    const card = e.target.closest(".card");
    const btn = e.target.closest("button");

    if (btn) return;

    if (card) {
        openDetail(Number(card.dataset.id));
    }
});

/* =====================
   HELPERS
===================== */

function get(id) {
    return document.getElementById(id)?.value || "";
}

/* =====================
   RENDER
===================== */

function render(list = archive) {

    grid.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "card";
        el.dataset.id = item.id;

        el.innerHTML = `
            ${item.image ? `<img src="${item.image}" class="img">` : ""}

            <h3>${item.title}</h3>

            <div class="meta">${item.stage || ""}</div>

            <div class="summary">${item.summary || ""}</div>

            <div class="footer">
                <span>${item.source || ""} ${item.episode || ""}</span>

                <button class="delete" data-id="${item.id}">
                    Delete
                </button>
            </div>
        `;

        grid.appendChild(el);
    });
}

/* =====================
   DETAIL
===================== */

function openDetail(id) {

    const item = archive.find(a => a.id === id);
    if (!item) return;

    detailBody.innerHTML = `
        <h2>${item.title}</h2>

        ${item.image ? `<img src="${item.image}" class="detail-img">` : ""}

        <p><b>Source:</b> ${item.source}</p>
        <p><b>Episode:</b> ${item.episode}</p>
        <p><b>Characters:</b> ${item.characters}</p>

        <hr>

        <h3>Summary</h3>
        <p>${item.summary}</p>

        <h3>Original</h3>
        <p style="white-space:pre-wrap">${item.original}</p>

        <h3>Analysis</h3>
        <p>${item.analysis}</p>
    `;

    detailPanel.classList.remove("hidden");
}

/* =====================
   DELETE
===================== */

function deleteItem(id) {
    archive = archive.filter(a => a.id !== id);
    save();
    render();
}

/* =====================
   STORAGE
===================== */

function save() {
    localStorage.setItem("archive_v2", JSON.stringify(archive));
}

function load() {
    const data = localStorage.getItem("archive_v2");
    if (data) archive = JSON.parse(data);
}
