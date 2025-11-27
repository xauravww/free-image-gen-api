import { connect } from "puppeteer-real-browser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

async function testLMArena() {
    console.log(`\n🤖 === LM ARENA TESTER ===`);
    
    console.log(`🆕 Creating fresh session...`);
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
        console.log(`\n🌐 Navigating to LM Arena...`);
        
        // Navigate to the specified URL
        const targetUrl = 'https://lmarena.ai/?mode=direct&chat-modality=image';
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = page.url();
        const title = await page.title();
        
        console.log(`✅ Successfully loaded LM Arena`);
        console.log(`📍 URL: ${currentUrl}`);
        console.log(`📄 Title: ${title}`);
        
        // Check for key elements on the page
        const pageInfo = await page.evaluate(() => {
            return {
                hasButtons: document.querySelectorAll('button').length,
                hasInputs: document.querySelectorAll('input').length,
                hasTextareas: document.querySelectorAll('textarea').length,
                hasImages: document.querySelectorAll('img').length,
                bodyText: document.body.innerText.substring(0, 200) + '...'
            };
        });
        
        console.log(`\n📊 Page Analysis:`);
        console.log(`   🔘 Buttons: ${pageInfo.hasButtons}`);
        console.log(`   📝 Inputs: ${pageInfo.hasInputs}`);
        console.log(`   📄 Textareas: ${pageInfo.hasTextareas}`);
        console.log(`   🖼️  Images: ${pageInfo.hasImages}`);
        console.log(`   📖 Content preview: ${pageInfo.bodyText}`);

        // Select the model first
        console.log(`\n🔍 Selecting model...`);
        try {
            // Click the model dropdown button (works whether model is selected or not)
            await page.evaluate(() => {
                const button = document.querySelector('button[aria-haspopup="dialog"]');
                if (button) button.click();
                else {
                    console.log("not opened the the model dropdown btn")
                    return
                }
            });
            console.log(`   ✅ Model dropdown opened`);

            // Wait for the model items to appear in the dropdown
            await page.waitForSelector('[cmdk-item]', { timeout: 15000 }); // Increased timeout

            // --- Simplified model selection without input search ---
            const TARGET_MODEL = "ideogram-v3-quality";  
            
            const matchingModel = await page.evaluate((TARGET_MODEL) => {
                const models = [...document.querySelectorAll('[cmdk-item]')];
                for (const model of models) {
                    const modelName = model.querySelector('span.flex-1.truncate.text-sm');
                    if (modelName && modelName.textContent.trim() === TARGET_MODEL) {
                        model.click(); // Click the matching model
                        return true; // Successfully clicked
                    }
                }
                return false; // Model not found
            }, TARGET_MODEL);

            if (!matchingModel) {
                console.error(`❌ Model "${TARGET_MODEL}" not found in the dropdown.`);
                return;
            }
            console.log(`✅ Successfully selected model: ${TARGET_MODEL}`);

            // Wait for the textarea to be available
            console.log(`\n🔍 Looking for textarea...`);
            await page.waitForSelector('textarea[name="message"]', { timeout: 10000 });

            // Human-like delay before interacting
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

            // Fill the prompt in the textarea
            const prompt = "A beautiful sunset over mountains with vibrant colors";
            console.log(`\n✍️  Filling prompt: "${prompt}"`);

            // Human-like delay before filling
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

            // Focus and type the prompt to simulate user input
            await page.focus('textarea[name="message"]');
            await page.type('textarea[name="message"]', prompt);

            // Add an extra space by typing it to activate submit button
            await page.type('textarea[name="message"]', ' ');

            // Verify what was actually set
            const typedText = await page.evaluate(() => {
                const textarea = document.querySelector('textarea[name="message"]');
                return textarea ? textarea.value : '';
            });
            console.log(`✍️  Verification: textarea contains "${typedText}"`);

            // Human-like pause after typing (like thinking)
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1500));

            // Find and click the submit button (arrow up button)
            console.log(`\n🚀 Clicking submit button...`);
            
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

                        // Wait longer in headless mode for modal to appear
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Take screenshot after submit for debugging
                        await page.screenshot({ path: 'after_submit.png', fullPage: true });
                        console.log(`📸 Screenshot saved: after_submit.png`);

                        // Check for modal in DOM
                        const modalCheck = await page.evaluate(() => {
                            const dialogs = document.querySelectorAll('div[role="dialog"]');
                            const buttons = Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim());
                            return {
                                dialogs: dialogs.length,
                                agreeButtons: buttons.filter(btn => btn.includes('Agree') || btn.includes('agree')).length,
                                allButtons: buttons.slice(0, 10) // first 10 buttons
                            };
                        });
                        console.log(`🔍 Modal check: ${modalCheck.dialogs} dialogs found, ${modalCheck.agreeButtons} agree buttons`);
                        console.log(`🔘 Sample buttons: ${modalCheck.allButtons.join(', ')}`);

                        submitClicked = true;
                    } else {
                        console.log(`   ❌ Submit button not found, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (submitError) {
                    console.log(`   ❌ Submit click failed: ${submitError.message}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (!submitClicked) {
                console.log(`❌ Failed to click submit button after ${maxSubmitAttempts} attempts`);
            }
            
            // Now check for Terms of Use modal that appears after submission
             console.log(`\n🔍 Checking for Terms of Use modal...`);
             try {
                const modal = await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
                if (modal) {
                    console.log(`📋 Terms of Use modal detected - reading terms...`);
                    // Human-like delay to "read" the terms
                    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
                    
                    // Try to click Agree button with retry logic
                    let agreeClicked = false;
                    let attempts = 0;
                    const maxAttempts = 3;
                    
                    while (!agreeClicked && attempts < maxAttempts) {
                        attempts++;
                        console.log(`📋 Attempting to click Agree button (attempt ${attempts})...`);
                        
                        try {
                            // Try different selectors for the Agree button
                            let agreeButton = await page.$('button.bg-interactive-cta');
                            
                             if (!agreeButton) {
                                 // Try to find button with "Agree" text and click using evaluate
                                 const found = await page.evaluate(() => {
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

                                 // Wait and check if modal is still there
                                 await new Promise(resolve => setTimeout(resolve, 2000));

                                 const modalStillExists = await page.$('div[role="dialog"]');
                                 if (!modalStillExists) {
                                     agreeClicked = true;
                                     console.log(`✅ Terms accepted successfully - modal closed`);
                                 } else {
                                     console.log(`   ⚠️  Modal still visible, retrying...`);
                                     await new Promise(resolve => setTimeout(resolve, 1000));
                                 }
                             } else if (!found) {
                                console.log(`   ❌ Agree button not found, retrying...`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } catch (clickError) {
                            console.log(`   ❌ Click failed: ${clickError.message}, retrying...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                    
                    if (!agreeClicked) {
                        console.log(`❌ Failed to click Agree button after ${maxAttempts} attempts`);
                    } else {
                        console.log(`✅ Terms accepted, proceeding with image generation...`);
                    }
                }
            } catch (error) {
                console.log(`   ℹ️  No modal detected, trying fallback Enter press...`);
                try {
                    await page.keyboard.press('Enter');
                    console.log(`   ✅ Enter pressed as fallback`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (enterError) {
                    console.log(`   ❌ Enter press failed: ${enterError.message}`);
                }
            }
            
             await page.focus('textarea[name="message"]');
             await page.type('textarea[name="message"]', prompt);

             // Click submit button again
             const submitButtonAgain = await page.$('button[type="submit"]') ||
                                       await page.$('button.bg-header-primary');
             if (submitButtonAgain) {
                 await submitButtonAgain.click();
                 console.log(`   ✅ Submit button clicked again`);
             }

             // Check for Terms of Use modal again after second submit
             console.log(`\n🔍 Checking for Terms of Use modal again...`);
             try {
                 const modalAgain = await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
                 if (modalAgain) {
                     console.log(`📋 Terms of Use modal detected again - reading terms...`);
                     // Human-like delay to "read" the terms
                     await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

                     // Try to click Agree button again
                     let agreeClickedAgain = false;
                     let attemptsAgain = 0;
                     const maxAttemptsAgain = 3;

                     while (!agreeClickedAgain && attemptsAgain < maxAttemptsAgain) {
                         attemptsAgain++;
                         console.log(`📋 Attempting to click Agree button again (attempt ${attemptsAgain})...`);

                         try {
                             // Try different selectors for the Agree button
                             let agreeButtonAgain = await page.$('button.bg-interactive-cta');

                             if (!agreeButtonAgain) {
                                 // Try to find button with "Agree" text and click using evaluate
                                 const foundAgain = await page.evaluate(() => {
                                     const buttons = Array.from(document.querySelectorAll('button'));
                                     const agreeBtn = buttons.find(btn => btn.textContent.trim() === 'Agree');
                                     if (agreeBtn) {
                                         agreeBtn.click();
                                         return true;
                                     }
                                     return false;
                                 });
                                 if (foundAgain) {
                                     agreeClickedAgain = true;
                                     console.log(`   ✅ Agree button clicked again`);
                                     continue;
                                 }
                             }

                             if (!agreeButtonAgain) {
                                 // Try modal submit button
                                 agreeButtonAgain = await page.$('div[role="dialog"] button[type="submit"]');
                             }

                             if (agreeButtonAgain) {
                                 await agreeButtonAgain.click();
                                 console.log(`   ✅ Agree button clicked again`);

                                 // Wait and check if modal is still there
                                 await new Promise(resolve => setTimeout(resolve, 2000));

                                 const modalStillExistsAgain = await page.$('div[role="dialog"]');
                                 if (!modalStillExistsAgain) {
                                     agreeClickedAgain = true;
                                     console.log(`✅ Terms accepted successfully again - modal closed`);
                                 } else {
                                     console.log(`   ⚠️  Modal still visible, retrying...`);
                                     await new Promise(resolve => setTimeout(resolve, 1000));
                                 }
                             } else if (!foundAgain) {
                                 console.log(`   ❌ Agree button not found, retrying...`);
                                 await new Promise(resolve => setTimeout(resolve, 1000));
                             }
                         } catch (clickError) {
                             console.log(`   ❌ Click failed: ${clickError.message}, retrying...`);
                             await new Promise(resolve => setTimeout(resolve, 1000));
                         }
                     }

                     if (!agreeClickedAgain) {
                         console.log(`❌ Failed to click Agree button again after ${maxAttemptsAgain} attempts`);
                     } else {
                         console.log(`✅ Terms accepted again, proceeding with image generation...`);
                     }
                 }
             } catch (error) {
                 console.log(`   ℹ️  No modal detected again, trying fallback Enter press...`);
                 try {
                     await page.keyboard.press('Enter');
                     console.log(`   ✅ Enter pressed as fallback again`);
                     await new Promise(resolve => setTimeout(resolve, 2000));
                 } catch (enterError) {
                     console.log(`   ❌ Enter press failed: ${enterError.message}`);
                 }
             }

             console.log(`\n✅ Image generation request submitted!`);
            
            // Wait for image generation to complete
            console.log(`\n⏳ Waiting for image generation to complete...`);
            
            let imageUrl = null;
            let waitAttempts = 0;
            const maxWaitAttempts = 60; // Wait up to 60 attempts (about 2 minutes)
            
            while (!imageUrl && waitAttempts < maxWaitAttempts) {
                waitAttempts++;
                console.log(`   🔍 Checking for generated image (attempt ${waitAttempts}/60)...`);
                
                try {
                    // Look for the generated image
                    const imageElement = await page.$('img[data-sentry-source-file="message-attachment.tsx"]');
                    
                    if (imageElement) {
                        imageUrl = await page.evaluate(el => el.getAttribute('src'), imageElement);
                        if (imageUrl && imageUrl.includes('cloudflarestorage.com')) {
                            console.log(`\n🎉 Image generation completed!`);
                            console.log(`🖼️  Image URL: ${imageUrl}`);
                            break;
                        }
                    }
                    
                    // Wait 2 seconds before checking again
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } catch (error) {
                    console.log(`   ⚠️  Error checking for image: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            if (!imageUrl) {
                console.log(`\n⏰ Timeout: Image generation took longer than expected`);
                console.log(`🔍 Browser kept open for manual inspection`);
            } else {
                console.log(`\n✅ Successfully generated and retrieved image URL!`);
                console.log(`🔗 You can download the image from: ${imageUrl}`);
            }
            
            console.log(`\n🔍 Browser kept open for manual inspection`);
            console.log(`Press Ctrl+C to close when done`);
            
            // Wait indefinitely for manual inspection
            await new Promise(() => {});
        } catch (error) {
            console.error(`\n❌ LM Arena test failed:`, error.message);
            throw error;
        }
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

// Run the test
testLMArena().catch(console.error);

