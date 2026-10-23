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
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    await loadMemberInfo();
    await loadNotifications(); 
    switchTab("dashboard");

    // 🚨 AUTO-POLLING: Magche-check ng notification every 10 seconds
    setInterval(() => {
        loadNotifications();
    }, 10000); 
});

// ============================================================
// LOAD MEMBER INFO (Updated for Profile Picture)
// ============================================================
async function loadMemberInfo() {
    try {
        const response = await fetch("/api/member/me");
        if (!response.ok) {
            window.location.href = "/member-login";
            return;
        }
        currentMember = await response.json();

        document.getElementById("sidebar-name").textContent = `${currentMember.first_name} ${currentMember.last_name}`;
        document.getElementById("page-subtitle").textContent = `Welcome back, ${currentMember.first_name}!`;
        
        // Update Sidebar Avatar
        const avatarContainer = document.getElementById("sidebar-avatar");
        if (currentMember.profile_pic) {
            avatarContainer.innerHTML = `<img src="/uploads/members/${currentMember.profile_pic}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            const initials = ((currentMember.first_name[0] || "") + (currentMember.last_name[0] || "")).toUpperCase();
            avatarContainer.textContent = initials;
        }
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

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (el) el.classList.add("active");
    else {
        document.querySelectorAll(".nav-item").forEach(item => {
            const onclick = item.getAttribute("onclick") || "";
            if (onclick.includes(`'${tab}'`)) {
                item.classList.add("active");
            }
        });
    }

    const titles = {
        "dashboard": "My Dashboard",
        "browse": "Browse Books",
        "reservations": "My Reservations",
        "history": "My Borrowing History",
        "fines": "My Fines",
        "profile": "My Profile", 
    };
    document.getElementById("page-title").textContent = titles[tab] || "My Portal";

    const content = document.getElementById("content-area");
    content.innerHTML = '<div class="loading">Loading...</div>';

    if (tab === "dashboard") renderDashboard();
    else if (tab === "browse") renderBrowse();
    else if (tab === "reservations") renderReservations();
    else if (tab === "history") renderHistory();
    else if (tab === "fines") renderFines();
    else if (tab === "profile") renderProfile(); 
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
                            <td><strong>${escapeHtml(b.book_title)}</strong> <span style="color: #64748b; font-size: 12px;">(Copy #${b.copy_number || 1})</span></td>
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
// BROWSE BOOKS TAB
// ============================================================
async function renderBrowse() {
    const content = document.getElementById("content-area");

    let books = [];
    try {
        books = await (await fetch("/api/member/available-books")).json();
    } catch (err) {
        console.error(err);
    }

    // 🚨 KUNG WALANG BOOKS, DITO LANG DAPAT
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

    // 🚨 KUNG MAY BOOKS, I-RENDER YUNG CARDS
    content.innerHTML = `
        <p style="color: #64748b; margin-bottom: 20px; font-size: 14px;">
            Browse our collection. Click a book to see more details and reserve it!
        </p>
        <div class="books-grid">
            ${books.map(b => {
                const avail = b.available_copies;
                const cls = avail === 0 ? "out" : (avail <= 2 ? "low" : "");
                const images = b.images ? JSON.parse(b.images) : [];
                
                let coverHTML = "";
                if (images.length > 0) {
                    const carouselId = `car-${b.book_id}`;
                    const imgTags = images.map((img, i) => 
                        `<img src="/uploads/books/${img}" class="carousel-img" style="display: ${i === 0 ? 'block' : 'none'}; width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(b.title)}">`
                    ).join("");
                    
                    const controls = images.length > 1 ? `
                        <button class="carousel-btn prev" onclick="event.stopPropagation(); moveCarousel('${carouselId}', -1)">❮</button>
                        <button class="carousel-btn next" onclick="event.stopPropagation(); moveCarousel('${carouselId}', 1)">❯</button>
                    ` : "";

                    coverHTML = `
                        <div class="carousel-container" id="${carouselId}" data-index="0" data-total="${images.length}">
                            ${imgTags}${controls}
                        </div>
                    `;
                } else {
                    coverHTML = `
                        <div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; background: linear-gradient(135deg, #e2e8f0, #cbd5e1); color:#94a3b8;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                    `;
                }

                return `
                    <div class="book-card" onclick="openBookDetails(${b.book_id}, '${escapeJs(b.title)}', '${escapeJs(b.author_name || 'Unknown')}', ${avail}, ${b.total_copies}, '${escapeJs(b.genre || '')}', ${b.publication_year || 'null'}, '${b.images || ''}')" style="cursor: pointer;">
                        <div class="book-card-cover" style="height: 160px; overflow: hidden; border-radius: 12px 12px 0 0; position: relative;">
                            ${coverHTML}
                        </div>
                        <div class="book-card-body" style="padding: 16px;">
                            <h4 style="margin-bottom: 4px; font-size: 16px;">${escapeHtml(b.title)}</h4>
                            <p class="book-author" style="margin-bottom: 12px;">by ${escapeHtml(b.author_name || "Unknown")}</p>
                            
                            <p class="book-availability ${cls}" style="font-weight: 700; margin-bottom: 12px; font-size: 13px;">
                                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background: ${avail === 0 ? '#ef4444' : (avail <= 2 ? '#f59e0b' : '#10b981')}; margin-right: 6px;"></span>
                                ${avail} of ${b.total_copies} available
                            </p>
                            
                            <button class="btn-reserve" onclick="event.stopPropagation(); openReserveModal(${b.book_id}, '${escapeJs(b.title)}', '${escapeJs(b.author_name || "Unknown")}')" style="width: 100%;">
                                Reserve This Book
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    // 🚨 IDAGDAG ITO SA PINAKA-DULO NG renderBrowse
    document.querySelectorAll('.carousel-container').forEach(el => {
        startAutoSlide(el);
    });
}

// ============================================================
// 🚨 AUTO SLIDESHOW LOGIC (IDAGDAG SA PINAKA-BABA)
// ============================================================
window.moveCarousel = function(carouselId, direction) {
    const el = document.getElementById(carouselId);
    if (!el) return;

    // Clear existing timer
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

    // Restart timer
    startAutoSlide(el);
}

function startAutoSlide(carouselEl) {
    const total = parseInt(carouselEl.dataset.total);
    if (total <= 1) return; // Wag mag-slide kung isa lang ang picture

    if (carouselEl.dataset.intervalId) {
        clearInterval(parseInt(carouselEl.dataset.intervalId));
    }

    const intervalId = setInterval(() => {
        moveCarousel(carouselEl.id, 1);
    }, 3000); // Mag-slide every 3 seconds

    carouselEl.dataset.intervalId = intervalId;

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
            await loadNotifications(); 
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
            await loadNotifications();
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
                        <td><strong>${escapeHtml(h.book_title)}</strong> <span style="color: #64748b; font-size: 12px;">(Copy #${h.copy_number || 1})</span></td>
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
// PROFILE TAB (WITH SHOW/HIDE PASSWORD AND UPLOAD)
// ============================================================
function renderProfile() {
    const content = document.getElementById("content-area");
    
    if (!currentMember) return;

    const picPreview = currentMember.profile_pic 
        ? `<img id="prof_pic_preview" src="/uploads/members/${currentMember.profile_pic}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #e2e8f0; margin-bottom: 10px;">`
        : `<div id="prof_pic_preview" style="width: 100px; height: 100px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #64748b; margin-bottom: 10px;">${((currentMember.first_name[0] || "") + (currentMember.last_name[0] || "")).toUpperCase()}</div>`;

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            
            <!-- EDIT INFO CARD -->
            <div class="book-card" style="padding: 24px; cursor: default;">
                <h3 style="margin-bottom: 20px; font-size: 18px; color: #0f172a; display:flex; align-items:center; gap:8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Personal Information
                </h3>
                
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    ${picPreview}
                    <div>
                        <label for="prof_pic_input" style="display: inline-block; padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: #475569;">
                            Choose Image
                        </label>
                        <input type="file" id="prof_pic_input" accept="image/*" style="display: none;" onchange="previewProfilePic(this)">
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Optional. Max 2MB.</p>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Email (Read-only)</label>
                    <input type="email" value="${escapeHtml(currentMember.email)}" readonly style="background:#f1f5f9; cursor:not-allowed; border-color:#e2e8f0; color:#64748b;">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Username (Read-only)</label>
                    <input type="text" value="${escapeHtml(currentMember.username)}" readonly style="background:#f1f5f9; cursor:not-allowed; border-color:#e2e8f0; color:#64748b;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" id="prof_first_name" value="${escapeHtml(currentMember.first_name)}">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" id="prof_last_name" value="${escapeHtml(currentMember.last_name)}">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Contact Number</label>
                    <input type="tel" id="prof_contact" value="${escapeHtml(currentMember.contact_number || '')}">
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label>Section (Optional)</label>
                    <input type="text" id="prof_section" value="${escapeHtml(currentMember.section || '')}" placeholder="e.g., STEM A">
                </div>

                <button class="btn-reserve" onclick="saveProfile()" style="width: 100%;">Save Changes</button>
            </div>

            <!-- SECURITY CARD -->
            <div class="book-card" style="padding: 24px; cursor: default; height: fit-content;">
                <h3 style="margin-bottom: 20px; font-size: 18px; color: #0f172a; display:flex; align-items:center; gap:8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Change Password
                </h3>
                
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>Current Password</label>
                    <div class="password-wrapper">
                        <input type="password" id="old_password" placeholder="Enter current password">
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('old_password', this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>New Password</label>
                    <div class="password-wrapper">
                        <input type="password" id="new_password" placeholder="At least 6 characters">
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('new_password', this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label>Confirm New Password</label>
                    <div class="password-wrapper">
                        <input type="password" id="confirm_password" placeholder="Re-enter new password">
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('confirm_password', this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>

                <button class="btn-reserve" style="width: 100%; background: linear-gradient(135deg, #0f172a, #334155);" onclick="changePassword()">Update Password</button>
            </div>

        </div>
    `;
}

window.previewProfilePic = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('prof_pic_preview');
            if (preview.tagName === 'IMG') {
                preview.src = e.target.result;
            } else {
                preview.outerHTML = `<img id="prof_pic_preview" src="${e.target.result}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #e2e8f0; margin-bottom: 10px;">`;
            }
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProfile() {
    const fileInput = document.getElementById("prof_pic_input");
    
    const formData = new FormData();
    formData.append("first_name", document.getElementById("prof_first_name").value.trim());
    formData.append("last_name", document.getElementById("prof_last_name").value.trim());
    formData.append("contact_number", document.getElementById("prof_contact").value.trim());
    formData.append("section", document.getElementById("prof_section").value.trim());
    
    if (fileInput && fileInput.files.length > 0) {
        formData.append("profile_pic", fileInput.files[0]);
    }

    if (!formData.get("first_name") || !formData.get("last_name")) {
        showToast("First and Last Name are required", "error");
        return;
    }

    const confirmed = await showConfirm({
        title: "Save Changes?",
        message: "Are you sure you want to update your profile information?",
        confirmText: "Yes, Save",
        cancelText: "Cancel",
        type: "success" 
    });

    if (!confirmed) return; 

    try {
        const res = await fetch("/api/member/profile", {
            method: "PUT",
            body: formData 
        });
        const result = await res.json();

        if (result.success) {
            showToast("Profile updated successfully!", "success");
            await loadMemberInfo(); 
            renderProfile(); 
        } else {
            showToast(result.error || "Failed to update profile", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Connection error", "error");
    }
}

async function changePassword() {
    const oldPass = document.getElementById("old_password").value;
    const newPass = document.getElementById("new_password").value;
    const confirmPass = document.getElementById("confirm_password").value;

    if (!oldPass || !newPass || !confirmPass) {
        showToast("Please fill in all password fields", "error");
        return;
    }
    if (newPass !== confirmPass) {
        showToast("New passwords do not match", "error");
        return;
    }
    if (newPass.length < 6) {
        showToast("New password must be at least 6 characters", "error");
        return;
    }

    try {
        const res = await fetch("/api/member/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass })
        });
        const result = await res.json();

        if (result.success) {
            showToast("Password changed successfully!", "success");
            document.getElementById("old_password").value = "";
            document.getElementById("new_password").value = "";
            document.getElementById("confirm_password").value = "";
        } else {
            showToast(result.error || "Failed to change password", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    }
}

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const svg = btn.querySelector('svg');
    
    if (input.type === "password") {
        input.type = "text";
        svg.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
        btn.style.color = "#0f172a";
    } else {
        input.type = "password";
        svg.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
        btn.style.color = "#94a3b8";
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


// ============================================================
// RESERVATION DATE & TIME VALIDATION
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    const dateInput = document.getElementById("reserveDate");
    const timeInput = document.getElementById("reserveTime");

    if (!dateInput) return;

    function setMinDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }
    setMinDate();

    dateInput.addEventListener("change", function () {
        if (!this.value) return;
        const selected = new Date(this.value + "T00:00:00");
        const day = selected.getDay(); 

        if (day === 0 || day === 6) {
            if (typeof showToast === "function") {
                showToast("Library is CLOSED on weekends. Please pick a weekday (Mon-Fri).", "error");
            } else {
                alert("❌ Library is CLOSED on weekends. Please pick a weekday (Mon-Fri).");
            }
            this.value = ""; 
        }
    });

    if (timeInput) {
        timeInput.addEventListener("change", function () {
            if (!this.value) return;
            const [hours, minutes] = this.value.split(":").map(Number);
            const totalMin = hours * 60 + minutes;
            const openMin = 7 * 60;   
            const closeMin = 19 * 60; 

            if (totalMin < openMin || totalMin >= closeMin) {
                if (typeof showToast === "function") {
                    showToast("Library hours are 7:00 AM to 7:00 PM only.", "error");
                } else {
                    alert("❌ Library hours are 7:00 AM to 7:00 PM only.");
                }
                this.value = ""; 
            }
        });
    }
});


// ============================================================
// 🚨 NOTIFICATIONS LOGIC (With Read Status)
// ============================================================
async function loadNotifications() {
    try {
        const res = await fetch("/api/member/notifications");
        let notifs = await res.json();

        // ========================================================
        // 🚨 1. SIDEBAR BADGE LOGIC (Laging nakikita kung may Pending/Ready)
        // ========================================================
        const sidebarBadge = document.getElementById("res-sidebar-badge");
        const activeCount = notifs.filter(n => n.type === 'pending' || n.type === 'ready').length;

        if (sidebarBadge) {
            if (activeCount > 0) {
                sidebarBadge.style.display = "inline-block";
                sidebarBadge.textContent = activeCount;
            } else {
                sidebarBadge.style.display = "none";
            }
        }

        // ========================================================
        // 🚨 2. BELL NOTIFICATION LOGIC (Nawawala pag clinick)
        // ========================================================
        // Kunin yung mga naclick/nabasa na
        const readNotifs = JSON.parse(localStorage.getItem('readNotifs') || '[]');
        
        // I-filter out yung mga nabasa na
        const activeNotifs = notifs.filter(n => !readNotifs.includes(n.id));

        const badge = document.getElementById("notif-badge");
        const dropdown = document.getElementById("notif-dropdown");
        
        if (activeNotifs.length > 0) {
            badge.style.display = "flex";
            badge.textContent = activeNotifs.length;
            
            dropdown.innerHTML = activeNotifs.map(n => `
                <div class="notif-item" onclick="handleNotifClick('${n.tab}', '${n.id}')">
                    <div class="notif-icon ${n.type}">
                        ${n.type === 'ready' ? '✅' : (n.type === 'pending' ? '⏳' : '📚')}
                    </div>
                    <div class="notif-content">
                        <p>${n.message}</p>
                    </div>
                </div>
            `).join("");
        } else {
            badge.style.display = "none";
            dropdown.innerHTML = `<div style="padding: 15px; text-align: center; color: #64748b; font-size: 13px;">No new notifications</div>`;
        }
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function toggleNotifications(event) {
    event.stopPropagation(); // Para hindi mag-close agad
    const dropdown = document.getElementById("notif-dropdown");
    dropdown.classList.toggle("show");
}

function handleNotifClick(tab, notifId) {
    // I-save sa localStorage
    let readNotifs = JSON.parse(localStorage.getItem('readNotifs') || '[]');
    if (!readNotifs.includes(notifId)) {
        readNotifs.push(notifId);
        localStorage.setItem('readNotifs', JSON.stringify(readNotifs));
    }

    document.getElementById("notif-dropdown").classList.remove("show");
    
    // I-refresh yung notifications para mawala yung badge/number agad
    loadNotifications(); 

    // Hanapin yung sidebar link para mag-highlight
    const navItems = document.querySelectorAll('.nav-item');
    let targetEl = null;
    navItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${tab}'`)) {
            targetEl = item;
        }
    });
    switchTab(tab, targetEl);
}

// Isara ang dropdown pag clinick sa labas
window.addEventListener('click', function(e) {
    const dropdown = document.getElementById("notif-dropdown");
    const btn = document.querySelector('.notif-btn');
    if (dropdown && dropdown.classList.contains('show') && !btn.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});