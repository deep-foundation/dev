
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  res.send('ok');

  const allowedStatuses = ["AUTHORIZED", "CONFIRMED"];
  if (!allowedStatuses.includes(req.body.Status)) {
    return next();
  }

  const axios = require('axios');

  const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");

  const tinkoffApiUrlLink = await getTinkoffApiUrlLink();
  const tinkoffApiUrl = tinkoffApiUrlLink.value.value;
  const paymentLink = await getPaymentLink();
  const userLinkId = paymentLink.from_id;
  const paymentTreeLinksDownToPaymentParent = await getPaymentTreeLinksDownToPaymentParent();
  const payLink = await getPayLink();
  const storageBusinessLink = await getStorageBusinessLink();
  const terminalKeyLink = await getTerminalKeyLink();
  const terminalKey = terminalKeyLink.value.value;
  const terminalPasswordLink = await getTerminalPasswordLink();
  const terminalPassword = terminalPasswordLink.value.value;

  if (req.body.Status === 'AUTHORIZED') {
    await handleAuthorizedStatus();
  } else if (req.body.Status === 'CONFIRMED') {
    await handleConfirmedStatus();
  }

  async function handleAuthorizedStatus(){
    const axios = require('axios');

    const confirmOptions = {
      TerminalKey: terminalKey,
      ...req.body
    };

    const confirmResult = await confirm(confirmOptions);

    if (confirmResult.error) {
      throw new Error(confirmResult.error);
    }

    return confirmResult;
  }

  async function handleConfirmedStatus() {
    let serialOperations = [];

    const reservedIds = await deep.reserve(3);
    const incomeLinkId = reservedIds.pop();

    const payedTypeLinkId = await deep.id(deep.linkId, "Payed");
    serialOperations.push({
      table: 'links',
      type: 'insert',
      objects: {
        type_id: payedTypeLinkId,
        from_id: deep.linkId,
        to_id: payLink.id,
      }
    })

    const storageClientTypeLinkId = await deep.id(deep.linkId, "StorageClient");
    const storageClientTitleTypeLinkId = await deep.id(deep.linkId, "StorageClientTitle");
    const incomeTypeLinkId = await deep.id(deep.linkId, "Income");
    const { data: [storageClientLink] } = await deep.select({
      type_id: storageClientTypeLinkId,
      number: { value: req.body.CardId }
    });
    let storageClientLinkId;
    if (!storageClientLink) {

      storageClientLinkId = reservedIds.pop();
      const storageClientTitleLinkId = reservedIds.pop();
      const storageClientInsertData = {
        table: 'links',
        type: 'insert',
        objects: {
          id: storageClientLinkId,
          type_id: storageClientTypeLinkId,
          in: {
            data: [{
              type_id: containTypeLinkId,
              from_id: userLinkId
            },
            ]
          },
        }
      };
      const storageClientNumberValueInsertData = {
        table: 'numbers',
        type: 'insert',
        objects: {
          link_id: storageClientLinkId,
          value: req.body.CardId
        }
      }

      const storageClientTitleInsertData = {
        table: 'links',
        type: 'insert',
        objects: {
          id: storageClientTitleLinkId,
          type_id: storageClientTitleTypeLinkId,
          from_id: storageClientLinkId,
          to_id: storageClientLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: userLinkId
            }
          }
        }
      };

      const storageClientTitleStringValueInsertData = {
        table: 'strings',
        type: 'insert',
        objects: {
          link_id: storageClientTitleLinkId,
          value: req.body.Pan
        }
      }

      serialOperations = [
        ...serialOperations,
        storageClientInsertData,
        storageClientNumberValueInsertData,
        storageClientTitleInsertData,
        storageClientTitleStringValueInsertData
      ]
    } else {
      storageClientLinkId = storageClientLink.id;
    }
    const incomeInsertData = {
      table: 'links',
      type: 'insert',
      objects: {
        id: incomeLinkId,
        type_id: incomeTypeLinkId,
        from_id: paymentLink.id,
        to_id: storageClientLinkId,
      }
    }
    serialOperations.push(incomeInsertData);
    await deep.serial({
      operations: serialOperations
    })
  }

  async function getTerminalKeyLink() {
    const terminalKeySelectData = {
      type_id: {
        _id: [deep.linkId, "TerminalKey"]
      },
      in: {
        type_id: {
          _id: [deep.linkId, "UsesTerminalKey"]
        },
        from_id: storageBusinessLink.id
      }
    };
    const { data: [terminalKeyLink] } = await deep.select(terminalKeySelectData);
    if (!terminalKeyLink) {
      throw new Error(`Select with data ${JSON.stringify(terminalKeySelectData)} returned no results`);
    }
    if (!terminalKeyLink.value?.value) {
      throw new Error(`##${terminalKeyLink.id} must have a value`);
    }
    return terminalKey
  }

  async function getTerminalPasswordLink() {
    const terminalPasswordSelectData = {
      type_id: {
        _id: [deep.linkId, "TerminalPassword"]
      },
      in: {
        type_id: {
          _id: [deep.linkId, "UsesTerminalPassword"]
        },
        from_id: storageBusinessLink.id
      }
    };
    const { data: [terminalPasswordLink] } = await deep.select(terminalPasswordSelectData);
    console.log({ terminalPasswordLink })
    if (!terminalPasswordLink) {
      throw new Error(`Select with data ${JSON.stringify(terminalPasswordSelectData)} returned no results`);
    }
    if (!terminalPasswordLink.value?.value) {
      throw new Error(`##${terminalPasswordLink.id} must have a value`);
    }
    return terminalPasswordLink;
  }

  async function getStorageBusinessLink() {
    const { data: [storageBusinessLink] } = await deep.select({
      id: paymentLink.to_id
    });
    if (!storageBusinessLink) {
      throw new Error(`##${paymentLink.to_id} is not found`);
    }
    return storageBusinessLink;
  }

  async function getPaymentTreeLinksDownToPaymentParent() {
    const paymentTreeLinksDownToPaymentParentSelectData = {
      up: {
        parent_id: { _eq: paymentLink.id },
        tree_id: {
          _id: [deep.linkId, "paymentTree"]
        }
      }
    };
    const { data: paymentTreeLinksDownToPaymentParent } = await deep.select(paymentTreeLinksDownToPaymentParentSelectData);
    if (paymentTreeLinksDownToPaymentParent.length === 0) {
      throw new Error(`Select with data ${JSON.stringify(paymentTreeLinksDownToPaymentParentSelectData)} returned no results`);
    }
    return paymentTreeLinksDownToPaymentParent;
  }

  async function getPayLink() {
    const payTypeLinkId = await deep.id(deep.linkId, "Pay");
    const payLink = paymentTreeLinksDownToPaymentParent.find(link => link.type_id === payTypeLinkId);
    if (!payLink) { throw new Error(`A link with type ##${payTypeLinkId} associated with payment ##${paymentLink.id} is not found`) }
    return payLink;
  }

  async function getPaymentLink() {
    const paymentSelectData = {
      type_id: {
        _id: [deep.linkId, "Payment"]
      },
      object: { value: { _contains: { bankPaymentId: parseInt(req.body.PaymentId) } } }
    };
    const { data: [paymentLink] } = await deep.select(paymentSelectData);
    if (!paymentLink) { throw new Error(`Select with data ${JSON.stringify(paymentSelectData)} returned no results`); }
    return paymentLink;
  }

  async function getTinkoffApiUrlLink() {
    const tinkoffApiUrlLinkSelectData = {
      id: {
        _id: [deep.linkId, "TinkoffApiUrl"]
      }
    };
    const { data: [tinkoffApiUrlLink] } = await deep.select(tinkoffApiUrlLinkSelectData);
    if (!tinkoffApiUrlLink) {
      throw new Error(`Select with data ${JSON.stringify(tinkoffApiUrlLinkSelectData)} returned no results`);
    }
    if (!tinkoffApiUrlLink.value?.value) {
      throw new Error(`##${tinkoffApiUrlLink.id} must have a value`);
    }
    return tinkoffApiUrlLink;
  }

  function generateToken(data) {
    const crypto = require('crypto');

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

  async function confirm(options) {
    try {
      const response = await axios({
        method: 'post',
        url: `${tinkoffApiUrl}/Confirm`,
        data: { ...options, Token: await generateToken(options) },
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
  }
};
