// ============================================================
// MEMBERS PAGE LOGIC — Modern Admin Panel
// ============================================================

let allMembers = [];
let currentSearchTerm = "";
let currentType = "";
let currentGrade = "";
let currentSort = "name";

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    loadMembers();
    setupFilters();
});

// ============================================================
// LOAD MEMBERS FROM API
// ============================================================
async function loadMembers() {
    const container = document.getElementById("membersContainer");
    container.innerHTML = '<div class="loading-state">Loading members...</div>';

    try {
        const members = await apiGet("/api/members");
        if (!members) return;

        allMembers = members;
        updateStats();
        renderMembers();
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="loading-state">Error loading members</div>';
    }
}

// ============================================================
// UPDATE STATS CARDS
// ============================================================
function updateStats() {
    const total = allMembers.length;
    const students = allMembers.filter(m => m.member_type === "Student").length;
    const faculty = allMembers.filter(m => m.member_type === "Faculty").length;
    const community = allMembers.filter(m => m.member_type === "Community").length;

    animateNumber("statTotalCount", total);
    animateNumber("statStudentCount", students);
    animateNumber("statFacultyCount", faculty);
    animateNumber("statCommunityCount", community);
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 600;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ============================================================
// FILTER BY TYPE (Clicking a stat card)
// ============================================================



function filterByType(type, cardEl) {
    // Toggle: if same type clicked, clear it
    if (currentType === type) {
        currentType = "";
        document.querySelectorAll(".member-stat-card").forEach(c => c.classList.remove("active"));
        document.getElementById("typeFilter").value = "";
    } else {
        currentType = type;
        document.querySelectorAll(".member-stat-card").forEach(c => c.classList.remove("active"));
        if (cardEl) cardEl.classList.add("active");
        document.getElementById("typeFilter").value = type;
    }
    renderMembers();
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
        searchTimeout = setTimeout(renderMembers, 250);
    });

    // Type filter dropdown
    document.getElementById("typeFilter").addEventListener("change", function () {
        currentType = this.value;
        // Update active card
        document.querySelectorAll(".member-stat-card").forEach(c => c.classList.remove("active"));
        if (currentType) {
            const cardMap = {
                "Student": "statStudent",
                "Faculty": "statFaculty",
                "Community": "statCommunity",
            };
            const cardId = cardMap[currentType];
            if (cardId) document.getElementById(cardId).classList.add("active");
        }
        renderMembers();
    });

        // Sort
    document.getElementById("sortSelect").addEventListener("change", function () {
        currentSort = this.value;
        renderMembers();
    });

    // Grade filter
    const gradeFilterEl = document.getElementById("gradeFilter");
    if (gradeFilterEl) {
        gradeFilterEl.addEventListener("change", function () {
            currentGrade = this.value;
            renderMembers();
        });
    }
}

// ============================================================
// CLEAR SEARCH
// ============================================================
function clearSearch() {
    document.getElementById("searchInput").value = "";
    currentSearchTerm = "";
    document.getElementById("clearBtn").style.display = "none";
    renderMembers();
}

// ============================================================
// FILTER + SORT + RENDER
// ============================================================
function renderMembers() {
    const container = document.getElementById("membersContainer");

    // Filter
        let members = allMembers.filter(m => {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        const matchesSearch = !currentSearchTerm ||
            fullName.includes(currentSearchTerm.toLowerCase()) ||
            (m.email || "").toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (m.contact_number || "").includes(currentSearchTerm) ||
            String(m.member_id).includes(currentSearchTerm);

        const matchesType = !currentType || m.member_type === currentType;

        // Grade filter: if "below-9" or "9-and-above", filter by grade range
        let matchesGrade = true;
        if (currentGrade === "below-9") {
            matchesGrade = ["Grade 7", "Grade 8"].includes(m.grade_level);
        } else if (currentGrade === "9-and-above") {
            matchesGrade = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"].includes(m.grade_level);
        } else if (currentGrade === "unassigned") {
            matchesGrade = !m.grade_level;
        } else if (currentGrade) {
            matchesGrade = m.grade_level === currentGrade;
        }

        return matchesSearch && matchesType && matchesGrade;
    });

    // Sort
    members = sortMembers(members, currentSort);

    // Empty state
    if (members.length === 0) {
        container.innerHTML = `
            <div class="members-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <h3>No members found</h3>
                <p>${currentSearchTerm || currentType ? "Try different search or filters" : "Add your first member to get started"}</p>
            </div>
        `;
        return;
    }

    // Render table
    container.innerHTML = `
        <div class="members-table-wrapper">
            <table class="members-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Member</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>Fines</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${members.map(m => renderMemberRow(m)).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderMemberRow(m) {
    const initials = ((m.first_name || "?")[0] + (m.last_name || "?")[0]).toUpperCase();
    const fullName = `${m.first_name} ${m.last_name}`;
    const typeClass = (m.member_type || "Student").toLowerCase();
    const hasFines = Number(m.total_fines) > 0;
    const finesText = `₱${Number(m.total_fines).toFixed(2)}`;

    // Type icons
    const typeIcons = {
        student: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>`,
        faculty: `<path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle>`,
        community: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>`,
    };

    const finesIcon = hasFines
        ? `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`
        : `<polyline points="20 6 9 17 4 12"></polyline>`;

    return `
        <tr>
            <td data-label="ID"><strong>#${m.member_id}</strong></td>
            <td data-label="Member">
                <div class="member-name-cell">
                    <div class="member-avatar ${typeClass}">${initials}</div>
                    <div>
                        <div class="member-name-text">${escapeHtml(fullName)}</div>
                        <div class="member-id-text">Member ID: #${m.member_id}</div>
                    </div>
                </div>
            </td>
            <td data-label="Contact">${escapeHtml(m.contact_number || "—")}</td>
            <td data-label="Email">${escapeHtml(m.email || "—")}</td>
            <td data-label="Type">
                <span class="member-type-badge ${typeClass}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${typeIcons[typeClass] || typeIcons.student}
                    </svg>
                    ${escapeHtml(m.member_type)}
                </span>
                ${m.grade_level ? `<div class="member-grade-text">${escapeHtml(m.grade_level)}</div>` : ""}
            </td>
            <td data-label="Fines">
                <span class="member-fines ${hasFines ? 'has-fines' : 'no-fines'}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${finesIcon}
                    </svg>
                    ${finesText}
                </span>
            </td>
            <td data-label="Actions">
                <div class="member-actions">
                    <button class="member-action-btn member-action-edit" onclick="openEditModal(${m.member_id})" title="Edit Member">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="member-action-btn member-action-delete" onclick="deleteMember(${m.member_id}, '${escapeJs(fullName)}')" title="Delete Member">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function sortMembers(members, sort) {
    const sorted = [...members];
    switch (sort) {
        case "name":
            return sorted.sort((a, b) =>
                `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
        case "name-desc":
            return sorted.sort((a, b) =>
                `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`));
        case "id":
            return sorted.sort((a, b) => b.member_id - a.member_id);
        case "id-asc":
            return sorted.sort((a, b) => a.member_id - b.member_id);
        case "fines":
            return sorted.sort((a, b) => (b.total_fines || 0) - (a.total_fines || 0));
        default:
            return sorted;
    }
}

// ============================================================
// ADD MEMBER MODAL
// ============================================================
function openAddModal() {
    document.getElementById("modalTitle").textContent = "Add New Member";
    document.getElementById("memberForm").reset();
    document.getElementById("memberId").value = "";
    document.getElementById("member_type").value = "Student";
    document.getElementById("memberModal").classList.add("active");
}

function openEditModal(memberId) {
    const m = allMembers.find(x => x.member_id === memberId);
    if (!m) return;

    document.getElementById("modalTitle").textContent = "Edit Member";
    document.getElementById("memberId").value = m.member_id;
    document.getElementById("first_name").value = m.first_name || "";
    document.getElementById("last_name").value = m.last_name || "";
    document.getElementById("contact_number").value = m.contact_number || "";
    document.getElementById("email").value = m.email || "";
    document.getElementById("member_type").value = m.member_type || "Student";
    document.getElementById("grade_level").value = m.grade_level || "";

    document.getElementById("memberModal").classList.add("active");
}

function closeModal() {
    document.getElementById("memberModal").classList.remove("active");
}

// ============================================================
// SAVE MEMBER
// ============================================================
document.getElementById("memberForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const memberId = document.getElementById("memberId").value;
    const contactValue = document.getElementById("contact_number").value.trim();
    const emailValue = document.getElementById("email").value.trim();

    // Validation
    if (contactValue && !/^\d{11}$/.test(contactValue)) {
        showToast("Contact number must be exactly 11 digits", "error");
        return;
    }

    if (emailValue) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            showToast("Please enter a valid email address", "error");
            return;
        }
    }

    const data = {
        first_name: document.getElementById("first_name").value.trim(),
        last_name: document.getElementById("last_name").value.trim(),
        contact_number: contactValue,
        email: emailValue,
        member_type: document.getElementById("member_type").value,
        grade_level: document.getElementById("grade_level").value || null,
    };

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        let result;
        if (memberId) {
            result = await apiPut(`/api/members/${memberId}`, data);
        } else {
            result = await apiPost("/api/members", data);
        }

        if (result && result.success) {
            showToast(memberId ? "Member updated!" : "Member added!", "success");
            closeModal();
            loadMembers();
        } else {
            showToast(result?.error || "Failed to save", "error");
        }
    } catch (err) {
        showToast("Connection error", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Member";
    }
});

// ============================================================
// DELETE MEMBER
// ============================================================
async function deleteMember(memberId, name) {
    const confirmed = await showConfirm({
        title: "Delete Member?",
        message: `Are you sure you want to delete member "${name}"? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
    });

    if (!confirmed) return;

    try {
        const result = await apiDelete(`/api/members/${memberId}`);
        if (result && result.success) {
            showToast("Member deleted", "success");
            loadMembers();
        } else {
            showToast(result?.error || "Cannot delete member", "error");
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
// CONTACT NUMBER: DIGITS ONLY
// ============================================================
document.getElementById("contact_number").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 11);
});

// ============================================================
// CLOSE MODAL ON OVERLAY CLICK
// ============================================================
document.getElementById("memberModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
});