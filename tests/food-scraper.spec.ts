import {test} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Lade Umgebungsvariablen aus der .env-Datei für lokale Tests
dotenv.config();

test.beforeAll(() => {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, {recursive: true});
    }
});

function cleanDishText(text: string): string {
    return text
        .replace(/\[h].*?\[\/h]/g, '') // [h]...[/h] und Inhalt entfernen
        .replace(/\[br]/g, ' ')          // [br] durch Leerzeichen ersetzen
        .replace(/\[\/?b]/g, '')         // [b] und [/b] Tags entfernen
        .replace(/"/g, '')               // Anführungszeichen entfernen
        .replace(/,\s*$/, '')            // Komma am Ende entfernen
        .replace(/\s+/g, ' ')            // Mehrfache Leerzeichen durch ein einzelnes ersetzen
        .trim();                         // Führende/nachfolgende Leerzeichen entfernen
}

test('Grab food schedule DLS', async ({page}) => {
    const dlsOrderedMeals: { date: string, dish: string }[] = [];
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
                                            const dishName = meal.dish.dishDescription.textSections.map(
                                                section => section.text === 'NK' ? ' (Bio)' : section.text
                                            ).join('');

                                            const deliveryDate = new Date(foodDay.deliveryDate);
                                            // Formatiert das Datum für die Zeitzone Europe/Berlin im Format JJJJ-MM-TT.
                                            // Die Locale 'sv-SE' (Schweden) wird verwendet, da sie standardmäßig dieses Format erzeugt.
                                            const formattedDate = new Intl.DateTimeFormat('sv-SE', {
                                                timeZone: 'Europe/Berlin',
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }).format(deliveryDate);

                                            dlsOrderedMeals.push({
                                                date: formattedDate,
                                                dish: dishName
                                            });
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

    if (dlsOrderedMeals.length > 0) {
        const logsDir = path.join(__dirname, '..', 'logs');
        const logFilePath = path.join(logsDir, 'dls_ordered_meals.json');
        fs.writeFileSync(logFilePath, JSON.stringify(dlsOrderedMeals, null, 2));
    }
});

test('Grab food schedule GFB', async ({page}) => {
    const gfbOrderedMeals: { date: string, dish: string }[] = [];
    page.on('response', async (response) => {
        if (response.url() === 'https://proxy.mms-rcs.de/call' && response.request().method() === 'POST') {
            const body = await response.text();
            if (body.includes('"mengeAlt"')) {
                try {
                    const jsonResponse = await response.json();
                    const content = jsonResponse.content;
                    if (!content || !content.kunden || !content.menuetexte) {
                        return;
                    }

                    const kundenKeys = Object.keys(content.kunden);
                    if (kundenKeys.length === 0) {
                        return;
                    }
                    const kunde = content.kunden[kundenKeys[0]];

                    if (kunde && kunde.tage) {
                        for (const tagKey in kunde.tage) {
                            const tag = kunde.tage[tagKey];
                            if (tag.bestellMenues) {
                                for (const menueKey in tag.bestellMenues) {
                                    const menue = tag.bestellMenues[menueKey];
                                    if (menue.mengeAlt > 0) {
                                        const menueText = content.menuetexte[menue.menueTextId];
                                        if (menueText) {
                                            gfbOrderedMeals.push({
                                                date: tag.datum,
                                                dish: cleanDishText(menueText.text)
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing or processing GFB response:', e);
                }
            }
        }
    });

    await page.goto('https://bestellung-gfb-catering.de/#/speiseplan-kunde');

    // Fill in login form from environment variables
    if (!process.env.GFB_USERNAME || !process.env.GFB_PASSWORD) {
        throw new Error('GFB_USERNAME and GFB_PASSWORD environment variables must be set.');
    }
    await page.locator('#benutzername').fill(process.env.GFB_USERNAME);
    await page.locator('#passwort').fill(process.env.GFB_PASSWORD);
    await page.locator('button.btn-login').click();

    await page.waitForTimeout(2000);

    await page.locator('mat-icon[aria-label="Zeitpunkt Vor"]').click();
    await page.waitForTimeout(2000);

    if (gfbOrderedMeals.length > 0) {
        const logsDir = path.join(__dirname, '..', 'logs');
        const logFilePath = path.join(logsDir, 'gfb_ordered_meals.json');
        fs.writeFileSync(logFilePath, JSON.stringify(gfbOrderedMeals, null, 2));
    }
});
