const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const endpoint = 'https://www.itv-tuvrheinland.es/citation/getAvailableDates?center_id=17&vehicle_type_id=9&service_id=1';
const saveFilePath = 'data.json';

// Retrieve Telegram API token and chat ID from environment variables
const telegramApiToken = process.env.TELEGRAM_API_TOKEN;
const chatId = process.env.CHAT_ID;

console.log('telegramApiToken:',telegramApiToken)

// Create a new Telegram bot instance
const bot = new TelegramBot(telegramApiToken, { polling: false });

// Function to fetch data from the endpoint
async function fetchData() {
  try {
    const response = await axios.get(endpoint);
    console.log('Status code:', response.status)
    console.log('Available Dates:', response.data.result.availableDates)
    return response.data.result.availableDates;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return null;
  }
}

// Function to save data to a file
function saveDataToFile(data) {
  fs.writeFileSync(saveFilePath, JSON.stringify(data), 'utf8');
  console.log('Data saved to file:', saveFilePath);
}

// Function to send a Telegram message
function sendTelegramMessage(message) {
  bot.sendMessage(chatId, message);
}

// Main function to check for changes and take actions
async function main() {
  try {
    const newData = await fetchData();

    if (newData === null) {
      return;
    }

    let oldData = [];

    try {
      const fileContent = fs.readFileSync(saveFilePath, 'utf8');
      oldData = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Error reading saved data:', error.message);
    }

    if (!oldData || JSON.stringify(newData) !== JSON.stringify(oldData)) {
      saveDataToFile(newData);
      sendTelegramMessage('New available dates:\n' + Object.values(newData).join('\n') + '\nBook Now: https://www.itv-tuvrheinland.es/cita-previa-itv?vehicle_type_id=9&center_id=17');
      
    } else {
      console.log('Data has not changed.');
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

// Call the main function
main();