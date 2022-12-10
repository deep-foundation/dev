const { expect } = require('chai');
const { confirm } = require('../../confirm.cjs');
const { payInBrowser } = require('../../payInBrowser.cjs');
const { testInit } = require('./testInit.cjs');
const puppeteer = require('puppeteer');

exports.testConfirm = async ({amount, customerKey,orderId,terminalKey, email, phone}) => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const initResult = await testInit({amount, customerKey,orderId,terminalKey, email, phone});

    await payInBrowser({
      browser,
      page,
      url: initResult.response.PaymentURL,
    });

    const confirmOptions = {
      TerminalKey: terminalKey,
      PaymentId: initResult.response.PaymentId,
    };

    const confirmResult = await confirm(confirmOptions);

    expect(confirmResult.error).to.equal(undefined);
    expect(confirmResult.response.Status).to.equal('CONFIRMED');

    return confirmResult;
  };