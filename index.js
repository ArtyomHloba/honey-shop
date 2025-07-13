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
    return new Promise((resolve, reject) => {
      try {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.name = "hiddenFrame";
        document.body.appendChild(iframe);

        const hiddenForm = document.createElement("form");
        hiddenForm.method = "POST";
        hiddenForm.action = GOOGLE_SCRIPT_URL;
        hiddenForm.target = "hiddenFrame";
        hiddenForm.style.display = "none";

        const fields = [
          { name: "timestamp", value: data.timestamp },
          { name: "firstName", value: data.firstName },
          { name: "lastName", value: data.lastName },
          { name: "phone", value: data.phone },
          { name: "email", value: data.email },
          { name: "comment", value: data.comment },
        ];

        fields.forEach(field => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = field.name;
          input.value = field.value || "";
          hiddenForm.appendChild(input);
        });

        document.body.appendChild(hiddenForm);

        iframe.onload = () => {
          setTimeout(() => {
            try {
              document.body.removeChild(hiddenForm);
              document.body.removeChild(iframe);

              resolve({
                success: true,
                data: {
                  status: "success",
                  message: "Дані відправлено успішно",
                },
              });
            } catch (cleanupError) {
              console.warn("Помилка очищення DOM:", cleanupError);
              resolve({
                success: true,
                data: {
                  status: "success",
                  message: "Дані відправлено",
                },
              });
            }
          }, 1000);
        };

        iframe.onerror = () => {
          try {
            document.body.removeChild(hiddenForm);
            document.body.removeChild(iframe);
          } catch (cleanupError) {
            console.warn("Помилка очищення DOM:", cleanupError);
          }
          reject(new Error("Помилка відправки форми"));
        };

        setTimeout(() => {
          if (document.body.contains(hiddenForm)) {
            reject(new Error("Таймаут відправки"));
          }
        }, 10000);

        hiddenForm.submit();
      } catch (error) {
        console.error("Помилка при відправці в Google Sheets:", error);
        reject(error);
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

  // Обробник форми
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      firstName: formData.get("firstName")?.trim() || "",
      lastName: formData.get("lastName")?.trim() || "",
      phone: formData.get("phone")?.trim() || "",
      email: formData.get("email")?.trim() || "",
      comment: formData.get("comment")?.trim() || "",
      timestamp: new Date().toLocaleString("uk-UA"),
    };

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
      await sendToGoogleSheets(data);

      showMessage(
        "✅ Дякуємо! Ваша заявка відправлена. Ми зв'яжемося з вами найближчим часом.",
        "success"
      );

      form.reset();
    } catch (error) {
      console.error("Помилка відправки:", error);
      showMessage(
        "❌ Сталася помилка при відправці заявки. Спробуйте ще раз або зв'яжіться з нами по телефону.",
        "error"
      );
    } finally {
      setLoadingState(false);
    }
  });

  // Форматування телефону
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

  // Плавна навігація
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
});

// Демо режим (якщо потрібно)
if (GOOGLE_SCRIPT_URL === "ВАШ_URL_ВЕБ_ДОДАТКА_ТУТАЈ") {
  console.warn(
    "⚠️ Google Apps Script URL не налаштовано. Працює в демо режимі."
  );
}
