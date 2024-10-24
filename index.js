// Required dependencies
const TelegramApi = require('node-telegram-bot-api');
const fs = require('fs');
const { google } = require('googleapis');

// Constants for Telegram bot and Google Sheets
const TOKEN = '7787559436:AAHujFfL08ckdaKCXSdpBglQht5Nov44qPY';
const CREDENTIALS = JSON.parse(fs.readFileSync('C:\\\\Users\\\\Asus\\\\Downloads\\\\positive-epoch-439512-f5-60cad04a9e2e.json'));
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1g4IBnSKuENvLONgQCxxZHETA5t8Z59vlwUKwIUNjUSY';

// Initialize bot and Google Sheets API
const bot = new TelegramApi(TOKEN, { polling: true });
const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });

// Helper function to get data from Google Sheets
async function getSpreadsheetData(range) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
    });
    return response.data.values;
}

// Store user choices and language preferences
let userChoices = {};
let userLanguage = {};

// Function to get a message in the correct language
function getMessage(chatId, enMessage, uaMessage) {
    return userLanguage[chatId] === 'uk' ? uaMessage : enMessage;
}

// Function to find the maximum value in a specific column within the recommendations
function findMaxInColumn(data, columnIndex) {
    let max = -Infinity;
    data.forEach(row => {
        const value = parseFloat(row[columnIndex]);
        if (value > max) {
            max = value;
        }
    });
    return max;
}

// Start bot interactions
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Introduction phase
    if (!userChoices[chatId]) {
        userChoices[chatId] = {};
        const name = msg.chat.first_name || 'User';
        await bot.sendMessage(chatId, `Heeey, dear ${name}, nice to meet you. Hooootelchik is a hotel loyalty programs best choice help app. Let's start from scratch, do you know what a hotel loyalty program is?`, {
            reply_markup: {
                keyboard: [
                    [{ text: 'Yes' }, { text: 'No' }]
                ],
                one_time_keyboard: true,
                resize_keyboard: true,
            },
        });
        return;
    }

    // Handle response to loyalty program question
    if (!userChoices[chatId].loyaltyProgramInfo) {
        if (text === 'Yes') {
            userChoices[chatId].loyaltyProgramInfo = true;
            await bot.sendMessage(chatId, 'Great! Let\'s proceed. How many nights per year do you plan to stay in a hotel?', {
                reply_markup: {
                    keyboard: [
                        [{ text: '5 to 10' }, { text: '10 to 15' }],
                        [{ text: '15 to 25' }, { text: '25+' }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else if (text === 'No') {
            userChoices[chatId].loyaltyProgramInfo = false;
            await bot.sendMessage(chatId, 'A hotel loyalty program is a reward program offered by a hotel chain to attract guests to their properties. You can read more about it here: https://en.wikipedia.org/wiki/Hotel_loyalty_program. Still interested?', {
                reply_markup: {
                    keyboard: [
                        [{ text: 'Yes' }, { text: 'No' }]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else {
            await bot.sendMessage(chatId, 'Please answer with Yes or No.');
        }
        return;
    }

    // Handle response to continuing after loyalty program info
    if (userChoices[chatId].loyaltyProgramInfo === false && !userChoices[chatId].continueAfterInfo) {
        if (text === 'Yes') {
            userChoices[chatId].continueAfterInfo = true;
            await bot.sendMessage(chatId, 'Great! Let\'s proceed. How many nights per year do you plan to stay in a hotel?', {
                reply_markup: {
                    keyboard: [
                        [{ text: '5 to 10' }, { text: '10 to 15' }],
                        [{ text: '15 to 25' }, { text: '25+' }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else if (text === 'No') {
            await bot.sendMessage(chatId, 'No problem! Feel free to reach out if you change your mind.');
            delete userChoices[chatId];
        } else {
            await bot.sendMessage(chatId, 'Please answer with Yes or No.');
        }
        return;
    }

    // Handle nights per year question
    if (!userChoices[chatId].nightsPerYear) {
        if (['5 to 10', '10 to 15', '15 to 25', '25+'].includes(text)) {
            userChoices[chatId].nightsPerYear = text;
            if (['5 to 10', '10 to 15', '15 to 25'].includes(text)) {
                await bot.sendMessage(chatId, 'If you spend only five to 10 nights in a hotel annually, don\'t obsess over hotel loyalty. Chasing elite status is worthwhile only if you\'ll confidently spend at least 25 nights each year, which can usually get you a mid-level tier of elite status. Do you still want to proceed?', {
                    reply_markup: {
                        keyboard: [
                            [{ text: 'Yes' }, { text: 'No' }]
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                });
            } else {
                userChoices[chatId].proceedAfterNights = true;
                const initialOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: getMessage(chatId, 'Geography', 'Географія') }],
                            [{ text: getMessage(chatId, 'Budget', 'Бюджет') }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'What matters more in your hotel search?', 'Що є важливішим у вашому пошуку готелю?'), initialOptions);
            }
        } else {
            await bot.sendMessage(chatId, 'Please select one of the given options.');
        }
        return;
    }

    // Handle response to proceeding after nights per year info
    if (userChoices[chatId].nightsPerYear && !userChoices[chatId].proceedAfterNights) {
        if (text === 'Yes') {
            userChoices[chatId].proceedAfterNights = true;
            const initialOptions = {
                reply_markup: {
                    keyboard: [
                        [{ text: getMessage(chatId, 'Geography', 'Географія') }],
                        [{ text: getMessage(chatId, 'Budget', 'Бюджет') }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            };
            await bot.sendMessage(chatId, getMessage(chatId, 'What matters more in your hotel search?', 'Що є важливішим у вашому пошуку готелю?'), initialOptions);
        } else if (text === 'No') {
            await bot.sendMessage(chatId, 'No problem! Feel free to reach out if you change your mind.');
            delete userChoices[chatId];
        } else {
            await bot.sendMessage(chatId, 'Please answer with Yes or No.');
        }
        return;
    }

    // Handle Geography or Budget selection
    if (userChoices[chatId].proceedAfterNights) {
        if (text === getMessage(chatId, 'Geography', 'Географія')) {
            userChoices[chatId].priority = 'geography';
            if (!userChoices[chatId].region) {
                const geographyOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: 'North America' }, { text: 'Europe' }],
                            [{ text: 'Asia' }, { text: 'Middle East' }, { text: 'Latin America' }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'Please select a region:', 'Будь ласка, оберіть регіон:'), geographyOptions);
                return;
            }
        } else if (text === getMessage(chatId, 'Budget', 'Бюджет')) {
            userChoices[chatId].priority = 'budget';
            if (!userChoices[chatId].budget) {
                const budgetOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: getMessage(chatId, 'Luxury', 'Розкішний') }],
                            [{ text: getMessage(chatId, 'Mid-Range', 'Середній') }],
                            [{ text: getMessage(chatId, 'Low-Cost', 'Бюджетний') }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'Please select your budget:', 'Будь ласка, оберіть свій бюджет:'), budgetOptions);
                return;
            }
        } else if (['Luxury', 'Mid-Range', 'Low-Cost'].includes(text)) {
            userChoices[chatId].budget = text;
            if (text === 'Low-Cost' && !userChoices[chatId].region) {
                const geographyOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: 'North America' }, { text: 'Latin America' }, { text: 'Asia' }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'Please select a region:', 'Будь ласка, оберіть регіон:'), geographyOptions);
                return;
            } else if (!userChoices[chatId].region) {
                const geographyOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: 'North America' }, { text: 'Europe' }],
                            [{ text: 'Asia' }, { text: 'Middle East' }, { text: 'Latin America' }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'Please select a region:', 'Будь ласка, оберіть регіон:'), geographyOptions);
                return;
            }
        } else if (['North America', 'Europe', 'Asia', 'Middle East', 'Latin America'].includes(text)) {
            userChoices[chatId].region = text;
            if (!userChoices[chatId].budget) {
                const budgetOptions = {
                    reply_markup: {
                        keyboard: [
                            [{ text: getMessage(chatId, 'Luxury', 'Розкішний') }],
                            [{ text: getMessage(chatId, 'Mid-Range', 'Середній') }],
                            [{ text: getMessage(chatId, 'Low-Cost', 'Бюджетний') }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                };
                await bot.sendMessage(chatId, getMessage(chatId, 'Please select your budget:', 'Будь ласка, оберіть свій бюджет:'), budgetOptions);
                return;
            }
        }

        // Provide recommendations based on user choices
        if (userChoices[chatId].region && userChoices[chatId].budget) {
            const data = await getSpreadsheetData('A2:Z'); // Adjust the range as needed
            // Filter data based on user choices
            const filteredData = data.filter(row => {
                const matchesRegion = row[0] === userChoices[chatId].region;
                const matchesBudget = row[4].toLowerCase() === userChoices[chatId].budget.toLowerCase();
                return matchesRegion && matchesBudget;
            });

            if (filteredData.length > 0) {
                userChoices[chatId].initialRecommendations = filteredData;
                // Ask about value preference
                await bot.sendMessage(chatId, 'Would you like to prioritize the monetary value of rewards (e.g., how much hotel points are worth in cents) or the number of offerings available? Please choose one:', {
                    reply_markup: {
                        keyboard: [
                            [{ text: 'Monetary Value of Rewards' }],
                            [{ text: 'Number of Offerings' }],
                        ],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                    },
                });
            } else {
                await bot.sendMessage(chatId, getMessage(chatId, 'No hotels found matching your preferences.', 'Готелів, що відповідають вашим критеріям, не знайдено.'));
                delete userChoices[chatId];
            }
        }
    }

    // Handle user's preference for monetary value or number of offerings
    if (userChoices[chatId].initialRecommendations && !userChoices[chatId].valuePreference) {
        if (text === 'Monetary Value of Rewards' || text === 'Number of Offerings') {
            userChoices[chatId].valuePreference = text;

            // Further filter based on the user's value preference
            let filteredData = userChoices[chatId].initialRecommendations;
            if (text === 'Monetary Value of Rewards') {
                // Column F corresponds to index 5 (since indices start at 0)
                const maxValue = findMaxInColumn(filteredData, 5);
                filteredData = filteredData.filter(row => parseFloat(row[5]) === maxValue);
            } else if (text === 'Number of Offerings') {
                // Column G corresponds to index 6
                const maxValue = findMaxInColumn(filteredData, 6);
                filteredData = filteredData.filter(row => parseFloat(row[6]) === maxValue);
            }

            userChoices[chatId].filteredRecommendations = filteredData;

            // Ask if the user wants to be even more specific
            await bot.sendMessage(chatId, 'Would you like to be even more specific and choose a loyalty program based on your lifestyle and benefits preferences?', {
                reply_markup: {
                    keyboard: [
                        [{ text: 'Yes' }, { text: 'No' }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else {
            await bot.sendMessage(chatId, 'Please select one of the given options.');
        }
        return;
    }

    // Handle lifestyle and benefits preference
    if (userChoices[chatId].valuePreference && !userChoices[chatId].lifestyleAsked) {
        if (text === 'Yes') {
            userChoices[chatId].lifestyleAsked = true;
            await bot.sendMessage(chatId, 'Please select your lifestyle preference:', {
                reply_markup: {
                    keyboard: [
                        [{ text: 'Spontaneous and Active' }],
                        [{ text: 'Spontaneous and Chill' }],
                        [{ text: 'Planned and Active' }],
                        [{ text: 'Planned and Chill' }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else if (text === 'No') {
            // Provide final recommendations without lifestyle filtering
            let recommendations = userChoices[chatId].filteredRecommendations.map(row => `${row[1]} (${row[2]})`).join('\n');
            await bot.sendMessage(chatId, `Based on your preferences, we recommend the following loyalty programs:\n${recommendations}`);
            delete userChoices[chatId];
        } else {
            await bot.sendMessage(chatId, 'Please answer with Yes or No.');
        }
        return;
    }

    // Handle user's lifestyle choice
    if (userChoices[chatId].lifestyleAsked && !userChoices[chatId].lifestyle) {
        const lifestyleOptions = ['Spontaneous and Active', 'Spontaneous and Chill', 'Planned and Active', 'Planned and Chill'];
        if (lifestyleOptions.includes(text)) {
            userChoices[chatId].lifestyle = text;

            // Map the lifestyle to the corresponding columns
            let columnsToCheck = [];
            if (text === 'Spontaneous and Active') {
                columnsToCheck = ['I', 'N', 'P', 'R', 'V', 'W'];
            } else if (text === 'Spontaneous and Chill') {
                columnsToCheck = ['I', 'N', 'M', 'N', 'S', 'Q', 'W'];
            } else if (text === 'Planned and Active') {
                columnsToCheck = ['H', 'L', 'O', 'U', 'P', 'R'];
            } else if (text === 'Planned and Chill') {
                columnsToCheck = ['H', 'L', 'M', 'Q', 'S', 'U'];
            }

            // Convert column letters to indices (A=0, B=1, ..., Z=25)
            const columnIndices = columnsToCheck.map(letter => letter.charCodeAt(0) - 65);

            // Filter recommendations based on the number of '1's in the specified columns
            let maxOnes = -1;
            let finalRecommendation = null;
            userChoices[chatId].filteredRecommendations.forEach(row => {
                let onesCount = 0;
                columnIndices.forEach(index => {
                    if (row[index] === '1') {
                        onesCount += 1;
                    }
                });
                if (onesCount > maxOnes) {
                    maxOnes = onesCount;
                    finalRecommendation = row;
                }
            });

            if (finalRecommendation) {
                await bot.sendMessage(chatId, `Based on your preferences, we recommend the following loyalty program:\n${finalRecommendation[1]} (${finalRecommendation[2]})`);
            } else {
                await bot.sendMessage(chatId, 'No loyalty programs found matching your lifestyle preferences.');
            }
            delete userChoices[chatId];
        } else {
            await bot.sendMessage(chatId, 'Please select one of the given options.');
        }
        return;
    }

    // Handle any other interactions or end the conversation
    if (text === '/start') {
        delete userChoices[chatId];
        await bot.sendMessage(chatId, 'Conversation reset. Please start again.');
    } else {
        await bot.sendMessage(chatId, 'I\'m not sure how to help with that. Please select one of the given options.');
    }
});
