const {insertNotificationHandler: baseInsertNotificationHandler} = require("../../insertNotificationHandler.cjs");
const {handlersDependencies} = require("./handlersDependencies.cjs");
const {confirm} = require("./confirm.cjs");

exports.insertTinkoffNotificationHandler = async (param) => {
  console.log('insertTinkoffNotificationHandler' , {param})
  const {packageName, packageId, deep, notificationPort, notificationRoute, portTypeLinkId, routerListeningTypeLinkId, routerTypeLinkId, routerStringUseTypeLinkId, routeTypeLinkId, handleRouteTypeLinkId, handlerTypeLinkId, supportsId, containTypeLinkId,  adminId, fileTypeLinkId, onConfirmedCode} = param;
    const code = `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  ${handlersDependencies}

  if(!(req.body.Status === "AUTHORIZED" || req.body.Status === "CONFIRMED" )) {
    return next();
  }

  if (req.body.Status === 'AUTHORIZED') {
    const reqBody = req.body;
    console.log({reqBody});
  
    const tinkoffProviderTypeLinkId = await deep.id("${packageName}", "TinkoffProvider");
    const tinkoffProviderLinkSelectQuery = await deep.select({
      type_id: tinkoffProviderTypeLinkId
    });
    if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
    const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
    console.log({tinkoffProviderLinkId});
  
    console.log(JSON.stringify(await deep.select({type_id: await deep.id("${packageName}", "Payment")})))
    console.log("Select args:" ,JSON.stringify({
      object: {value: {_contains: {bankPaymentId: req.body.PaymentId}}}
    }))

    const paymentLinkSelectQuery = await deep.select({
      object: {value: {_contains: {bankPaymentId: parseInt(req.body.PaymentId)}}}
    });
    if(paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
    const paymentLink = paymentLinkSelectQuery.data[0];
    console.log({paymentLink});
    if(!paymentLink) { throw new Error("The payment link associated with the bank payment id " + req.body.PaymentId + " is not found."); }
  
    const {data: mpUpPayment, error: mpUpPaymentSelectQueryError} = await deep.select({
      up: {
        parent_id: { _eq: paymentLink.id },
        tree_id: { _eq: await deep.id("${packageName}", "paymentTree") }
      }
    });
    console.log({mpUpPayment});
    if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }
  
    const payTypeLinkId = await deep.id("${packageName}", "Pay");
    const payLink = mpUpPayment.find(link => link.type_id === payTypeLinkId);
    console.log({payLink});
    if(!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }
    
    const confirm = ${confirm.toString()};

    const storageReceiverLinkSelectQuery = await deep.select({
      id: paymentLink.to_id
    });
    if(storageReceiverLinkSelectQuery.error) {throw new Error(storageReceiverLinkSelectQuery.error.message);}
    const storageReceiverId = storageReceiverLinkSelectQuery.data[0].id;
    console.log({storageReceiverId});


    const usesTokenTypeLinkId = await deep.id("${packageName}", "UsesToken");
    const usesTokenLinkSelectQuery = await deep.select({
      type_id: usesTokenTypeLinkId,
      from_id: storageReceiverId,
    });
    if(usesTokenLinkSelectQuery.error) {throw new Error(usesTokenLinkSelectQuery.error.message);}
    const usesTokenLink = usesTokenLinkSelectQuery.data[0];
    console.log({usesTokenLink});
  
    const tokenLinkSelectQuery = await deep.select({
      id: usesTokenLink.to_id,
    });
    if(tokenLinkSelectQuery.error) {throw new Error(tokenLinkSelectQuery.error.message);}
    const tokenLink = tokenLinkSelectQuery.data[0];
    console.log({tokenLink});

    const confirmOptions = {
      TerminalKey: tokenLink.value.value,
      PaymentId: req.body.PaymentId,
      Amount: req.body.Amount,
      // Receipt: req.body.Receipt,
    };
    console.log({confirmOptions});

    const confirmResult = await confirm(confirmOptions);
    console.log({confirmResult});

    if (confirmResult.error) {
      const errorMessage = "Could not confirm the pay. " + confirmResult.error;
      const {error: errorLinkInsertError} = await deep.insert({
        type_id: (await deep.id("${packageName}", "Error")),
        from_id: tinkoffProviderLinkId,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
      });
      if(errorLinkInsertError) { throw new Error(errorLinkInsertError); }
      throw new Error(errorMessage);
    }

    return confirmResult;
  } else if (req.body.Status === 'CONFIRMED') {
    ${onConfirmedCode}
  }
};
`;

return await baseInsertNotificationHandler({packageId, adminId, containTypeLinkId, deep, fileTypeLinkId, handlerName: "tinkoffNotificationHandler", handleRouteTypeLinkId,handlerTypeLinkId,notificationPort,notificationRoute,portTypeLinkId,routerListeningTypeLinkId,routerStringUseTypeLinkId,routerTypeLinkId,routeTypeLinkId,supportsId, code});
}

