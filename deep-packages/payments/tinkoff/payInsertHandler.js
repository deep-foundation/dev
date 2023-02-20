
async ({ deep, require, data: { newLink: payLink, triggeredByLinkId } }) => {

    const crypto = require('crypto');
    const axios = require('axios');

    const paymentTreeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree");
    const { data: linksUpToPayMp } = await deep.select({
      down: {
        link_id: { _eq: payLink.id },
        tree_id: { _eq: paymentTreeId }
      }
    });
    if (linksUpToPayMp.length === 0) {
      throw new Error(`There is no links up to ##${payLink.id} materialized path`);
    }

    const paymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
    const paymentLink = linksUpToPayMp.find(link => link.type_id === paymentTypeLinkId);
    if (!paymentLink) throw new Error(`A link with type ##${paymentTypeLinkId} associated with the link ##${payLink.id} is not found`);

    const { data: [storageBusinessLink] } = await deep.select({
        id: paymentLink.to_id
    });
    console.log({ storageBusinessLink })

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

    const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
    const {data: [tinkoffProviderLink]} = await deep.select({
        type_id: tinkoffProviderTypeLinkId
    });
    if(!tinkoffProviderLink) {
        throw new Error(`A link with type ##${tinkoffProviderTypeLinkId} is not found`)
    }

    const sumTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
    const sumLink = linksUpToPayMp.find(link => link.type_id === sumTypeLinkId);
    console.log({ sumLink });
    if (!sumLink) throw new Error(`A link with type ##${sumTypeLinkId} associated with the link ##${payLink.id} is not found`);
    if(!sumLink.value?.value) {
        throw new Error(`##${sumLink.id} must have a value`)
    }

    const terminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalKey");
    const usesTerminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalKey");
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
        TerminalKey: terminalKeyLink.value.value,
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
    console.log({ options });

    let initResult = await init(options);
    console.log({ initResult });
    if (initResult.error) {
        const errorMessage = "Could not initialize the order. " + initResult.error;
        const { error: errorLinkInsertQueryError } = await deep.insert({
            type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
            from_id: tinkoffProviderLink.id,
            to_id: payLink.id,
            string: { data: { value: errorMessage } },
        });
        if (errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
        throw new Error(errorMessage);
    }

    const urlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
    const { error: urlLinkInsertQueryError } = await deep.insert({
        type_id: urlTypeLinkId,
        from_id: tinkoffProviderLink.id,
        to_id: payLink.id,
        string: { data: { value: initResult.response.PaymentURL } },
    });
    if (urlLinkInsertQueryError) { throw new Error(urlLinkInsertQueryError.message); }

    const paymentValueLinkInsertQuery = await deep.insert({ link_id: paymentLink.id, value: { bankPaymentId: parseInt(initResult.response.PaymentId) } }, { table: "objects" });
    console.log(`Setting ${initResult.response.PaymentId} as bankPaymentId for ${paymentLink.id}`)
    if (paymentValueLinkInsertQuery.error) { throw new Error(paymentValueLinkInsertQuery.error.message); }
    console.log(JSON.stringify(paymentValueLinkInsertQuery));

    return initResult;
};
