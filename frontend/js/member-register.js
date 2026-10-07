// ============================================================
// MEMBER REGISTRATION LOGIC (with beautiful OTP modal)
// ============================================================

let registeredEmail = "";
let timerInterval = null;
let countdownSeconds = 600;  // 10 minutes
let resendSeconds = 0;

// ============================================================
// PASSWORD TOGGLES
// ============================================================
function setupPasswordToggle(toggleId, inputId, iconId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (!toggle || !input || !icon) return;

    const EYE_OPEN = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    const EYE_CLOSED = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;

    // Toggle show/hide on eye click
    toggle.addEventListener("click", function () {
        if (input.type === "password") {
            input.type = "text";
            icon.innerHTML = EYE_CLOSED;
            toggle.classList.add("active");
        } else {
            input.type = "password";
            icon.innerHTML = EYE_OPEN;
            toggle.classList.remove("active");
        }
    });

    // ⭐ NEW: Reset to hidden when input loses focus (clicking elsewhere)
    input.addEventListener("blur", function () {
        if (input.type === "text") {
            input.type = "password";
            icon.innerHTML = EYE_OPEN;
            toggle.classList.remove("active");
        }
    });
}

setupPasswordToggle("togglePassword", "password", "eyeIcon");
setupPasswordToggle("toggleConfirm", "confirm_password", "eyeIconConfirm");


// ============================================================
// CONTACT NUMBER: DIGITS ONLY
// ============================================================
document.getElementById("contact_number").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 11);
});


// ============================================================
// HIDE SECTION FIELD FOR NON-STUDENTS
// ============================================================
document.getElementById("grade_level").addEventListener("change", function () {
    const sectionGroup = document.getElementById("sectionGroup");
    const value = this.value;

    if (value === "Faculty" || value === "Community") {
        sectionGroup.style.display = "none";
        document.getElementById("section").value = "";
    } else {
        sectionGroup.style.display = "block";
    }
});


// ============================================================
// REGISTRATION FORM SUBMIT
// ============================================================
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const errorMsg = document.getElementById("errorMsg");
    const btn = document.getElementById("submitBtn");
    const btnText = btn.querySelector(".btn-text");

    errorMsg.textContent = "";

    const data = {
        first_name: document.getElementById("first_name").value.trim(),
        last_name: document.getElementById("last_name").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        contact_number: document.getElementById("contact_number").value.trim(),
        grade_level: document.getElementById("grade_level").value,
        section: document.getElementById("section").value.trim(),
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
        confirm_password: document.getElementById("confirm_password").value,
        member_type: "Student",
    };

    if (data.grade_level === "Faculty") data.member_type = "Faculty";
    if (data.grade_level === "Community") data.member_type = "Community";

    // Validation
    if (!data.first_name || !data.last_name) {
        showToast("Please enter your full name", "error");
        return;
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        showToast("Please enter a valid email", "error");
        return;
    }

    if (!data.contact_number || data.contact_number.length !== 11) {
        showToast("Contact number must be 11 digits", "error");
        return;
    }

    if (!data.grade_level) {
        showToast("Please select your grade level", "error");
        return;
    }

    if (!data.username || data.username.length < 3) {
        showToast("Username must be at least 3 characters", "error");
        return;
    }

    if (data.password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    if (data.password !== data.confirm_password) {
        showToast("Passwords do not match", "error");
        return;
    }

    btn.disabled = true;
    if (btnText) btnText.textContent = "Creating account...";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
            registeredEmail = data.email;
            document.getElementById("verifyEmail").textContent = data.email;

            showToast("Account created! Check your email for the code.", "success", {
                title: "Registration Successful",
                duration: 4000,
            });

            setTimeout(() => {
                document.getElementById("verifyModal").classList.add("active");
                clearDigits();
                startTimer();
                startResendCooldown(60);
            }, 800);
        } else {
            errorMsg.textContent = result.error || "Registration failed";
            showToast(result.error || "Registration failed", "error", { title: "Registration Failed" });
            btn.disabled = false;
            if (btnText) btnText.textContent = "Create Account";
        }
    } catch (err) {
        errorMsg.textContent = "Connection error. Is the server running?";
        showToast("Cannot connect to server", "error");
        btn.disabled = false;
        if (btnText) btnText.textContent = "Create Account";
    }
});


// ============================================================
// OTP DIGIT INPUTS — AUTO-JUMP, PASTE, ETC.
// ============================================================
const digitInputs = document.querySelectorAll(".code-digit");

digitInputs.forEach((input, index) => {
    input.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");

        if (this.value.length === 1) {
            if (index < digitInputs.length - 1) {
                digitInputs[index + 1].focus();
            } else {
                this.blur();
                setTimeout(() => tryAutoVerify(), 100);
            }
        }

        updateDigitStyles();
    });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !this.value && index > 0) {
            digitInputs[index - 1].focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            digitInputs[index - 1].focus();
        }
        if (e.key === "ArrowRight" && index < digitInputs.length - 1) {
            digitInputs[index + 1].focus();
        }
    });

    input.addEventListener("focus", function () {
        this.select();
    });

    input.addEventListener("paste", function (e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text");
        const digits = pasted.replace(/\D/g, "").slice(0, 6).split("");

        digits.forEach((digit, i) => {
            if (digitInputs[i]) {
                digitInputs[i].value = digit;
            }
        });

        const lastIndex = Math.min(digits.length, 5);
        digitInputs[lastIndex].focus();
        updateDigitStyles();

        if (digits.length === 6) {
            setTimeout(() => tryAutoVerify(), 100);
        }
    });
});

function updateDigitStyles() {
    digitInputs.forEach(inp => {
        if (inp.value) {
            inp.classList.add("filled");
        } else {
            inp.classList.remove("filled");
        }
        inp.classList.remove("error", "success");
    });
}

function getEnteredCode() {
    return Array.from(digitInputs).map(inp => inp.value).join("");
}

function clearDigits() {
    digitInputs.forEach(inp => {
        inp.value = "";
        inp.classList.remove("filled", "error", "success");
    });
    if (digitInputs[0]) digitInputs[0].focus();
}

function showDigitError() {
    digitInputs.forEach(inp => inp.classList.add("error"));
}

function showDigitSuccess() {
    digitInputs.forEach(inp => inp.classList.add("success"));
}


// ============================================================
// AUTO-VERIFY
// ============================================================
function tryAutoVerify() {
    const code = getEnteredCode();
    if (code.length === 6) {
        verifyCode();
    }
}


// ============================================================
// COUNTDOWN TIMER
// ============================================================
function startTimer() {
    clearInterval(timerInterval);
    countdownSeconds = 600;

    const timerBox = document.querySelector(".verify-timer");
    if (timerBox) timerBox.classList.remove("expired");

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        countdownSeconds--;
        updateTimerDisplay();

        if (countdownSeconds <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById("timerDisplay");
    const timerBox = document.querySelector(".verify-timer");
    if (!timerEl) return;

    if (countdownSeconds <= 0) {
        timerEl.textContent = "Expired";
        if (timerBox) timerBox.classList.add("expired");
        return;
    }

    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

    if (countdownSeconds <= 60 && timerBox) {
        timerBox.classList.add("expired");
    }
}


// ============================================================
// RESEND CODE
// ============================================================
async function resendCode() {
    const btn = document.getElementById("resendBtn");
    const text = document.getElementById("resendText");
    const errorEl = document.getElementById("verifyError");

    if (resendSeconds > 0) return;

    errorEl.textContent = "";
    btn.disabled = true;
    text.textContent = "Sending...";

    try {
        const response = await fetch("/api/auth/resend-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: registeredEmail }),
        });

        const result = await response.json();

        if (result.success) {
            showToast("New verification code sent!", "success", { title: "Code Sent" });
            clearDigits();
            startTimer();
            startResendCooldown(60);
        } else {
            errorEl.textContent = result.error || "Failed to resend";
            text.textContent = "Resend Code";
            btn.disabled = false;
        }
    } catch (err) {
        errorEl.textContent = "Connection error";
        text.textContent = "Resend Code";
        btn.disabled = false;
    }
}

function startResendCooldown(seconds) {
    resendSeconds = seconds;
    const btn = document.getElementById("resendBtn");
    const text = document.getElementById("resendText");

    btn.disabled = true;

    const interval = setInterval(() => {
        resendSeconds--;
        text.textContent = `Resend in ${resendSeconds}s`;

        if (resendSeconds <= 0) {
            clearInterval(interval);
            btn.disabled = false;
            text.textContent = "Resend Code";
        }
    }, 1000);
}


// ============================================================
// VERIFY CODE
// ============================================================
async function verifyCode() {
    const code = getEnteredCode();
    const errorEl = document.getElementById("verifyError");
    const btn = document.getElementById("verifyBtn");
    const btnText = btn.querySelector(".btn-text");

    errorEl.textContent = "";

    if (!code || code.length !== 6) {
        errorEl.textContent = "Please enter all 6 digits";
        showDigitError();
        return;
    }

    btn.disabled = true;
    if (btnText) btnText.textContent = "Verifying...";

    try {
        const response = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: registeredEmail, code: code }),
        });

        const result = await response.json();

        if (result.success) {
            showDigitSuccess();
            showToast("Email verified! Waiting for admin approval.", "success", {
                title: "Verified!",
                duration: 4000,
            });

            setTimeout(() => {
                window.location.href = "/member-login";
            }, 2500);
        } else {
            errorEl.textContent = result.error || "Invalid code";
            showDigitError();
            btn.disabled = false;
            if (btnText) btnText.textContent = "Verify Account";

            setTimeout(() => {
                digitInputs.forEach(inp => inp.classList.remove("error"));
            }, 2000);
        }
    } catch (err) {
        errorEl.textContent = "Connection error";
        btn.disabled = false;
        if (btnText) btnText.textContent = "Verify Account";
    }
}


// ============================================================
// MODAL CONTROLS
// ============================================================
function closeVerifyModal() {
    document.getElementById("verifyModal").classList.remove("active");
    clearInterval(timerInterval);
    clearDigits();
}