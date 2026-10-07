// ============================================================
// ADMIN LOGIN LOGIC
// ============================================================

// ============================================================
// PASSWORD TOGGLE
// ============================================================
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const eyeIcon = document.getElementById("eyeIcon");

const EYE_OPEN = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
`;

const EYE_CLOSED = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
`;


// Reset to hidden when input loses focus
passwordInput.addEventListener("blur", function () {
    if (passwordInput.type === "text") {
        passwordInput.type = "password";
        eyeIcon.innerHTML = EYE_OPEN;
        togglePassword.classList.remove("active");
        togglePassword.title = "Show password";
    }
});

togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.innerHTML = EYE_CLOSED;
        togglePassword.classList.add("active");
        togglePassword.title = "Hide password";
    } else {
        passwordInput.type = "password";
        eyeIcon.innerHTML = EYE_OPEN;
        togglePassword.classList.remove("active");
        togglePassword.title = "Show password";
    }
});


// ============================================================
// LOGIN FORM
// ============================================================
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("errorMsg");
    const btn = document.querySelector(".btn-login");
    const btnText = btn.querySelector(".btn-text");

    errorMsg.textContent = "";
    btn.disabled = true;
    if (btnText) btnText.textContent = "Signing in...";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (data.success) {
            // Show success toast before redirect
            showToast("Login successful! Welcome back.", "success", {
                title: "Welcome!",
                duration: 1500,
            });
            setTimeout(() => {
                window.location.href = data.redirect || "/dashboard";
            }, 500);
        } else {
            errorMsg.textContent = data.error || "Login failed";
            showToast(data.error || "Login failed", "error", { title: "Login Failed" });
            btn.disabled = false;
            if (btnText) btnText.textContent = "Sign In as Librarian";
        }
    } catch (err) {
        errorMsg.textContent = "Connection error. Is the server running?";
        showToast("Cannot connect to server", "error");
        btn.disabled = false;
        if (btnText) btnText.textContent = "Sign In as Librarian";
    }
});