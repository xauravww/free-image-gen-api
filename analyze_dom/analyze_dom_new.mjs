import { connect } from "puppeteer-real-browser";

async function analyzeDOM() {
    console.log("🤖 Analyzing LM Arena DOM...");

    const { browser, page } = await connect({
        headless: false, // Set to false to see the browser
        defaultViewport: {
            width: 1280,
            height: 1024
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        recaptcha: true,
        turnstile: true,
        disableXvfb: true
    });

    try {
        const targetUrl = 'https://lmarena.ai/?mode=direct&chat-modality=image';
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("📄 Page loaded. Analyzing DOM...");

        // Log all buttons
        const buttons = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            return Array.from(btns).map(btn => ({
                text: btn.textContent.trim(),
                attributes: Array.from(btn.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
            }));
        });
        console.log("🔘 All buttons:");
        buttons.forEach((btn, i) => console.log(`  ${i}: ${btn.text}: ${btn.attributes}`));

        // Log inputs
        const inputs = await page.evaluate(() => {
            const ins = document.querySelectorAll('input');
            return Array.from(ins).map(inp => ({
                type: inp.type,
                placeholder: inp.placeholder,
                attributes: Array.from(inp.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
            }));
        });
        console.log("📝 All inputs:");
        inputs.forEach((inp, i) => console.log(`  ${i}: ${inp.type} ${inp.placeholder}: ${inp.attributes}`));

        // Log textareas
        const textareas = await page.evaluate(() => {
            const tas = document.querySelectorAll('textarea');
            return Array.from(tas).map(ta => ({
                name: ta.name,
                placeholder: ta.placeholder,
                attributes: Array.from(ta.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
            }));
        });
        console.log("📄 All textareas:");
        textareas.forEach((ta, i) => console.log(`  ${i}: ${ta.name} ${ta.placeholder}: ${ta.attributes}`));

        // Try to find model button
        const modelButton = await page.evaluate(() => {
            const btn = document.querySelector('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
            return btn ? { text: btn.textContent.trim(), exists: true } : { exists: false };
        });
        console.log("🔍 Model button:", modelButton);

        if (modelButton.exists) {
            console.log("Attempting to click model button with fallbacks...");

            // Method 1: page.click with selector
            try {
                console.log("Method 1: page.click with selector");
                await page.click('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
                console.log("Method 1 succeeded");
            } catch (e) {
                console.log("Method 1 failed:", e.message);

                // Method 2: scroll and page.$$ click
                try {
                    console.log("Method 2: scroll and page.$$ click");
                    await page.evaluate(() => {
                        const btn = document.querySelector('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
                        if (btn) btn.scrollIntoView();
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const buttons = await page.$$('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
                    if (buttons.length > 0) {
                        await buttons[0].click();
                        console.log("Method 2 succeeded");
                    } else {
                        console.log("Method 2 failed: no buttons found");
                    }
                } catch (e2) {
                    console.log("Method 2 failed:", e2.message);

                    // Method 3: page.evaluate click
                    try {
                        console.log("Method 3: page.evaluate click");
                        await page.evaluate(() => {
                            const btn = document.querySelector('button[role="combobox"][aria-haspopup="dialog"]:not([data-sentry-source-file="mode-selector.tsx"])');
                            if (btn) {
                                btn.scrollIntoView();
                                btn.click();
                            }
                        });
                        console.log("Method 3 succeeded");
                    } catch (e3) {
                        console.log("Method 3 failed:", e3.message);

                        // Method 4: click with text
                        try {
                            console.log("Method 4: click with text");
                            await page.click('text="gemini-3-pro-image-preview (nano-banana-pro)"');
                            console.log("Method 4 succeeded");
                        } catch (e4) {
                            console.log("Method 4 failed:", e4.message);

                            // Method 5: xpath click
                            try {
                                console.log("Method 5: xpath click");
                                await page.click('xpath=//button[contains(text(), "gemini-3-pro-image-preview")]');
                                console.log("Method 5 succeeded");
                            } catch (e5) {
                                console.log("Method 5 failed:", e5.message);
                                console.log("All click methods failed");
                            }
                        }
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Log if dialog appeared
            const dialog = await page.evaluate(() => {
                const dlg = document.querySelector('div[role="dialog"]') || document.querySelector('[cmdk-root]');
                return dlg ? { exists: true, tag: dlg.tagName, class: dlg.className } : { exists: false };
            });
            console.log("🔍 Dialog after click:", dialog);

            // Log cmdk items
            const items = await page.evaluate(() => {
                const its = document.querySelectorAll('[cmdk-item]');
                return Array.from(its).map(it => ({
                    value: it.getAttribute('data-value'),
                    text: it.textContent.trim()
                }));
            });
            console.log("🔍 CMDK items:");
            items.forEach((item, i) => console.log(`  ${i}: ${item.value}: ${item.text}`));

            // Log inputs again
            const inputsAfter = await page.evaluate(() => {
                const ins = document.querySelectorAll('input');
                return Array.from(ins).map(inp => ({
                    type: inp.type,
                    placeholder: inp.placeholder,
                    value: inp.value
                }));
            });
            console.log("📝 Inputs after click:");
            inputsAfter.forEach((inp, i) => console.log(`  ${i}: ${inp.type} ${inp.placeholder} value="${inp.value}"`));
        }

        // Wait for manual inspection
        console.log("🔍 Browser open for manual inspection. Press Ctrl+C to close.");
        await new Promise(() => {});

    } catch (error) {
        console.error("❌ Analysis failed:", error.message);
    } finally {
        await browser.close();
    }
}

analyzeDOM().catch(console.error);