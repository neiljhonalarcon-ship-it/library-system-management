// ============================================================
// ADMIN RESERVATIONS PAGE LOGIC
// ============================================================

let allReservations = [];
let currentFilter = "";

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", loadAll);

async function loadAll() {
    await Promise.all([loadStats(), loadReservations()]);
}

// ============================================================
// LOAD STATS
// ============================================================
async function loadStats() {
    try {
        const stats = await apiGet("/api/admin/reservation-stats");
        if (!stats) return;

        animateNumber("statPending", stats.pending);
        animateNumber("statReady", stats.ready);
        animateNumber("statCompleted", stats.completed);
        animateNumber("statCancelled", stats.cancelled);

        // Update sidebar badge
        const badge = document.getElementById("pendingReservationsBadge");
        if (badge) {
            if (stats.pending > 0) {
                badge.textContent = stats.pending;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        }
    } catch (err) {
        console.error("Failed to load stats:", err);
    }
}

// ============================================================
// LOAD RESERVATIONS
// ============================================================
async function loadReservations() {
    const content = document.getElementById("reservationsContent");
    content.innerHTML = '<div class="loading">Loading reservations...</div>';

    try {
        const url = currentFilter
            ? `/api/admin/reservations?status=${currentFilter}`
            : "/api/admin/reservations";

        const reservations = await apiGet(url);
        if (!reservations) return;

        allReservations = reservations;
        renderReservations(reservations);
    } catch (err) {
        console.error(err);
        content.innerHTML = '<div class="loading">Error loading reservations</div>';
    }
}

// ============================================================
// FILTER
// ============================================================
function filterReservations(status, el) {
    currentFilter = status;

    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    if (el) el.classList.add("active");

    loadReservations();
}

// ============================================================
// RENDER
// ============================================================
function renderReservations(reservations) {
    const content = document.getElementById("reservationsContent");

    if (reservations.length === 0) {
        content.innerHTML = `
            <div class="reservations-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <h3>${currentFilter ? `No ${currentFilter.toLowerCase()} reservations` : "No reservations yet"}</h3>
                <p>${currentFilter ? "Try a different filter to see other reservations." : "Reservations from members will appear here."}</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="reservations-grid">
            ${reservations.map(r => {
                const statusClass = r.status.toLowerCase();
                const initials = getInitials(r.member_name);
                const typeClass = (r.member_type || "Student").toLowerCase();

                const pickupDate = new Date(r.pickup_date).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric"
                });

                const createdDate = new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric"
                });

                let actions = "";
                if (r.status === "Pending") {
                    actions = `
                        <button class="res-btn res-btn-ready" onclick="updateStatus(${r.reservation_id}, 'Ready')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Mark Ready
                        </button>
                        <button class="res-btn res-btn-cancel" onclick="updateStatus(${r.reservation_id}, 'Cancelled')">
                            ❌ Cancel
                        </button>
                    `;
                } else if (r.status === "Ready") {
                    actions = `
                        <button class="res-btn res-btn-complete" onclick="updateStatus(${r.reservation_id}, 'Completed')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Complete Pickup
                        </button>
                        <button class="res-btn res-btn-cancel" onclick="updateStatus(${r.reservation_id}, 'Cancelled')">
                            ❌ Cancel
                        </button>
                    `;
                }

                return `
                    <div class="res-card ${statusClass}">
                        <div class="res-header">
                            <div class="res-member">
                                <div class="res-avatar">${initials}</div>
                                <div class="res-member-info">
                                    <div class="res-member-name">${escapeHtml(r.member_name)}</div>
                                    <span class="res-member-type">${escapeHtml(r.member_type)}</span>
                                </div>
                            </div>
                            <span class="res-status-badge ${statusClass}">${r.status}</span>
                        </div>

                        <div class="res-book">
                            <div class="res-book-title">📚 ${escapeHtml(r.book_title)}</div>
                            <div class="res-book-author">ISBN: ${escapeHtml(r.book_isbn || "—")}</div>
                        </div>

                        <div class="res-details">
                            <div class="res-detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span>Pickup: <strong>${pickupDate}</strong></span>
                            </div>
                            <div class="res-detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>Time: <strong>${escapeHtml(r.pickup_time)}</strong></span>
                            </div>
                            <div class="res-detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                <span>${escapeHtml(r.member_email || "—")}</span>
                            </div>
                            <div class="res-detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <span>${escapeHtml(r.member_contact || "—")}</span>
                            </div>
                            <div class="res-detail-row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>Requested: <strong>${createdDate}</strong></span>
                            </div>
                        </div>

                        ${r.notes ? `<div class="res-notes">"${escapeHtml(r.notes)}"</div>` : ""}

                        ${actions ? `<div class="res-actions">${actions}</div>` : ""}
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ============================================================
// UPDATE STATUS
// ============================================================
async function updateStatus(reservationId, newStatus) {
    const configs = {
        "Ready": {
            title: "Mark as Ready?",
            message: "The book is prepared and ready for the member to pick up.",
            confirmText: "Mark Ready",
            type: "success",
        },
        "Completed": {
            title: "Complete Pickup?",
            message: "The member is picking up the book. This will create a borrow transaction and give them 14 days to return it.",
            confirmText: "Yes, Complete",
            type: "success",
        },
        "Cancelled": {
            title: "Cancel Reservation?",
            message: "This reservation will be cancelled and cannot be undone.",
            confirmText: "Yes, Cancel",
            type: "danger",
        },
    };

    const config = configs[newStatus] || {
        title: `Change to ${newStatus}?`,
        message: `Change this reservation's status to ${newStatus}?`,
        confirmText: "Confirm",
        type: "warning",
    };

    const confirmed = await showConfirm(config);
    if (!confirmed) return;

    try {
        const response = await apiPost(`/api/admin/reservation/${reservationId}/status`, {
            status: newStatus,
        });

        if (response && response.success) {
            showToast(response.message || `Status updated to ${newStatus}`, "success", {
                title: newStatus === "Completed" ? "Book Picked Up!" : `Reservation ${newStatus}`,
            });
            await loadAll();
        } else {
            showToast(response?.error || "Failed to update", "error");
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