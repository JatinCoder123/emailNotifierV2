// Alarm to check every minute (20s in your case)
chrome.runtime.onInstalled.addListener(() => {
  console.log("Creating The Alarm...");
  chrome.alarms.create("checkMail", { periodInMinutes: 1 });
});

// On alarm trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkMail") {
    console.log("Fetching the mails...");
    fetchMail();
  }
});

async function fetchMail() {
  try {
    const res = await fetch("https://mail.google.com/mail/feed/atom", {
      credentials: "include",
    });
    console.log("Get The XmlText...");
    const xmlText = await res.text();
    console.log("Extracting..");
    const entries = extractEntries(xmlText);
    console.log(entries);

    // Load seen IDs from storage
    chrome.storage.local.get({ lastIds: [], trackedEmails: [] }, (data) => {
      const seen = new Set(data.lastIds || []);
      console.log(seen);
      console.log("Checking...");
      let newIds = [...seen]; // copy existing

      entries.forEach((entry) => {
        const { title, id, authorEmail, summary } = entry;
        const normalizedTitle = title.toLowerCase();
        const normalizedSummary = summary.toLowerCase();

        // Check if the email is tracked
        const tracked = data.trackedEmails.find(
          (item) => item.email.toLowerCase() === authorEmail.toLowerCase()
        );

        if (!tracked) return; // skip if not tracked

        // Check keyword match
        const keywords = tracked.keywords;
        const keywordMatch =
          keywords.length === 0 || // no keywords means match all
          keywords.some(
            (key) =>
              normalizedTitle.includes(key.toLowerCase()) ||
              normalizedSummary.includes(key.toLowerCase())
          );

        // Notify if new email
        if (!seen.has(id) && keywordMatch) {
          console.log("New email from:", authorEmail);

          newIds.push(id);
          notifyInTabs(authorEmail);

          // notifyUser(authorEmail); // optional, if needed
        }
      });

      // Keep only last 50 IDs
      if (newIds.length > 50) {
        newIds = newIds.slice(-50);
      }
      // Save updated IDs back to storage
      chrome.storage.local.set({ lastIds: newIds });
    });
  } catch (err) {
    console.error("Error fetching Gmail feed:", err);
  }
}

// Helper to extract mail entries
function extractEntries(xmlText) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xmlText))) {
    const block = match[1];
    const id = block.match(/<id>(.*?)<\/id>/)?.[1] || "";
    const title = block.match(/<title.*?>(.*?)<\/title>/)?.[1] || "";
    const summary = block.match(/<summary.*?>(.*?)<\/summary>/)?.[1] || "";
    const authorEmail =
      block.match(/<email>(.*?)<\/email>/)?.[1]?.toLowerCase() || "";
    entries.push({ id, title, authorEmail, summary });
  }
  return entries;
}
function notifyUser(authorEmail) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icon128.png", // put an icon in your extension folder
      title: "📩 New Email",
      message: "New Email from " + authorEmail,
      priority: 2,
    },
    (notificationId) => {
      console.log("Notification shown:", notificationId);
    }
  );
}
function notifyInTabs(authorEmail) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (authorEmail) => {
            const msg = "📩 New Email from " + authorEmail;
            const div = document.createElement("div");
            div.innerText = msg;
            div.style.position = "fixed";
            div.style.bottom = "10px";
            div.style.right = "10px";
            div.style.background = "#333";
            div.style.color = "white";
            div.style.padding = "10px 15px";
            div.style.borderRadius = "8px";
            div.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.3)";
            div.style.zIndex = "999999";
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 4000);

            const audio = new Audio(chrome.runtime.getURL("sound.mp3"));
            audio.volume = 0.7;
            audio.play().catch((err) => console.log("Sound blocked:", err));
          },
          args: [authorEmail], // 👈 only first tab gets true
        });
      }
    });
  });
}
// function notifyInTabs(authorEmail) {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     if (tabs.length === 0) return;

//     const activeTab = tabs[0];

//     // Inject script into active tab to play sound and show message
//     chrome.scripting.executeScript({
//       target: { tabId: activeTab.id },
//       func: (authorEmail) => {
//         // 🔊 Play sound
//         const audio = new Audio(chrome.runtime.getURL("sound.mp3"));
//         audio.volume = 0.7;
//         audio.play().catch((err) => console.log("Sound blocked:", err));

//         // 📩 Show message
//         const msg = "📩 New Email from " + authorEmail;
//         const div = document.createElement("div");
//         div.innerText = msg;
//         Object.assign(div.style, {
//           position: "fixed",
//           bottom: "10px",
//           right: "10px",
//           background: "#333",
//           color: "white",
//           padding: "10px 15px",
//           borderRadius: "8px",
//           boxShadow: "0px 2px 8px rgba(0,0,0,0.3)",
//           zIndex: "999999",
//         });
//         document.body.appendChild(div);
//         setTimeout(() => div.remove(), 4000);
//       },
//       args: [authorEmail],
//     });

//     // Inject message div into all other tabs (no sound)
//     chrome.tabs.query({}, (allTabs) => {
//       allTabs.forEach((tab) => {
//         if (tab.id !== activeTab.id) {
//           chrome.scripting.executeScript({
//             target: { tabId: tab.id },
//             func: (authorEmail) => {
//               const msg = "📩 New Email from " + authorEmail;
//               const div = document.createElement("div");
//               div.innerText = msg;
//               Object.assign(div.style, {
//                 position: "fixed",
//                 bottom: "10px",
//                 right: "10px",
//                 background: "#333",
//                 color: "white",
//                 padding: "10px 15px",
//                 borderRadius: "8px",
//                 boxShadow: "0px 2px 8px rgba(0,0,0,0.3)",
//                 zIndex: "999999",
//               });
//               document.body.appendChild(div);
//               setTimeout(() => div.remove(), 4000);
//             },
//             args: [authorEmail],
//           });
//         }
//       });
//     });
//   });
// }
