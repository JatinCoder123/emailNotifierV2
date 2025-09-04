
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("emailInput");
  const keywordInput = document.getElementById("keywordInput");
  const addBtn = document.getElementById("addBtn");
  const emailList = document.getElementById("emailList");

  // Render emails from storage
  function renderList(items) {
    emailList.innerHTML = "";
    items.forEach((item, index) => {
      const li = document.createElement("li");

      const emailText = document.createElement("div");
      emailText.className = "email-text";

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.textContent = "📩";

      const span = document.createElement("span");
      span.textContent = item.email;

      emailText.appendChild(icon);
      emailText.appendChild(span);

      li.appendChild(emailText);

      // Add keywords if available
      if (item.keywords && item.keywords.length > 0) {
        const keywordsDiv = document.createElement("div");
        keywordsDiv.className = "keywords";
        keywordsDiv.textContent = "Keywords: " + item.keywords.join(", ");
        li.appendChild(keywordsDiv);
      }

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.className = "delete-btn";
      delBtn.addEventListener("click", () => deleteEmail(index));

      li.appendChild(delBtn);
      emailList.appendChild(li);
    });
  }

  // Load stored emails initially
  chrome.storage.local.get({ trackedEmails: [] }, (data) => {
    renderList(data.trackedEmails);
  });

  // Add new email
  addBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    if (!email) return;

    const keywords = keywordInput.value
      .split(",")
      .map(k => k.trim())
      .filter(k => k !== ""); // remove empty strings

    chrome.storage.local.get({ trackedEmails: [] }, (data) => {
      const updated = [...data.trackedEmails, { email, keywords }];
      chrome.storage.local.set({ trackedEmails: updated }, () => {
        renderList(updated);
        emailInput.value = "";
        keywordInput.value = "";
      });
    });
  });

  // Delete email by index
  function deleteEmail(index) {
    chrome.storage.local.get({ trackedEmails: [] }, (data) => {
      const updated = data.trackedEmails.filter((_, i) => i !== index);
      chrome.storage.local.set({ trackedEmails: updated }, () => {
        renderList(updated);
      });
    });
  }
});
