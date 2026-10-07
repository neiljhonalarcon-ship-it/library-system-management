// ============================================================
// REPORTS PAGE LOGIC
// ============================================================

let currentTab = "dashboard";

// ============================================================
// SWITCH TAB
// ============================================================
function switchTab(tab, button) {
    currentTab = tab;
    document.querySelectorAll(".report-tab").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    loadTabContent();
}

// ============================================================
// LOAD ALL (initial)
// ============================================================
async function loadAll() {
    await loadTabContent();
}

async function loadTabContent() {
    const content = document.getElementById("reportContent");
    content.innerHTML = '<div class="report-card"><div class="loading">Loading report...</div></div>';

    if (currentTab === "dashboard") await renderDashboardReport();
    else if (currentTab === "top-books") await renderTopBooks();
    else if (currentTab === "top-borrowers") await renderTopBorrowers();
    else if (currentTab === "overdue") await renderOverdueReport();
}

// ============================================================
// DASHBOARD REPORT
// ============================================================
async function renderDashboardReport() {
    const data = await apiGet("/api/reports/dashboard");
    if (!data) return;

    const content = document.getElementById("reportContent");
    content.innerHTML = `
        <div class="report-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Library Dashboard Report
            </h2>

            <div class="report-grid">
                <div class="report-section books">
                    <div class="report-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        Books
                    </div>
                    <div class="report-row">
                        <span>Total Titles</span>
                        <strong>${data.books.titles}</strong>
                    </div>
                    <div class="report-row">
                        <span>Total Copies</span>
                        <strong>${data.books.copies}</strong>
                    </div>
                </div>

                <div class="report-section members">
                    <div class="report-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        Members
                    </div>
                    <div class="report-row">
                        <span>Registered</span>
                        <strong>${data.members.total}</strong>
                    </div>
                </div>

                <div class="report-section borrows">
                    <div class="report-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path></svg>
                        Borrows
                    </div>
                    <div class="report-row">
                        <span>Total Transactions</span>
                        <strong>${data.borrows.total}</strong>
                    </div>
                    <div class="report-row">
                        <span>Currently Out</span>
                        <strong>${data.borrows.active}</strong>
                    </div>
                    <div class="report-row">
                        <span>Overdue</span>
                        <strong style="color: #ef4444;">${data.borrows.overdue}</strong>
                    </div>
                    <div class="report-row">
                        <span>Returned</span>
                        <strong style="color: #10b981;">${data.borrows.returned}</strong>
                    </div>
                </div>

                <div class="report-section fines">
                    <div class="report-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>
                        Fines
                    </div>
                    <div class="report-row">
                        <span>Unpaid</span>
                        <strong style="color: #ef4444;">${data.fines.unpaid_count} (P${Number(data.fines.unpaid_amount).toFixed(2)})</strong>
                    </div>
                    <div class="report-row">
                        <span>Paid</span>
                        <strong style="color: #10b981;">${data.fines.paid_count} (P${Number(data.fines.paid_amount).toFixed(2)})</strong>
                    </div>
                    <div class="report-row">
                        <span>Total Collected</span>
                        <strong>P${Number(data.fines.total_collected).toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// TOP BOOKS REPORT
// ============================================================
async function renderTopBooks() {
    const books = await apiGet("/api/reports/top-books") || [];

    const content = document.getElementById("reportContent");

    if (books.length === 0 || books.every(b => b.borrow_count === 0)) {
        content.innerHTML = `
            <div class="report-card">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                    Top 5 Most Borrowed Books
                </h2>
                <div class="report-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <h3>No borrows yet</h3>
                    <p>Borrow some books to see top rankings</p>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="report-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                Top 5 Most Borrowed Books
            </h2>
            <div class="rank-list">
                ${books.map((b, i) => `
                    <div class="rank-item top-${i + 1}">
                        <div class="rank-number">${i + 1}</div>
                        <div class="rank-info">
                            <div class="rank-title">${escapeHtml(b.title)}</div>
                            <div class="rank-subtitle">${escapeHtml(b.author_name || "Unknown")} • ${escapeHtml(b.genre || "N/A")}</div>
                        </div>
                        <div class="rank-badge">
                            <span class="rank-count">${b.borrow_count}</span>
                            <span class="rank-label">borrows</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

// ============================================================
// TOP BORROWERS REPORT
// ============================================================
async function renderTopBorrowers() {
    const borrowers = await apiGet("/api/reports/top-borrowers") || [];
    const content = document.getElementById("reportContent");

    if (borrowers.length === 0 || borrowers.every(b => b.borrow_count === 0)) {
        content.innerHTML = `
            <div class="report-card">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                    Top 5 Active Borrowers
                </h2>
                <div class="report-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                    <h3>No active borrowers yet</h3>
                    <p>Members who borrow books will appear here</p>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="report-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                Top 5 Active Borrowers
            </h2>
            <div class="rank-list">
                ${borrowers.map((b, i) => {
                    const initials = getInitials(b.member_name);
                    const typeClass = (b.member_type || "Student").toLowerCase();
                    return `
                        <div class="rank-item top-${i + 1}">
                            <div class="rank-number">${i + 1}</div>
                            <div class="rank-info" style="display: flex; align-items: center; gap: 12px;">
                                <div class="member-avatar-sm ${typeClass}">${initials}</div>
                                <div>
                                    <div class="rank-title">${escapeHtml(b.member_name)}</div>
                                    <div class="rank-subtitle">${escapeHtml(b.member_type)}</div>
                                </div>
                            </div>
                            <div class="rank-badge">
                                <span class="rank-count">${b.borrow_count}</span>
                                <span class="rank-label">books</span>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

// ============================================================
// OVERDUE REPORT
// ============================================================
async function renderOverdueReport() {
    const overdue = await apiGet("/api/reports/overdue") || [];
    const content = document.getElementById("reportContent");

    if (overdue.length === 0) {
        content.innerHTML = `
            <div class="report-card">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Overdue Books Report
                </h2>
                <div class="report-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <h3>No overdue books</h3>
                    <p>All books are returned on time. Excellent!</p>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="report-card">
            <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Overdue Books Report (${overdue.length})
            </h2>
            <table class="overdue-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Contact</th>
                        <th>Book</th>
                        <th>Due Date</th>
                        <th>Days Late</th>
                    </tr>
                </thead>
                <tbody>
                    ${overdue.map(o => {
                        const initials = getInitials(o.member_name);
                        const typeClass = (o.member_type || "Student").toLowerCase();
                        return `
                            <tr>
                                <td>
                                    <span class="member-avatar-sm ${typeClass}">${initials}</span>
                                    ${escapeHtml(o.member_name)}
                                </td>
                                <td>${escapeHtml(o.contact_number || "—")}</td>
                                <td>${escapeHtml(o.book_title)}</td>
                                <td>${formatDate(o.due_date)}</td>
                                <td><span class="days-late-badge">${o.days_late} days</span></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
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

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", loadAll);