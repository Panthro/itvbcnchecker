const { chromium } = require('playwright');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Configuration
const CENTER_ID = 17; // The center we want to monitor
const PLATE = '1234BCD'; // Test license plate
const BASE_URL = 'https://www.itv-tuvrheinland.es/cita-previa-itv';
const SAVE_FILE_PATH = 'data.json';

// Telegram configuration
const telegramApiToken = process.env.TELEGRAM_API_TOKEN;
const chatId = process.env.CHAT_ID;

// Create Telegram bot instance
const bot = new TelegramBot(telegramApiToken, { polling: false });

// Function to send Telegram message
function sendTelegramMessage(message) {
  if (telegramApiToken && chatId) {
    bot.sendMessage(chatId, message);
    console.log('Telegram message sent:', message);
  } else {
    console.log('Telegram not configured, would send:', message);
  }
}

// Function to save data to file
function saveDataToFile(data) {
  fs.writeFileSync(SAVE_FILE_PATH, JSON.stringify(data), 'utf8');
  console.log('Data saved to file:', SAVE_FILE_PATH);
}

// Function to load existing data
function loadExistingData() {
  try {
    const fileContent = fs.readFileSync(SAVE_FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn('Error reading saved data:', error.message);
    return {};
  }
}

// Main function to check availability
async function checkAvailability() {
  let browser;
  try {
    console.log(`Starting availability check for center ID: ${CENTER_ID}`);
    
    // Launch browser
    browser = await chromium.launch({ 
      headless: true, // Set to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigate to the booking page with pre-filled parameters
    const url = `${BASE_URL}?plate=${PLATE}&center_id=${CENTER_ID}`;
    console.log('Navigating to:', url);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Accept cookies if present
    try {
      await page.click('button:has-text("Aceptar todo")', { timeout: 5000 });
      console.log('Accepted cookies');
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log('No cookie banner found or already accepted');
    }
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Step 1: License plate should be pre-filled, wait for it to be processed
    console.log('Waiting for license plate processing...');
    await page.waitForSelector('text="Matrícula: 1234BCD"', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for processing
    
    // Step 2: Select motorcycle
    console.log('Selecting motorcycle...');
    await page.click('text="Motocicleta"', { timeout: 5000 }).catch(() => {
      console.log('Motorcycle already selected or not found');
    });
    await page.waitForTimeout(1000);
    
    // Step 3: Select gasoline type
    console.log('Selecting gasoline type...');
    await page.click('label:has-text("Gasolina catalizada")', { timeout: 5000 }).catch(() => {
      console.log('Gasoline type already selected or not found');
    });
    await page.waitForTimeout(1000);
    
    // Step 4: Select ITV service
    console.log('Selecting ITV service...');
    await page.selectOption('select[id*="service"], select[name*="service"], #select-service', 'ITV', { timeout: 5000 }).catch(() => {
      console.log('ITV service already selected or not found');
    });
    await page.waitForTimeout(2000);
    
    // Step 5: Wait for date selection interface to load
    console.log('Waiting for date selection interface...');
    await page.waitForSelector('text="Elige mes, día y hora para la inspección", text="Selecciona fecha", table', { timeout: 15000 }).catch(() => {
      console.log('Date selection interface not found, checking for calendar...');
    });
    
    // Wait for calendar to load completely
    await page.waitForTimeout(3000);
    
    // Check for available time slots
    console.log('Checking for available time slots...');
    
    // Look for clickable time slots (available appointments) - multiple approaches
    const clickableElements = await page.evaluate(() => {
      // Method 1: Look for elements with cursor pointer style
      const pointerElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.cursor === 'pointer' && el.textContent && el.textContent.match(/\d{2}:\d{2}/);
      });
      
      // Method 2: Look for clickable table cells
      const tableCells = Array.from(document.querySelectorAll('td, th')).filter(el => {
        return el.textContent && el.textContent.match(/\d{2}:\d{2}/) && el.onclick;
      });
      
      // Method 3: Look for any clickable time elements
      const timeElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        return text && text.match(/^\d{2}:\d{2}$/) && (
          el.style.cursor === 'pointer' || 
          el.getAttribute('cursor') === 'pointer' ||
          el.onclick ||
          el.tagName === 'BUTTON'
        );
      });
      
      // Combine all methods and extract times
      const allElements = [...pointerElements, ...tableCells, ...timeElements];
      const times = allElements.map(el => el.textContent.trim()).filter(time => time.match(/^\d{2}:\d{2}$/));
      
      // Remove duplicates
      return [...new Set(times)];
    });
    
    console.log('Found clickable time slots:', clickableElements);
    
    // Check if there are any available slots
    const hasAvailability = clickableElements.length > 0;
    
    // Get current date range being displayed
    const dateRange = await page.textContent('text="octubre"').catch(() => 'Unknown date range');
    console.log('Current date range:', dateRange);
    
    // Prepare availability data
    const availabilityData = {
      center_id: CENTER_ID,
      check_time: new Date().toISOString(),
      date_range: dateRange,
      available_slots: clickableElements,
      has_availability: hasAvailability,
      total_slots: clickableElements.length
    };
    
    // Load existing data
    const existingData = loadExistingData();
    
    // Check if availability has changed
    const previousAvailability = existingData[`center_${CENTER_ID}`] || {};
    const availabilityChanged = JSON.stringify(availabilityData.available_slots) !== JSON.stringify(previousAvailability.available_slots);
    
    if (availabilityChanged) {
      console.log('Availability changed!');
      
      // Save new data
      existingData[`center_${CENTER_ID}`] = availabilityData;
      saveDataToFile(existingData);
      
      // Send notification
      if (hasAvailability) {
        const message = `🎉 AVAILABILITY FOUND for Center ${CENTER_ID}!\n\n` +
          `📅 Date Range: ${dateRange}\n` +
          `⏰ Available Slots: ${clickableElements.length}\n` +
          `🕐 Times: ${clickableElements.slice(0, 10).join(', ')}${clickableElements.length > 10 ? '...' : ''}\n\n` +
          `🔗 Book Now: ${url}`;
        
        sendTelegramMessage(message);
      } else {
        const message = `❌ No availability found for Center ${CENTER_ID}\n\n` +
          `📅 Date Range: ${dateRange}\n` +
          `🕐 Available Slots: 0\n\n` +
          `🔗 Check: ${url}`;
        
        sendTelegramMessage(message);
      }
    } else {
      console.log('No availability changes detected');
    }
    
    // Return availability info for logging
    return {
      center_id: CENTER_ID,
      has_availability: hasAvailability,
      available_slots: clickableElements,
      date_range: dateRange
    };
    
  } catch (error) {
    console.error('Error during availability check:', error);
    
    // Send error notification
    const errorMessage = `⚠️ Error checking availability for Center ${CENTER_ID}:\n\n${error.message}`;
    sendTelegramMessage(errorMessage);
    
    return {
      center_id: CENTER_ID,
      error: error.message,
      has_availability: false
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main execution
async function main() {
  console.log('Starting ITV availability checker...');
  console.log(`Monitoring Center ID: ${CENTER_ID}`);
  console.log(`Telegram configured: ${!!(telegramApiToken && chatId)}`);
  
  const result = await checkAvailability();
  console.log('Check completed:', result);
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkAvailability };
