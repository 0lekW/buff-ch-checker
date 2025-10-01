const akMetricSelect = document.getElementById('akMetric');
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

// Load current setting
browser.storage.local.get('akMetric').then((result) => {
  if (result.akMetric) {
    akMetricSelect.value = result.akMetric;
  }
});

saveButton.addEventListener('click', () => {
  const akMetric = akMetricSelect.value;
  
  browser.storage.local.set({ akMetric: akMetric }).then(() => {
    statusDiv.textContent = 'Saved!';
    statusDiv.className = 'status success';
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
});