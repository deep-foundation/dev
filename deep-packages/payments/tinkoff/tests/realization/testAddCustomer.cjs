const { expect } = require('chai');
const { addCustomer } = require('../../addCustomer.cjs');

exports.testAddCustomer = async ({customerKey,terminalKey}) => {
    console.log('testAddCustomer-start');

    const addCustomerOptions = {
      TerminalKey: terminalKey,
      CustomerKey: customerKey,
    };
    console.log({ addCustomerOptions });

    const addCustomerResult = await addCustomer(addCustomerOptions);
    console.log({ addCustomerResult });

    expect(addCustomerResult.error).to.equal(undefined);
    console.log('testAddCustomer-end');
  };