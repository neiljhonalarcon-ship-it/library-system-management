// ============================================================
// BOOKS PAGE LOGIC — Modern Cards + Grid/List View
// ============================================================

let allBooks = [];
let currentSearchTerm = "";
let currentGenre = "";
let currentSort = "title";
let currentView = "grid";

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    loadBooks();
    setupFilters();
});

// ============================================================
// LOAD BOOKS FROM API
// ============================================================
async function loadBooks() {
    const container = document.getElementById("booksContainer");
    container.innerHTML = '<div class="loading-state">Loading books...</div>';

    try {
        const books = await apiGet("/api/books");
        if (!books) return;

        allBooks = books;
        populateGenreFilter(books);
        renderBooks();
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="loading-state">Error loading books</div>';
    }
}

// ============================================================
// POPULATE GENRE FILTER
// ============================================================
function populateGenreFilter(books) {
    const select = document.getElementById("genreFilter");
    const currentValue = select.value;

    // Get unique genres
    const genres = [...new Set(books.map(b => b.genre).filter(g => g))].sort();

    // Keep "All Genres" option, add others
    select.innerHTML = '<option value="">All Genres</option>' +
        genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");

    // Restore previous selection if it still exists
    if (currentValue) select.value = currentValue;
}

// ============================================================
// SETUP FILTERS AND CONTROLS
// ============================================================
function setupFilters() {
    // Search
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearBtn");
    let searchTimeout;

    searchInput.addEventListener("input", function () {
        currentSearchTerm = this.value.trim();
        clearBtn.style.display = currentSearchTerm ? "flex" : "none";
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderBooks, 250);
    });

    // Genre filter
    document.getElementById("genreFilter").addEventListener("change", function () {
        currentGenre = this.value;
        renderBooks();
    });

    // Sort
    document.getElementById("sortSelect").addEventListener("change", function () {
        currentSort = this.value;
        renderBooks();
    });
}

// ============================================================
// CLEAR SEARCH
// ============================================================
function clearSearch() {
    document.getElementById("searchInput").value = "";
    currentSearchTerm = "";
    document.getElementById("clearBtn").style.display = "none";
    renderBooks();
}

// ============================================================
// SWITCH VIEW (Grid / List)
// ============================================================
function setView(view, btn) {
    currentView = view;
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const container = document.getElementById("booksContainer");
    container.className = `books-container ${view}-view`;

    renderBooks();
}

// ============================================================
// FILTER + SORT + RENDER
// ============================================================
function renderBooks() {
    const container = document.getElementById("booksContainer");

    // Filter
    let books = allBooks.filter(b => {
        const matchesSearch = !currentSearchTerm ||
            (b.title || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.author_name || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.isbn || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.genre || "").toLowerCase().includes(currentSearchTerm.toLowerCase());

        const matchesGenre = !currentGenre || b.genre === currentGenre;

        return matchesSearch && matchesGenre;
    });

    // Sort
    books = sortBooks(books, currentSort);

    // Render
    if (books.length === 0) {
        container.className = `books-container ${currentView}-view`;
        container.innerHTML = `
            <div class="books-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <h3>No books found</h3>
                <p>${currentSearchTerm || currentGenre ? "Try different search or filters" : "Add your first book to get started"}</p>
            </div>
        `;
        return;
    }

    if (currentView === "grid") {
        renderGridView(books);
    } else {
        renderListView(books);
    }
}

function sortBooks(books, sort) {
    const sorted = [...books];
    switch (sort) {
        case "title":
            return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        case "title-desc":
            return sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        case "year":
            return sorted.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
        case "year-asc":
            return sorted.sort((a, b) => (a.publication_year || 0) - (b.publication_year || 0));
        case "available":
            return sorted.sort((a, b) => (b.available_copies || 0) - (a.available_copies || 0));
        default:
            return sorted;
    }
}

// ============================================================
// GRID VIEW
// ============================================================
function renderGridView(books) {
    const container = document.getElementById("booksContainer");
    container.className = "books-container grid-view";

    container.innerHTML = books.map(book => {
        const genreClass = getGenreClass(book.genre);
        const avail = book.available_copies;
        const total = book.total_copies;

        let availClass = "ok";
        if (avail === 0) availClass = "out";
        else if (avail <= 2) availClass = "low";

        return `
            <div class="book-card-modern" onclick="openEditModal(${book.book_id})">
                <div class="book-cover ${genreClass}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span class="book-availability-badge ${availClass}">${avail}/${total}</span>
                </div>
                <div class="book-info-modern">
                    <div class="book-title-modern">${escapeHtml(book.title)}</div>
                    <div class="book-author-modern">by ${escapeHtml(book.author_name || "Unknown")}</div>
                    <div class="book-meta-modern">
                        ${book.genre ? `<span class="genre-tag ${genreClass}">${escapeHtml(book.genre)}</span>` : ""}
                        ${book.publication_year ? `<span class="year-tag">${book.publication_year}</span>` : ""}
                    </div>
                </div>
                <div class="book-actions-modern" onclick="event.stopPropagation();">
                    <button class="btn-book-action btn-book-edit" onclick="event.stopPropagation(); openEditModal(${book.book_id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-book-action btn-book-delete" onclick="event.stopPropagation(); deleteBook(${book.book_id}, '${escapeJs(book.title)}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// ============================================================
// LIST VIEW
// ============================================================
function renderListView(books) {
    const container = document.getElementById("booksContainer");
    container.className = "books-container list-view";

    container.innerHTML = books.map(book => {
        const genreClass = getGenreClass(book.genre);
        const avail = book.available_copies;
        const total = book.total_copies;

        let availClass = "ok";
        if (avail === 0) availClass = "out";
        else if (avail <= 2) availClass = "low";

        return `
            <div class="book-list-item">
                <div class="book-list-cover ${genreClass}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                </div>
                <div class="book-list-info">
                    <div class="book-list-title">${escapeHtml(book.title)}</div>
                    <div class="book-list-subtitle">
                        <span>by ${escapeHtml(book.author_name || "Unknown")}</span>
                        ${book.genre ? `<span class="genre-tag ${genreClass}">${escapeHtml(book.genre)}</span>` : ""}
                        ${book.publication_year ? `<span class="year-tag">${book.publication_year}</span>` : ""}
                    </div>
                </div>
                <div class="book-list-badges">
                    <span class="book-availability-badge ${availClass}" style="position: static;">${avail}/${total}</span>
                </div>
                <div class="book-list-actions">
                    <button class="btn-book-action btn-book-edit" onclick="openEditModal(${book.book_id})" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-book-action btn-book-delete" onclick="deleteBook(${book.book_id}, '${escapeJs(book.title)}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// ============================================================
// GET GENRE CLASS (for coloring)
// ============================================================
function getGenreClass(genre) {
    if (!genre) return "default";
    const g = genre.toLowerCase().trim();

    if (g.includes("fantasy")) return "fantasy";
    if (g.includes("mystery") || g.includes("crime") || g.includes("detective")) return "mystery";
    if (g.includes("horror") || g.includes("thriller")) return "horror";
    if (g.includes("romance")) return "romance";
    if (g.includes("science") || g.includes("sci-fi") || g.includes("scifi")) return "science";
    if (g.includes("history") || g.includes("historical")) return "history";
    if (g.includes("fiction")) return "fiction";

    return "default";
}

// ============================================================
// ADD BOOK MODAL
// ============================================================
function openAddModal() {
    document.getElementById("modalTitle").textContent = "Add New Book";
    document.getElementById("bookForm").reset();
    document.getElementById("bookId").value = "";
    document.getElementById("total_copies").value = 1;
    document.getElementById("bookModal").classList.add("active");
}

function openEditModal(bookId) {
    const book = allBooks.find(b => b.book_id === bookId);
    if (!book) return;

    document.getElementById("modalTitle").textContent = "Edit Book";
    document.getElementById("bookId").value = book.book_id;
    document.getElementById("title").value = book.title || "";
    document.getElementById("author_name").value = book.author_name || "";
    document.getElementById("isbn").value = book.isbn || "";
    document.getElementById("genre").value = book.genre || "";
    document.getElementById("publication_year").value = book.publication_year || "";
    document.getElementById("publisher").value = book.publisher || "";
    document.getElementById("total_copies").value = book.total_copies || 1;
    document.getElementById("location").value = book.location || "";

    document.getElementById("bookModal").classList.add("active");
}

function closeModal() {
    document.getElementById("bookModal").classList.remove("active");
}

// ============================================================
// SAVE BOOK (Add or Edit)
// ============================================================
document.getElementById("bookForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const bookId = document.getElementById("bookId").value;
    const data = {
        title: document.getElementById("title").value.trim(),
        author_name: document.getElementById("author_name").value.trim(),
        isbn: document.getElementById("isbn").value.trim(),
        genre: document.getElementById("genre").value.trim(),
        publication_year: document.getElementById("publication_year").value,
        publisher: document.getElementById("publisher").value.trim(),
        total_copies: parseInt(document.getElementById("total_copies").value) || 1,
        location: document.getElementById("location").value.trim(),
    };

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        let result;
        if (bookId) {
            result = await apiPut(`/api/books/${bookId}`, data);
        } else {
            result = await apiPost("/api/books", data);
        }

        if (result && result.success) {
            showToast(bookId ? "Book updated!" : "Book added!", "success");
            closeModal();
            loadBooks();
        } else {
            showToast(result?.error || "Failed to save", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Book";
    }
});

// ============================================================
// DELETE BOOK
// ============================================================
async function deleteBook(bookId, title) {
    const confirmed = await showConfirm({
        title: "Delete Book?",
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
    });

    if (!confirmed) return;

    try {
        const result = await apiDelete(`/api/books/${bookId}`);
        if (result && result.success) {
            showToast("Book deleted", "success");
            loadBooks();
        } else {
            showToast(result?.error || "Cannot delete book", "error");
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

function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/\\/g, "\\\\");
}

// ============================================================
// CLOSE MODAL ON OVERLAY CLICK
// ============================================================
document.getElementById("bookModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
});