// Settings page controller

const tokenInput = document.getElementById('apiToken');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');

// Load existing token
chrome.storage.local.get('apifyApiToken', (result) => {
  if (result.apifyApiToken) {
    tokenInput.value = result.apifyApiToken;
  }
});

saveBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  chrome.storage.local.set({ apifyApiToken: token }, () => {
    toast.className = 'toast success';
    setTimeout(() => {
      toast.className = 'toast';
    }, 2000);
  });
});

tokenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
