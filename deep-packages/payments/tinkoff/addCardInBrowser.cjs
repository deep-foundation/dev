const { sleep } = require("../../sleep.cjs");

const addCardInBrowser = async ({ page, browser, url }) => {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#card-number__input');
  await sleep(300);
  await page.type('#card-number__input', process.env.PAYMENTS_C2B_CARD_NUMBER_SUCCESS); // card number
  await sleep(300);
  await page.keyboard.press('Tab');
  await sleep(300);
  await page.type('#card-expiration__input', process.env.PAYMENTS_C2B_CARD_EXPDATE); // expired date
  await sleep(300);
  await page.keyboard.press('Tab');
  await sleep(300);
  const needToEnterCVC = await page.evaluate(() => {
    return !!document.querySelector('#cvv__input1');
  });
  if (needToEnterCVC) {
    console.log('NEED CVC!!!!!!!');
    await page.type('#cvv__input1', process.env.PAYMENTS_C2B_CARD_CVC[0]); // CVC code
    await sleep(300);
    await page.keyboard.press('Tab');
    await sleep(300);
    await page.type('#cvv__input2', process.env.PAYMENTS_C2B_CARD_CVC[1]); // CVC code
    await sleep(300);
    await page.keyboard.press('Tab');
    await sleep(300);
    await page.type('#cvv__input3', process.env.PAYMENTS_C2B_CARD_CVC[2]); // CVC code
    await sleep(3000);
  } else {
    console.log('NO NEED CVC!!!!!!!');
  }
  await sleep(1000);
  await page.keyboard.press('Tab');
  await sleep(2000);
  await page.click('.form-submit button'); // submit button
  await sleep(3000);
  // await sleep(100);
  // await page.close();
  // await sleep(100);
  await browser.close();
};

  exports.addCardInBrowser = addCardInBrowser;