import { connect } from "puppeteer-real-browser";

export async function generateImage(prompt, model = 'ideogram-v3-quality') {
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];

  // Random user agents to avoid blockage
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];
  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

  const { browser, page } = await connect({
    headless: false,
    defaultViewport: {
      width: 1280,
      height: 1024
    },
    userAgent: randomUA,
    recaptcha: true,
    turnstile: true,
    disableXvfb: false
  });

  try {
    console.log(`🤖 Starting image generation for prompt: "${prompt}"`);

    // Navigate to the specified URL
    const targetUrl = 'https://lmarena.ai/?mode=direct&chat-modality=image';
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 }); // Reduced

    // Wait for page to load completely (reduced)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Select the model
    console.log(`🔍 Selecting model: ${model}`);
    try {
      // Click the model dropdown button
      await page.evaluate(() => {
        const button = document.querySelector('button[aria-haspopup="dialog"]');
        if (button) button.click();
        else {
          console.log("Model dropdown button not found")
          return
        }
      });
      console.log(`   ✅ Model dropdown opened`);

      // Wait for the model items to appear in the dropdown (reduced)
      await page.waitForSelector('[cmdk-item]', { timeout: 10000 });

      // Select the target model
      const matchingModel = await page.evaluate((TARGET_MODEL) => {
        const models = [...document.querySelectorAll('[cmdk-item]')];
        for (const model of models) {
          const modelName = model.querySelector('span.flex-1.truncate.text-sm');
          if (modelName && modelName.textContent.trim() === TARGET_MODEL) {
            model.click();
            return true;
          }
        }
        return false;
      }, model);

      if (!matchingModel) {
        throw new Error(`Model "${model}" not found in the dropdown.`);
      }
      console.log(`✅ Successfully selected model: ${model}`);

    } catch (error) {
      throw new Error(`Model selection failed: ${error.message}`);
    }

    // Wait for the textarea to be available (reduced)
    console.log(`🔍 Looking for textarea...`);
    await page.waitForSelector('textarea[name="message"]', { timeout: 5000 });

    // Human-like delay before interacting (reduced)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Fill the prompt in the textarea
    console.log(`✍️  Filling prompt: "${prompt}"`);

    // Human-like delay before filling (reduced)
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Focus and type the prompt to simulate user input
    await page.focus('textarea[name="message"]');
    await page.type('textarea[name="message"]', prompt);

    // Add an extra space by typing it to activate submit button
    await page.type('textarea[name="message"]', ' ');

    // Human-like pause after typing (reduced)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Find and click the submit button
    console.log(`🚀 Clicking submit button...`);

    let submitClicked = false;
    let submitAttempts = 0;
    const maxSubmitAttempts = 3;

    while (!submitClicked && submitAttempts < maxSubmitAttempts) {
      submitAttempts++;
      console.log(`   Attempting to click submit button (attempt ${submitAttempts})...`);

      try {
        const submitButton = await page.$('button[type="submit"]') ||
                            await page.$('button.bg-header-primary');

        if (submitButton) {
          await submitButton.click();
          console.log(`   ✅ Submit button clicked`);
          submitClicked = true;
        } else {
          console.log(`   ❌ Submit button not found, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (submitError) {
        console.log(`   ❌ Submit click failed: ${submitError.message}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!submitClicked) {
      throw new Error(`Failed to click submit button after ${maxSubmitAttempts} attempts`);
    }

    // Take screenshot before submission
    await page.screenshot({ path: 'before_submit.png', fullPage: true });
    console.log(`📸 Screenshot saved: before_submit.png`);

    // Handle Terms of Use modal
    console.log(`🔍 Checking for Terms of Use modal...`);
    try {
      const modal = await page.waitForSelector('div[role="dialog"]', { timeout: 5000 }); // Reduced
      if (modal) {
        console.log(`📋 Terms of Use modal detected - reading terms...`);
        // Take screenshot for debugging
        await page.screenshot({ path: 'modal_detected.png', fullPage: true });
        console.log(`📸 Screenshot saved: modal_detected.png`);
        // Human-like delay to "read" the terms (reduced)
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Try to click Agree button
        let agreeClicked = false;
        let attempts = 0;
        const maxAttempts = 10; // Increased

        while (!agreeClicked && attempts < maxAttempts) {
          attempts++;
          console.log(`📋 Attempting to click Agree button (attempt ${attempts})...`);

          try {
            // Try different selectors for the Agree button
            let agreeButton = await page.$('button.bg-interactive-cta');
            let found = false;

            if (!agreeButton) {
              // Try to find button with "Agree" text
              found = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const agreeBtn = buttons.find(btn => btn.textContent.trim() === 'Agree');
                if (agreeBtn) {
                  agreeBtn.click();
                  return true;
                }
                return false;
              });
              if (found) {
                agreeClicked = true;
                console.log(`   ✅ Agree button clicked`);
                continue;
              }
            }

            if (!agreeButton) {
              // Try modal submit button
              agreeButton = await page.$('div[role="dialog"] button[type="submit"]');
            }

            if (agreeButton) {
              await agreeButton.click();
              console.log(`   ✅ Agree button clicked`);

              // Wait and check if modal is still there (reduced)
              await new Promise(resolve => setTimeout(resolve, 1000));

              const modalStillExists = await page.$('div[role="dialog"]');
              if (!modalStillExists) {
                agreeClicked = true;
                console.log(`✅ Terms accepted successfully - modal closed`);
              } else {
                console.log(`   ⚠️  Modal still visible, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } else if (!found) {
              console.log(`   ❌ Agree button not found, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (clickError) {
            console.log(`   ❌ Click failed: ${clickError.message}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!agreeClicked) {
          throw new Error(`Failed to click Agree button after ${maxAttempts} attempts`);
        }
      }
    } catch (error) {
      console.log(`   ℹ️  No modal detected, continuing...`);
    }

    // Take screenshot after modal handling
    await page.screenshot({ path: 'after_modal.png', fullPage: true });
    console.log(`📸 Screenshot saved: after_modal.png`);

    console.log(`✅ Image generation request submitted!`);

    // Take screenshot after submission
    await page.screenshot({ path: 'after_submit.png', fullPage: true });
    console.log(`📸 Screenshot saved: after_submit.png`);

    // Check if we were redirected to login or error page
    const currentUrl = page.url();
    console.log(`📍 Current URL after submit: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      throw new Error('Redirected to login page - authentication required');
    }

    // Wait for image generation to complete
    console.log(`⏳ Waiting for image generation to complete...`);

    let imageUrl = null;
    let waitAttempts = 0;
    const maxWaitAttempts = 120; // Increased timeout

    while (!imageUrl && waitAttempts < maxWaitAttempts) {
      waitAttempts++;
      console.log(`   🔍 Checking for generated image (attempt ${waitAttempts}/120)...`);

      try {
        // Try multiple selectors for the generated image
        let imageElement = await page.$('img[data-sentry-source-file="message-attachment.tsx"]');

        // If not found, try other common selectors
        if (!imageElement) {
          imageElement = await page.$('img[src*="cloudflarestorage.com"]');
        }
        if (!imageElement) {
          imageElement = await page.$('img[alt*="generated"]');
        }
        if (!imageElement) {
          // Look for any image that appeared recently
          const images = await page.$$('img');
          for (const img of images) {
            const src = await page.evaluate(el => el.getAttribute('src'), img);
            if (src && (src.includes('cloudflarestorage.com') || src.includes('blob:') || src.includes('data:image'))) {
              imageElement = img;
              break;
            }
          }
        }

        if (imageElement) {
          imageUrl = await page.evaluate(el => el.getAttribute('src'), imageElement);
          if (imageUrl && (imageUrl.includes('cloudflarestorage.com') || imageUrl.includes('blob:') || imageUrl.includes('data:image'))) {
            console.log(`\n🎉 Image generation completed!`);
            console.log(`🖼️  Image URL: ${imageUrl}`);
            break;
          }
        }

        // Take a screenshot every 30 attempts for debugging
        if (waitAttempts % 30 === 0) {
          await page.screenshot({ path: `debug_attempt_${waitAttempts}.png`, fullPage: true });
          console.log(`📸 Debug screenshot saved: debug_attempt_${waitAttempts}.png`);
        }

        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log(`   ⚠️  Error checking for image: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!imageUrl) {
      throw new Error(`Image generation timeout after ${maxWaitAttempts} attempts`);
    }

    console.log(`✅ Successfully generated and retrieved image URL!`);
    return { imageUrl, prompt, model };

  } finally {
    await browser.close();
  }
}