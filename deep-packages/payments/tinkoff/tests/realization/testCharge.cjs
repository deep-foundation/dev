const { expect } = require('chai');
const { charge } = require('../../charge.cjs');
const { getCardList } = require('../../getCardList.cjs');
const { getState } = require('../../getState.cjs');
const { payInBrowser } = require('../../payInBrowser.cjs');
const { testInit } = require('./testInit.cjs');
const puppeteer = require('puppeteer');

exports.testCharge = async ({amount, customerKey,orderId,terminalKey, email, phone}) => {
    console.log('testCharge-start');
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const initResult = await testInit({amount, customerKey,orderId,terminalKey, email, phone});

    await payInBrowser({
      browser,
      page,
      url: initResult.response.PaymentURL,
    });

    const getCardListOptions = {
      TerminalKey: terminalKey,
      CustomerKey: customerKey,
    };

    const getCardListResult = await getCardList(getCardListOptions);

    expect(getCardListResult.response[0].RebillId).to.have.length.above(0);

    const getStateOptions = {
      TerminalKey: terminalKey,
      PaymentId: initResult.response.PaymentId,
    };

    const getStateResult = await getState(getStateOptions);

    expect(getStateResult.response.Status).to.equal('AUTHORIZED');

    const newInitResult = await testInit({amount, customerKey,orderId,terminalKey, email, phone});
    

    const newChargeOptions = {
      TerminalKey: terminalKey,
      PaymentId: newInitResult.response.PaymentId,
      RebillId: Number(getCardListResult.response[0].RebillId),
    };

    const chargeResult = await charge(newChargeOptions);

    expect(chargeResult.error).to.equal(undefined);
    console.log('testCharge-end');
  };