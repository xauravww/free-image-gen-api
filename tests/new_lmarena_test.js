import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

async function newLmarenaAPITest() {
    console.log('🚀 Starting scaled LM Arena API test...');

    // Configuration for scaling
    const numRequests = 5; // Number of image requests to handle
    const concurrency = 2; // Max concurrent requests
    const delayBetweenBatches = 5000; // Delay between batches (ms)
    const prompts = [
        'A beautiful sunset over mountains with vibrant colors',
        'A futuristic city skyline at night',
        'A serene lake with reflections',
        'A dragon flying over a castle',
        'An astronaut on the moon'
    ];

    // Step 1: Obtain Turnstile token (placeholder - replace with real solver)
    const turnstileToken = await getTurnstileToken();
    if (!turnstileToken) {
        console.error('❌ Failed to get Turnstile token');
        return;
    }

    // Step 2: Generate provisional user ID
    const provisionalUserId = uuidv4();

    // Step 3: Sign up anonymously (from HAR: POST to /nextjs-api/sign-up)
    try {
        console.log('📝 Signing up anonymously...');
        const signUpResponse = await axios.post('https://lmarena.ai/nextjs-api/sign-up', {
            turnstileToken,
            provisionalUserId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-IN,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6,en-GB;q=0.5',
                'Origin': 'https://lmarena.ai',
                'Referer': 'https://lmarena.ai/c/new?mode=direct&chat-modality=image'
            },
            timeout: 10000
        });

        const { access_token, user } = signUpResponse.data;
        console.log('✅ Signed up anonymously, got JWT');

        // Step 4: (Optional) Send analytics (from HAR)
        console.log('📊 Sending analytics...');
        await axios.post('https://lmarena.ai/ingest/i/v0/e/?ip=1&_=1764223953165&ver=1.223.3&compression=gzip-js', {
            // Minimal payload
            event: 'test'
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        console.log('✅ Analytics sent');

        // Step 5: Scale image generation (placeholder - replace with actual API)
        console.log(`🎨 Scaling to ${numRequests} requests with concurrency ${concurrency}...`);
        const results = [];
        for (let i = 0; i < numRequests; i += concurrency) {
            const batch = prompts.slice(i, i + concurrency).map(async (prompt, idx) => {
                const requestId = i + idx + 1;
                console.log(`📤 Request ${requestId}: "${prompt}"`);
                try {
                    // Placeholder: Replace with actual image generation API
                    // Example: const response = await axios.post('https://lmarena.ai/api/generate-image', { model: 'ideogram-v3-quality', prompt }, { headers: { 'Authorization': `Bearer ${access_token}` } });
                    // For now, simulate
                    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // Simulate API delay
                    const imageUrl = `https://example.com/generated-image-${requestId}.png`; // Placeholder URL
                    console.log(`✅ Request ${requestId} completed: ${imageUrl}`);
                    return { requestId, prompt, imageUrl, success: true };
                } catch (error) {
                    console.log(`❌ Request ${requestId} failed: ${error.message}`);
                    return { requestId, prompt, error: error.message, success: false };
                }
            });
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);

            // Delay between batches to avoid rate limits
            if (i + concurrency < numRequests) {
                console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        console.log('📊 Scaling complete. Results:');
        results.forEach(result => {
            console.log(`- Request ${result.requestId}: ${result.success ? 'Success' : 'Failed'} - ${result.imageUrl || result.error}`);
        });

    } catch (error) {
        console.error('❌ API test failed:', error.response?.data || error.message);
    }
}

// Helper: Get Turnstile token using headless puppeteer with click logic
async function getTurnstileToken() {
    console.log('🔑 Obtaining Turnstile token via headless browser...');
    const { connect } = await import('puppeteer-real-browser');
    const { browser, page } = await connect({
        headless: false,
        defaultViewport: { width: 1280, height: 1024 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        turnstile: true,
        disableXvfb: true
    });

    // Listen for network responses
    page.on('response', async (response) => {
        if (response.url().includes('cloudflare') || response.url().includes('turnstile') || response.url().includes('challenge-platform')) {
            console.log('🌐 CF/Turnstile Response:', response.url(), response.status());
            try {
                const text = await response.text();
                if (text && text.length < 500) console.log('📄 Response body:', text);
            } catch (e) {}
        }
    });

    try {
        await page.goto('https://lmarena.ai/?mode=direct&chat-modality=image', { waitUntil: 'networkidle0', timeout: 30000 });

        // Check localStorage for token
        const storedToken = await page.evaluate(() => localStorage.getItem('_grecaptcha'));
        if (storedToken) {
            console.log('✅ Token found in localStorage _grecaptcha');
            return storedToken;
        }

        // Fallback: Use provided token (replace with actual if needed)
        const fallbackToken = '09ADiQh0dARV2guU3G3zqJiMd3-ztf4S3TYypJV8J1gv35VLpMvwbdD3orSf2TuoGBm4NNAJqiwIkpZ81VVuJ6rqQZfdTTLt2IHxV1YA0aPiiDQh6EC5oYgVBtG0T3-ohd';
        console.log('⚠️ Using fallback token');
        return fallbackToken;

        console.log('📊 Analyzing initial DOM...');
        let domInfo = await page.evaluate(() => {
            const turnstileInputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
            const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => iframe.src);
            const divs = Array.from(document.querySelectorAll('div')).filter(div => {
                const rect = div.getBoundingClientRect();
                return rect.width > 290 && rect.width <= 310 && !div.querySelector('*');
            }).map(div => ({ width: div.getBoundingClientRect().width, height: div.getBoundingClientRect().height }));
            return {
                turnstileInputs: turnstileInputs.length,
                iframes: iframes.filter(src => src.includes('cloudflare')),
                potentialWidgets: divs.length,
                bodyText: document.body.innerText.substring(0, 500)
            };
        });
        console.log('🔍 Initial DOM Analysis:', domInfo);

        // Simulate UI to trigger Turnstile: select model, type prompt, submit
        console.log('🔧 Simulating UI steps to trigger Turnstile...');
        try {
            // Click model dropdown
            await page.evaluate(() => {
                const button = document.querySelector('button[aria-haspopup="dialog"]');
                if (button) button.click();
            });
            await page.waitForSelector('[cmdk-item]', { timeout: 5000 });

            // Select model
            const modelSelected = await page.evaluate((target) => {
                const models = [...document.querySelectorAll('[cmdk-item]')];
                for (const model of models) {
                    const name = model.querySelector('span.flex-1.truncate.text-sm');
                    if (name && name.textContent.trim() === target) {
                        model.click();
                        return true;
                    }
                }
                return false;
            }, 'ideogram-v3-quality');
            if (!modelSelected) console.log('⚠️ Model not selected');

            // Wait for textarea
            await page.waitForSelector('textarea[name="message"]', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Type prompt
            await page.focus('textarea[name="message"]');
            await page.type('textarea[name="message"]', 'Test prompt');
            await page.type('textarea[name="message"]', ' ');

            // Submit
            const submitBtn = await page.$('button[type="submit"]') || await page.$('button.bg-header-primary');
            if (submitBtn) {
                await submitBtn.click();
                console.log('✅ Submitted, waiting for Turnstile...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Analyze DOM after submit
            domInfo = await page.evaluate(() => {
                const turnstileInputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
                const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => iframe.src);
                const divs = Array.from(document.querySelectorAll('div')).filter(div => {
                    const rect = div.getBoundingClientRect();
                    return rect.width > 290 && rect.width <= 310 && !div.querySelector('*');
                }).map(div => ({ width: div.getBoundingClientRect().width, height: div.getBoundingClientRect().height }));
                return {
                    turnstileInputs: turnstileInputs.length,
                    iframes: iframes.filter(src => src.includes('cloudflare')),
                    potentialWidgets: divs.length,
                    bodyText: document.body.innerText.substring(0, 500)
                };
            });
            console.log('🔍 Post-submit DOM Analysis:', domInfo);

        } catch (uiError) {
            console.log('⚠️ UI simulation failed:', uiError.message);
        }

        // Wait for Turnstile iframe
        await page.waitForFunction(() => {
            const iframes = document.querySelectorAll('iframe');
            for (let iframe of iframes) {
                if (iframe.src.includes('challenges.cloudflare.com')) {
                    return true;
                }
            }
            return false;
        }, { timeout: 10000 });

        // Click on Turnstile widget to trigger challenge (based on puppeteer-real-browser logic)
        const clicked = await checkTurnstile({ page });
        if (!clicked) {
            console.log('⚠️ Turnstile not clicked');
        }

        // Wait for token to be set (up to 60 seconds, check every 2s)
        console.log('⏳ Waiting for Turnstile token (solve the challenge in the browser)...');
        let token = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            token = await page.evaluate(() => {
                const input = document.querySelector('input[name="cf-turnstile-response"]');
                return input ? input.value : null;
            });
            if (token) {
                console.log('✅ Token obtained');
                break;
            }
            console.log(`🔄 Checking token... (${i + 1}/30)`);
        }

        console.log('⏳ Browser kept open for manual Turnstile solving and inspection.');
        console.log('Solve the challenge in the browser, then check:');
        console.log('- DOM: document.querySelector(\'input[name="cf-turnstile-response"]\').value');
        console.log('- localStorage: localStorage.getItem("_grecaptcha")');
        console.log('Press Ctrl+C to close when done.');
        // Keep browser open indefinitely for manual interaction
        await new Promise(() => {}); // Hang to keep open
        return token || null;
    } catch (error) {
        console.error('❌ Error during token retrieval:', error.message);
        await browser.close();
        return null;
    }
}

// Copied from puppeteer-real-browser turnstile.mjs
const checkTurnstile = ({ page }) => {
    return new Promise(async (resolve, reject) => {
        var waitInterval = setTimeout(() => { clearInterval(waitInterval); resolve(false) }, 5000);

        try {
            const elements = await page.$$('[name="cf-turnstile-response"]');
            if (elements.length <= 0) {

                const coordinates = await page.evaluate(() => {
                    let coordinates = [];
                    document.querySelectorAll('div').forEach(item => {
                        try {
                            let itemCoordinates = item.getBoundingClientRect()
                            let itemCss = window.getComputedStyle(item)
                            if (itemCss.margin == "0px" && itemCss.padding == "0px" && itemCoordinates.width > 290 && itemCoordinates.width <= 310 && !item.querySelector('*')) {
                                coordinates.push({ x: itemCoordinates.x, y: item.getBoundingClientRect().y, w: item.getBoundingClientRect().width, h: item.getBoundingClientRect().height })
                            }
                        } catch (err) { }
                    });

                    if (coordinates.length <= 0) {
                        document.querySelectorAll('div').forEach(item => {
                            try {
                                let itemCoordinates = item.getBoundingClientRect()
                                if (itemCoordinates.width > 290 && itemCoordinates.width <= 310 && !item.querySelector('*')) {
                                    coordinates.push({ x: itemCoordinates.x, y: item.getBoundingClientRect().y, w: item.getBoundingClientRect().width, h: item.getBoundingClientRect().height })
                                }
                            } catch (err) { }
                        });

                    }

                    return coordinates
                })

                for (const item of coordinates) {
                    try {
                        let x = item.x + 30;
                        let y = item.y + item.h / 2;
                        await page.mouse.click(x, y);
                    } catch (err) { }
                }
                return resolve(true)
            }

            for (const element of elements) {
                try {
                    const parentElement = await element.evaluateHandle(el => el.parentElement);
                    const box = await parentElement.boundingBox();
                    let x = box.x + 30;
                    let y = box.y + box.height / 2;
                    await page.mouse.click(x, y);
                } catch (err) { }
            }
            clearInterval(waitInterval)
            resolve(true)
        } catch (err) {
            clearInterval(waitInterval)
            resolve(false)
        }
    })
}

newLmarenaAPITest();