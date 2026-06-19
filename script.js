var archive = [];
var editingId = null;
var activeCategory = "Both";
var activeStage = null;
var modal, btnNew, btnCancel, form, grid, searchInput, timelineView, btnExport, btnImport, importFile, stageFilter, storageDisplay;

console.log('=== Script loaded! v20260618 ===');

function initApp() {
    initDOM();
    loadData();
    render();
    renderStageCloud();
    updateStorageDisplay();
    bindSidebar();
}

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
    stageFilter = document.getElementById("stageFilter");
    storageDisplay = document.getElementById("storageDisplay");

    btnNew.addEventListener('click', function() {
        editingId = null;
        form.reset();
        document.getElementById("modalTitle").textContent = "New Record";
        modal.classList.remove("hidden");
    });

    btnCancel.addEventListener('click', function() {
        modal.classList.add("hidden");
        form.reset();
        editingId = null;
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var data = {
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
            createdAt: editingId ? (findItem(editingId) || {}).createdAt : new Date().toISOString()
        };

        if (editingId) {
            var idx = findIndex(editingId);
            if (idx >= 0) archive[idx] = data;
        } else {
            archive.push(data);
        }

        saveData();
        render();
        renderStageCloud();
        updateStorageDisplay();
        modal.classList.add("hidden");
        form.reset();
        editingId = null;
    });

    searchInput.addEventListener('input', function(e) {
        var kw = e.target.value.toLowerCase();
        var filtered = archive.filter(function(item) {
            var text = [item.title, item.characters, item.timelineSummary, item.originalText, item.objectiveNote, item.personalAnalysis].filter(function(x) { return x; }).join(" ").toLowerCase();
            return text.indexOf(kw) !== -1;
        });
        render(filtered);
    });

    btnExport.addEventListener('click', function() {
        var json = JSON.stringify(archive, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ace_yuu_archive_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });

    btnImport.addEventListener('click', function() {
        importFile.click();
    });

    importFile.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var data = JSON.parse(ev.target.result);
                if (Array.isArray(data)) {
                    archive = data;
                    saveData();
                    render();
                    renderStageCloud();
                    updateStorageDisplay();
                }
            } catch (err) {
                console.warn('Import failed', err);
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });
}

function bindSidebar() {
    var items = document.querySelectorAll("#categoryFilter li");
    items.forEach(function(item) {
        item.addEventListener('click', function() {
            items.forEach(function(i) { i.classList.remove("active"); });
            item.classList.add("active");

            var type = item.getAttribute('data-val');
            activeCategory = type;
            activeStage = null;
            renderStageCloud();

            if (type === "Timeline") {
                grid.classList.add("hidden");
                timelineView.classList.remove("hidden");
                renderTimeline();
                return;
            }

            timelineView.classList.add("hidden");
            grid.classList.remove("hidden");

            render(getFilteredList());
        });
    });
}

function getFilteredList() {
    var list = archive;

    if (activeCategory === "Both") {
        list = list.filter(function(a) { return a.category === "Both"; });
    } else if (activeCategory && activeCategory !== "Timeline") {
        list = list.filter(function(a) { return a.category === activeCategory; });
    }

    if (activeStage) {
        list = list.filter(function(a) { return a.relationshipStage === activeStage; });
    }

    return list;
}

function render(list) {
    if (typeof list === 'undefined') list = getFilteredList();
    grid.innerHTML = '';

    if (list.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = 'No records yet';
        empty.style.color = '#888';
        empty.style.padding = '20px';
        grid.appendChild(empty);
        return;
    }

    list.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'archive-card';

        card.addEventListener('click', function() {
            openEditModal(item);
        });

        var title = document.createElement('h3');
        title.textContent = item.title || '';
        card.appendChild(title);

        if (item.relationshipStage) {
            var stage = document.createElement('div');
            stage.className = 'card-stage';
            stage.textContent = item.relationshipStage;
            card.appendChild(stage);
        }

        var summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.textContent = item.timelineSummary || '';
        card.appendChild(summary);

        var meta = document.createElement('div');
        meta.className = 'card-meta';
        meta.textContent = (item.source || '') + ' · ' + (item.episode || '');
        card.appendChild(meta);

        grid.appendChild(card);
    });
}

function renderStageCloud() {
    if (!stageFilter) return;
    stageFilter.innerHTML = '';

    var stages = {};
    archive.forEach(function(item) {
        if (item.relationshipStage) {
            stages[item.relationshipStage] = (stages[item.relationshipStage] || 0) + 1;
        }
    });

    var stageNames = Object.keys(stages);

    if (stageNames.length === 0) {
        var empty = document.createElement('li');
        empty.className = 'empty-note';
        empty.textContent = 'No stages yet';
        stageFilter.appendChild(empty);
        return;
    }

    stageNames.sort().forEach(function(stage) {
        var li = document.createElement('li');
        li.textContent = stage + ' (' + stages[stage] + ')';
        li.setAttribute('data-stage', stage);
        if (activeStage === stage) {
            li.classList.add('active');
        }
        li.addEventListener('click', function() {
            if (activeStage === stage) {
                activeStage = null;
            } else {
                activeStage = stage;
            }
            renderStageCloud();
            render(getFilteredList());
        });
        stageFilter.appendChild(li);
    });
}

function updateStorageDisplay() {
    if (!storageDisplay) return;
    try {
        var data = localStorage.getItem('ace_yuu_archive') || '';
        var bytes = new Blob([data]).size;
        var mb = (bytes / (1024 * 1024)).toFixed(2);
        storageDisplay.textContent = 'Storage: ' + mb + ' MB';
    } catch (e) {
        storageDisplay.textContent = 'Storage: 0.00 MB';
    }
}

function openEditModal(item) {
    editingId = item.id;
    document.getElementById("modalTitle").textContent = "Edit Record";
    document.getElementById("title").value = item.title || '';
    document.getElementById("category").value = item.category || 'Both';
    document.getElementById("source").value = item.source || 'Main Story';
    document.getElementById("episode").value = item.episode || '';
    document.getElementById("characters").value = item.characters || '';
    document.getElementById("relationshipStage").value = item.relationshipStage || '';
    document.getElementById("timelineSummary").value = item.timelineSummary || '';
    document.getElementById("originalText").value = item.originalText || '';
    document.getElementById("objectiveNote").value = item.objectiveNote || '';
    document.getElementById("personalAnalysis").value = item.personalAnalysis || '';
    modal.classList.remove("hidden");
}

function renderTimeline() {
    timelineView.innerHTML = '';

    var sorted = archive.slice().sort(function(a, b) {
        var ea = (a.episode || '').match(/(\d+)-(\d+)/);
        var eb = (b.episode || '').match(/(\d+)-(\d+)/);
        if (!ea || !eb) return (a.episode || '').localeCompare(b.episode || '');
        var diff = parseInt(ea[1]) - parseInt(eb[1]);
        if (diff !== 0) return diff;
        return parseInt(ea[2]) - parseInt(eb[2]);
    });

    sorted.forEach(function(item) {
        var div = document.createElement('div');
        div.className = 'timeline-item';

        var h3 = document.createElement('h3');
        h3.textContent = item.episode || 'No Episode';
        div.appendChild(h3);

        if (item.relationshipStage) {
            var stage = document.createElement('div');
            var strong = document.createElement('strong');
            strong.textContent = item.relationshipStage;
            stage.appendChild(strong);
            div.appendChild(stage);
        }

        var p = document.createElement('p');
        p.textContent = item.timelineSummary || '';
        div.appendChild(p);

        timelineView.appendChild(div);
    });
}

function findItem(id) {
    for (var i = 0; i < archive.length; i++) {
        if (archive[i].id === id) return archive[i];
    }
    return null;
}

function findIndex(id) {
    for (var i = 0; i < archive.length; i++) {
        if (archive[i].id === id) return i;
    }
    return -1;
}

function saveData() {
    try {
        localStorage.setItem('ace_yuu_archive', JSON.stringify(archive));
    } catch (e) {
        console.warn('Save failed', e);
    }
}

function loadData() {
    try {
        var data = localStorage.getItem('ace_yuu_archive');
        if (data) {
            var parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                archive = parsed;
            }
        }
    } catch (e) {
        console.warn('Load failed', e);
        archive = [];
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
