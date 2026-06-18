var archive = [];
var editingId = null;
var currentImageData = null;
var currentReadItem = null;

var modal, btnNew, btnCancel, btnDelete, form, grid, searchInput, timelineView;
var btnExport, btnImport, importFile, imageInput, imagePreview;

// ============ 图片压缩 ============
function compressImage(file, maxSize, quality) {
    return new Promise(function(resolve, reject) {
        if (!maxSize) maxSize = 800;
        if (!quality) quality = 0.75;

        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var w = img.width;
                var h = img.height;
                var ratio = Math.min(maxSize / w, maxSize / h, 1);
                var newW = Math.round(w * ratio);
                var newH = Math.round(h * ratio);

                var canvas = document.createElement('canvas');
                canvas.width = newW;
                canvas.height = newH;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newW, newH);

                var result = canvas.toDataURL('image/jpeg', quality);
                resolve(result);
            };
            img.onerror = function() { reject(new Error('Failed to load image')); };
            img.src = e.target.result;
        };
        reader.onerror = function() { reject(new Error('Failed to read file')); };
        reader.readAsDataURL(file);
    });
}

// ============ 自定义弹窗 ============
function showAlert(message, onClose) {
    var modal = document.getElementById('customAlertModal');
    var msg = document.getElementById('customAlertMessage');
    var btn = document.getElementById('customAlertOk');
    msg.textContent = message;
    modal.classList.remove('hidden');
    btn.onclick = function() {
        modal.classList.add('hidden');
        if (onClose) onClose();
    };
}

function showConfirm(message, onYes, onNo) {
    var modal = document.getElementById('customConfirmModal');
    var msg = document.getElementById('customConfirmMessage');
    var btnYes = document.getElementById('customConfirmYes');
    var btnNo = document.getElementById('customConfirmNo');
    msg.textContent = message;
    modal.classList.remove('hidden');
    btnYes.onclick = function() {
        modal.classList.add('hidden');
        if (onYes) onYes();
    };
    btnNo.onclick = function() {
        modal.classList.add('hidden');
        if (onNo) onNo();
    };
}

function loadData() {
    try {
        var data = localStorage.getItem('ace_yuu_archive');
        if (data) {
            var parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                archive = parsed;
                return;
            }
        }
    } catch (e) {
        console.warn('Load failed:', e);
    }
    archive = [];
}

function saveData() {
    try {
        localStorage.setItem('ace_yuu_archive', JSON.stringify(archive));
        updateStorageIndicator();
    } catch (e) {
        console.warn('Save failed:', e);
        showAlert('Failed to save: ' + e.message);
    }
}

function updateStorageIndicator() {
    var el = document.getElementById('storageIndicator');
    if (!el) return;
    try {
        var data = localStorage.getItem('ace_yuu_archive') || '';
        var bytes = new Blob([data]).size;
        var mb = (bytes / (1024 * 1024)).toFixed(2);
        el.textContent = 'Storage: ' + mb + ' MB';
        el.classList.remove('hidden');
    } catch (e) {
        // ignore
    }
}

function initDOM() {
    modal = document.getElementById('modal');
    btnNew = document.getElementById('btnNew');
    btnCancel = document.getElementById('btnCancel');
    btnDelete = document.getElementById('btnDelete');
    form = document.getElementById('archiveForm');
    grid = document.getElementById('archiveGrid');
    searchInput = document.getElementById('searchInput');
    timelineView = document.getElementById('timelineView');
    btnExport = document.getElementById('btnExport');
    btnImport = document.getElementById('btnImport');
    importFile = document.getElementById('importFile');
    imageInput = document.getElementById('imageInput');
    imagePreview = document.getElementById('imagePreview');

    btnNew.addEventListener('click', function() {
        editingId = null;
        currentImageData = null;
        form.reset();
        imagePreview.innerHTML = '';
        document.getElementById('modalTitle').textContent = 'New Record';
        btnDelete.style.display = 'none';
        modal.classList.remove('hidden');
    });

    btnCancel.addEventListener('click', function() {
        modal.classList.add('hidden');
        form.reset();
        imagePreview.innerHTML = '';
        editingId = null;
        currentImageData = null;
    });

    btnDelete.addEventListener('click', function() {
        if (editingId) {
            var item = findItem(editingId);
            var title = item && item.title ? '"' + item.title + '"' : 'this record';
            showConfirm('Delete ' + title + '?', function() {
                var idx = findIndex(editingId);
                if (idx >= 0) archive.splice(idx, 1);
                saveData();
                render();
                modal.classList.add('hidden');
                form.reset();
                imagePreview.innerHTML = '';
                editingId = null;
                currentImageData = null;
            });
        }
    });

    imageInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        // 简单检查文件类型
        if (file.type.indexOf('image/') !== 0) {
            showAlert('Please select an image file.');
            imageInput.value = '';
            return;
        }

        // 显示临时预览，先显示原始图再压缩
        imagePreview.innerHTML = '<div style="color:#D6B06A">Compressing image...</div>';

        compressImage(file, 800, 0.75).then(function(dataUrl) {
            currentImageData = dataUrl;
            imagePreview.innerHTML = '<img src="' + dataUrl + '" alt="Preview"><button type="button" class="remove-image-btn" onclick="removeImage()">Remove</button>';
        }).catch(function(err) {
            console.warn('Compress failed:', err);
            imagePreview.innerHTML = '';
            showAlert('Failed to process image');
        });
    });

    document.getElementById('btnReadEdit').addEventListener('click', function() {
        if (currentReadItem) {
            document.getElementById('readModal').classList.add('hidden');
            openEditModal(currentReadItem);
        }
    });

    document.getElementById('btnReadClose').addEventListener('click', function() {
        document.getElementById('readModal').classList.add('hidden');
        currentReadItem = null;
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        var existingItem = editingId ? findItem(editingId) : null;
        var imageData = currentImageData || (existingItem ? existingItem.image : null);

        var data = {
            id: editingId || Date.now(),
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            source: document.getElementById('source').value,
            episode: document.getElementById('episode').value,
            characters: document.getElementById('characters').value,
            relationshipStage: document.getElementById('relationshipStage').value,
            timelineSummary: document.getElementById('timelineSummary').value,
            originalText: document.getElementById('originalText').value,
            objectiveNote: document.getElementById('objectiveNote').value,
            personalAnalysis: document.getElementById('personalAnalysis').value,
            image: imageData,
            createdAt: editingId ? (existingItem || {}).createdAt : new Date().toISOString()
        };

        if (editingId) {
            var idx = findIndex(editingId);
            if (idx >= 0) archive[idx] = data;
        } else {
            archive.push(data);
        }

        saveData();
        render();
        modal.classList.add('hidden');
        form.reset();
        imagePreview.innerHTML = '';
        currentImageData = null;
        editingId = null;
    });

    searchInput.addEventListener('input', function(e) {
        var kw = e.target.value.toLowerCase();
        var filtered = archive.filter(function(item) {
            var text = [
                item.title, item.characters, item.timelineSummary,
                item.originalText, item.objectiveNote, item.personalAnalysis
            ].filter(function(x) { return x; }).join(' ').toLowerCase();
            return text.indexOf(kw) !== -1;
        });
        render(filtered);
    });

    btnExport.addEventListener('click', function() {
        var blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
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
                    showAlert('Imported ' + data.length + ' records successfully!');
                } else {
                    showAlert('Invalid data format');
                }
            } catch (err) {
                showAlert('Failed to parse JSON');
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });
}

function bindSidebar() {
    var items = document.querySelectorAll('#categoryFilter li');
    items.forEach(function(item) {
        item.addEventListener('click', function() {
            items.forEach(function(i) { i.classList.remove('active'); });
            item.classList.add('active');

            var type = item.getAttribute('data-val');

            if (type === 'Timeline') {
                grid.classList.add('hidden');
                timelineView.classList.remove('hidden');
                renderTimeline();
                return;
            }

            timelineView.classList.add('hidden');
            grid.classList.remove('hidden');

            if (type === 'Both') {
                render(archive.filter(function(a) { return a.category === 'Both'; }));
            } else {
                render(archive.filter(function(a) { return a.category === type; }));
            }
        });
    });
}

function render(list) {
    if (!list) list = archive;
    grid.innerHTML = '';

    if (list.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = 'No records';
        empty.style.color = '#888';
        empty.style.padding = '20px';
        grid.appendChild(empty);
        return;
    }

    list.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'archive-card';

        card.addEventListener('click', function() {
            openReadModal(item);
        });

        if (item.image) {
            var img = document.createElement('img');
            img.src = item.image;
            img.className = 'card-image';
            img.alt = item.title || '';
            card.appendChild(img);
        }

        var title = document.createElement('h3');
        title.textContent = item.title || '';
        card.appendChild(title);

        var stage = document.createElement('div');
        stage.className = 'card-stage';
        stage.textContent = item.relationshipStage || 'Uncategorized';
        card.appendChild(stage);

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

function openReadModal(item) {
    currentReadItem = item;
    var body = document.getElementById('readModalBody');
    body.innerHTML = '';

    if (item.image) {
        var imgDiv = document.createElement('div');
        imgDiv.className = 'read-field';
        var img = document.createElement('img');
        img.src = item.image;
        img.className = 'read-image';
        img.alt = item.title || '';
        imgDiv.appendChild(img);
        body.appendChild(imgDiv);
    }

    var title = document.createElement('div');
    title.className = 'read-field';
    title.innerHTML = '<label>Title</label><div class="read-value">' + (item.title || '') + '</div>';
    body.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'read-field';
    var metaText = (item.category || '') + (item.source ? ' · ' + item.source : '') + (item.episode ? ' · ' + item.episode : '');
    meta.innerHTML = '<label>Info</label><div class="read-value">' + metaText + '</div>';
    body.appendChild(meta);

    if (item.characters) {
        var chars = document.createElement('div');
        chars.className = 'read-field';
        chars.innerHTML = '<label>Characters</label><div class="read-value">' + item.characters + '</div>';
        body.appendChild(chars);
    }

    if (item.relationshipStage) {
        var stage = document.createElement('div');
        stage.className = 'read-field';
        stage.innerHTML = '<label>Relationship Stage</label><div class="read-value">' + item.relationshipStage + '</div>';
        body.appendChild(stage);
    }

    if (item.timelineSummary) {
        var summary = document.createElement('div');
        summary.className = 'read-field';
        summary.innerHTML = '<label>Timeline Summary</label><div class="read-value">' + item.timelineSummary + '</div>';
        body.appendChild(summary);
    }

    if (item.originalText) {
        var orig = document.createElement('div');
        orig.className = 'read-field';
        orig.innerHTML = '<label>Original Japanese Text</label><div class="read-value">' + item.originalText + '</div>';
        body.appendChild(orig);
    }

    if (item.objectiveNote) {
        var obj = document.createElement('div');
        obj.className = 'read-field';
        obj.innerHTML = '<label>Objective Notes</label><div class="read-value">' + item.objectiveNote + '</div>';
        body.appendChild(obj);
    }

    if (item.personalAnalysis) {
        var pers = document.createElement('div');
        pers.className = 'read-field';
        pers.innerHTML = '<label>Personal Analysis</label><div class="read-value">' + item.personalAnalysis + '</div>';
        body.appendChild(pers);
    }

    document.getElementById('readModal').classList.remove('hidden');
}

function openEditModal(item) {
    editingId = item.id;
    currentImageData = item.image || null;
    document.getElementById('modalTitle').textContent = 'Edit Record';
    document.getElementById('title').value = item.title || '';
    document.getElementById('category').value = item.category || 'Both';
    document.getElementById('source').value = item.source || 'Main Story';
    document.getElementById('episode').value = item.episode || '';
    document.getElementById('characters').value = item.characters || '';
    document.getElementById('relationshipStage').value = item.relationshipStage || '';
    document.getElementById('timelineSummary').value = item.timelineSummary || '';
    document.getElementById('originalText').value = item.originalText || '';
    document.getElementById('objectiveNote').value = item.objectiveNote || '';
    document.getElementById('personalAnalysis').value = item.personalAnalysis || '';

    if (item.image) {
        imagePreview.innerHTML = '<img src="' + item.image + '" alt="Preview"><button type="button" class="remove-image-btn" onclick="removeImage()">Remove</button>';
    } else {
        imagePreview.innerHTML = '';
    }

    btnDelete.style.display = 'inline-block';
    modal.classList.remove('hidden');
}

function removeImage() {
    currentImageData = null;
    imagePreview.innerHTML = '';
    imageInput.value = '';
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
        h3.style.cursor = 'pointer';
        h3.style.color = 'var(--bond)';
        h3.style.textDecoration = 'underline';
        h3.style.textUnderlineOffset = '3px';
        h3.textContent = item.episode || 'No Episode';
        h3.addEventListener('click', function() {
            openReadModal(item);
        });
        h3.addEventListener('touchend', function(e) {
            e.preventDefault();
            openReadModal(item);
        });
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

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            initDOM();
            render();
            bindSidebar();
            updateStorageIndicator();
        });
    } else {
        loadData();
        initDOM();
        render();
        bindSidebar();
        updateStorageIndicator();
    }
}
