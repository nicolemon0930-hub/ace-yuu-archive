let archive = [];

const modal = document.getElementById("modal");
const btnNew = document.getElementById("btnNew");
const btnCancel = document.getElementById("btnCancel");
const form = document.getElementById("archiveForm");
const grid = document.getElementById("archiveGrid");
const searchInput = document.getElementById("searchInput");

const categoryItems = document.querySelectorAll("#categoryFilter li");
const timelineView = document.getElementById("timelineView");
window.onload = () => {
    loadData();
    render();
    bindSidebar();   // ⭐必须在这里绑定
};
function bindSidebar() {

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
