export { };

import { connect } from "puppeteer-real-browser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureLoggedIn, listAccounts, getVerifiedAccount } from './login_helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMostRecentSession(): string | null {
    const basePath = path.join(__dirname, '..');
    const sessionDirs: string[] = [];
    
    try {
        const files = fs.readdirSync(basePath);
        for (const file of files) {
            const fullPath = path.join(basePath, file);
            if (fs.statSync(fullPath).isDirectory() && 
                (file.includes('session') || file.includes('user-data'))) {
                sessionDirs.push(fullPath);
            }
        }
    } catch (error) {
        console.error('Error reading session directories:', error);
        return null;
    }
    
    if (sessionDirs.length === 0) return null;
    
    const sessions = sessionDirs.map(dir => ({
        path: dir,
        mtime: fs.statSync(dir).mtime
    }));
    
    sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return sessions[0].path;
}

async function testLogin() {
    console.log(`\n🔐 === LOGIN TESTER ===`);
    
    // Show available accounts first
    console.log(`\n📋 Checking available accounts...`);
    listAccounts();
    
    const account = getVerifiedAccount();
    if (!account) {
        console.log(`❌ No verified accounts found in accounts.json`);
        console.log(`💡 Run 'npm run single' to create a new account first`);
        process.exit(1);
    }
    
    const sessionPath = getMostRecentSession();
    if (!sessionPath) {
        console.log(`❌ No session directory found, creating new one...`);
    } else {
        console.log(`📁 Using session: ${path.basename(sessionPath)}`);
    }

    const userDataDir = sessionPath || path.join(__dirname, '..', `test-login-${Date.now()}`);
    const args = ['--no-sandbox', '--disable-setuid-sandbox'];
    
    const { browser, page } = await connect({
        headless: false,
        defaultViewport: {
            width: 1280,
            height: 1024
        },
        args: [...args, `--user-data-dir=${userDataDir}`],
        recaptcha: true,
        disableXvfb: true
    } as any);

    try {
        // Test login process
        const loginSuccess = await ensureLoggedIn(page);
        
        if (loginSuccess) {
            console.log(`\n✅ === LOGIN TEST SUCCESSFUL ===`);
            
            // Test accessing different profile pages
            const testPages = [
                'https://www.upwork.com/nx/create-profile/',
                'https://www.upwork.com/nx/create-profile/work-preference',
                'https://www.upwork.com/nx/create-profile/resume-import',
                'https://www.upwork.com/nx/create-profile/categories'
            ];
            
            console.log(`\n🧪 Testing access to profile pages...`);
            
            for (const url of testPages) {
                try {
                    console.log(`\n🌐 Testing: ${url}`);
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const currentUrl = page.url();
                    const title = await page.title();
                    
                    if (currentUrl.includes('/login')) {
                        console.log(`   ❌ Redirected to login - session issue`);
                    } else {
                        console.log(`   ✅ Successfully accessed`);
                        console.log(`   📍 URL: ${currentUrl}`);
                        console.log(`   📄 Title: ${title}`);
                        
                        // Check for key elements
                        const pageInfo = await page.evaluate(() => {
                            return {
                                hasButtons: document.querySelectorAll('button').length,
                                hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length,
                                hasSkillsInput: document.querySelectorAll('input.air3-typeahead-input-fake').length > 0
                            };
                        });
                        
                        console.log(`   📊 Elements: ${pageInfo.hasButtons} buttons, ${pageInfo.hasCheckboxes} checkboxes, Skills input: ${pageInfo.hasSkillsInput ? 'Yes' : 'No'}`);
                    }
                } catch (error) {
                    console.log(`   ❌ Failed to access: ${(error as Error).message}`);
                }
            }
            
            console.log(`\n✅ Login test completed successfully!`);
            console.log(`🎯 You can now run other tests like:`);
            console.log(`   npm run test-categories`);
            console.log(`   npm run test-flow`);
            console.log(`   npm run test-resume`);
            
        } else {
            console.log(`\n❌ === LOGIN TEST FAILED ===`);
            console.log(`💡 Possible solutions:`);
            console.log(`   1. Run 'npm run single' to create a new account`);
            console.log(`   2. Check if accounts.json has verified accounts`);
            console.log(`   3. Verify account credentials are still valid`);
        }
        
        console.log(`\n🔍 Browser kept open for manual inspection`);
        console.log(`Press Ctrl+C to close when done`);
        
        // Wait indefinitely
        await new Promise(() => {});

    } catch (error) {
        console.error(`\n❌ Login test failed:`, (error as Error).message);
        throw error;
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testLogin().catch(console.error);
}