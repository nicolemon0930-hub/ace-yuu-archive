let archive = [];

const modal = document.getElementById("modal");
const btnNew = document.getElementById("btnNew");
const btnCancel = document.getElementById("btnCancel");
const form = document.getElementById("archiveForm");
const grid = document.getElementById("archiveGrid");
const searchInput = document.getElementById("searchInput");

// 初始化
window.onload = () => {
    loadData();
    render();
};

// 打开弹窗
btnNew.onclick = () => {
    modal.classList.remove("hidden");
};

// 关闭弹窗
btnCancel.onclick = () => {
    modal.classList.add("hidden");
    form.reset();
};

// 保存
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

// 保存到本地
function saveData() {
    localStorage.setItem("ace_yuu_archive", JSON.stringify(archive));
}

// 读取
function loadData() {
    const data = localStorage.getItem("ace_yuu_archive");
    if (data) {
        archive = JSON.parse(data);
    }
}

// 渲染
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

// 搜索
searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    const filtered = archive.filter(item => {
        return (
            item.title?.toLowerCase().includes(keyword) ||
            item.characters?.toLowerCase().includes(keyword) ||
            item.timelineSummary?.toLowerCase().includes(keyword) ||
            item.originalText?.toLowerCase().includes(keyword) ||
            item.objectiveNote?.toLowerCase().includes(keyword) ||
            item.personalAnalysis?.toLowerCase().includes(keyword)
        );
    });

    render(filtered);
});