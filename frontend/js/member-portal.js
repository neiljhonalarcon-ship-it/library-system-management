// ============================================================
// MEMBER PORTAL LOGIC
// ============================================================

let currentMember = null;
let currentTab = "dashboard";
let currentReserveBookId = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    document.getElementById("current-date").textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    await loadMemberInfo();
    switchTab("dashboard");
});

// ============================================================
// LOAD MEMBER INFO
// ============================================================
async function loadMemberInfo() {
    try {
        const response = await fetch("/api/member/me");
        if (!response.ok) {
            window.location.href = "/member-login";
            return;
        }
        currentMember = await response.json();

        document.getElementById("sidebar-name").textContent =
            `${currentMember.first_name} ${currentMember.last_name}`;
        document.getElementById("page-subtitle").textContent =
            `Welcome back, ${currentMember.first_name}!`;
    } catch (err) {
        console.error(err);
        window.location.href = "/member-login";
    }
}

// ============================================================
// SWITCH TAB
// ============================================================
function switchTab(tab, el) {
    currentTab = tab;

    // Update sidebar active state
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (el) el.classList.add("active");
    else {
        // If no element, find by tab name
        document.querySelectorAll(".nav-item").forEach(item => {
            const onclick = item.getAttribute("onclick") || "";
            if (onclick.includes(`'${tab}'`)) {
                item.classList.add("active");
            }
        });
    }

    // Update page title
    const titles = {
        "dashboard": "My Dashboard",
        "browse": "Browse Books",
        "reservations": "My Reservations",
        "history": "My Borrowing History",
        "fines": "My Fines",
    };
    document.getElementById("page-title").textContent = titles[tab] || "My Portal";

    // Load content
    const content = document.getElementById("content-area");
    content.innerHTML = '<div class="loading">Loading...</div>';

    if (tab === "dashboard") renderDashboard();
    else if (tab === "browse") renderBrowse();
    else if (tab === "reservations") renderReservations();
    else if (tab === "history") renderHistory();
    else if (tab === "fines") renderFines();
}

// ============================================================
// DASHBOARD TAB
// ============================================================
async function renderDashboard() {
    const content = document.getElementById("content-area");

    if (!currentMember) {
        content.innerHTML = "<p>Loading...</p>";
        return;
    }

    const initials = ((currentMember.first_name[0] || "") + (currentMember.last_name[0] || "")).toUpperCase();

    let borrows = [], fines = [];
    try {
        borrows = await (await fetch("/api/member/my-borrows")).json();
        fines = await (await fetch("/api/member/my-fines")).json();
    } catch (err) {
        console.error(err);
    }

    const totalFines = fines.reduce((sum, f) => sum + Number(f.amount), 0);

    content.innerHTML = `
        <div class="welcome-banner">
            <div class="avatar-lg">${initials}</div>
            <div>
                <h2>Hello, ${escapeHtml(currentMember.first_name)}!</h2>
                <p>${escapeHtml(currentMember.member_type)} • ${escapeHtml(currentMember.grade_level || "")}</p>
            </div>
        </div>

        <div class="member-stats">
            <div class="member-stat-card">
                <div class="stat-circle" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <div class="stat-info">
                    <h3>Currently Borrowed</h3>
                    <div class="stat-value">${borrows.length}</div>
                </div>
            </div>

            <div class="member-stat-card">
                <div class="stat-circle" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
                </div>
                <div class="stat-info">
                    <h3>Unpaid Fines</h3>
                    <div class="stat-value">P${totalFines.toFixed(2)}</div>
                </div>
            </div>

            <div class="member-stat-card">
                <div class="stat-circle" style="background: linear-gradient(135deg, #10b981, #059669);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <div class="stat-info">
                    <h3>Member Type</h3>
                    <div class="stat-value" style="font-size: 16px;">${escapeHtml(currentMember.member_type)}</div>
                </div>
            </div>
        </div>

        <h3 class="portal-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            My Currently Borrowed Books
        </h3>
        ${borrows.length === 0 ? `
            <div class="portal-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h3>No books borrowed</h3>
                <p>Browse our collection and reserve a book to pick up</p>
            </div>
        ` : `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Book</th>
                        <th>Borrowed</th>
                        <th>Due Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${borrows.map(b => `
                        <tr>
                            <td><strong>${escapeHtml(b.book_title)}</strong></td>
                            <td>${formatDate(b.borrow_date)}</td>
                            <td>${formatDate(b.due_date)}</td>
                            <td><span class="status-pill ${b.status.toLowerCase()}">${b.status}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `}
    `;
}

// ============================================================
// BROWSE BOOKS TAB (with Reserve button)
// ============================================================
async function renderBrowse() {
    const content = document.getElementById("content-area");

    let books = [];
    try {
        books = await (await fetch("/api/member/available-books")).json();
    } catch (err) {
        console.error(err);
    }

    if (books.length === 0) {
        content.innerHTML = `
            <div class="portal-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <h3>No books available</h3>
                <p>All books are currently borrowed. Check back later!</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <p style="color: #64748b; margin-bottom: 20px; font-size: 14px;">
            Browse our collection. Reserve a book and we'll have it ready for pickup!
        </p>
        <div class="books-grid">
            ${books.map(b => {
                const avail = b.available_copies;
                const cls = avail === 0 ? "out" : (avail <= 2 ? "low" : "");
                return `
                    <div class="book-card">
                        <h4>${escapeHtml(b.title)}</h4>
                        <p class="book-author">by ${escapeHtml(b.author_name || "Unknown")}</p>
                        <div class="book-meta">
                            ${b.genre ? `<span class="book-tag">${escapeHtml(b.genre)}</span>` : ""}
                            ${b.publication_year ? `<span class="book-tag">${b.publication_year}</span>` : ""}
                        </div>
                        <p class="book-availability ${cls}">
                            ${avail} of ${b.total_copies} available
                        </p>
                        ${avail > 0 ? `
                            <button class="btn-reserve" onclick="openReserveModal(${b.book_id}, '${escapeHtml(b.title).replace(/'/g, "\\'")}', '${escapeHtml(b.author_name || "Unknown").replace(/'/g, "\\'")}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                Reserve This Book
                            </button>
                        ` : `
                            <button class="btn-reserve" style="background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed;" disabled>
                                Not Available
                            </button>
                        `}
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ============================================================
// RESERVATIONS TAB
// ============================================================
async function renderReservations() {
    const content = document.getElementById("content-area");

    let reservations = [];
    try {
        const res = await fetch("/api/member/my-reservations");
        if (!res.ok) {
            content.innerHTML = '<p style="color: #ef4444;">Please log in</p>';
            return;
        }
        reservations = await res.json();
    } catch (err) {
        console.error(err);
    }

    if (reservations.length === 0) {
        content.innerHTML = `
            <div class="reservations-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3>No reservations yet</h3>
                <p>Browse our collection and reserve a book to pick up!</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="reservations-list">
            ${reservations.map(r => {
                const statusClass = r.status.toLowerCase();
                const dateFormatted = new Date(r.pickup_date).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric"
                });

                const canCancel = r.status === "Pending";

                return `
                    <div class="reservation-card ${statusClass}">
                        <div class="reservation-header">
                            <div>
                                <div class="reservation-title">${escapeHtml(r.book_title)}</div>
                                <div class="reservation-author">by ${escapeHtml(r.author_name || "Unknown")}</div>
                            </div>
                            <span class="reservation-status ${statusClass}">${r.status}</span>
                        </div>

                        <div class="reservation-details">
                            <div class="reservation-detail">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <strong>${dateFormatted}</strong>
                            </div>
                            <div class="reservation-detail">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <strong>${escapeHtml(r.pickup_time)}</strong>
                            </div>
                        </div>

                        ${r.notes ? `<div class="reservation-notes">"${escapeHtml(r.notes)}"</div>` : ""}

                        ${canCancel ? `
                            <div class="reservation-actions">
                                <button class="btn-cancel-reservation" onclick="cancelReservation(${r.reservation_id})">
                                    ❌ Cancel Reservation
                                </button>
                            </div>
                        ` : ""}
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ============================================================
// RESERVE MODAL
// ============================================================
function openReserveModal(bookId, title, author) {
    currentReserveBookId = bookId;

    document.getElementById("reserveBookTitle").textContent = title;
    document.getElementById("reserveBookAuthor").textContent = "by " + author;
    document.getElementById("reserveDate").value = "";
    document.getElementById("reserveTime").value = "";
    document.getElementById("reserveNotes").value = "";
    document.getElementById("reserveError").textContent = "";

    // Set min date to today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("reserveDate").min = today;

    document.getElementById("reserveModal").classList.add("active");
}

function closeReserveModal() {
    document.getElementById("reserveModal").classList.remove("active");
    currentReserveBookId = null;
}

async function submitReservation() {
    const bookId = currentReserveBookId;
    const pickupDate = document.getElementById("reserveDate").value;
    const pickupTime = document.getElementById("reserveTime").value;
    const notes = document.getElementById("reserveNotes").value.trim();
    const errorEl = document.getElementById("reserveError");
    const btn = document.getElementById("reserveSubmitBtn");
    const btnText = btn.querySelector(".btn-text");

    errorEl.textContent = "";

    if (!pickupDate) {
        errorEl.textContent = "Please select a pickup date";
        return;
    }

    if (!pickupTime) {
        errorEl.textContent = "Please select a pickup time";
        return;
    }

    btn.disabled = true;
    if (btnText) btnText.textContent = "Reserving...";

    try {
        const response = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                book_id: bookId,
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                notes: notes,
            }),
        });

        const result = await response.json();

        if (result.success) {
            showToast("Reservation confirmed!", "success", { title: "Reserved" });
            closeReserveModal();
            setTimeout(() => switchTab("reservations"), 500);
        } else {
            errorEl.textContent = result.error || "Failed to reserve";
            btn.disabled = false;
            if (btnText) btnText.textContent = "Confirm Reservation";
        }
    } catch (err) {
        errorEl.textContent = "Connection error";
        btn.disabled = false;
        if (btnText) btnText.textContent = "Confirm Reservation";
    }
}

async function cancelReservation(reservationId) {
    const confirmed = await showConfirm({
        title: "Cancel Reservation?",
        message: "Are you sure you want to cancel this reservation? This cannot be undone.",
        confirmText: "Yes, Cancel",
        cancelText: "Keep It",
        type: "warning",
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/member/cancel-reservation/${reservationId}`, {
            method: "POST",
        });

        const result = await response.json();

        if (result.success) {
            showToast("Reservation cancelled", "success");
            renderReservations();
        } else {
            showToast(result.error || "Failed to cancel", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// HISTORY TAB
// ============================================================
async function renderHistory() {
    const content = document.getElementById("content-area");

    let history = [];
    try {
        history = await (await fetch("/api/member/my-history")).json();
    } catch (err) {
        console.error(err);
    }

    if (history.length === 0) {
        content.innerHTML = `
            <div class="portal-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <h3>No borrowing history yet</h3>
                <p>Your book history will appear here once you start borrowing</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Book</th>
                    <th>Borrowed</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                    <th>Fine</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(h => `
                    <tr>
                        <td><strong>${escapeHtml(h.book_title)}</strong></td>
                        <td>${formatDate(h.borrow_date)}</td>
                        <td>${formatDate(h.due_date)}</td>
                        <td>${h.return_date ? formatDate(h.return_date) : "—"}</td>
                        <td><span class="status-pill ${h.status.toLowerCase()}">${h.status}</span></td>
                        <td>${h.fine_amount > 0 ? `P${Number(h.fine_amount).toFixed(2)}` : "—"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ============================================================
// FINES TAB
// ============================================================
async function renderFines() {
    const content = document.getElementById("content-area");

    let fines = [];
    try {
        fines = await (await fetch("/api/member/my-fines")).json();
    } catch (err) {
        console.error(err);
    }

    if (fines.length === 0) {
        content.innerHTML = `
            <div class="portal-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <h3>No unpaid fines</h3>
                <p>Great job! You have no outstanding fines.</p>
            </div>
        `;
        return;
    }

    const total = fines.reduce((sum, f) => sum + Number(f.amount), 0);

    content.innerHTML = `
        <div class="welcome-banner" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
            <div>
                <p style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">TOTAL UNPAID FINES</p>
                <h2 style="font-size: 32px;">P${total.toFixed(2)}</h2>
                <p style="font-size: 12px; opacity: 0.9;">Please pay at the library to clear your account</p>
            </div>
        </div>

        <table class="fines-table">
            <thead>
                <tr>
                    <th>Book</th>
                    <th>Days Late</th>
                    <th>Amount</th>
                    <th>Date Incurred</th>
                </tr>
            </thead>
            <tbody>
                ${fines.map(f => `
                    <tr>
                        <td><strong>${escapeHtml(f.book_title)}</strong></td>
                        <td>${f.overdue_days} days</td>
                        <td><strong style="color: #ef4444;">P${Number(f.amount).toFixed(2)}</strong></td>
                        <td>${formatDate(f.date_incurred)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
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
// MEMBER LOGOUT
// ============================================================
async function memberLogout() {
    try {
        await fetch("/api/auth/member-logout", { method: "POST" });
    } catch (err) {
        console.error(err);
    }
    window.location.href = "/";
}

// ============================================================
// MODAL CLOSE ON OVERLAY CLICK
// ============================================================
document.getElementById("reserveModal").addEventListener("click", function (e) {
    if (e.target === this) closeReserveModal();
});