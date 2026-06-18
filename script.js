var archive = [];
var editingId = null;
var currentImageData = null;
var currentFileSha = null;
var githubToken = null;

// 自动从 URL 解析仓库信息
var repoOwner = null;
var repoName = null;
var scriptUrl = null;

// 检测页面环境
function detectRepo() {
    if (typeof window === 'undefined') return false;
    var host = window.location.hostname;
    if (host && host.indexOf('github.io') !== -1) {
        // username.github.io/repo/ 格式
        var parts = window.location.pathname.split('/').filter(function(p) { return p; });
        var username = host.split('.')[0];
        if (parts.length > 0) {
            repoOwner = username;
            repoName = parts[0];
        }
    } else if (host && host.indexOf('nicolemon0930-hub') !== -1) {
        // 备用：如果 URL 包含
        var path = window.location.pathname;
        var match = path.match(/\/([^\/]+)\/ace-yuu-archive/);
        if (match) {
            repoOwner = match[1];
            repoName = 'ace-yuu-archive';
        }
    }

    // 默认值
    if (!repoOwner) repoOwner = 'nicolemon0930-hub';
    if (!repoName) repoName = 'ace-yuu-archive';

    // 从 localStorage 读取 token
    githubToken = localStorage.getItem('github_token') || null;
}

function isSyncEnabled() {
    return githubToken && repoOwner && repoName;
}

// 从 GitHub 读取数据
function loadDataFromGithub(callback) {
    var url = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/data.json';

    fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'token ' + githubToken
        }
    })
    .then(function(response) {
        if (response.status === 404) {
            // 文件不存在，创建空数组
            currentFileSha = null;
            callback([]);
            return null;
        }
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        if (data === null || data === undefined) return;

        currentFileSha = data.sha;

        // content 是 base64 编码的
        var content = data.content || '';
        content = content.replace(/\s/g, '');
        if (!content) {
            callback([]);
            return;
        }

        try {
            var decoded = atob(content);
            var parsed = JSON.parse(decoded);
            if (Array.isArray(parsed)) {
                callback(parsed);
            } else {
                callback([]);
            }
        } catch (e) {
            console.warn('Parse data.json failed:', e);
            callback([]);
        }
    })
    .catch(function(error) {
        console.warn('GitHub load failed:', error);
        callback(null, error);
    });
}

// 保存数据到 GitHub
function saveDataToGithub(data, callback) {
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    var url = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/data.json';

    var body = {
        message: 'Update data.json',
        content: content
    };

    if (currentFileSha) {
        body.sha = currentFileSha;
    }

    fetch(url, {
        method: 'PUT',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'token ' + githubToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        if (data && data.content) {
            currentFileSha = data.content.sha;
        }
        callback(true);
    })
    .catch(function(error) {
        console.warn('GitHub save failed:', error);
        callback(false, error);
    });
}

// 兼容旧的 localStorage
function loadDataFromLocal() {
    try {
        var data = localStorage.getItem('ace_yuu_archive');
        if (data) {
            var parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Local load failed:', e);
    }
    return [];
}

function saveDataToLocal(data) {
    try {
        localStorage.setItem('ace_yuu_archive', JSON.stringify(data));
    } catch (e) {
        console.warn('Local save failed:', e);
    }
}

// 统一的加载接口
function loadData(callback) {
    if (isSyncEnabled()) {
        loadDataFromGithub(function(data, error) {
            if (data !== null && data !== undefined) {
                archive = data;
                saveDataToLocal(data); // 本地缓存
                if (callback) callback(true);
            } else {
                // GitHub 失败，回退到本地
                archive = loadDataFromLocal();
                if (callback) callback(false, error);
            }
        });
    } else {
        archive = loadDataFromLocal();
        if (callback) callback(false);
    }
}

// 统一的保存接口
function saveData(callback) {
    // 总是先保存到本地缓存
    saveDataToLocal(archive);

    if (isSyncEnabled()) {
        saveDataToGithub(archive, function(success, error) {
            if (callback) callback(success, error);
        });
    } else {
        if (callback) callback(false);
    }
}

// DOM refs
var modal, btnNew, btnCancel, btnDelete, form, grid, searchInput, timelineView;
var btnExport, btnImport, importFile, imageInput, imagePreview;
var btnSettings, settingsModal, btnSaveSettings, btnCancelSettings, githubTokenInput, syncStatus;

function initApp() {
    detectRepo();
    initDOM();
    loadData(function(success, error) {
        if (error) {
            var statusEl = document.getElementById('syncStatus');
            if (statusEl) {
                statusEl.textContent = 'Failed to sync: ' + error.message + '. Using local data.';
                statusEl.style.color = '#B84A5A';
            }
        }
        render();
        bindSidebar();
    });
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
    btnSettings = document.getElementById('btnSettings');
    settingsModal = document.getElementById('settingsModal');
    btnSaveSettings = document.getElementById('btnSaveSettings');
    btnCancelSettings = document.getElementById('btnCancelSettings');
    githubTokenInput = document.getElementById('githubToken');
    syncStatus = document.getElementById('syncStatus');

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
        if (editingId && confirm('Delete this record?')) {
            var idx = findIndex(editingId);
            if (idx >= 0) archive.splice(idx, 1);
            saveData(function() {});
            render();
            modal.classList.add('hidden');
            form.reset();
            imagePreview.innerHTML = '';
            editingId = null;
            currentImageData = null;
        }
    });

    // 图片上传
    imageInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(ev) {
            currentImageData = ev.target.result;
            imagePreview.innerHTML = '<img src="' + currentImageData + '" alt="Preview"><button type="button" class="remove-image-btn" onclick="removeImage()">Remove</button>';
        };
        reader.readAsDataURL(file);
    });

    // 保存记录
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

        saveData(function(success, error) {
            if (error) {
                alert('Save failed: ' + error.message);
            }
        });
        render();
        modal.classList.add('hidden');
        form.reset();
        imagePreview.innerHTML = '';
        currentImageData = null;
        editingId = null;
    });

    // 搜索
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

    // 导出
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

    // 导入
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
                    saveData(function() {});
                    render();
                    alert('Import successful!');
                } else {
                    alert('Invalid data format');
                }
            } catch (err) {
                alert('Failed to parse JSON');
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    // 设置
    btnSettings.addEventListener('click', function() {
        githubTokenInput.value = githubToken || '';
        if (isSyncEnabled()) {
            syncStatus.textContent = 'Sync: ON (' + repoOwner + '/' + repoName + ')';
            syncStatus.style.color = '#D6B06A';
        } else {
            syncStatus.textContent = 'Sync: OFF (local storage only)';
            syncStatus.style.color = '#aaa';
        }
        settingsModal.classList.remove('hidden');
    });

    btnCancelSettings.addEventListener('click', function() {
        settingsModal.classList.add('hidden');
    });

    btnSaveSettings.addEventListener('click', function() {
        var token = githubTokenInput.value.trim();
        if (token) {
            githubToken = token;
            localStorage.setItem('github_token', token);
            syncStatus.textContent = 'Saving...';
            syncStatus.style.color = '#D6B06A';

            // 测试并从 GitHub 加载数据
            loadData(function(success, error) {
                if (error) {
                    syncStatus.textContent = 'Failed: ' + error.message;
                    syncStatus.style.color = '#B84A5A';
                    setTimeout(function() {
                        alert('Failed to connect to GitHub. Please check your token and repository permissions.');
                    }, 100);
                } else {
                    syncStatus.textContent = 'Synced successfully!';
                    syncStatus.style.color = '#8c7674';
                }
                render();
                setTimeout(function() {
                    settingsModal.classList.add('hidden');
                }, 1500);
            });
        } else {
            githubToken = null;
            localStorage.removeItem('github_token');
            syncStatus.textContent = 'Token removed. Using local storage only.';
            syncStatus.style.color = '#aaa';
            setTimeout(function() {
                settingsModal.classList.add('hidden');
            }, 1500);
        }
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
                render(archive);
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
            openEditModal(item);
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

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}
