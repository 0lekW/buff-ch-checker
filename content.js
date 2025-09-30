// Content script for Buff163 Case Hardened blue percentage display

let blueGemData = null;
let akMetric = 'top'; // default

// Load embedded JSON file and user settings
Promise.all([
  fetch(browser.runtime.getURL('blue_gem_data.json')).then(response => response.json()),
  browser.storage.local.get('akMetric')
]).then(([data, storage]) => {
  blueGemData = data;
  if (storage.akMetric) {
    akMetric = storage.akMetric;
  }
  processListings();  
  observePageChanges();
})

// Weapon name mapping from internal names to JSON keys
const weaponMapping = {
  "weapon_ak47": "ak47",
  "weapon_knife_widowmaker": "talon",
  "weapon_knife_m9_bayonet": "m9",
  "weapon_knife_butterfly": "butterfly",
  "weapon_knife_karambit": "karambit",
  "weapon_bayonet": "bayonet",
  "weapon_knife_flip": "flip",
  "weapon_knife_gut": "gut",
  "weapon_knife_push": "shadow_daggers",
  "weapon_knife_tactical": "huntsman",
  "weapon_knife_gypsy_jackknife": "navaja",
  "weapon_knife_stiletto": "stiletto",
  "weapon_knife_ursus": "ursus",
  "weapon_knife_falchion": "falchion",
  "weapon_knife_skeleton": "skeleton",
  "weapon_knife_cord": "paracord",
  "weapon_knife_survival_bowie": "bowie",
  "weapon_knife_css": "classic",
  "weapon_knife_outdoor": "nomad",
  "weapon_knife_canis": "survival",
  "weapon_knife_kukri": "kukri",
  "weapon_fiveseven": "five_seven",
  "weapon_mac10": "mac_10"
};


function getBluePercentage(weaponInternalName, paintSeed) {
  if (!blueGemData) return null;
  
  // Convert weapon internal name to JSON key
  const weaponKey = weaponMapping[weaponInternalName];
  if (!weaponKey) return null;

  const root = blueGemData.skins ? blueGemData.skins : blueGemData;
  
  // Check if weapon exists in data
  const weaponData = root[weaponKey];
  if (!weaponData || !weaponData.ch) return null;
  
  // Get pattern data for this specific seed
  const seedData = weaponData.ch[String(paintSeed)];
  if (!seedData) return null;
  
  // Return the metrics available for this pattern
  return {
    top: seedData.top || 0,
    magazine: seedData.magazine || 0,
    overall: seedData.overall || 0,
    any_blue: seedData.any_blue || 0
  };
}

function processListings() {
  // Find all listing rows
  const listings = document.querySelectorAll('tr.selling[data-asset-info][data-goods-info]');
  
  listings.forEach(listing => {
    // Check if already processed
    if (listing.dataset.chProcessed) return;
    listing.dataset.chProcessed = 'true';
    
    try {
      // Parse the JSON data
      const assetInfo = JSON.parse(listing.dataset.assetInfo);
      const goodsInfo = JSON.parse(listing.dataset.goodsInfo);
      
      // Check if it's Case Hardened
      const isCaseHardened = (goodsInfo.tags?.series?.internal_name === 'weapon_case_hardened' || goodsInfo.tags?.series?.internal_name === 'case_hardened');
      if (!isCaseHardened) return;
      
      // Get paint seed and weapon type
      const paintSeed = assetInfo.info?.paintseed;
      const weaponInternalName = goodsInfo.tags?.weapon?.internal_name;
      
      if (paintSeed === undefined || !weaponInternalName) return;
      
      // Get blue percentage
      const percentages = getBluePercentage(weaponInternalName, paintSeed);
      
      if (percentages) {
        // Find the sticker-premium div to add the blue % next to tier
        const premiumDiv = listing.querySelector('.sticker-premium');
        if (premiumDiv) {
          let primaryMetric = 'overall';
          let primaryValue = percentages.overall;

          // For AK-47, use the user's preference
          if (weaponInternalName === 'weapon_ak47') {
            primaryMetric = akMetric;
            primaryValue = percentages[akMetric];
          }
          
          // Create blue percentage badge
          const blueSpan = document.createElement('span');
          blueSpan.className = 'stag ch-blue-gem';
          
          // Color code based on blue %
          let backgroundColor = '#5299FF'; // Default blue
          if (primaryValue >= 50) {
            backgroundColor = '#00D4FF'; // Bright cyan for high tier
          } else if (primaryValue >= 30) {
            backgroundColor = '#4A90E2'; // Nice blue for mid tier
          } else if (primaryValue >= 15) {
            backgroundColor = '#5299FF'; // Standard blue
          } else {
            backgroundColor = '#7B8A99'; // Gray-blue for low tier
          }
          
          blueSpan.style.cssText = `float: left; background: ${backgroundColor}; margin-left: 5px; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500;`;
          
          // Display format: show primary metric with value
          const metricLabel = primaryMetric === 'any_blue' ? 'Blue' : primaryMetric.charAt(0).toUpperCase() + primaryMetric.slice(1);
          blueSpan.textContent = `${metricLabel}: ${primaryValue.toFixed(1)}%`;
          
          if (weaponInternalName === 'weapon_ak47') {
            // Add detailed tooltip with all metrics
            blueSpan.title = `Pattern Seed: ${paintSeed}\n` +
                            `Top: ${percentages.top.toFixed(2)}%\n` +
                            `Magazine: ${percentages.magazine.toFixed(2)}%\n` +
                            `Overall: ${percentages.overall.toFixed(2)}%\n`;
          }
          else
          {
            // For other weapons, simpler tooltip
            blueSpan.title = `Pattern Seed: ${paintSeed}\n` +
                            `Overall Blue: ${percentages.overall.toFixed(2)}%`;
          }
          
          
          premiumDiv.appendChild(blueSpan);
        }
      }
    } catch (error) {
      console.error('Error processing listing:', error);
    }
  });
}

function observePageChanges() {
  // Watch for dynamic content changes (pagination, filters, etc.)
  const observer = new MutationObserver((mutations) => {
    processListings();
  });
  
  const targetNode = document.querySelector('.list_tb_csgo') || document.body;
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

// Listen for setting updates
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.akMetric) {
    akMetric = changes.akMetric.newValue;
    
    // Clear and reprocess
    document.querySelectorAll('tr.selling[data-ch-processed]').forEach(el => {
      delete el.dataset.chProcessed;
      el.querySelectorAll('.ch-blue-gem, .ch-tier').forEach(badge => badge.remove());
    });
    processListings();
  }
});