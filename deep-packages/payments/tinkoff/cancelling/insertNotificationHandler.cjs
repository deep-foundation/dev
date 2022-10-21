const {insertNotificationHandler: baseInsertNotificationHandler} = require("./../../insertNotificationHandler.cjs");

const insertNotificationHandler = async ({paymentsPackageName,deep, notificationPort, notificationRoute, portTypeId, routerListeningTypeId, routerTypeId, routerStringUseTypeId, routeTypeId, handleRouteTypeId, handlerTypeId, supportsId, containTypeId,  adminId, fileTypeId}) => {
    const code = `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  ${handlersDependencies}
  const reqBody = req.body;
  console.log({reqBody});

  // Canceled is used instead of Cancelled because tinkoff team is not goos at english 
  if (req.body.Status !== 'CANCELED') {
    return next();
  }

  const TinkoffProvider = await deep.id("${paymentsPackageName}", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLink = tinkoffProviderLinkSelectQuery.data[0];

  const cancellingPaymentLinkSelectQuery = await deep.select({
    object: {value: {_contains: {orderId: req.body.OrderId}}}
  });
  if(cancellingPaymentLinkSelectQuery.error) { throw new Error(cancellingPaymentLinkSelectQuery.error.message); }
  const cancellingPaymentLink = cancellingPaymentLinkSelectQuery.data[0];
  console.log({cancellingPaymentLink});
  if(!cancellingPaymentLink) { throw new Error("The cancelling payment link associated with the order id " + req.body.OrderId + " is not found."); }

  const {data: mpUpCancellingPaymentLink, error: mpUpcancellingPaymentLinkSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: cancellingPaymentLink.id },
      tree_id: { _eq: await deep.id("${paymentsPackageName}", "paymentTree") }
    }
  });
  console.log({mpUpCancellingPaymentLink});
  if(mpUpcancellingPaymentLinkSelectQueryError) { throw new Error(mpUpcancellingPaymentLinkSelectQueryError.message); }

  const Pay = await deep.id("${paymentsPackageName}", "Pay");
  const payLink = mpUpCancellingPaymentLink.find(link => link.type_id === Pay);
  console.log({payLink});
  if(!payLink) { throw new Error("The pay link associated with cancelling payment link " + cancellingPaymentLink + " is not found.") }


  const bankPaymentId = req.body.PaymentId;

  const {data: mpUpPayment, error: mpUpPaymentLinkSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: cancellingPaymentLink.id },
      tree_id: { _eq: await deep.id("${paymentsPackageName}", "paymentTree") }
    }
  });

  const Sum = await deep.id("${paymentsPackageName}", "Sum")
  const sumLink = mpUpPayment.find(link => link.type_id === Sum);
  if(!sumLink) {throw new Error("Could not find sum link associated with the cancelling payment " + cancellingPaymentLink);}
  
  const Payed = await deep.id("${paymentsPackageName}", "Payed")
  const payedInsertLinkInsertQuery = await deep.insert({
    type_id: Payed,
    from_id: tinkoffProviderLink.id,
    to_id: sumLink.id,
  });
  if(payedInsertLinkInsertQuery.error) {throw new Error(payedInsertLinkInsertQuery.error.message);}

  res.send('ok');
};
`;

return await baseInsertNotificationHandler({adminId, containTypeId, deep, fileTypeId, handlerName: "tinkoffNotificationHandler", handleRouteTypeId,handlerTypeId,notificationPort,notificationRoute,portTypeId,routerListeningTypeId,routerStringUseTypeId,routerTypeId,routeTypeId,supportsId, code});
}

exports.insertNotificationHandler = insertNotificationHandler;