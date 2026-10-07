// ============================================================
// DASHBOARD LOGIC
// ============================================================

// ============================================================
// SHOW TODAY'S DATE
// ============================================================
function showTodayDate() {
    const now = new Date();
    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", options);
}

// ============================================================
// LOAD STATS FROM API
// ============================================================
async function loadStats() {
    try {
        const data = await apiGet("/api/dashboard");
        if (!data) return;

        animateNumber("stat-books", data.total_books);
        animateNumber("stat-copies", data.total_copies);
        animateNumber("stat-members", data.total_members);
        animateNumber("stat-borrowed", data.borrowed);
        animateNumber("stat-overdue", data.overdue);
        document.getElementById("stat-fines").textContent = peso(data.unpaid_fines);
    } catch (err) {
        console.error("Failed to load stats:", err);
    }
}

// ============================================================
// ANIMATE NUMBERS COUNTING UP
// ============================================================
function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const duration = 800;
    const start = performance.now();
    const startValue = 0;

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (target - startValue) * eased);
        el.textContent = current;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ============================================================
// LOAD USER INFO
// ============================================================
async function loadUser() {
    try {
        const user = await apiGet("/api/me");
        if (user) {
            document.getElementById("username-display").textContent = user.username;
        }
    } catch (err) {
        console.error("Failed to load user:", err);
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    showTodayDate();
    loadUser();
    loadStats();
});