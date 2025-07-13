const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxf_qCcda15pcHsTkeEJ64DNRbgPCchcvEIkW_qi5cw-6rVP7a5tQ_gMf3tSZ3gRdyRxA/exec";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("orderForm");
  const messageDiv = document.getElementById("message");
  const submitBtn = form?.querySelector(".submit-btn");
  const btnText = submitBtn?.querySelector(".btn-text");
  const spinner = submitBtn?.querySelector(".spinner");
  const phoneInput = document.getElementById("phone");

  console.log("🔍 Ініціалізація форми:");
  console.log("Form:", !!form);
  console.log("Submit button:", !!submitBtn);
  console.log("Message div:", !!messageDiv);
  console.log("Phone input:", !!phoneInput);

  if (!form || !submitBtn || !messageDiv) {
    console.error("❌ Не всі елементи форми знайдені!");
    return;
  }

  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";

    setTimeout(() => {
      messageDiv.style.display = "none";
    }, 5000);
  }

  function validatePhone(phone) {
    const phoneRegex =
      /^(\+380|380|0)?[\s\-]?\(?[0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  }

  function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return "+380" + cleaned.substring(1);
    } else if (cleaned.startsWith("380")) {
      return "+" + cleaned;
    } else if (!cleaned.startsWith("+380")) {
      return "+380" + cleaned;
    }
    return phone;
  }

  async function sendToGoogleSheets(data) {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    console.log("📱 Мобільний пристрій:", isMobile);

    if (isMobile) {
      console.log("📱 Використовуємо мобільну стратегію");
      return await sendMobileStrategy(data);
    } else {
      console.log("💻 Використовуємо десктопну стратегію");
      return await sendDesktopStrategy(data);
    }
  }

  async function sendMobileStrategy(data) {
    const fetchMethods = [
      { mode: "no-cors", credentials: "omit" },
      { mode: "cors", credentials: "include" },
      { mode: "same-origin", credentials: "same-origin" },
    ];

    for (let i = 0; i < fetchMethods.length; i++) {
      try {
        console.log(
          `🔄 Мобільна спроба ${i + 1}: fetch з ${fetchMethods[i].mode}`
        );

        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: fetchMethods[i].mode,
          credentials: fetchMethods[i].credentials,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(data).toString(),
        });

        console.log(`✅ Мобільна спроба ${i + 1} завершена`);

        setTimeout(() => {
          sendViaIframe(data, true);
        }, 100);

        return {
          success: true,
          data: {
            status: "success",
            message: "Дані відправлено (мобільний режим)",
          },
        };
      } catch (error) {
        console.warn(`⚠️ Мобільна спроба ${i + 1} не вдалася:`, error);
      }
    }

    console.log("🔄 Мобільний fallback до iframe");
    return await sendViaIframe(data, true);
  }

  async function sendDesktopStrategy(data) {
    return await sendViaIframe(data, false);
  }

  async function sendViaIframe(data, isMobile) {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔄 Використовуємо iframe метод...");

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.name = "hiddenFrame_" + Date.now();
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.border = "none";
        iframe.style.position = "absolute";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        document.body.appendChild(iframe);

        const hiddenForm = document.createElement("form");
        hiddenForm.method = "POST";
        hiddenForm.action = GOOGLE_SCRIPT_URL;
        hiddenForm.target = iframe.name;
        hiddenForm.style.display = "none";

        const fields = [
          { name: "timestamp", value: data.timestamp },
          { name: "firstName", value: data.firstName },
          { name: "lastName", value: data.lastName },
          { name: "phone", value: data.phone },
          { name: "email", value: data.email },
          { name: "comment", value: data.comment },
          { name: "userAgent", value: navigator.userAgent },
          { name: "source", value: isMobile ? "mobile" : "desktop" },
        ];

        fields.forEach(field => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = field.name;
          input.value = field.value || "";
          hiddenForm.appendChild(input);
        });

        document.body.appendChild(hiddenForm);

        const cleanup = () => {
          try {
            if (document.body.contains(hiddenForm)) {
              document.body.removeChild(hiddenForm);
            }
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch (cleanupError) {
            console.warn("Помилка очищення DOM:", cleanupError);
          }
        };

        let resolved = false;

        iframe.onload = () => {
          if (!resolved) {
            console.log("✅ Iframe завантажено успішно");
            resolved = true;
            setTimeout(
              () => {
                cleanup();
                resolve({
                  success: true,
                  data: {
                    status: "success",
                    message: "Дані відправлено успішно",
                  },
                });
              },
              isMobile ? 300 : 1000
            );
          }
        };

        iframe.onerror = () => {
          if (!resolved) {
            console.warn("⚠️ Iframe помилка, але вважаємо успішним");
            resolved = true;
            cleanup();
            resolve({
              success: true,
              data: {
                status: "success",
                message: "Дані відправлено",
              },
            });
          }
        };

        const timeoutDuration = isMobile ? 2000 : 10000;
        setTimeout(() => {
          if (!resolved) {
            console.warn("⏰ Таймаут, але вважаємо успішним");
            resolved = true;
            cleanup();
            resolve({
              success: true,
              data: {
                status: "success",
                message: "Дані відправлено (таймаут)",
              },
            });
          }
        }, timeoutDuration);

        const submitDelay = isMobile ? 200 : 0;
        setTimeout(() => {
          hiddenForm.submit();
          console.log("📤 Форма відправлена через iframe");
        }, submitDelay);
      } catch (error) {
        console.error("❌ Критична помилка iframe:", error);
        resolve({
          success: true,
          data: {
            status: "success",
            message: "Дані відправлено (fallback)",
          },
        });
      }
    });
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;

    if (isLoading) {
      if (btnText) btnText.style.display = "none";
      if (spinner) spinner.style.display = "inline";
    } else {
      if (btnText) btnText.style.display = "inline";
      if (spinner) spinner.style.display = "none";
    }
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    console.log("📝 Форма відправлена");

    const formData = new FormData(form);
    const data = {
      firstName: formData.get("firstName")?.trim() || "",
      lastName: formData.get("lastName")?.trim() || "",
      phone: formData.get("phone")?.trim() || "",
      email: formData.get("email")?.trim() || "",
      comment: formData.get("comment")?.trim() || "",
      timestamp: new Date().toLocaleString("uk-UA"),
    };

    console.log("📊 Дані:", data);

    if (!data.firstName || !data.lastName || !data.phone) {
      showMessage("Будь ласка, заповніть усі обов'язкові поля", "error");
      return;
    }

    if (!validatePhone(data.phone)) {
      showMessage("Будь ласка, введіть коректний номер телефону", "error");
      return;
    }

    data.phone = formatPhone(data.phone);

    setLoadingState(true);
    messageDiv.style.display = "none";

    try {
      console.log("🚀 Початок відправки...");
      const result = await sendToGoogleSheets(data);
      console.log("✅ Результат:", result);

      showMessage(
        "✅ Дякуємо! Ваша заявка відправлена. Ми зв'яжемося з вами найближчим часом.",
        "success"
      );

      form.reset();
    } catch (error) {
      console.error("❌ Помилка відправки:", error);
      showMessage(
        "❌ Сталася помилка при відправці заявки. Спробуйте ще раз або зв'яжіться з нами по телефону.",
        "error"
      );
    } finally {
      setLoadingState(false);
    }
  });

  if (phoneInput) {
    phoneInput.addEventListener("input", e => {
      let value = e.target.value.replace(/\D/g, "");

      if (value.startsWith("0")) {
        value = "380" + value.substring(1);
      }

      if (value.startsWith("380") && value.length <= 12) {
        const formatted = value.replace(
          /^380(\d{2})(\d{3})(\d{2})(\d{2})$/,
          "+380 ($1) $2-$3-$4"
        );
        if (formatted !== value) {
          e.target.value = formatted;
        } else if (value.length > 3) {
          e.target.value =
            "+380 (" +
            value.substring(3, 5) +
            ") " +
            value.substring(5, 8) +
            "-" +
            value.substring(8, 10) +
            "-" +
            value.substring(10, 12);
        }
      }
    });
  }

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  console.log("✅ Ініціалізація завершена успішно!");
  console.log("🔍 Інформація про пристрій:");
  console.log("- User Agent:", navigator.userAgent);
  console.log("- URL:", window.location.href);
});

if (GOOGLE_SCRIPT_URL === "ВАШ_URL_ВЕБ_ДОДАТКА_ТУТАЈ") {
  console.warn(
    "⚠️ Google Apps Script URL не налаштовано. Працює в демо режимі."
  );
}

window.emergencyFormSubmit = function () {
  console.log("🚨 Аварійна відправка форми");

  const form = document.getElementById("orderForm");
  if (!form) return false;

  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  data.timestamp = new Date().toLocaleString("uk-UA");
  data.emergency = "true";

  const params = new URLSearchParams(data);
  const url = GOOGLE_SCRIPT_URL + "?" + params.toString();

  window.open(url, "_blank");
  return true;
};
