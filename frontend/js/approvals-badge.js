// ============================================================
// PENDING APPROVALS BADGE
// Auto-updates the pending count shown in the sidebar
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
    const badge = document.getElementById("pendingCount");
    if (!badge) return;

    try {
        const response = await fetch("/api/admin/pending-members");
        if (!response.ok) return;

        const pending = await response.json();
        const count = pending.length;

        if (count > 0) {
            badge.textContent = count;
            badge.style.cssText = `
                margin-left: auto;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                min-width: 22px;
                text-align: center;
                display: inline-block;
            `;
        } else {
            badge.style.display = "none";
        }
    } catch (err) {
        console.error("Failed to load pending count:", err);
    }
});