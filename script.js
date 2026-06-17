document.addEventListener("DOMContentLoaded", () => {
    let archive = JSON.parse(localStorage.getItem("archive_data")) || [];
    const modal = document.getElementById("modal"), form = document.getElementById("archiveForm"), grid = document.getElementById("archiveGrid"), detailPanel = document.getElementById("detailPanel");

    function render(list = archive) {
        grid.innerHTML = list.map(item => `
            <div class="card" data-id="${item.id}">
                <h3>${item.title}</h3>
                <p>${item.summary || 'No summary'}</p>
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
        `).join('');
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        const newItem = {
            id: Date.now(),
            title: document.getElementById("title").value,
            summary: document.getElementById("summary").value,
            original: document.getElementById("original").value,
            analysis: document.getElementById("analysis").value
        };
        archive.push(newItem);
        localStorage.setItem("archive_data", JSON.stringify(archive));
        render();
        modal.classList.add("hidden");
        form.reset();
    };

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            archive = archive.filter(a => a.id != e.target.dataset.id);
            localStorage.setItem("archive_data", JSON.stringify(archive));
            render();
        } else if (e.target.closest(".card") && !e.target.classList.contains("delete-btn")) {
            const id = e.target.closest(".card").dataset.id;
            const item = archive.find(a => a.id == id);
            document.getElementById("detailBody").innerHTML = `<h2>${item.title}</h2><p>${item.analysis}</p>`;
            detailPanel.classList.remove("hidden");
        }
    });

    document.getElementById("btnNew").onclick = () => modal.classList.remove("hidden");
    document.getElementById("btnCancel").onclick = () => modal.classList.add("hidden");
    document.getElementById("closeDetail").onclick = () => detailPanel.classList.add("hidden");

    render();
});
