import { connect } from "puppeteer-real-browser";

async function analyzeDOM() {
    console.log("🤖 Analyzing LM Arena DOM...");

    const { browser, page } = await connect({
        headless: true, // Run headless for analysis
        defaultViewport: { width: 1280, height: 1024 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const targetUrl = 'https://lmarena.ai/?mode=direct&chat-modality=image';
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("📄 Page loaded. Analyzing model dropdown...");

        // Log all buttons for debugging
        const buttons = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            return Array.from(btns).map(btn => ({
                text: btn.textContent.trim(),
                attributes: Array.from(btn.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
            }));
        });
        console.log("🔘 All buttons on page:");
        buttons.slice(0, 10).forEach(btn => console.log(`  - ${btn.text}: ${btn.attributes}`));

        // Try to find model dropdown button
        const modelButton = await page.evaluate(() => {
            const btn = document.querySelector('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
            return btn ? { text: btn.textContent.trim(), exists: true } : { exists: false };
        });
        console.log("🔍 Model dropdown button:", modelButton);

        // Click the model dropdown if found
        if (modelButton.exists) {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])'));
                if (buttons.length > 1) {
                    buttons[1].click();
                }
            });

            // Wait for dialog to open
            await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });

            // Wait a bit for content to load
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Now find the input in the dialog
            const inputExists = await page.evaluate(() => {
                const dialog = document.querySelector('div[role="dialog"]');
                if (dialog) {
                    const input = dialog.querySelector('input[data-sentry-element="CommandInput"]');
                    return !!input;
                }
                return false;
            });

            // Get all available models without typing
            const models = await page.evaluate(() => {
                const dialog = document.querySelector('div[role="dialog"]');
                if (dialog) {
                    const items = dialog.querySelectorAll('[cmdk-item]');
                    return Array.from(items).map(item => ({
                        value: item.getAttribute('data-value'),
                        text: item.textContent.trim()
                    }));
                }
                return [];
            });

            console.log("🔍 Available models in dialog:");
            models.forEach(model => {
                console.log(`  - ${model.value}: ${model.text}`);
            });

            // Check if ideogram is available
            const ideogramModel = models.find(m => m.value && m.value.includes('ideogram'));
            if (ideogramModel) {
                console.log(`✅ Ideogram model found: ${ideogramModel.value}`);
            } else {
                console.log("❌ Ideogram model not found");
            }
        } else {
            console.log("❌ Model dropdown button not found");
        }

        console.log("🔍 Available models:");
        models.forEach(model => {
            console.log(`  - ${model.value}: ${model.text}`);
        });

        // Check if ideogram is available
        const ideogramModel = models.find(m => m.value && m.value.includes('ideogram'));
        if (ideogramModel) {
            console.log(`✅ Ideogram model found: ${ideogramModel.value}`);
        } else {
            console.log("❌ Ideogram model not found");
        }

    } catch (error) {
        console.error("❌ Analysis failed:", error.message);
    } finally {
        await browser.close();
    }
}

analyzeDOM().catch(console.error);