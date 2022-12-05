const { expect } = require('chai');
const { payInBrowser } = require('../../payInBrowser.cjs');
const { testInit } = require('./testInit.cjs');
const puppeteer = require('puppeteer');

exports.testGetState = async ({amount, customerKey,orderId,terminalKey, email, phone}) => {
    const initResult = await testInit({amount, customerKey,orderId,terminalKey, email, phone});

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await payInBrowser({
      browser,
      page,
      url: initResult.response.PaymentURL,
    });

    const getStateOptions = {
      TerminalKey: terminalKey,
      PaymentId: initResult.response.PaymentId,
    };

    const getStateResult = await getState(getStateOptions);

    expect(getStateResult.error).to.equal(undefined);
  };