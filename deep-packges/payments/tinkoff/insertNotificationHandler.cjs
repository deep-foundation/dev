const {insertNotificationHandler: baseInsertNotificationHandler} = require("./../../insertNotificationHandler.cjs");

const insertNotificationHandler = async ({deep, notificationPort, notificationRoute, portTypeId, routerListeningTypeId, routerTypeId, routerStringUseTypeId, routeTypeId, handleRouteTypeId, handlerTypeId, supportsId, containTypeId,  adminId, fileTypeId}) => {
    const code = `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  ${handlersDependencies}

  if(req.body.Status !== "AUTHORIZED" || req.body.Status !== "CONFIRMED") {
    return next();
  }

  const reqBody = req.body;
  console.log({reqBody});

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
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
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
    }
  });
  console.log({mpUpPayment});
  if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }

  const Pay = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
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

  const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
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
        type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
        from_id: tinkoffProviderLinkId,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
      });
      if(errorLinkInsertError) { throw new Error(errorLinkInsertError); }
      throw new Error(errorMessage);
    }

    return confirmResult;
  } else if (req.body.Status === 'CONFIRMED') {
    const payedLinkInsertQuery = await deep.insert({
      type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderLinkId,
      to_id: payLink.id,
    });
    if(payedLinkInsertQuery.error) { throw new Error(payedLinkInsertQuery.error.message); }
    const payedLinkId = payedLinkInsertQuery.data[0].id;
    console.log({payedLinkId});

    const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
    const storageClientLinkSelectQuery = await deep.select({
      type_id: StorageClient,
      number: {value: req.body.CardId}
    });
    console.log({storageClientLinkSelectQuery});
    if(storageClientLinkSelectQuery.error) {throw new Error(storageClientLinkSelectQuery.error.message);}
    
    if(fromLinkOfPayment.type_id !== StorageClient) {
      var storageClientLinkId;
      if(storageClientLinkSelectQuery.data.length === 0) {
        const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
        const storageClientLinkInsertQuery = await deep.insert({
          type_id: StorageClient,
          number: {data: {value: req.body.CardId}},
        });
        console.log({storageClientLinkInsertQuery});
        if(storageClientLinkInsertQuery.error) {throw new Error(storageClientLinkInsertQuery.error.message);}
        storageClientLinkId = storageClientLinkInsertQuery.data[0].id;
    
        const Title = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
        const titleLinkInsertQuery = await deep.insert({
          type_id: Title,
          from_id: storageClientLinkId,
          to_id: storageClientLinkId,
          string: {data: {value: req.body.Pan}},
        });
        if(titleLinkInsertQuery.error) {throw new Error(titleLinkInsertQuery.error.message);}
        const titleLinkId = titleLinkInsertQuery.data[0].id;
        console.log({titleLinkId});
      } else {
        storageClientLinkId = storageClientLinkSelectQuery.data[0];
      }
      const Income = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Income");
      const incomeLinkInsertQuery = await deep.insert({
        type_id: Income,
        from_id: paymentLink.id,
        to_id: storageClientLinkId,
      });
      if(incomeLinkInsertQuery.error) {throw new Error(incomeLinkInsertQuery.error.message);}
      const incomeLinkId = incomeLinkInsertQuery.data[0].id;
      console.log({incomeLinkId});
      
    }
  } 
  res.send('ok');
};
`;

await baseInsertNotificationHandler({adminId, containTypeId, deep, fileTypeId, handlerName: "tinkoffNotificationHandler", handleRouteTypeId,handlerTypeId,notificationPort,notificationRoute,portTypeId,routerListeningTypeId,routerStringUseTypeId,routerTypeId,routeTypeId,supportsId, code});
}

exports.insertNotificationHandler = insertNotificationHandler;