const { expect } = require('chai');

exports.testInit = async ({amount, customerKey,orderId,terminalKey, email, phone}) => {
    const initOptions = {
      TerminalKey: terminalKey,
      OrderId: orderId,
      Amount: amount,
      Description: 'Test shopping',
      CustomerKey: customerKey,
      Language: 'ru',
      Recurrent: 'Y',
      DATA: {
        Email: email,
        Phone: phone,
      },
      // Receipt: {
      // 	Items: [{
      // 		Name: 'Test item',
      // 		Price: PRICE,
      // 		Quantity: 1,
      // 		Amount: PRICE,
      // 		PaymentMethod: 'prepayment',
      // 		PaymentObject: 'service',
      // 		Tax: 'none',
      // 	}],
      // 	Email: process.env.PAYMENTS_C2B_EMAIL,
      // 	Phone: process.env.PAYMENTS_C2B_PHONE,
      // 	Taxation: 'usn_income',
      // },
    };

    const initResult = await init(initOptions);

    expect(initResult.error).to.equal(undefined);

    return initResult;
  };