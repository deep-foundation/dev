const { removeCustomer } = require("../../removeCustomer.cjs");
const { testAddCustomer } = require("./testAddCustomer.cjs");

exports.testRemoveCustomer = async ({customerKey,terminalKey, phone}) => {
    console.log('testRemoveCustomer-start');

    const removeCustomerData = {
      TerminalKey: terminalKey,
      CustomerKey: customerKey,
    };

    const newAddCustomerData = {
      ...removeCustomerData,
      Phone: phone,
    };

    const addResult = await testAddCustomer(newAddCustomerData);

    expect(addResult.error).to.equal(undefined);

    const removeResult = await removeCustomer(removeCustomerData);

    expect(removeResult.error).to.equal(undefined);

    console.log('testRemoveCustomer-end');
  };