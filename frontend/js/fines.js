// ============================================================
// FINES PAGE LOGIC
// ============================================================

let allFines = [];

// ============================================================
// LOAD ALL
// ============================================================
async function loadAll() {
    await Promise.all([loadStats(), loadFines()]);
}

// ============================================================
// LOAD STATS
// ============================================================
async function loadStats() {
    try {
        const stats = await apiGet("/api/fines/stats");
        if (!stats) return;

        animateNumber("statUnpaidCount", stats.unpaid_count);
        animateNumber("statPaidCount", stats.paid_count);
        document.getElementById("statUnpaidAmount").textContent = peso(stats.unpaid_amount);
        document.getElementById("statPaidAmount").textContent = peso(stats.paid_amount);
    } catch (err) {
        console.error("Failed to load stats:", err);
    }
}

// ============================================================
// LOAD FINES
// ============================================================
async function loadFines() {
    const tbody = document.getElementById("finesTableBody");
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading fines...</td></tr>';

    try {
        const fines = await apiGet("/api/fines") || [];
        allFines = fines;
        renderFines(fines);
        updateTotal(fines);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading fines</td></tr>';
    }
}

function updateTotal(fines) {
    const total = fines.reduce((sum, f) => sum + Number(f.amount), 0);
    document.getElementById("totalOutstanding").textContent = peso(total);
}

function renderFines(fines) {
    const tbody = document.getElementById("finesTableBody");

    if (fines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state-fines">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <h3>No unpaid fines</h3>
                    <p>All fines have been collected. Great job!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = fines.map(f => {
        const initials = getInitials(f.member_name);
        const typeClass = (f.member_type || "Student").toLowerCase();
        const dateStr = formatDate(f.date_incurred);

        return `
            <tr>
                <td><strong>#${f.fine_id}</strong></td>
                <td>
                    <div class="member-cell">
                        <div class="member-avatar ${typeClass}">${escapeHtml(initials)}</div>
                        <span>${escapeHtml(f.member_name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(f.book_title)}</td>
                <td><span class="days-badge">${f.overdue_days} days</span></td>
                <td class="rate-cell">P${Number(f.fine_per_day).toFixed(2)}</td>
                <td class="amount-cell">P${Number(f.amount).toFixed(2)}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn-pay" onclick="payFine(${f.fine_id}, '${escapeHtml(f.member_name)}', ${f.amount})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Pay
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// PAY FINE
// ============================================================
async function payFine(fineId, memberName, amount) {
    const confirmed = await showConfirm({
        title: "Confirm Payment?",
        message: `Collect P${Number(amount).toFixed(2)} from ${memberName}? This will mark the fine as paid and remove it from the outstanding list.`,
        confirmText: "Yes, Mark as Paid",
        cancelText: "Cancel",
        type: "success",
    });

    if (!confirmed) return;

    try {
        const result = await apiPost(`/api/fines/${fineId}/pay`, {});
        if (result && result.success) {
            showToast(`P${Number(result.amount).toFixed(2)} collected from ${result.member_name}!`, "success");
            await loadAll();
        } else {
            showToast(result?.error || "Failed to process payment", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// HELPERS
// ============================================================
function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    return ((parts[0] || "?")[0] + (parts[parts.length - 1] || "?")[0]).toUpperCase();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 800;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", loadAll);