const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const productUrl = 'https://www.mondou.com/en-CA/tuna-recipe-with-ocean-fish-in-gravy-wet-food-for-senior-cats-1045870.html'; 
  const webhookUrl = process.env.WEBHOOK_URL;

  console.log(`Navigating to ${productUrl}...`);
  await page.goto(productUrl);

  const addToCartBtn = page.locator('button.add-to-cart');
  
  console.log('Checking Stock Status via Interaction...');
  await addToCartBtn.click();
  await page.waitForTimeout(3000);

  const errorText = 'The quantity requested exceeds the available inventory';
  const isErrorVisible = await page.getByText(errorText).isVisible();

  const status = isErrorVisible ? 'OUT_OF_STOCK' : 'IN_STOCK';
  console.log(`STOCK_STATUS: ${status}`);

  if (webhookUrl) {
    console.log(`Sending POST to Webhook...`);
    try {
        const response = await page.request.post(webhookUrl, {
            data: {
                status: status,
                productUrl: productUrl,
                timestamp: new Date().toISOString()
            }
        });
        console.log(`Webhook sent. Status: ${response.status()}`);
    } catch (error) {
        console.error('Failed to send webhook:', error);
    }
  } else {
    console.log('No WEBHOOK_URL provided. Skipping POST.');
  }

  await browser.close();
})();