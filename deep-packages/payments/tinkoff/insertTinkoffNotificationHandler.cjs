const {insertNotificationHandler: baseInsertNotificationHandler} = require("../../insertNotificationHandler.cjs");
const {handlersDependencies} = require("./handlersDependencies.cjs");
const {confirm} = require("./confirm.cjs");

const insertTinkoffNotificationHandler = async ({packageName, packageId, deep, notificationPort, notificationRoute, portTypeId, routerListeningTypeId, routerTypeId, routerStringUseTypeId, routeTypeId, handleRouteTypeId, handlerTypeId, supportsId, containTypeId,  adminId, fileTypeId, onCofirmedCode}) => {
    const code = `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  ${handlersDependencies}

  if(!(req.body.Status === "AUTHORIZED" || req.body.Status === "CONFIRMED")) {
    return next();
  }

  const reqBody = req.body;
  console.log({reqBody});

  const TinkoffProvider = await deep.id("${packageName}", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
  console.log({tinkoffProviderLinkId});

  const paymentLinkSelectQuery = await deep.select({
    object: {value: {_contains: {orderId: req.body.OrderId}}}
  });
  if(paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
  const paymentLink = paymentLinkSelectQuery.data[0];
  console.log({paymentLink});
  if(!paymentLink) { throw new Error("The payment link associated with the order id " + req.body.OrderId + " is not found."); }

  const {data: mpUpPayment, error: mpUpPaymentSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: paymentLink.id },
      tree_id: { _eq: await deep.id("${packageName}", "paymentTree") }
    }
  });
  console.log({mpUpPayment});
  if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }

  const Pay = await deep.id("${packageName}", "Pay");
  const payLink = mpUpPayment.find(link => link.type_id === Pay);
  console.log({payLink});
  if(!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }


  if (req.body.Status === 'AUTHORIZED') {
  const confirm = ${confirm.toString()};

  const storageBusinessLinkSelectQuery = await deep.select({
    id: paymentLink.to_id
  });
  if(storageBusinessLinkSelectQuery.error) {throw new Error(storageBusinessLinkSelectQuery.error.message);}
  const storageBusinessLinkId = storageBusinessLinkSelectQuery.data[0].id;
  console.log({storageBusinessLinkId});

  const Token = await deep.id("${packageName}", "Token");
  const tokenLinkSelectQuery = await deep.select({
    type_id: Token,
    from_id: storageBusinessLinkId,
    to_id: storageBusinessLinkId
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
    ${onCofirmedCode}
  } 
  res.send('ok');
};
`;

return await baseInsertNotificationHandler({packageId, adminId, containTypeId, deep, fileTypeId, handlerName: "tinkoffNotificationHandler", handleRouteTypeId,handlerTypeId,notificationPort,notificationRoute,portTypeId,routerListeningTypeId,routerStringUseTypeId,routerTypeId,routeTypeId,supportsId, code});
}

exports.insertTinkoffNotificationHandler = insertTinkoffNotificationHandler;