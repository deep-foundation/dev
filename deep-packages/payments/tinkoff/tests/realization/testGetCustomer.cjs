const {testAddCustomer} = require('./testAddCustomer.cjs');
const {getCustomer} = require('./../../getCustomer.cjs');

exports.testGetCustomer = async ({customerKey,terminalKey, phone}) => {
    console.log('testGetCustomer-start');

    const customerOptions = {
      TerminalKey: terminalKey,
      CustomerKey: customerKey,
    };

    const addCustomerDataOptions = {
      ...customerOptions,
      Phone: phone,
    };

    const addResult = await testAddCustomer(addCustomerDataOptions);

    expect(addResult.error).to.equal(undefined);

    const getResult = await getCustomer(customerOptions);

    expect(getResult.error).to.equal(undefined);
    expect(getResult.response.Phone).to.equal(
        phone
    );

    console.log('testGetCustomer-end');
  };