import {test} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Lade Umgebungsvariablen aus der .env-Datei für lokale Tests
dotenv.config();

let orderedMeals: { deliveryDate: string, dish: string }[] = [];

test.beforeAll(() => {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
});

test('Grab food schedule', async ({page}) => {
    page.on('websocket', ws => {
        ws.on('framereceived', event => {
            const payloadString = event.payload.toString();
            if (!payloadString.includes('foodDays')) {
                return;
            }

            try {
                const payload = JSON.parse(payloadString);
                const data = payload[3]?.[0];

                if (data && data.foodDays) {
                    for (const foodDay of data.foodDays) {
                        if (foodDay.mealsGroups) {
                            for (const mealsGroup of foodDay.mealsGroups) {
                                if (mealsGroup.meals) {
                                    for (const meal of mealsGroup.meals) {
                                        if (meal.dish && meal.dish.ordered === true) {
                                            orderedMeals.push({ deliveryDate: foodDay.deliveryDate, dish: meal.dish.name });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });
    });

    await page.goto('https://www.dls-gmbh.biz/mein-essen/food');

    await page.locator('.action-text').click();

    // Fill in login form from environment variables
    if (!process.env.DLS_USERNAME || !process.env.DLS_PASSWORD) {
        throw new Error('DLS_USERNAME and DLS_PASSWORD environment variables must be set.');
    }
    await page.getByPlaceholder('Kundennummer').fill(process.env.DLS_USERNAME);
    await page.getByPlaceholder('Passwort').fill(process.env.DLS_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dash');

    await page.locator('a[routerlink="/mein-essen/food"]').click();
    await page.waitForTimeout(2000);
    await page.locator('i.fa-caret-right').click();
    await page.waitForTimeout(2000);
    await page.locator('i.fa-caret-right').click();
    await page.waitForTimeout(2000);
    await page.locator('i.fa-caret-right').click();
    await page.waitForTimeout(2000);
    await page.locator('i.fa-caret-right').click();
    await page.waitForTimeout(2000);


    await page.waitForURL('**/food');



});

test.afterAll(async () => {
    const logsDir = path.join(__dirname, '..', 'logs');
    const logFilePath = path.join(logsDir, 'ordered_meals_kurt.json');

    if (orderedMeals.length === 0) {
        console.log('No ordered meals found, skipping file creation and Google Drive upload.');
        return;
    }

    const outputJson = {
        kurt: orderedMeals
    };

    fs.writeFileSync(logFilePath, JSON.stringify(outputJson, null, 2));
    console.log(`Ordered meals saved to ${logFilePath}`);
    console.log(`Content of the file: ${JSON.stringify(outputJson, null, 2)}`);
});
