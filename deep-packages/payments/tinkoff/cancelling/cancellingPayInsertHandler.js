
async ({ deep, require, data: { newLink: payLink } }) => {

  const crypto = require('crypto');
  const axios = require('axios');

  const tinkoffApiUrlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "TinkoffApiUrl");
  const { data: [tinkoffApiUrlLink] } = await deep.select({
    type_id: tinkoffApiUrlTypeLinkId
  });
  if (!tinkoffApiUrlLink) {
    throw new Error(`A link with type ##${tinkoffApiUrlTypeLinkId} is not found`);
  }
  if (!tinkoffApiUrlLink.value?.value) {
    throw new Error(`##${tinkoffApiUrlLink.id} must have a value`);
  }
  const tinkoffApiUrl = tinkoffApiUrlLink.value.value;

  const terminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "TerminalPassword");
  const usesTerminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "UsesTerminalPassword");
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


  const { data: linksDownToLinkPay } = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "paymentTree") }, // TODO
    },
  });
  console.log({ mpDownPay: linksDownToLinkPay });

  const cancellingPaymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling-cancelling", "CancellingPayment");
  const cancellingPaymentLink = linksDownToLinkPay.find(link => link.type_id === cancellingPaymentTypeLinkId);
  console.log({ cancellingPaymentLink });
  if (!cancellingPaymentLink) {
    return;
  }

  const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "TinkoffProvider");
  const { data: [tinkoffProviderLink] } = await deep.select({
      type_id: tinkoffProviderTypeLinkId
  });
  if (!tinkoffProviderLink) {
      throw new Error(`A link with type ##${tinkoffProviderTypeLinkId} is not found`)
  }

  const sumTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Sum");
  const sumLink = linksDownToLinkPay.find(link => link.type_id === sumTypeLinkId);
  console.log({ sumLink });
  if (!sumLink) throw new Error(`A link with type ##${sumTypeLinkId} associated with the link ##${payLink.id} is not found`);
  if (!sumLink.value?.value) {
      throw new Error(`##${sumLink.id} must have a value`)
  }


  const {data: [cancelledPaymentLink]} = await deep.select({
    id: cancellingPaymentLink.from_id
  });

  const terminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "TerminalKey");
  const usesTerminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "UsesTerminalKey");
  const { data: [terminalKeyLink] } = await deep.select({
      type_id: terminalKeyTypeLinkId,
      in: {
          type_id: usesTerminalKeyTypeLinkId,
          from_id: storageBusinessLink.id
      }
  });
  console.log({ terminalKeyLink })
  if (!terminalKeyLink) {
      throw new Error(`A link with type ##${terminalKeyTypeLinkId} is not found`);
  }
  if (!terminalKeyLink.value?.value) {
      throw new Error(`##${terminalKeyLink.id} must have a value`);
  }
  const terminalKey = terminalKeyLink.value.value;


  const incomeTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Income");
  await deep.insert({
    type_id: incomeTypeLinkId,
    from_id: cancellingPaymentLink.id,
    to_id: cancelledPaymentLink.to_id
  });

  const {data: [userLink]} = await deep.select({
    id: cancellingPaymentLink.to_id
  });

  const cancel = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: `${tinkoffApiUrl}/Cancel`,
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

  await deep.insert({ link_id: cancellingPaymentLink.id, value: cancelledPaymentLink.value.value }, { table: "objects" });

  const bankPaymentId = cancelledPaymentLink.value.value.bankPaymentId;
  const cancelOptions = {
    TerminalKey: terminalKey,
    PaymentId: bankPaymentId,
    Amount: sumLink.value.value,
  };
  console.log({ cancelOptions });

  const cancelResult = await cancel(cancelOptions);
  console.log({ cancelResult });
  if (cancelResult.error) {
    await deep.insert({
      type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Error")),
      from_id: tinkoffProviderLink.id,
      to_id: payLink.id,
      string: { data: { value: cancelResult.error } },
    });
    throw new Error(cancelResult.error);
  }

  await deep.insert({
    type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b-cancelling", "Payed"),
    from_id: tinkoffProviderLink.id,
    to_id: payLink.id,
  });

};
