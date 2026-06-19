var archive = [];
var editingId = null;
var activeCategory = "Both";
var activeStage = null;
var imageBuffer = null;
var currentDetailItem = null;
var modal, btnNew, btnCancel, form, grid, searchInput, timelineView, btnExport, btnImport, importFile, stageFilter, storageDisplay;
var detailModal, btnDetailEdit, btnDetailDelete, btnDetailClose, detailContent;
var imageInput, imagePreview, btnRemoveImage;

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

    detailModal = document.getElementById("detailModal");
    btnDetailEdit = document.getElementById("btnDetailEdit");
    btnDetailDelete = document.getElementById("btnDetailDelete");
    btnDetailClose = document.getElementById("btnDetailClose");
    detailContent = document.getElementById("detailContent");

    imageInput = document.getElementById("imageInput");
    imagePreview = document.getElementById("imagePreview");
    btnRemoveImage = document.getElementById("btnRemoveImage");

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                imageBuffer = ev.target.result;
                if (imagePreview) imagePreview.src = imageBuffer;
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnRemoveImage) {
        btnRemoveImage.addEventListener('click', function() {
            imageBuffer = null;
            if (imagePreview) imagePreview.src = '';
            if (imageInput) imageInput.value = '';
        });
    }

    btnNew.addEventListener('click', function() {
        editingId = null;
        imageBuffer = null;
        form.reset();
        if (imagePreview) imagePreview.src = '';
        document.getElementById("modalTitle").textContent = "New Record";
        modal.classList.remove("hidden");
    });

    btnCancel.addEventListener('click', function() {
        modal.classList.add("hidden");
        form.reset();
        editingId = null;
        imageBuffer = null;
        if (imagePreview) imagePreview.src = '';
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var existingImage = editingId ? (findItem(editingId) || {}).image : null;
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
            image: imageBuffer !== null ? imageBuffer : existingImage,
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
        imageBuffer = null;
        if (imagePreview) imagePreview.src = '';
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

    if (btnDetailEdit) {
        btnDetailEdit.addEventListener('click', function() {
            if (!currentDetailItem) return;
            detailModal.classList.add("hidden");
            openEditModal(currentDetailItem);
        });
    }

    if (btnDetailDelete) {
        btnDetailDelete.addEventListener('click', function() {
            if (!currentDetailItem) return;
            if (confirm('Delete this record?')) {
                var idx = findIndex(currentDetailItem.id);
                if (idx >= 0) {
                    archive.splice(idx, 1);
                    saveData();
                    render();
                    renderStageCloud();
                    updateStorageDisplay();
                }
                detailModal.classList.add("hidden");
                currentDetailItem = null;
            }
        });
    }

    if (btnDetailClose) {
        btnDetailClose.addEventListener('click', function() {
            detailModal.classList.add("hidden");
            currentDetailItem = null;
        });
    }
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
            openDetailModal(item);
        });

        if (item.image) {
            var img = document.createElement('img');
            img.src = item.image;
            img.alt = item.title || '';
            img.className = 'card-image';
            card.appendChild(img);
        }

        var body = document.createElement('div');
        body.className = 'card-body';

        var title = document.createElement('h3');
        title.textContent = item.title || '';
        body.appendChild(title);

        if (item.relationshipStage) {
            var stage = document.createElement('div');
            stage.className = 'card-stage';
            stage.textContent = item.relationshipStage;
            body.appendChild(stage);
        }

        var summary = document.createElement('div');
        summary.className = 'card-summary';
        summary.textContent = item.timelineSummary || '';
        body.appendChild(summary);

        var meta = document.createElement('div');
        meta.className = 'card-meta';
        var parts = [];
        if (item.source) parts.push(item.source);
        if (item.episode) parts.push(item.episode);
        meta.textContent = parts.join(' · ');
        body.appendChild(meta);

        card.appendChild(body);
        grid.appendChild(card);
    });
}

function renderStageCloud() {
    if (!stageFilter) return;
    stageFilter.innerHTML = '';

    var stages = {};
    var filtered = archive;

    if (activeCategory === "Both") {
        filtered = archive.filter(function(a) { return a.category === "Both"; });
    } else if (activeCategory && activeCategory !== "Timeline") {
        filtered = archive.filter(function(a) { return a.category === activeCategory; });
    }

    filtered.forEach(function(item) {
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
        if (activeStage === stage) li.classList.add('active');
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
        storageDisplay.textContent = mb + ' MB';
    } catch (e) {
        storageDisplay.textContent = '0.00 MB';
    }
}

function openDetailModal(item) {
    currentDetailItem = item;
    if (!detailContent) return;

    detailContent.innerHTML = '';

    if (item.image) {
        var img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title || '';
        img.className = 'detail-image';
        detailContent.appendChild(img);
    }

    var title = document.createElement('h2');
    title.className = 'detail-title';
    title.textContent = item.title || '';
    detailContent.appendChild(title);

    var infoParts = [];
    if (item.characters) infoParts.push(item.characters);
    if (item.source) infoParts.push(item.source);
    if (item.episode) infoParts.push(item.episode);
    if (infoParts.length > 0) {
        addDetailSection('INFO', infoParts.join(' · '));
    }

    if (item.relationshipStage) {
        addDetailSection('RELATIONSHIP STAGE', item.relationshipStage);
    }

    if (item.timelineSummary) {
        addDetailSection('TIMELINE SUMMARY', item.timelineSummary);
    }

    if (item.originalText) {
        addDetailSection('ORIGINAL JAPANESE TEXT', item.originalText);
    }

    if (item.objectiveNote) {
        addDetailSection('OBJECTIVE NOTES', item.objectiveNote);
    }

    if (item.personalAnalysis) {
        addDetailSection('PERSONAL ANALYSIS', item.personalAnalysis);
    }

    detailModal.classList.remove("hidden");
}

function addDetailSection(label, content) {
    if (!detailContent) return;
    var section = document.createElement('div');
    section.className = 'detail-section';

    var labelEl = document.createElement('div');
    labelEl.className = 'detail-section-label';
    labelEl.textContent = label;
    section.appendChild(labelEl);

    var contentEl = document.createElement('div');
    contentEl.className = 'detail-section-content';
    contentEl.textContent = content;
    section.appendChild(contentEl);

    detailContent.appendChild(section);
}

function openEditModal(item) {
    editingId = item.id;
    imageBuffer = item.image || null;
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
    if (imagePreview) imagePreview.src = item.image || '';
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
        div.style.cursor = 'pointer';

        div.addEventListener('click', function() {
            var items = document.querySelectorAll('#categoryFilter li');
            items.forEach(function(i) {
                i.classList.remove('active');
                if (i.getAttribute('data-val') === (item.category || 'Both')) {
                    i.classList.add('active');
                }
            });
            timelineView.classList.add('hidden');
            grid.classList.remove('hidden');
            render(getFilteredList());
            openDetailModal(item);
        });

        var h3 = document.createElement('h3');
        h3.textContent = item.episode || 'No Episode';
        div.appendChild(h3);

        if (item.title) {
            var titleEl = document.createElement('div');
            titleEl.style.color = 'var(--bond)';
            titleEl.style.fontSize = '0.95rem';
            titleEl.style.marginTop = '4px';
            titleEl.textContent = item.title;
            div.appendChild(titleEl);
        }

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
