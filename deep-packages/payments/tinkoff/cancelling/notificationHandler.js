
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  // Canceled is used instead of Cancelled because tinkoff team is not goos at english 
  const allowedStatuses = ['CANCELED']
  if (!allowedStatuses.includes(req.body.Status)) {
    return next();
  }

  res.send('ok');

  const crypto = require('crypto');

  const terminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalPassword");
  const usesTerminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalPassword");
  const { data: [terminalPasswordLink] } = await deep.select({
    type_id: terminalPasswordTypeLinkId,
    in: {
      type_id: usesTerminalPasswordTypeLinkId,
      from_id: storageBusinessLink.id
    }
  });
  if (!terminalPasswordLink) {
    throw new Error(`A link with type ##${terminalPasswordTypeLinkId} is not found`);
  }
  if (!terminalPasswordLink.value?.value) {
    throw new Error(`##${terminalPasswordLink.id} must have a value`);
  }
  const terminalPassword = terminalPasswordLink.value.value;

  const generateToken = (data) => {
    const { Receipt, DATA, Shops, ...restData } = data;
    const dataWithPassword = {
      Password: terminalPassword,
      ...restData,
    };
    console.log({ dataWithPassword });

    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => dataWithPassword[key])
      .reduce((acc, item) => `${acc}${item}`, '');
    console.log({ dataString });
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    console.log({ hash });
    return hash;
  };

  const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const { data: [tinkoffProviderLink] } = await deep.select({
    type_id: tinkoffProviderTypeLinkId
  });
  if (!tinkoffProviderLink) {
    throw new Error(`A link with type ##${tinkoffProviderTypeLinkId} is not found`)
  }

  const cancellingPaymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Payment");
  const { data: [cancellingPaymentLink] } = await deep.select({
    type_id: cancellingPaymentTypeLinkId,
    object: { value: { _contains: { orderId: req.body.OrderId } } }
  });
  if (!cancellingPaymentLink) {
    throw new Error(`A link with type ##${cancellingPaymentTypeLinkId} and object value ${{ orderId: req.body.OrderId }} is not found`)
  }

  const { data: linksDownToCancellingPaymentMp } = await deep.select({
    up: {
      parent_id: { _eq: cancellingPaymentLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "paymentTree") }
    }
  });

  const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Pay");
  const payLink = linksDownToCancellingPaymentMp.find(link => link.type_id === payTypeLinkId);
  if (!payLink) { throw new Error(`A link with type ##${payTypeLinkId} associated with ##${cancellingPaymentLink} is not found.`) }

  const bankPaymentId = req.body.PaymentId;

  const sumTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  const sumLink = linksUpToPayMp.find(link => link.type_id === sumTypeLinkId);
  console.log({ sumLink });
  if (!sumLink) throw new Error(`A link with type ##${sumTypeLinkId} associated with the link ##${payLink.id} is not found`);
  if (!sumLink.value?.value) {
    throw new Error(`##${sumLink.id} must have a value`)
  }

  const payedTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Payed")
  await deep.insert({
    type_id: payedTypeLinkId,
    from_id: tinkoffProviderLink.id,
    to_id: sumLink.id,
  });
};
