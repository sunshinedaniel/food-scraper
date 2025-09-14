import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown() {
    const logsDir = path.join(__dirname, '..', 'logs');
    const dlsLogPath = path.join(logsDir, 'dls_ordered_meals.json');
    const gfbLogPath = path.join(logsDir, 'gfb_ordered_meals.json');

    let dlsOrderedMeals: any[] = [];
    let gfbOrderedMeals: any[] = [];

    if (fs.existsSync(dlsLogPath)) {
        try {
            dlsOrderedMeals = JSON.parse(fs.readFileSync(dlsLogPath, 'utf-8'));
            fs.unlinkSync(dlsLogPath);
        } catch (e) {
            console.error(`Error processing ${dlsLogPath}:`, e);
        }
    }

    if (fs.existsSync(gfbLogPath)) {
        try {
            gfbOrderedMeals = JSON.parse(fs.readFileSync(gfbLogPath, 'utf-8'));
            fs.unlinkSync(gfbLogPath);
        } catch (e) {
            console.error(`Error processing ${gfbLogPath}:`, e);
        }
    }

    if (dlsOrderedMeals.length > 0 || gfbOrderedMeals.length > 0) {
        const logFilePath = path.join(logsDir, 'ordered_meals.json');
        const outputJson = {
            dls: dlsOrderedMeals,
            gfb: gfbOrderedMeals
        };
        fs.writeFileSync(logFilePath, JSON.stringify(outputJson, null, 2));
        console.log(`Ordered meals saved to ${logFilePath}`);
    } else {
        console.log('No ordered meals found, skipping file creation.');
    }
}

export default globalTeardown;

