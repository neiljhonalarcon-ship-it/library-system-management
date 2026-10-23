// ============================================================
// BOOKS PAGE LOGIC — Multiple Images & Slideshow
// ============================================================

let allBooks = [];
let currentSearchTerm = "";
let currentGenre = "";
let currentSort = "title";
let currentView = "grid";

document.addEventListener("DOMContentLoaded", function () {
    loadBooks();
    setupFilters();
});

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

function populateGenreFilter(books) {
    const select = document.getElementById("genreFilter");
    const currentValue = select.value;
    const genres = [...new Set(books.map(b => b.genre).filter(g => g))].sort();

    select.innerHTML = '<option value="">All Genres</option>' +
        genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");

    if (currentValue) select.value = currentValue;
}

function setupFilters() {
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearBtn");
    let searchTimeout;

    searchInput.addEventListener("input", function () {
        currentSearchTerm = this.value.trim();
        clearBtn.style.display = currentSearchTerm ? "flex" : "none";
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderBooks, 250);
    });

    document.getElementById("genreFilter").addEventListener("change", function () {
        currentGenre = this.value;
        renderBooks();
    });

    document.getElementById("sortSelect").addEventListener("change", function () {
        currentSort = this.value;
        renderBooks();
    });
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    currentSearchTerm = "";
    document.getElementById("clearBtn").style.display = "none";
    renderBooks();
}

function setView(view, btn) {
    currentView = view;
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const container = document.getElementById("booksContainer");
    container.className = `books-container ${view}-view`;
    renderBooks();
}

function renderBooks() {
    const container = document.getElementById("booksContainer");

    let books = allBooks.filter(b => {
        const matchesSearch = !currentSearchTerm ||
            (b.title || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.author_name || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.isbn || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (b.genre || "").toLowerCase().includes(currentSearchTerm.toLowerCase());

        const matchesGenre = !currentGenre || b.genre === currentGenre;
        return matchesSearch && matchesGenre;
    });

    books = sortBooks(books, currentSort);

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

    if (currentView === "grid") renderGridView(books);
    else renderListView(books);

    // 🚨 IDAGDAG ITO SA DULO PARA UMANDAR ANG AUTO-SLIDE
    document.querySelectorAll('.carousel-container').forEach(el => {
        startAutoSlide(el);
    });
}

function sortBooks(books, sort) {
    const sorted = [...books];
    switch (sort) {
        case "title": return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        case "title-desc": return sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        case "year": return sorted.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
        case "year-asc": return sorted.sort((a, b) => (a.publication_year || 0) - (b.publication_year || 0));
        case "available": return sorted.sort((a, b) => (b.available_copies || 0) - (a.available_copies || 0));
        default: return sorted;
    }
}

// ============================================================
// 🚨 CAROUSEL HELPER
// ============================================================
function renderCarousel(imagesJson, title) {
    if (!imagesJson) return null;
    try {
        const images = JSON.parse(imagesJson);
        if (!images || images.length === 0) return null;

        const carouselId = `carousel-${Math.random().toString(36).substr(2, 9)}`;
        const imgTags = images.map((img, i) => 
            `<img src="/uploads/books/${img}" class="carousel-img" style="display: ${i === 0 ? 'block' : 'none'}; width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(title)}">`
        ).join("");

        const controls = images.length > 1 ? `
            <button class="carousel-btn prev" onclick="event.stopPropagation(); moveCarousel('${carouselId}', -1)">❮</button>
            <button class="carousel-btn next" onclick="event.stopPropagation(); moveCarousel('${carouselId}', 1)">❯</button>
        ` : "";

        return `
            <div class="carousel-container" id="${carouselId}" data-index="0" data-total="${images.length}">
                ${imgTags}
                ${controls}
            </div>
        `;
    } catch(e) {
        return null;
    }
}

// ============================================================
// 🚨 AUTO SLIDESHOW LOGIC
// ============================================================
window.moveCarousel = function(carouselId, direction) {
    const el = document.getElementById(carouselId);
    if (!el) return;
    
    // I-clear muna yung lumang timer
    if (el.dataset.intervalId) {
        clearInterval(parseInt(el.dataset.intervalId));
    }

    const images = el.querySelectorAll('.carousel-img');
    let current = parseInt(el.dataset.index);
    let total = parseInt(el.dataset.total);

    images[current].style.display = 'none';
    current = (current + direction + total) % total;
    images[current].style.display = 'block';
    el.dataset.index = current;

    // I-restart yung timer pagkatapos mag-click
    startAutoSlide(el);
}

function startAutoSlide(carouselEl) {
    const total = parseInt(carouselEl.dataset.total);
    if (total <= 1) return; // Wag mag-slide kung isa lang ang picture

    if (carouselEl.dataset.intervalId) {
        clearInterval(parseInt(carouselEl.dataset.intervalId));
    }

    carouselEl.dataset.intervalId = setInterval(() => {
        // Direktang logic para hindi mag-conflict sa moveCarousel function
        const images = carouselEl.querySelectorAll('.carousel-img');
        let current = parseInt(carouselEl.dataset.index);
        
        images[current].style.display = 'none';
        current = (current + 1) % total;
        images[current].style.display = 'block';
        carouselEl.dataset.index = current;
    }, 3000); // Mag-slide every 3 seconds

    // Pause kapag tinututukan ng mouse (Hover)
    carouselEl.onmouseenter = () => {
        clearInterval(parseInt(carouselEl.dataset.intervalId));
    };

    // Resume kapag umalis yung mouse
    carouselEl.onmouseleave = () => {
        startAutoSlide(carouselEl);
    };
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
        const carouselHTML = renderCarousel(book.images, book.title);

        let availClass = "ok";
        if (avail === 0) availClass = "out";
        else if (avail <= 2) availClass = "low";

        return `
            <div class="book-card-modern" onclick="openEditModal(${book.book_id})">
                <div class="book-cover ${genreClass}">
                    ${carouselHTML ? carouselHTML : `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>`}
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
                    <button class="btn-book-action" style="background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;" onclick="event.stopPropagation(); viewCopies(${book.book_id}, '${escapeJs(book.title)}', ${book.total_copies}, ${book.available_copies})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        Copies
                    </button>
                    <button class="btn-book-action btn-book-edit" onclick="event.stopPropagation(); openEditModal(${book.book_id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit
                    </button>
                    <button class="btn-book-action btn-book-delete" onclick="event.stopPropagation(); deleteBook(${book.book_id}, '${escapeJs(book.title)}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
        const carouselHTML = renderCarousel(book.images, book.title);

        let availClass = "ok";
        if (avail === 0) availClass = "out";
        else if (avail <= 2) availClass = "low";

        return `
            <div class="book-list-item">
                <div class="book-list-cover ${genreClass}">
                    ${carouselHTML ? carouselHTML : `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>`}
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
                    <button class="btn-book-action" style="background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;" onclick="viewCopies(${book.book_id}, '${escapeJs(book.title)}', ${book.total_copies}, ${book.available_copies})" title="View Copies">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </button>
                    <button class="btn-book-action btn-book-edit" onclick="openEditModal(${book.book_id})" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-book-action btn-book-delete" onclick="deleteBook(${book.book_id}, '${escapeJs(book.title)}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// ============================================================
// GET GENRE CLASS
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
// VIEW COPIES MODAL
// ============================================================
function viewCopies(bookId, title, totalCopies, availableCopies) {
    const borrowed = totalCopies - availableCopies;
    let copiesHTML = "";
    for (let i = 1; i <= totalCopies; i++) {
        const copyId = `BK-${String(bookId).padStart(3, '0')}-C${String(i).padStart(2, '0')}`;
        const isBorrowed = i <= borrowed;
        const statusText = isBorrowed ? "Borrowed" : "Available";
        const statusStyle = isBorrowed 
            ? "background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700;" 
            : "background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700;";

        copiesHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-weight: 700; font-family: monospace; font-size: 14px; color: #0f172a; letter-spacing: 0.5px;">${copyId}</div>
                <span style="${statusStyle}">${statusText}</span>
            </div>
        `;
    }

    const modalHTML = `
        <div class="modal-overlay" id="copiesModal" style="display: flex; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
            <div class="modal" style="background: white; border-radius: 16px; max-width: 420px; width: 100%; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: fadeIn 0.3s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h2 style="font-size: 18px; color: #0f172a; margin: 0; font-weight: 800;">Book Copies</h2>
                    <button onclick="document.getElementById('copiesModal').remove()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8;">✕</button>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 20px; font-weight: 600; line-height: 1.4;">${escapeHtml(title)}</p>
                
                <div style="max-height: 300px; overflow-y: auto; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    ${copiesHTML}
                </div>
                
                <button onclick="document.getElementById('copiesModal').remove()" style="width: 100%; padding: 12px; background: #f1f5f9; border: none; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Close</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================
// ADD/EDIT MODAL
// ============================================================
function openAddModal() {
    document.getElementById("modalTitle").textContent = "Add New Book";
    document.getElementById("bookForm").reset();
    document.getElementById("bookId").value = "";
    document.getElementById("total_copies").value = 1;
    
    const imageInput = document.getElementById("book_images");
    if (imageInput) imageInput.value = "";

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

    const imageInput = document.getElementById("book_images");
    if (imageInput) imageInput.value = "";

    document.getElementById("bookModal").classList.add("active");
}

function closeModal() {
    document.getElementById("bookModal").classList.remove("active");
}

// ============================================================
// SAVE BOOK (Add or Edit) — Using FormData
// ============================================================
document.getElementById("bookForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const bookId = document.getElementById("bookId").value;
    
    const formData = new FormData();
    formData.append("title", document.getElementById("title").value.trim());
    formData.append("author_name", document.getElementById("author_name").value.trim());
    formData.append("isbn", document.getElementById("isbn").value.trim());
    formData.append("genre", document.getElementById("genre").value.trim());
    formData.append("publication_year", document.getElementById("publication_year").value);
    formData.append("publisher", document.getElementById("publisher").value.trim());
    formData.append("total_copies", parseInt(document.getElementById("total_copies").value) || 1);
    formData.append("location", document.getElementById("location").value.trim());

    const imageInput = document.getElementById("book_images");
    if (imageInput && imageInput.files.length > 0) {
        for (let i = 0; i < imageInput.files.length; i++) {
            formData.append("images", imageInput.files[i]);
        }
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        let url = bookId ? `/api/books/${bookId}` : "/api/books";
        let method = bookId ? "PUT" : "POST";

        const response = await fetch(url, { method: method, body: formData });
        const result = await response.json();

        if (result && result.success) {
            showToast(bookId ? "Book updated!" : "Book added!", "success");
            closeModal();
            loadBooks();
        } else {
            showToast(result?.error || "Failed to save", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Connection error", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Book";
    }
});

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
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/\\/g, "\\\\");
}

document.getElementById("bookModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
});