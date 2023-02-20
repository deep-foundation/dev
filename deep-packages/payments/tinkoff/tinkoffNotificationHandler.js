
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {

  const crypto = require('crypto');
  const axios = require('axios');

  const tinkoffApiUrlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffApiUrl");
  const { data: [tinkoffApiUrlLinkId] } = await deep.select({
    type_id: tinkoffApiUrlTypeLinkId
  });
  if (!tinkoffApiUrlLinkId) {
    throw new Error(`A link with type ##${tinkoffApiUrlTypeLinkId} is not found`);
  }
  if (!tinkoffApiUrlLinkId.value?.value) {
    throw new Error(`##${tinkoffApiUrlLinkId} must have a value`);
  }
  const tinkoffApiUrl = tinkoffApiUrlLinkId.value.value;

  const allowedStatuses = ["AUTHORIZED", "CONFIRMED"];
  if (!allowedStatuses.includes(req.body.Status)) {
    return next();
  }

  const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const { data: [tinkoffProviderLink] } = await deep.select({
    type_id: tinkoffProviderTypeLinkId
  });
  if (!tinkoffProviderLink) {
    throw new Error(`A link with type link id ##${tinkoffProviderTypeLinkId} is not found.`)
  }

  const paymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
  const { data: [paymentLink] } = await deep.select({
    type_id: paymentTypeLinkId,
    object: { value: { _contains: { bankPaymentId: parseInt(req.body.PaymentId) } } }
  });
  if (!paymentLink) { throw new Error(`A link with type ##${paymentTypeLinkId} associated with the bank payment id ${req.body.PaymentId} is not found.`); }

  const paymentTreeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree");
  const { data: linksDownToPaymentMp } = await deep.select({
    up: {
      parent_id: { _eq: paymentLink.id },
      tree_id: { _eq: paymentTreeId }
    }
  });
  if (linksDownToPaymentMp.length === 0) {
    throw new Error(`There is no links down to ##${paymentLink.id} materialized path`);
  }

  const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
  const payLink = linksDownToPaymentMp.find(link => link.type_id === payTypeLinkId);
  console.log({ payLink });
  if (!payLink) { throw new Error(`A link with type ##${payTypeLinkId} associated with payment link ${paymentLink} is not found`) }

  console.log({ tinkoffApiUrl })
  console.log(`${tinkoffApiUrl}/Confirm`)

  const { data: [storageBusinessLink] } = await deep.select({
    id: paymentLink.to_id
  });
  console.log({storageBusinessLink})

  const terminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalKey");
  const usesTerminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalKey");
  const { data: [terminalKeyLink] } = await deep.select({
    type_id: terminalKeyTypeLinkId,
    in: {
      type_id: usesTerminalKeyTypeLinkId,
      from_id: storageBusinessLink.id
    }
  });
  console.log({terminalKeyLink})
  if (!terminalKeyLink) {
    throw new Error(`A link with type ##${terminalKeyTypeLinkId} is not found`);
  }
  if(!terminalKeyLink.value?.value) {
    throw new Error(`##${terminalKeyLink.id} must have a value`);
  }

  const terminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalPassword");
  const usesTerminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalPassword");
  const { data: [terminalPasswordLink] } = await deep.select({
    type_id: terminalPasswordTypeLinkId,
    in: {
      type_id: usesTerminalPasswordTypeLinkId,
      from_id: storageBusinessLink.id
    }
  });
  console.log({terminalPasswordLink})
  if (!terminalPasswordLink) {
    throw new Error(`A link with type ##${terminalPasswordTypeLinkId} is not found`);
  }
  if(!terminalPasswordLink.value?.value) {
    throw new Error(`##${terminalPasswordLink.id} must have a value`);
  }

  const generateToken = (data) => {
    const { Receipt, DATA, Shops, ...restData } = data;
    const dataWithPassword = {
      Password: terminalPasswordLink.value.value,
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

  if (req.body.Status === 'AUTHORIZED') {
    const confirm = async (options) => {
      try {
        const response = await axios({
          method: 'post',
          url: `${tinkoffApiUrl}/Confirm`,
          data: { ...options, Token: generateToken(options) },
        });

        const error = response.data.Details;

        return {
          error,
          request: options,
          response: response.data,
        };
      } catch (error) {
        return {
          error,
          request: options,
          response: null,
        };
      }
    };

    const confirmOptions = {
      TerminalKey: terminalKeyLink.value.value,
      PaymentId: req.body.PaymentId,
      Amount: req.body.Amount,
      // Receipt: req.body.Receipt,
    };
    console.log({ confirmOptions });

    const confirmResult = await confirm(confirmOptions);
    console.log({ confirmResult });

    if (confirmResult.error) {
      const errorMessage = "Could not confirm the pay. " + confirmResult.error;
      const { error: errorLinkInsertError } = await deep.insert({
        type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
        from_id: tinkoffProviderLink.id,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
      });
      if (errorLinkInsertError) { throw new Error(errorLinkInsertError); }
      throw new Error(errorMessage);
    }

    return confirmResult;
  } else if (req.body.Status === 'CONFIRMED') {

    const payedTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed");
    const { data: [insertedPayedLink] } = await deep.insert({
      type_id: payedTypeLinkId,
      from_id: tinkoffProviderLink.id,
      to_id: payLink.id,
    });
    if (payedLinkInsertQuery.error) {
      throw new Error(payedLinkInsertQuery.error.message);
    }
    if (!insertedPayedLink) {
      throw new Error(`Unable to insert a link with type ##${payedTypeLinkId}`)
    }

    const storageClientTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
    const storageClientLinkSelectQuery = await deep.select({
      type_id: storageClientTypeLinkId,
      number: { value: req.body.CardId }
    });
    console.log({ storageClientLinkSelectQuery });
    if (storageClientLinkSelectQuery.error) { throw new Error(storageClientLinkSelectQuery.error.message); }

    if (fromLinkOfPayment.type_id !== storageClientTypeLinkId) {
      var storageClientLinkId;
      if (storageClientLinkSelectQuery.data.length === 0) {
        const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
        const storageClientLinkInsertQuery = await deep.insert({
          type_id: StorageClient,
          number: { data: { value: req.body.CardId } },
        });
        console.log({ storageClientLinkInsertQuery });
        if (storageClientLinkInsertQuery.error) { throw new Error(storageClientLinkInsertQuery.error.message); }
        storageClientLinkId = storageClientLinkInsertQuery.data[0].id;

        const Title = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
        const titleLinkInsertQuery = await deep.insert({
          type_id: Title,
          from_id: storageClientLinkId,
          to_id: storageClientLinkId,
          string: { data: { value: req.body.Pan } },
        });
        if (titleLinkInsertQuery.error) { throw new Error(titleLinkInsertQuery.error.message); }
        const titleLinkId = titleLinkInsertQuery.data[0].id;
        console.log({ titleLinkId });
      } else {
        storageClientLinkId = storageClientLinkSelectQuery.data[0];
      }
      const Income = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Income");
      const incomeLinkInsertQuery = await deep.insert({
        type_id: Income,
        from_id: paymentLink.id,
        to_id: storageClientLinkId,
      });
      if (incomeLinkInsertQuery.error) { throw new Error(incomeLinkInsertQuery.error.message); }
      const incomeLinkId = incomeLinkInsertQuery.data[0].id;
      console.log({ incomeLinkId });

    }

  }
  res.send('ok');
};
