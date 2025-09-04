let lastIds = new Set();

// Alarm to check every minute
chrome.runtime.onInstalled.addListener(() => {
  console.log("Creating The Alarm...");
  chrome.alarms.create("checkMail", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkMail") {
    fetchMail();
  }
});

async function fetchMail() {
  try {
    const res = await fetch("https://mail.google.com/mail/feed/atom", {
      credentials: "include",
    });
    const xmlText = await res.text();
    console.log("Extracting..")
    const entries = extractEntries(xmlText);

    const seen = new Set(lastIds);

    chrome.storage.local.get({ trackedEmails: [] }, (data) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          console.log("Checking...");
          entries.forEach((entry) => {
            const { title, id, authorEmail, summary } = entry;
            const verifiedEmail = data.trackedEmails.filter((item) =>
              item.email.includes(authorEmail)
            );
            const keywords =
              (verifiedEmail.length > 0 &&
                verifiedEmail[0].keywords.length == 0) ||
              (verifiedEmail.length > 0 &&
                verifiedEmail[0].keywords.length > 0 &&
                verifiedEmail[0].keywords.some(
                  (key) => title.includes(key) || summary.includes(key)
                ));
            if (verifiedEmail.length > 0 && !seen.has(id) && keywords) {
              lastIds.add(id);
              console.log(authorEmail);
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (authorEmail) => {
                  const audio = new Audio(chrome.runtime.getURL("sound.mp3"));
                  audio.play().catch((err) => console.log("Audio error:", err));
                  let msg = "📩 New Email from " + authorEmail;
                  let div = document.createElement("div");
                  div.innerText = msg;
                  div.style.position = "fixed";
                  div.style.bottom = "10px";
                  div.style.right = "10px";
                  div.style.backgroundColor = "#333";
                  div.style.color = "white";
                  div.style.padding = "10px 15px";
                  div.style.borderRadius = "8px";
                  div.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.3)";
                  div.style.zIndex = "999999";
                  document.body.appendChild(div);

                  setTimeout(() => div.remove(), 4000);
                },
                args: [authorEmail],
              });
            }
          });
        }
      });
    });
  } catch (err) {
    console.error("Error fetching Gmail feed:", err);
  }
}
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
