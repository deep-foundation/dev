const { insertHandler } = require("../../insertHandler.cjs");
const {handlersDependencies} = require("./handlersDependencies.cjs");
const {init} = require("./init.cjs");

exports.insertTinkoffPayInsertHandler = async ({packageName, deep, notificationUrl, userEmail, userPhone, fileTypeId, containTypeId, packageId, dockerSupportsJsId,  handleInsertTypeId, handlerTypeId, payTypeId}) => {
    const code = `
async ({ deep, require, data: { newLink } }) => {
  ${handlersDependencies}

  const tinkoffProviderTypeLinkId = await deep.id("${packageName}", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: tinkoffProviderTypeLinkId
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: newLink.id },
      tree_id: { _eq: await deep.id("${packageName}", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const paymentTypeLinkId = await deep.id("${packageName}", "Payment");
  const paymentLink = mpDownPay.find(link => link.type_id === paymentTypeLinkId);
  console.log({paymentLink});
  if(!paymentLink) throw new Error("Payment link associated with the pay link " + newLink.id + " is not found.");

  const sumTypeLinkId = await deep.id("${packageName}", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === sumTypeLinkId); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + newLink.id + " is not found.");

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

  const tokenTypeLinkId = await deep.id("${packageName}", "Token");
  const tokenLinkSelectQuery = await deep.select({
    type_id: tokenTypeLinkId,
    from_id: storageBusinessLinkId,
    to_id: storageBusinessLinkId
  });
  if(tokenLinkSelectQuery.error) {throw new Error(tokenLinkSelectQuery.error.message);}
  const tokenLink = tokenLinkSelectQuery.data[0];
  console.log({tokenLink});

  const init = ${init.toString()};

  const options = {
    TerminalKey: tokenLink.value.value,
    OrderId: "" + Date.now() + paymentLink.id,
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
      type_id: (await deep.id("${packageName}", "Error")),
      from_id: tinkoffProviderLinkId,
      to_id: newLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  }

  const urlTypeLinkId = await deep.id("${packageName}", "Url");
  const {error: urlLinkInsertQueryError} = await deep.insert({
    type_id: urlTypeLinkId,
    from_id: tinkoffProviderLinkId,
    to_id: newLink.id,
    string: { data: { value: initResult.response.PaymentURL } },
  });
  if(urlLinkInsertQueryError) { throw new Error(urlLinkInsertQueryError.message); }

  const paymentLinkValueInsertQuery = await deep.insert({link_id: {_eq: paymentLink.id}}, {value: {bankPaymentId: initResult.response.PaymentId}}, {table: "objects"});
  if(paymentLinkValueInsertQuery.error) { throw new Error(paymentLinkValueInsertQuery.error.message); }
  
  return initResult;
};
`;
return await insertHandler({deep, fileTypeId, fileName: 'payInsertHandlerFile', handlerName: 'payInsertHandler', handleName: 'payInsertHandle', triggerTypeId: payTypeId, code, supportsId: dockerSupportsJsId, handleOperationTypeId: handleInsertTypeId, containTypeId, packageId, handlerTypeId, code});
}

