import { migrate, rollback } from './migrate';

const command = process.argv[2];

(async (): Promise<void> => {
    try {
        if (command === 'migrate') {
            await migrate();
        } else if (command === 'rollback') {
            await rollback();
        } else {
            console.log('Usage: tsx cli.ts [migrate|rollback]');
        }
    } catch (error) {
        process.exit(1);
    }
})().catch(console.error);
