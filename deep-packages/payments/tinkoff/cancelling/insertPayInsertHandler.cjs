const { insertHandler } = require("../../../insertHandler.cjs");
const {cancel} = require("./cancel.cjs");

const insertPayInsertHandler = async ({paymentsPackageName, cancellingPaymentsPackageName,deep, syncTextFileTypeId, terminalKey, containTypeId, packageId, dockerSupportsJsId, handlerTypeId, handleInsertTypeId}) => {
    const code = `
async ({ deep, require, data: { newLink: payLink } }) => {
  ${handlersDependencies}

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("${paymentsPackageName}", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const CancellingPayment = await deep.id("${cancellingPaymentsPackageName}", "CancellingPayment");
  const cancellingPaymentLink = mpDownPay.find(link => link.type_id === CancellingPayment);
  console.log({cancellingPaymentLink});
  if(!cancellingPaymentLink) {
    return;
  }

  const TinkoffProvider = await deep.id("${paymentsPackageName}", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLink = tinkoffProviderLinkSelectQuery.data[0];

  const Sum = await deep.id("${paymentsPackageName}", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === Sum); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + payLink.id + " is not found.");

  const Url = await deep.id("${paymentsPackageName}", "Url");

  const cancelledPaymentLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.from_id
  });
  if(cancelledPaymentLinkSelectQuery.error) { throw new Error(cancelledPaymentLinkSelectQuery.error.message); }
  const cancelledPaymentLink = cancelledPaymentLinkSelectQuery.data[0];
  console.log({cancelledPaymentLink}); 

  const Income = await deep.id("${paymentsPackageName}", "Income");
  const incomeLinkInsertQuery = await deep.insert({
    type_id: Income,
    from_id: cancellingPaymentLink.id,
    to_id: cancelledPaymentLink.to_id
  });
  if(incomeLinkInsertQuery.error) {throw new Error(incomeLinkInsertQuery.error.message);}
  

  const userLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.to_id
  });
  if(userLinkSelectQuery.error) { throw new Error(userLinkSelectQuery.error.message); }
  const userLink = userLinkSelectQuery.data[0];
  console.log({userLink});
  
  const cancel = ${cancel.toString()};

  await deep.insert({link_id: cancellingPaymentLink.id, value: cancelledPaymentLink.value.value}, {table: "objects"});

  const cancelOptions = {
    TerminalKey: "${terminalKey}",
    PaymentId: cancelledPaymentLink.value.value.bankPaymentId,
    Amount: sumLink.value.value,
  };
  console.log({ cancelOptions });

  const cancelResult = await cancel(cancelOptions);
  console.log({cancelResult});
  if (cancelResult.error) {
    const errorMessage = "Could not cancel the order. " + JSON.stringify(cancelResult.error);

    const {error: errorLinkInsertQueryError} = await deep.insert({
      type_id: (await deep.id("${paymentsPackageName}", "Error")),
      from_id: tinkoffProviderLink.id,
      to_id: payLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  } 

  const {error: payedLinkInsertQueryError} = await deep.insert({
    type_id: await deep.id("${paymentsPackageName}", "Payed"),
    from_id: tinkoffProviderLink.id,
    to_id: payLink.id,
  });
  if(payedLinkInsertQueryError) {throw new Error(payedLinkInsertQueryError.message); }
  
};
`;

return await insertHandler({deep,fileTypeId: syncTextFileTypeId, fileName: 'payInsertHandlerFile', handlerName: 'payInsertHandler', handleName: 'payInsertHandle', triggerTypeId, code, supportsId: dockerSupportsJsId, handleOperationTypeId: handleInsertTypeId, containTypeId, packageId, handlerTypeId, code});
}

exports.insertPayInsertHandler = insertPayInsertHandler;