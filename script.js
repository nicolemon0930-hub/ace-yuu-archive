let archive = [];

let grid, modal, form, detailPanel, detailBody;

window.onload = () => {
    grid = document.getElementById("archiveGrid");
    modal = document.getElementById("modal");
    form = document.getElementById("archiveForm");
    detailPanel = document.getElementById("detailPanel");
    detailBody = document.getElementById("detailBody");

    load();
    render();
    bind();
};

function bind() {

    document.getElementById("btnNew").onclick = () => {
        modal.classList.remove("hidden");
    };

    document.getElementById("btnCancel").onclick = () => {
        modal.classList.add("hidden");
    };

    form.onsubmit = (e) => {
        e.preventDefault();

        archive.push({
            id: Date.now(),
            title: title.value,
            image: image.value,
            category: category.value,
            episode: episode.value,
            characters: characters.value,
            summary: timelineSummary.value,
            original: originalText.value,
            analysis: personalAnalysis.value
        });

        save();
        render();
        modal.classList.add("hidden");
        form.reset();
    };

    document.addEventListener("click", (e) => {

        const card = e.target.closest(".card");
        if (card) {
            openDetail(card.dataset.id);
        }

        if (e.target.id === "closeDetail") {
            detailPanel.classList.add("hidden");
        }
    });
}

function render() {

    grid.innerHTML = "";

    archive.forEach(item => {

        const div = document.createElement("div");
        div.className = "card";
        div.dataset.id = item.id;

        div.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.category}</p>
        `;

        grid.appendChild(div);
    });
}

function openDetail(id) {

    const item = archive.find(a => a.id == id);
    if (!item) return;

    detailBody.innerHTML = `
        <h2>${item.title}</h2>
        <p>${item.summary}</p>
        <p>${item.original}</p>
        <p>${item.analysis}</p>
    `;

    detailPanel.classList.remove("hidden");
}

function save() {
    localStorage.setItem("archive_20", JSON.stringify(archive));
}

function load() {
    const data = localStorage.getItem("archive_20");
    if (data) archive = JSON.parse(data);
}
