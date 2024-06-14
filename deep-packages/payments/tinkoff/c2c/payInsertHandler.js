
async ({ deep, require, data: { newLink, triggeredByLinkId } }) => {
  
const crypto = require('crypto');
const axios = require('axios');

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

const tinkoffApiUrlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffApiUrl");
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


  const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: tinkoffProviderTypeLinkId
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: newLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const paymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
  const paymentLink = mpDownPay.find(link => link.type_id === paymentTypeLinkId);
  console.log({paymentLink});
  if(!paymentLink) throw new Error("Payment link associated with the pay link " + newLink.id + " is not found.");

  const sumTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
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

  const usesTokenTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesToken");
  const usesTokenLinkSelectQuery = await deep.select({
    type_id: usesTokenTypeLinkId,
    from_id: storageBusinessLinkId,
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

  const init = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: `${tinkoffApiUrl}/Init`,
        headers: {
          'Content-Type': 'application/json',
        },
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

  const options = {
    TerminalKey: tokenLink.value.value,
    OrderId: "" + Date.now() + paymentLink.id,
    CustomerKey: triggeredByLinkId,
    NotificationURL: "https://5237-deepfoundation-dev-ymdvap98nh7.ws-us87.gitpod.io/payments-tinkoff-c2b",
    PayType: 'T',
    Amount: sumLink.value.value,
    Description: 'Test shopping',
    Language: 'ru',
    Recurrent: 'Y',
    DATA: {
      Email: "karafizi.artur@gmail.com",
      Phone: "+79003201234",
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
    //   Email: "karafizi.artur@gmail.com",
    //   Phone: "+79003201234",
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
      to_id: newLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  }

  const urlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
  const {error: urlLinkInsertQueryError} = await deep.insert({
    type_id: urlTypeLinkId,
    from_id: tinkoffProviderLinkId,
    to_id: newLink.id,
    string: { data: { value: initResult.response.PaymentURL } },
  });
  if(urlLinkInsertQueryError) { throw new Error(urlLinkInsertQueryError.message); }

  const paymentValueLinkInsertQuery = await deep.insert({link_id: paymentLink.id, value: {bankPaymentId: parseInt(initResult.response.PaymentId)}}, {table: "objects"})
  if(paymentValueLinkInsertQuery.error) { throw new Error(paymentValueLinkInsertQuery.error.message); }
  console.log(JSON.stringify(paymentValueLinkInsertQuery));
  
  return initResult;
};
