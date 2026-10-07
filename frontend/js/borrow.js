// ============================================================
// BORROW / RETURN PAGE LOGIC
// ============================================================

let allTransactions = [];
let allMembers = [];
let allBooks = [];

// ============================================================
// LOAD INITIAL DATA
// ============================================================
async function loadAll() {
    await Promise.all([loadMembers(), loadBooks(), loadTransactions()]);
}

async function loadMembers() {
    allMembers = await apiGet("/api/members") || [];
}

async function loadBooks() {
    allBooks = await apiGet("/api/books") || [];
}

// ============================================================
// LOAD ACTIVE BORROWS
// ============================================================
async function loadTransactions() {
    const tbody = document.getElementById("transactionsTableBody");
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';

    try {
        const transactions = await apiGet("/api/transactions") || [];
        allTransactions = transactions;
        renderTransactions(transactions);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Error loading</td></tr>';
    }
}

function renderTransactions(transactions) {
    const tbody = document.getElementById("transactionsTableBody");

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <p>No active borrows — all books are in the library!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const isOverdue = t.status === "Overdue";
        const rowClass = isOverdue ? "overdue-row" : "";
        const statusClass = t.status.toLowerCase();

        return `
            <tr class="${rowClass}">
                <td><strong>#${t.transaction_id}</strong></td>
                <td>${escapeHtml(t.member_name)}</td>
                <td>${escapeHtml(t.book_title)}</td>
                <td>${formatDate(t.borrow_date)}</td>
                <td>${formatDate(t.due_date)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${t.status}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// ESCAPE HTML
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

// ============================================================
// BORROW FORM LOGIC
// ============================================================
const memberInput = document.getElementById("borrowMemberId");
const bookInput = document.getElementById("borrowBookId");

memberInput.addEventListener("input", updateBorrowPreview);
bookInput.addEventListener("input", updateBorrowPreview);

function updateBorrowPreview() {
    const memberId = parseInt(memberInput.value);
    const bookId = parseInt(bookInput.value);

    const member = allMembers.find(m => m.member_id === memberId);
    const book = allBooks.find(b => b.book_id === bookId);

    // Update member hint
    if (member) {
        document.getElementById("memberInfo").textContent =
            `✓ ${member.first_name} ${member.last_name} (${member.member_type})`;
        document.getElementById("memberInfo").style.color = "#10b981";
    } else if (memberId) {
        document.getElementById("memberInfo").textContent = "✗ Member not found";
        document.getElementById("memberInfo").style.color = "#ef4444";
    } else {
        document.getElementById("memberInfo").textContent = "";
    }

    // Update book hint
    if (book) {
        document.getElementById("bookInfo").textContent =
            `✓ ${book.title} (${book.available_copies} available)`;
        document.getElementById("bookInfo").style.color = book.available_copies > 0 ? "#10b981" : "#ef4444";
    } else if (bookId) {
        document.getElementById("bookInfo").textContent = "✗ Book not found";
        document.getElementById("bookInfo").style.color = "#ef4444";
    } else {
        document.getElementById("bookInfo").textContent = "";
    }

    // Show/hide preview
    const preview = document.getElementById("borrowPreview");
    if (member && book) {
        preview.style.display = "block";
        document.getElementById("previewMember").textContent = `${member.first_name} ${member.last_name}`;
        document.getElementById("previewBook").textContent = book.title;

        const today = new Date();
        const due = new Date();
        due.setDate(due.getDate() + 14);

        document.getElementById("previewBorrowDate").textContent = today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        document.getElementById("previewDueDate").textContent = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } else {
        preview.style.display = "none";
    }
}

async function processBorrow() {
    const memberId = parseInt(memberInput.value);
    const bookId = parseInt(bookInput.value);

    if (!memberId || !bookId) {
        showToast("Please enter both Member ID and Book ID", "error");
        return;
    }

    try {
        const result = await apiPost("/api/borrow", { member_id: memberId, book_id: bookId });

        if (result && result.success) {
            showToast(`✓ "${result.book_title}" borrowed by ${result.member_name}`, "success");
            memberInput.value = "";
            bookInput.value = "";
            document.getElementById("memberInfo").textContent = "";
            document.getElementById("bookInfo").textContent = "";
            document.getElementById("borrowPreview").style.display = "none";
            await loadAll();
        } else {
            showToast(result?.error || "Failed to borrow", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// RETURN FORM LOGIC
// ============================================================
const tidInput = document.getElementById("returnTransactionId");

tidInput.addEventListener("input", function () {
    const tid = parseInt(this.value);
    const tx = allTransactions.find(t => t.transaction_id === tid);
    const preview = document.getElementById("returnPreview");

    if (tx) {
        preview.style.display = "block";
        document.getElementById("returnMember").textContent = tx.member_name;
        document.getElementById("returnBook").textContent = tx.book_title;
        document.getElementById("returnDueDate").textContent = formatDate(tx.due_date);
    } else {
        preview.style.display = "none";
    }
});

async function processReturn() {
    const tid = parseInt(tidInput.value);

    if (!tid) {
        showToast("Please enter a Transaction ID", "error");
        return;
    }

    const tx = allTransactions.find(t => t.transaction_id === tid);
    if (!tx) {
        showToast("Transaction not found in active borrows", "error");
        return;
    }

    if (!confirm(`Return "${tx.book_title}" from ${tx.member_name}?`)) return;

    try {
        const result = await apiPost(`/api/return/${tid}`, {});

        if (result && result.success) {
            if (result.fine > 0) {
                showToast(`✓ Returned! Fine: P${result.fine.toFixed(2)} (${result.overdue_days} days late)`, "success");
            } else {
                showToast(`✓ "${result.book_title}" returned on time!`, "success");
            }
            tidInput.value = "";
            document.getElementById("returnPreview").style.display = "none";
            await loadAll();
        } else {
            showToast(result?.error || "Failed to return", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", loadAll);



// ============================================================
// SEARCH FEATURE — Member, Book, TID Searches
// ============================================================

// Cache for loaded data
let cachedMembers = [];
let cachedBooks = [];
let cachedTransactions = [];

// ============================================================
// SEARCH MODAL — MEMBER
// ============================================================
async function openMemberSearch() {
    document.getElementById("memberSearchModal").classList.add("active");
    document.getElementById("memberSearchInput").value = "";
    document.getElementById("memberSearchResults").innerHTML = 
        '<div class="search-empty">Loading members...</div>';

    try {
        const members = await apiGet("/api/members") || [];
        cachedMembers = members;
        renderMemberResults(members);
        document.getElementById("memberSearchInput").focus();
    } catch (err) {
        document.getElementById("memberSearchResults").innerHTML = 
            '<div class="search-empty">Error loading members</div>';
    }
}

function closeMemberSearch() {
    document.getElementById("memberSearchModal").classList.remove("active");
}

function renderMemberResults(members) {
    const container = document.getElementById("memberSearchResults");

    if (members.length === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <div>No members found</div>
            </div>
        `;
        return;
    }

    container.innerHTML = members.map(m => {
        const initials = ((m.first_name || "?")[0] + (m.last_name || "?")[0]).toUpperCase();
        const typeClass = (m.member_type || "Student").toLowerCase();
        const fullName = `${m.first_name} ${m.last_name}`;

        return `
            <div class="search-result-item" onclick="selectMember(${m.member_id}, '${escapeJs(fullName)}')">
                <div class="result-avatar ${typeClass}">${initials}</div>
                <div class="result-info">
                    <div class="result-title">${escapeHtml(fullName)}</div>
                    <div class="result-subtitle">ID #${m.member_id} • ${escapeHtml(m.email || "No email")}</div>
                </div>
                <span class="result-badge ${typeClass}">${escapeHtml(m.member_type)}</span>
            </div>
        `;
    }).join("");
}

function selectMember(memberId, name) {
    document.getElementById("borrowMemberId").value = memberId;
    closeMemberSearch();
    showToast(`Selected: ${name}`, "success", { title: "Member Found", duration: 2000 });
    // Trigger preview update
    document.getElementById("borrowMemberId").dispatchEvent(new Event("input"));
}

// Member search filter
document.getElementById("memberSearchInput").addEventListener("input", function () {
    const term = this.value.trim().toLowerCase();
    if (!term) {
        renderMemberResults(cachedMembers);
        return;
    }
    const filtered = cachedMembers.filter(m => 
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.contact_number || "").includes(term) ||
        String(m.member_id).includes(term)
    );
    renderMemberResults(filtered);
});


// ============================================================
// SEARCH MODAL — BOOK
// ============================================================
async function openBookSearch() {
    document.getElementById("bookSearchModal").classList.add("active");
    document.getElementById("bookSearchInput").value = "";
    document.getElementById("bookSearchResults").innerHTML = 
        '<div class="search-empty">Loading books...</div>';

    try {
        const books = await apiGet("/api/books") || [];
        // Filter to only show books with available copies
        cachedBooks = books;
        renderBookResults(books.filter(b => b.available_copies > 0));
        document.getElementById("bookSearchInput").focus();
    } catch (err) {
        document.getElementById("bookSearchResults").innerHTML = 
            '<div class="search-empty">Error loading books</div>';
    }
}

function closeBookSearch() {
    document.getElementById("bookSearchModal").classList.remove("active");
}

function renderBookResults(books) {
    const container = document.getElementById("bookSearchResults");

    if (books.length === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <div>No available books found</div>
            </div>
        `;
        return;
    }

    container.innerHTML = books.map(b => {
        const avail = b.available_copies;
        let badgeClass = "available";
        if (avail <= 2) badgeClass = "low";

        return `
            <div class="search-result-item" onclick="selectBook(${b.book_id}, '${escapeJs(b.title)}')">
                <div class="result-book-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                </div>
                <div class="result-info">
                    <div class="result-title">${escapeHtml(b.title)}</div>
                    <div class="result-subtitle">by ${escapeHtml(b.author_name || "Unknown")} • ${avail} of ${b.total_copies} available</div>
                </div>
                <span class="result-badge ${badgeClass}">${avail} left</span>
            </div>
        `;
    }).join("");
}

function selectBook(bookId, title) {
    document.getElementById("borrowBookId").value = bookId;
    closeBookSearch();
    showToast(`Selected: ${title}`, "success", { title: "Book Found", duration: 2000 });
    document.getElementById("borrowBookId").dispatchEvent(new Event("input"));
}

// Book search filter
document.getElementById("bookSearchInput").addEventListener("input", function () {
    const term = this.value.trim().toLowerCase();
    const available = cachedBooks.filter(b => b.available_copies > 0);
    if (!term) {
        renderBookResults(available);
        return;
    }
    const filtered = available.filter(b => 
        (b.title || "").toLowerCase().includes(term) ||
        (b.author_name || "").toLowerCase().includes(term) ||
        (b.isbn || "").toLowerCase().includes(term) ||
        (b.genre || "").toLowerCase().includes(term)
    );
    renderBookResults(filtered);
});


// ============================================================
// SEARCH MODAL — TID (Active Borrows)
// ============================================================
async function openTidSearch() {
    document.getElementById("tidSearchModal").classList.add("active");
    document.getElementById("tidSearchInput").value = "";
    document.getElementById("tidSearchResults").innerHTML = 
        '<div class="search-empty">Loading active borrows...</div>';

    try {
        const transactions = await apiGet("/api/transactions") || [];
        cachedTransactions = transactions;
        renderTidResults(transactions);
        document.getElementById("tidSearchInput").focus();
    } catch (err) {
        document.getElementById("tidSearchResults").innerHTML = 
            '<div class="search-empty">Error loading borrows</div>';
    }
}

function closeTidSearch() {
    document.getElementById("tidSearchModal").classList.remove("active");
}

function renderTidResults(transactions) {
    const container = document.getElementById("tidSearchResults");

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                </svg>
                <div>No active borrows</div>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map(t => {
        const initials = getInitials(t.member_name);
        const isOverdue = t.status === "Overdue";
        const badgeClass = isOverdue ? "out" : "available";
        const badgeText = isOverdue ? "Overdue" : "Borrowed";

        return `
            <div class="search-result-item" onclick="selectTransaction(${t.transaction_id}, '${escapeJs(t.book_title)}')">
                <div class="result-avatar" style="background: linear-gradient(135deg, #f59e0b, #d97706);">${initials}</div>
                <div class="result-info">
                    <div class="result-title">${escapeHtml(t.book_title)}</div>
                    <div class="result-subtitle">TID #${t.transaction_id} • ${escapeHtml(t.member_name)}</div>
                </div>
                <span class="result-badge ${badgeClass}">${badgeText}</span>
            </div>
        `;
    }).join("");
}

function selectTransaction(tid, bookTitle) {
    document.getElementById("returnTransactionId").value = tid;
    closeTidSearch();
    showToast(`Selected: ${bookTitle}`, "success", { title: "Transaction Found", duration: 2000 });
    document.getElementById("returnTransactionId").dispatchEvent(new Event("input"));
}

// TID search filter
document.getElementById("tidSearchInput").addEventListener("input", function () {
    const term = this.value.trim().toLowerCase();
    if (!term) {
        renderTidResults(cachedTransactions);
        return;
    }
    const filtered = cachedTransactions.filter(t => 
        (t.member_name || "").toLowerCase().includes(term) ||
        (t.book_title || "").toLowerCase().includes(term) ||
        String(t.transaction_id).includes(term)
    );
    renderTidResults(filtered);
});


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

function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/\\/g, "\\\\");
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    return ((parts[0] || "?")[0] + (parts[parts.length - 1] || "?")[0]).toUpperCase();
}


// ============================================================
// MODAL — Close on overlay click
// ============================================================
["memberSearchModal", "bookSearchModal", "tidSearchModal"].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === this) {
                this.classList.remove("active");
            }
        });
    }
});

// ESC key closes any open modal
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        ["memberSearchModal", "bookSearchModal", "tidSearchModal"].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.classList.remove("active");
        });
    }
});