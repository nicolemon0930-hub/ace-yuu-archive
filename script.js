var archive = [];
var editingId = null;
var currentImageData = null;
var currentReadItem = null;
var currentTagFilter = null;

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
    var alertModal = document.getElementById('customAlertModal');
    var msg = document.getElementById('customAlertMessage');
    var btn = document.getElementById('customAlertOk');
    msg.textContent = message;
    alertModal.classList.remove('hidden');
    btn.onclick = function() {
        alertModal.classList.add('hidden');
        if (onClose) onClose();
    };
}

function showConfirm(message, onYes, onNo) {
    var confirmModal = document.getElementById('customConfirmModal');
    var msg = document.getElementById('customConfirmMessage');
    var btnYes = document.getElementById('customConfirmYes');
    var btnNo = document.getElementById('customConfirmNo');
    msg.textContent = message;
    confirmModal.classList.remove('hidden');
    btnYes.onclick = function() {
        confirmModal.classList.add('hidden');
        if (onYes) onYes();
    };
    btnNo.onclick = function() {
        confirmModal.classList.add('hidden');
        if (onNo) onNo();
    };
}

function closeEditModal() {
    document.getElementById('modal').classList.add('hidden');
    form.reset();
    imagePreview.innerHTML = '';
    editingId = null;
    currentImageData = null;
}

function closeReadModal() {
    document.getElementById('readModal').classList.add('hidden');
    currentReadItem = null;
}

// 点击遮罩层 & ESC 关闭弹窗
document.addEventListener('click', function(e) {
    var target = e.target;
    if (target.id === 'modal') closeEditModal();
    if (target.id === 'readModal') closeReadModal();
    if (target.id === 'customAlertModal') {
        target.classList.add('hidden');
    }
    if (target.id === 'customConfirmModal') {
        target.classList.add('hidden');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var editModal = document.getElementById('modal');
    var readModal = document.getElementById('readModal');
    var alertModal = document.getElementById('customAlertModal');
    var confirmModal = document.getElementById('customConfirmModal');
    if (alertModal && !alertModal.classList.contains('hidden')) {
        alertModal.classList.add('hidden');
        return;
    }
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
        confirmModal.classList.add('hidden');
        return;
    }
    if (readModal && !readModal.classList.contains('hidden')) {
        closeReadModal();
        return;
    }
    if (editModal && !editModal.classList.contains('hidden')) {
        closeEditModal();
    }
});

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

    btnCancel.addEventListener('click', closeEditModal);

    btnDelete.addEventListener('click', function() {
        if (editingId) {
            var item = findItem(editingId);
            var title = item && item.title ? '"' + item.title + '"' : 'this record';
            showConfirm('Delete ' + title + '?', function() {
                var idx = findIndex(editingId);
                if (idx >= 0) archive.splice(idx, 1);
                saveData();
                render();
                renderTagCloud();
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
            closeReadModal();
            openEditModal(currentReadItem);
        }
    });

    document.getElementById('btnReadClose').addEventListener('click', closeReadModal);

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
        renderTagCloud();
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
                    renderTagCloud();
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

            var filtered = archive;
            if (type === 'Both') {
                filtered = archive.filter(function(a) { return a.category === 'Both'; });
            } else {
                filtered = archive.filter(function(a) { return a.category === type; });
            }

            if (currentTagFilter) {
                filtered = filtered.filter(function(a) {
                    return a.characters && a.characters.indexOf(currentTagFilter) !== -1;
                });
            }

            render(filtered);
        });
    });
}

function getTags() {
    var tagSet = {};
    archive.forEach(function(item) {
        if (!item.characters) return;
        // 支持中英文逗号分隔
        var parts = item.characters.split(/[,，]/).map(function(s) { return s.trim(); }).filter(Boolean);
        parts.forEach(function(tag) {
            var key = tag.toLowerCase();
            if (!tagSet[key]) tagSet[key] = { name: tag, count: 0 };
            tagSet[key].count++;
        });
    });
    var tagList = [];
    for (var k in tagSet) {
        tagList.push(tagSet[k]);
    }
    tagList.sort(function(a, b) { return b.count - a.count; });
    return tagList;
}

function renderTagCloud() {
    var container = document.getElementById('tagCloud');
    if (!container) return;
    container.innerHTML = '';
    var tags = getTags();

    if (tags.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'tag-empty';
        empty.textContent = 'No characters yet';
        container.appendChild(empty);
        return;
    }

    // "All" 清除标签过滤按钮
    var allTag = document.createElement('span');
    allTag.className = 'tag-tag' + (currentTagFilter === null ? ' active' : '');
    allTag.textContent = 'All';
    allTag.addEventListener('click', function() {
        currentTagFilter = null;
        renderTagCloud();
        // 重新执行当前分类
        var active = document.querySelector('#categoryFilter li.active');
        if (active) active.click();
        else render();
    });
    container.appendChild(allTag);

    tags.forEach(function(t) {
        var el = document.createElement('span');
        el.className = 'tag-tag' + (currentTagFilter && currentTagFilter.toLowerCase() === t.name.toLowerCase() ? ' active' : '');
        el.textContent = t.name + ' · ' + t.count;
        el.addEventListener('click', function() {
            if (currentTagFilter && currentTagFilter.toLowerCase() === t.name.toLowerCase()) {
                currentTagFilter = null;
            } else {
                currentTagFilter = t.name;
            }
            renderTagCloud();
            // 重新应用当前分类过滤
            var active = document.querySelector('#categoryFilter li.active');
            if (active) active.click();
            else render();
        });
        container.appendChild(el);
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

function addReadField(labelText, valueText) {
    var div = document.createElement('div');
    div.className = 'read-field';
    var label = document.createElement('label');
    label.textContent = labelText;
    div.appendChild(label);
    var value = document.createElement('div');
    value.className = 'read-value';
    value.textContent = valueText;
    div.appendChild(value);
    return div;
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

    body.appendChild(addReadField('Title', item.title || ''));

    var metaText = (item.category || '') + (item.source ? ' · ' + item.source : '') + (item.episode ? ' · ' + item.episode : '');
    body.appendChild(addReadField('Info', metaText));

    if (item.characters) body.appendChild(addReadField('Characters', item.characters));
    if (item.relationshipStage) body.appendChild(addReadField('Relationship Stage', item.relationshipStage));
    if (item.timelineSummary) body.appendChild(addReadField('Timeline Summary', item.timelineSummary));
    if (item.originalText) body.appendChild(addReadField('Original Japanese Text', item.originalText));
    if (item.objectiveNote) body.appendChild(addReadField('Objective Notes', item.objectiveNote));
    if (item.personalAnalysis) body.appendChild(addReadField('Personal Analysis', item.personalAnalysis));

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
            renderTagCloud();
            updateStorageIndicator();
        });
    } else {
        loadData();
        initDOM();
        render();
        bindSidebar();
        renderTagCloud();
        updateStorageIndicator();
    }
}
