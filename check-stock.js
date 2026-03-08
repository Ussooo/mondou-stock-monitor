const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

(async () => {
    if (!fs.existsSync(DATA_FILE)) {
        process.exit(0);
    }

    let products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (products.length === 0) {
        process.exit(0);
    }

    const browser = await chromium.launch({
        headless: false, 
        slowMo: 100 // Adds a 100ms delay to every action so you can follow along 
        });

    const page = await browser.newPage();
    const webhookUrl = process.env.WEBHOOK_URL;

    for (let product of products) {
        let currentStatus = 'ERROR';
        
        try {
            await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const merchant = product.merchant ? product.merchant.toLowerCase() : 'unknown';

            switch (merchant) {
                case 'mondou':
                    // Stock check via Interaction
                    const addToCartBtnM = page.locator('button.add-to-cart');
                    if (await addToCartBtnM.isVisible()) {
                        await addToCartBtnM.click({ timeout: 5000 });
                        await page.waitForTimeout(2000);
                        const errorText = 'The quantity requested exceeds the available inventory';
                        const isErrorVisible = await page.getByText(errorText).isVisible();
                        currentStatus = isErrorVisible ? 'OUT_OF_STOCK' : 'IN_STOCK';
                    } else {
                        currentStatus = 'OUT_OF_STOCK';
                    }
                    // Price Extraction
                    const priceM = await page.locator('.sales span.value, span.price').first().innerText().catch(() => 'N/A');
                    product.lastPrice = priceM.trim();
                    break;

                case 'amazon':
                    // Stock check via Availability Text
                    const availAmazon = await page.locator('#availability').innerText({ timeout: 5000 }).catch(() => '');
                    currentStatus = availAmazon.toLowerCase().includes('in stock') ? 'IN_STOCK' : 'OUT_OF_STOCK';
                    // Price Extraction
                    const priceA = await page.locator('.a-price .a-offscreen').first().innerText().catch(() => 'N/A');
                    product.lastPrice = priceA.trim();
                    break;

                case 'aubut':
                    console.log("Aubut: Navigation start...");
                    await page.waitForTimeout(4000); 

                    try {
                        const montrealLabel = page.locator('label[for="succ1"]').filter({ hasText: 'Montreal' });
                        
                        if (await montrealLabel.isVisible({ timeout: 5000 })) {
                            console.log("Aubut: Selecting Montreal...");
                            await montrealLabel.click();
                            await page.waitForTimeout(1000);

                            // FIX: Use exact text match and specific classes to avoid the cookie banner button
                            const saveBtn = page.locator('button.colorful06').filter({ hasText: /^Save$/ });
                            
                            console.log("Aubut: Clicking the REAL Save button...");
                            await saveBtn.click();
                            
                            await page.waitForLoadState('networkidle');
                        }
                    } catch (e) {
                        console.log("Aubut: Store selection failed: " + e.message);
                    }

                    // Scrape logic
                    const aubutContent = await page.locator('.availability').innerText().catch(() => '');
                    console.log(`Aubut: Text found: "${aubutContent.replace(/\n/g, ' ')}"`);
                    
                    const isInStock = /in stock|en stock|available|disponible|aisle|allée/i.test(aubutContent);
                    const isNotAvailable = /not available|pas disponible|rupture/i.test(aubutContent);

                    if (isInStock && !isNotAvailable) {
                        currentStatus = 'IN_STOCK';
                    } else if (isNotAvailable) {
                        currentStatus = 'OUT_OF_STOCK';
                    } else {
                        currentStatus = 'ERROR';
                    }
                    
                    const priceElement = page.locator('.product-price').first();
                    let rawPrice = await priceElement.innerText().catch(() => 'N/A');
                    product.lastPrice = rawPrice.split('\n')[0].replace(/[^\d.,\$]/g, '').trim();
                    break;

                default:
                    currentStatus = 'UNSUPPORTED_MERCHANT';
            }
        } catch (e) {
            console.error(`Error checking ${product.name}:`, e.message);
            currentStatus = 'ERROR';
        }
        
        const timestamp = new Date().toISOString();
        product.lastChecked = timestamp;
        
        if (currentStatus !== product.status) {
            product.history.push(`${timestamp}: ${product.status} -> ${currentStatus}`);
            product.status = currentStatus;
            
            if (webhookUrl) {
                try {
                    await page.request.post(webhookUrl, {
                        data: {
                            productName: product.name,
                            status: currentStatus,
                            price: product.lastPrice,
                            productUrl: product.url,
                            timestamp: timestamp
                        }
                    });
                } catch (error) {}
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
    await browser.close();
})();