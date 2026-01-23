const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// File to store the last known status
const STATUS_FILE = 'last_status.txt';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const productUrl = 'https://www.mondou.com/en-CA/tuna-recipe-with-ocean-fish-in-gravy-wet-food-for-senior-cats-1045870.html'; 
  const webhookUrl = process.env.WEBHOOK_URL;

  // 1. Read the previous status from file (if it exists)
  let lastStatus = 'UNKNOWN';
  if (fs.existsSync(STATUS_FILE)) {
      lastStatus = fs.readFileSync(STATUS_FILE, 'utf8').trim();
  }
  console.log(`Previous Status: ${lastStatus}`);

  // 2. Check Current Status
  console.log(`Navigating to ${productUrl}...`);
  await page.goto(productUrl);

  const addToCartBtn = page.locator('button.add-to-cart');
  console.log('Checking Stock Status via Interaction...');
  
  // Attempt click logic
  let currentStatus = 'IN_STOCK';
  try {
      await addToCartBtn.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      const errorText = 'The quantity requested exceeds the available inventory';
      const isErrorVisible = await page.getByText(errorText).isVisible();
      if (isErrorVisible) currentStatus = 'OUT_OF_STOCK';
  } catch (e) {
      // If click fails/timeouts, button might be disabled or hidden
      if (await addToCartBtn.isDisabled()) {
          currentStatus = 'OUT_OF_STOCK';
      }
  }
  console.log(`Current Status: ${currentStatus}`);

  // 3. Compare and Act
  if (currentStatus !== lastStatus) {
      console.log(`⚠ STATUS CHANGE DETECTED! (${lastStatus} -> ${currentStatus})`);
      
      // Update the local file
      fs.writeFileSync(STATUS_FILE, currentStatus);

      // Trigger Webhook
      if (webhookUrl) {
          console.log(`Sending Alert to Azure...`);
          try {
              await page.request.post(webhookUrl, {
                  data: {
                      status: currentStatus,
                      productUrl: productUrl,
                      timestamp: new Date().toISOString()
                  }
              });
              console.log('Webhook sent successfully.');
          } catch (error) {
              console.error('Failed to send webhook:', error);
          }
      }
  } else {
      console.log('No change in status. No alert sent.');
  }

  await browser.close();
})();