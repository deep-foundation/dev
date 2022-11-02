const addCardInBrowser = async ({ page, browser, url }) => {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#card-number__input');
    await delay(300);
    await page.type('#card-number__input', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
    await delay(300);
    await page.keyboard.press('Tab');
    await delay(300);
    await page.type('#card-expiration__input', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
    await delay(300);
    await page.keyboard.press('Tab');
    await delay(300);
    const needToEnterCVC = await page.evaluate(() => {
      return !!document.querySelector('#cvv__input1');
    });
    if (needToEnterCVC) {
      console.log('NEED CVC!!!!!!!');
      await page.type('#cvv__input1', process.env.PAYMENT_E2C_CARD_CVC[0]); // CVC code
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await page.type('#cvv__input2', process.env.PAYMENT_E2C_CARD_CVC[1]); // CVC code
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await page.type('#cvv__input3', process.env.PAYMENT_E2C_CARD_CVC[2]); // CVC code
      await delay(3000);
    } else {
      console.log('NO NEED CVC!!!!!!!');
    }
    await delay(1000);
    await page.keyboard.press('Tab');
    await delay(2000);
    await page.click('.form-submit button'); // submit button
    await delay(3000);
    // await delay(100);
    // await page.close();
    // await delay(100);
    await browser.close();
  };

  exports.addCardInBrowser = addCardInBrowser;