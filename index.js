const { chromium } = require('playwright');
const fs = require('fs');

async function crawl(SEARCH_TERM) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Opening Google Maps...');
    await page.goto('https://www.google.com/maps/search/' + encodeURIComponent(SEARCH_TERM));

    const feedSelector = 'div[role="feed"]';
    const endOfListText = "You've reached the end of the list.";

    let previousHeight = 0;
    let currentHeight = await page.$eval(feedSelector, element => element.scrollHeight);

    const dataArray = [];

    while (previousHeight !== currentHeight) {
        previousHeight = currentHeight;

        console.log('Scrolling to the bottom...');
        await page.$eval(feedSelector, element => element.scrollTop = element.scrollHeight);

        await page.waitForTimeout(2000); // Adjust the wait time as needed

        const isEndOfList = await page.$eval(feedSelector, (element, text) => element.innerText.includes(text), endOfListText);

        if (isEndOfList) {
            console.log('Reached the end of the list.');
            break;
        }

        currentHeight = await page.$eval(feedSelector, element => element.scrollHeight);

        console.log('Continuing to scroll...');
    }

    console.log('Scrolling back to the top...');
    await page.$eval(feedSelector, element => element.scrollTop = 0);

    console.log('Waiting for a moment...');
    await page.waitForTimeout(2000); // Adjust the wait time as needed

    console.log('Clicking on each element with class "hfpxzc"...');
    const elementsToClick = await page.$$('.hfpxzc');
    for (let i = 0; i < elementsToClick.length; i++) {
        const element = elementsToClick[i];
        const isElementAttached = await element.evaluate(element => !!element);

        if (!isElementAttached) {
            console.log('Element is not attached, skipping...');
            continue;
        }

        await element.click();
        await page.waitForSelector('div[role="main"]', { timeout: 5000 }); // Wait for the div with role "main" to appear

        // Extract data from the specified selectors
        const extractedData = await page.evaluate(() => {
            const nameElement = document.querySelector('div[role="main"] h1.DUwDvf');
            const categoryElement = document.querySelector('div[role="main"] button.DkEaL');
            const addressElement = document.querySelector('button[data-item-id="address"] .Io6YTe');
            const phoneElement = document.querySelector('div[role="main"] button[data-item-id="phone"] .Io6YTe');

            return {
                name: nameElement ? nameElement.textContent : null,
                category: categoryElement ? categoryElement.textContent : null,
                address: addressElement ? addressElement.textContent : null,
                phone: phoneElement ? phoneElement.textContent : null,
                zipCode: null, // Placeholder for zip code
            };
        });
        if (extractedData.name && extractedData.address) {


            // Extract zip code from the address and save it as a separate property
            const zipCodeMatch = extractedData.address.match(/\b\d{5}(?:-\d{4})?\b/);
            extractedData.zipCode = zipCodeMatch ? zipCodeMatch[0] : "No Zip Code Found";
            console.log('Extracted Data:', extractedData);
            // Add each extracted object to the dataArray
            dataArray.push(extractedData);

            fs.writeFileSync(SEARCH_TERM + '.json', JSON.stringify(dataArray, null, 2));
        } else {
            console.log('Not Saving:', extractedData);
        }

        await page.waitForTimeout(1.5 * 1000); // Pause for 1 second before proceeding to the next click
    }

    // Write the array of JSON objects to the "data.json" file
    fs.writeFileSync(SEARCH_TERM + '.json', JSON.stringify(dataArray, null, 2));

    console.log(`Data saved to "${SEARCH_TERM}.json"`);

    console.log('Closing the browser...');
    await browser.close();
    return dataArray
};

module.exports = crawl