import nodemailer from 'nodemailer';
import axios from 'axios';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure Nodemailer transporter (SMTP)
// Expects environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'dummy',
        pass: process.env.SMTP_PASS || 'dummy'
    }
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Dispatch an alert to all active recipients via configured channels
 * @param {Object} alertData - The alert information to send
 */
export async function dispatchAlert(alertData) {
    try {
        // Fetch active recipients
        const { rows: recipients } = await pool.query(
            'SELECT name, email, telegram_chat_id FROM alert_recipients WHERE is_active = TRUE'
        );

        if (recipients.length === 0) {
            console.log('[Dispatch] No active recipients configured. Skipping dispatch.');
            return;
        }

        const messageText = `🚨 DAFS ALERT 🚨\n\nMonitor ID: ${alertData.monitor_id}\nAddress: ${alertData.address}\nChain: ${alertData.chain}\nAmount: ${alertData.amount}\nMessage: ${alertData.message}\nTx Hash: ${alertData.tx_hash}\nTime: ${new Date().toLocaleString()}`;
        const htmlText = `<h2>🚨 DAFS Investigation Alert</h2>
            <ul>
                <li><strong>Monitor ID:</strong> ${alertData.monitor_id}</li>
                <li><strong>Target:</strong> ${alertData.address}</li>
                <li><strong>Network:</strong> ${alertData.chain}</li>
                <li><strong>Volume:</strong> ${alertData.amount}</li>
                <li><strong>Message:</strong> ${alertData.message}</li>
                <li><strong>Tx Hash:</strong> ${alertData.tx_hash}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>Please review immediately in the Digital Asset Forensics Suite.</p>`;

        for (const recipient of recipients) {
            // 1. Send Email
            if (recipient.email) {
                try {
                    await transporter.sendMail({
                        from: '"DAFS Alert System" <alerts@namolabs.com>',
                        to: recipient.email,
                        subject: `🚨 [DAFS] Alert: ${alertData.message}`,
                        text: messageText,
                        html: htmlText
                    });
                    console.log(`[Dispatch] Email sent to ${recipient.email}`);
                } catch (emailErr) {
                    console.error(`[Dispatch] Failed to send email to ${recipient.email}: ${emailErr.message}`);
                }
            }

            // 2. Send Telegram
            if (recipient.telegram_chat_id && TELEGRAM_BOT_TOKEN) {
                try {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        chat_id: recipient.telegram_chat_id,
                        text: messageText
                    });
                    console.log(`[Dispatch] Telegram sent to ${recipient.telegram_chat_id}`);
                } catch (tgErr) {
                    console.error(`[Dispatch] Failed to send telegram to ${recipient.telegram_chat_id}: ${tgErr.message}`);
                }
            }
        }
    } catch (err) {
        console.error('[Dispatch] Fatal error in dispatchService:', err.message);
    }
}
