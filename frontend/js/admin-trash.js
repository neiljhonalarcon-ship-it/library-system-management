let trashItems = [];

document.addEventListener("DOMContentLoaded", () => {
    loadTrash();
});

// ============================================================
// LOAD TRASH ITEMS
// ============================================================
async function loadTrash() {
    const container = document.getElementById("trashList");
    container.innerHTML = `<div class="loading-state" style="text-align:center; padding: 20px;">Loading trash...</div>`;

    try {
        const res = await fetch("/api/admin/trash");
        const data = await res.json();
        
        trashItems = [
            ...data.books.map(b => ({ ...b, label: `Book: ${b.title}` })),
            ...data.members.map(m => ({ ...m, label: `Member: ${m.title}` }))
        ];

        renderTrash();
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="text-align:center; color:#ef4444; padding: 20px;">Failed to load trash.</div>`;
    }
}

// ============================================================
// RENDER TRASH LIST
// ============================================================
function renderTrash() {
    const container = document.getElementById("trashList");
    
    const selectAllBox = document.getElementById("selectAll");
    if (selectAllBox) selectAllBox.checked = false;
    
    updateToolbarState();

    if (trashItems.length === 0) {
        container.innerHTML = `
            <div class="portal-empty" style="text-align:center; padding: 50px; background: var(--bg-card); border-radius: 12px;">
                <h3 style="color: var(--text-main); margin: 0 0 5px 0;">Trash is empty</h3>
                <p style="color: var(--text-muted); margin: 0;">Deleted items will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = trashItems.map((item, index) => `
        <div class="book-list-item" style="display: flex; align-items: center; padding: 15px 20px; background: var(--bg-card); border-radius: 12px; box-shadow: 0 2px 8px var(--shadow-color); margin-bottom: 10px;">
            <input type="checkbox" class="trash-checkbox" value="${index}" onchange="updateToolbarState()" style="width: 18px; height: 18px; margin-right: 15px; cursor:pointer;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; font-size: 15px; color: var(--text-main);">${item.label}</h4>
                <span class="book-tag" style="background: var(--bg-hover); color: var(--text-muted); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">${item.type.toUpperCase()}</span>
            </div>
        </div>
    `).join("");
}

// ============================================================
// UPDATE TOOLBAR BUTTONS
// ============================================================
function updateToolbarState() {
    const checkedCount = document.querySelectorAll('.trash-checkbox:checked').length;
    const restoreBtn = document.getElementById('restoreBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    if (checkedCount > 0) {
        restoreBtn.disabled = false;
        restoreBtn.style.cursor = 'pointer';
        restoreBtn.style.opacity = '1';

        deleteBtn.disabled = false;
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.opacity = '1';
    } else {
        restoreBtn.disabled = true;
        restoreBtn.style.cursor = 'not-allowed';
        restoreBtn.style.opacity = '0.5';

        deleteBtn.disabled = true;
        deleteBtn.style.cursor = 'not-allowed';
        deleteBtn.style.opacity = '0.5';
        
        const selectAllBox = document.getElementById("selectAll");
        if (selectAllBox) selectAllBox.checked = false;
    }
}

// ============================================================
// SELECT ALL FUNCTION
// ============================================================
function toggleSelectAll(checkbox) {
    document.querySelectorAll('.trash-checkbox').forEach(cb => cb.checked = checkbox.checked);
    updateToolbarState();
}

// ============================================================
// GET SELECTED ITEMS
// ============================================================
function getSelectedItems() {
    const selected = [];
    document.querySelectorAll('.trash-checkbox:checked').forEach(cb => {
        selected.push(trashItems[cb.value]);
    });
    return selected;
}

// ============================================================
// RESTORE MODAL LOGIC
// ============================================================
function openRestoreModal() {
    const checkedCount = document.querySelectorAll('.trash-checkbox:checked').length;
    if (checkedCount === 0) return;

    document.getElementById('passwordModal').style.display = 'flex';
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminPasswordInput').focus();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

async function confirmRestore() {
    const password = document.getElementById('adminPasswordInput').value;
    if (!password) {
        if(window.toast) toast.error("Please enter your password.");
        return;
    }

    const selected = getSelectedItems();
    if (selected.length === 0) return;

    const btn = document.getElementById('confirmRestoreBtn');
    btn.textContent = 'Restoring...';
    btn.disabled = true;

    try {
        const res = await fetch("/api/admin/trash/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: selected, password: password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            if(window.toast) toast.success(data.message || "Restored successfully!");
            closePasswordModal();
            loadTrash();
        } else {
            if(window.toast) toast.error(data.error || "Failed to restore");
        }
    } catch (err) {
        console.error(err);
        if(window.toast) toast.error("Connection error");
    } finally {
        btn.textContent = 'Confirm';
        btn.disabled = false;
    }
}

// ============================================================
// DELETE PERMANENTLY
// ============================================================
async function deleteSelectedPermanently() {
    const selected = getSelectedItems();
    if (selected.length === 0) return;

    const confirmed = await showConfirm({
        title: "Permanently Delete?",
        message: `Are you sure you want to permanently delete ${selected.length} item(s)? This action CANNOT be undone.`,
        confirmText: "Yes, Delete",
        cancelText: "Cancel",
        type: "danger",
    });
    if (!confirmed) return;

    try {
        const res = await fetch("/api/admin/trash/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: selected })
        });
        const data = await res.json();
        
        if (data.success) {
            if(window.toast) toast.success(data.message);
            loadTrash();
        } else {
            if(window.toast) toast.error(data.error);
        }
    } catch (err) {
        console.error(err);
        if(window.toast) toast.error("Connection error");
    }
}