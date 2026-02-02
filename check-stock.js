const { chromium } = require('playwright');
require('dotenv').config({ path: 'secrets.env' }); // Load secrets for local testing

// ================= CONFIGURATION =================
const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const SAS = process.env.AZURE_SAS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CONTAINER = "config";
const FILE = "products.json";

// Fix SAS token if missing '?'
const SAS_TOKEN = SAS && !SAS.startsWith('?') ? `?${SAS}` : SAS;
const DATA_URL = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${FILE}${SAS_TOKEN}`;
// =================================================

(async () => {
    // 1. Fetch Product List from Azure
    console.log("📥 Fetching product list from Azure...");
    let products = [];
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`Azure Error: ${res.status} ${res.statusText}`);
        products = await res.json();
    } catch (e) {
        console.error("❌ Failed to load products:", e.message);
        process.exit(1);
    }

    if (products.length === 0) {
        console.log("No products to check.");
        return;
    }
    console.log(`Found ${products.length} product(s).`);

    // 2. Launch Browser
    const browser = await chromium.launch();
    const context = await browser.newContext();
    let hasChanges = false;

    // 3. Loop Through Items
    for (const item of products) {
        console.log(`\n🔎 Checking: ${item.name}`);
        const page = await context.newPage();
        
        try {
            await page.goto(item.url);
            
            // --- Stock Check Logic ---
            const addToCartBtn = page.locator('button.add-to-cart');
            let currentStatus = 'IN_STOCK';
            
            try {
                // Try clicking "Add to Cart" to see if it rejects us
                await addToCartBtn.click({ timeout: 5000 });
                await page.waitForTimeout(2000); 
                
                // Mondou specific error message for OOS
                const errorText = 'The quantity requested exceeds the available inventory';
                const isErrorVisible = await page.getByText(errorText).isVisible();
                
                if (isErrorVisible) currentStatus = 'OUT_OF_STOCK';
            } catch (e) {
                // If button is disabled or missing, assume OOS
                 if (await addToCartBtn.isDisabled() || !(await addToCartBtn.isVisible())) {
                    currentStatus = 'OUT_OF_STOCK';
                }
            }
            // -------------------------

            console.log(`   Status: ${currentStatus} (Previous: ${item.lastStatus})`);

            // 4. Compare & Act
            if (currentStatus !== item.lastStatus) {
                console.log(`   ⚠️ CHANGE DETECTED!`);
                item.lastStatus = currentStatus;
                hasChanges = true;

                // Send Alert
                if (WEBHOOK_URL) {
                    await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product: item.name,
                            url: item.url,
                            status: currentStatus,
                            timestamp: new Date().toISOString()
                        })
                    });
                    console.log("   📨 Alert sent.");
                }
            }

        } catch (err) {
            console.error(`   ❌ Error checking item:`, err.message);
        } finally {
            await page.close();
        }
    }

    await browser.close();

    // 5. Save Updates to Azure
    if (hasChanges) {
        console.log("\n💾 Saving updates to Azure...");
        const res = await fetch(DATA_URL, {
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(products, null, 2)
        });
        
        if (res.ok) console.log("✅ Azure updated successfully.");
        else console.error("❌ Failed to update Azure:", res.statusText);
    } else {
        console.log("\n✅ No status changes found.");
    }

})();