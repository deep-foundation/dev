const { insertHandler } = require("../../insertHandler.cjs");
const {handlersDependencies} = require("./handlersDependencies.cjs");
const {init} = require("./init.cjs");

const insertPayInsertHandler = async ({deep, notificationUrl, userEmail, userPhone, fileTypeId, containTypeId, packageId, dockerSupportsJsId,  handleInsertTypeId, handlerTypeId, payTypeId}) => {
    const code = `
async ({ deep, require, data: { newLink: payLink } }) => {
  ${handlersDependencies}

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const Payment = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
  const paymentLink = mpDownPay.find(link => link.type_id === Payment);
  console.log({paymentLink});
  if(!paymentLink) throw new Error("Payment link associated with the pay link " + payLink.id + " is not found.");

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === Sum); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + payLink.id + " is not found.");

  const fromLinkOfPaymentSelectQuery = await deep.select({
    id: paymentLink.from_id
  });
  if(fromLinkOfPaymentSelectQuery.error) { throw new Error(fromLinkOfPaymentSelectQuery.error.message); }
  const fromLinkOfPayment = fromLinkOfPaymentSelectQuery.data[0];
  console.log({fromLinkOfPayment});

  const storageBusinessLinkSelectQuery = await deep.select({
    id: paymentLink.to_id
  });
  if(storageBusinessLinkSelectQuery.error) { throw new Error(storageBusinessLinkSelectQuery.error.message); }
  const storageBusinessLinkId = storageBusinessLinkSelectQuery.data[0].id;
  console.log({storageBusinessLinkId});

  const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
  const tokenLinkSelectQuery = await deep.select({
    type_id: Token,
    from_id: storageBusinessLinkId,
    to_id: storageBusinessLinkId
  });
  if(tokenLinkSelectQuery.error) {throw new Error(tokenLinkSelectQuery.error.message);}
  const tokenLink = tokenLinkSelectQuery.data[0];
  console.log({tokenLink});

  const init = ${init.toString()};

  const options = {
    TerminalKey: tokenLink.value.value,
    OrderId: paymentLink?.value?.value.orderId ?? paymentLink.id,
    CustomerKey: deep.linkId,
    NotificationURL: "${notificationUrl}",
    PayType: 'T',
    Amount: sumLink.value.value,
    Description: 'Test shopping',
    Language: 'ru',
    Recurrent: 'Y',
    DATA: {
      Email: "${userEmail}",
      Phone: "${userPhone}",
    },
    // Receipt: {
    //   Items: [{
    //     Name: 'Test item',
    //     Price: sum,
    //     Quantity: 1,
    //     Amount: sumLink.value.value,
    //     PaymentMethod: 'prepayment',
    //     PaymentObject: 'service',
    //     Tax: 'none',
    //   }],
    //   Email: "${userEmail}",
    //   Phone: "${userPhone}",
    //   Taxation: 'usn_income',
    // }
  };
  console.log({options});

  let initResult = await init(options);
  console.log({initResult});
  if (initResult.error) {
    const errorMessage = "Could not initialize the order. " + initResult.error;
    const {error: errorLinkInsertQueryError} = await deep.insert({
      type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
      from_id: tinkoffProviderLinkId,
      to_id: payLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  }

  const Url = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
  const {error: urlLinkInsertQueryError} = await deep.insert({
    type_id: Url,
    from_id: tinkoffProviderLinkId,
    to_id: payLink.id,
    string: { data: { value: initResult.response.PaymentURL } },
  });
  if(urlLinkInsertQueryError) { throw new Error(urlLinkInsertQueryError.message); }

  console.log("paymentLink.value.value", paymentLink.value.value);
  console.log("paymentLink.value.value", paymentLink.value.value);
  const paymentLinkValueUpdateQuery = await deep.update({link_id: {_eq: paymentLink.id}}, {value: {...paymentLink.value.value, bankPaymentId: initResult.response.PaymentId}}, {table: "objects"});
  if(paymentLinkValueUpdateQuery.error) { throw new Error(paymentLinkValueUpdateQuery.error.message); }
  
  return initResult;
};
`;
return await insertHandler({deep, fileTypeId, fileName: 'payInsertHandlerFile', handlerName: 'payInsertHandler', handleName: 'payInsertHandle', triggerTypeId: payTypeId, code, supportsId: dockerSupportsJsId, handleOperationTypeId: handleInsertTypeId, containTypeId, packageId, handlerTypeId, code});
}

exports.insertPayInsertHandler = insertPayInsertHandler;