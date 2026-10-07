// ============================================================
// ADMIN APPROVALS LOGIC
// ============================================================

let pendingMembers = [];

// ============================================================
// LOAD PENDING MEMBERS
// ============================================================
async function loadPending() {
    const content = document.getElementById("approvalsContent");
    content.innerHTML = '<div class="loading">Loading pending members...</div>';

    try {
        const response = await fetch("/api/admin/pending-members");
        if (response.status === 401 || response.status === 302) {
            window.location.href = "/admin-login";
            return;
        }

        const members = await response.json();
        pendingMembers = members;

        // Update badge
        document.getElementById("pendingBadge").textContent = members.length;
        document.getElementById("pendingBadge").style.display = members.length > 0 ? "inline-block" : "none";

        renderApprovals(members);
    } catch (err) {
        console.error(err);
        content.innerHTML = '<div class="loading">Error loading members</div>';
    }
}

// ============================================================
// RENDER APPROVALS
// ============================================================
function renderApprovals(members) {
    const content = document.getElementById("approvalsContent");

    if (members.length === 0) {
        content.innerHTML = `
            <div class="approvals-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <h3>All caught up!</h3>
                <p>No pending member registrations at the moment. When someone registers, they'll appear here for approval.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="info-banner">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span><strong>${members.length}</strong> member${members.length > 1 ? "s" : ""} waiting for approval. Review and approve to grant access.</span>
        </div>

        <div class="approvals-grid">
            ${members.map(m => {
                const initials = ((m.first_name || "?")[0] + (m.last_name || "?")[0]).toUpperCase();
                const typeClass = (m.member_type || "Student").toLowerCase();
                const verified = m.email_verified ? "verified" : "";
                const verifiedText = m.email_verified ? "✓ Email Verified" : "⚠️ Not Verified";
                const registeredDate = formatDate(m.date_registered);

                return `
                    <div class="pending-card">
                        <div class="card-header">
                            <div class="card-avatar ${typeClass}">${initials}</div>
                            <div class="card-name">
                                <h3>${escapeHtml(m.first_name)} ${escapeHtml(m.last_name)}</h3>
                                <span class="card-type-badge ${typeClass}">${escapeHtml(m.member_type)}</span>
                            </div>
                        </div>

                        <div class="card-details">
                            <div class="detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                <span>${escapeHtml(m.email)}</span>
                            </div>
                            <div class="detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <span>${escapeHtml(m.contact_number || "—")}</span>
                            </div>
                            ${m.grade_level ? `
                                <div class="detail-row">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                                    <span><strong>${escapeHtml(m.grade_level)}</strong>${m.section ? " • " + escapeHtml(m.section) : ""}</span>
                                </div>
                            ` : ""}
                            <div class="detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span>Registered ${registeredDate}</span>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button class="btn-approve" onclick="approveMember(${m.member_id}, '${escapeHtml(m.first_name)} ${escapeHtml(m.last_name)}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Approve
                            </button>
                            <button class="btn-reject" onclick="rejectMember(${m.member_id}, '${escapeHtml(m.first_name)} ${escapeHtml(m.last_name)}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                Reject
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ============================================================
// APPROVE MEMBER
// ============================================================
async function approveMember(memberId, name) {
    const confirmed = await showConfirm({
        title: "Approve Member?",
        message: `Approve ${name}? They will be able to log in and borrow books from the library.`,
        confirmText: "Yes, Approve",
        cancelText: "Cancel",
        type: "success",
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/admin/approve-member/${memberId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Approved" }),
        });

        const result = await response.json();

        if (result.success) {
            showToast(`${name} approved!`, "success", { title: "Member Approved" });
            setTimeout(loadPending, 500);
        } else {
            showToast(result.error || "Failed to approve", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// REJECT MEMBER
// ============================================================
async function rejectMember(memberId, name) {
    const confirmed = await showConfirm({
        title: "Reject Member?",
        message: `Reject ${name}? They will NOT be able to log in to the system. This action cannot be undone.`,
        confirmText: "Yes, Reject",
        cancelText: "Cancel",
        type: "danger",
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/admin/approve-member/${memberId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Rejected" }),
        });

        const result = await response.json();

        if (result.success) {
            showToast(`${name} rejected`, "warning", { title: "Member Rejected" });
            setTimeout(loadPending, 500);
        } else {
            showToast(result.error || "Failed to reject", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", loadPending);