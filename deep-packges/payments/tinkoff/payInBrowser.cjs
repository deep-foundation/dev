

const payInBrowser = async ({ page, browser, url }) => {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await sleep(5000);
    const oldForm = await page.evaluate(() => {
      return !!document.querySelector(
        'input[automation-id="tui-input-card-grouped__card"]'
      );
    });
    if (oldForm) {
      console.log('OLD FORM!!!!!!!');
      // Старая форма используется на тестовом сервере
      const cvc1 = await page.evaluate(() => {
        return !!document.querySelector(
          'button[automation-id="pay-card__submit"]'
        );
      });
      if (cvc1) {
        await page.waitForSelector(
          'input[automation-id="tui-input-card-grouped__card"]'
        );
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__card"]',
          process.env.PAYMENTS_C2B_CARD_NUMBER_SUCCESS
        ); // card number
        await sleep(300);
        await page.keyboard.press('Tab');
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__expire"]',
          process.env.PAYMENTS_C2B_CARD_EXPDATE
        ); // expired date
        await sleep(300);
        await page.keyboard.press('Tab');
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__cvc"]',
          process.env.PAYMENTS_C2B_CARD_CVC
        ); // CVC code
        await sleep(300);
        await page.click('button[automation-id="pay-card__submit"]'); // submit button
      } else {
        await page.waitForSelector(
          'input[automation-id="tui-input-card-grouped__card"]'
        );
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__card"]',
          process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS
        ); // card number
        await sleep(300);
        await page.keyboard.press('Tab');
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__expire"]',
          process.env.PAYMENT_E2C_CARD_EXPDATE
        ); // expired date
        await sleep(300);
        await page.keyboard.press('Tab');
        await sleep(300);
        await page.type(
          'input[automation-id="tui-input-card-grouped__cvc"]',
          process.env.PAYMENT_E2C_CARD_CVC
        ); // CVC code
        await sleep(300);
        await page.click('button[automation-id="pay-wallet__submit"]'); // submit button
        await sleep(300);
        await page.waitForSelector('input[name="password"]');
        const code = prompt('enter code ');
        console.log('code', code);
        await page.type('input[name="password"]', code);
        await sleep(1000);
      }
      // TODO: пока старая форма вызывалась только на тестовой карте, где ввод смс кода не нужен
      await sleep(1000);
    } else {
      console.log('NEW FORM!!!!!!!');
      await page.type('#pan', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
      await page.type('#expDate', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
      await page.type('#card_cvc', process.env.PAYMENT_E2C_CARD_CVC); // CVC code
      await page.click('button[type=submit]'); // submit button
      await page.waitForSelector('input[name="password"]');
      const code = prompt('enter code ');
      console.log('code', code);
      await page.type('input[name="password"]', code);
      await sleep(3000);
    }
    await browser.close();
  };

  exports.payInBrowser = payInBrowser;