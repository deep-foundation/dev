
async ({ deep, require, data: { newLink: payLink, triggeredByLinkId } }) => {
    const crypto = require('crypto');
    const axios = require('axios');

    const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");

    const paymentTreeLinksUpToPay = await getPaymentTreeLinksUpToPay({ payLinkId: payLink.id });
    const paymentLink = await getPaymentLink({ paymentTreeLinksUpToPay });
    const storageBusinessLink = await getStorageBusinessLink({ paymentLink });
    const terminalPasswordLink = await getTerminalPasswordLink({ storageBusinessLink });
    const terminalPassword = terminalPasswordLink.value.value;
    const sumLink = await getSumLink({ paymentTreeLinksUpToPay });
    const sum = sumLink.value.value;
    const terminalKeyLink = await getTerminalKeyLink({ storageBusinessLink });
    const terminalKey = terminalKeyLink.value.value;
    const tinkoffApiUrlLink = await getTinkoffApiUrlLink();
    const tinkoffApiUrl = tinkoffApiUrlLink.value.value;
    const emailLink = await getEmailLink({ triggeredByLinkId });
    const email = emailLink?.value?.value;
    const phoneNumberLink = await getPhoneNumberLink({ triggeredByLinkId });
    const phoneNumber = phoneNumberLink?.value?.value;
    const notificationUrlLink = await getNotificationUrlLink();
    const notificationUrl = notificationUrlLink.value.value;

    const initData = await getInitData({
        email,
        notificationUrl,
        paymentLinkId: paymentLink.id,
        phoneNumber,
        sum,
        terminalKey
    })
    let initResult = await init({
        data: initData,
        tinkoffApiUrl: tinkoffApiUrl,
        terminalPassword
    });
    if (initResult.error) {
        throw new Error(initResult.error);
    }

    const urlInsertData = await getUrlInsertData();
    const paymentValueInsertData = await getPaymentValueInsertData({paymentLink});

    await deep.serial({
        operations: [
            urlInsertData, 
            paymentValueInsertData
        ]
    })

    return initResult;

    async function getPaymentTreeLinksUpToPay({ payLinkId }) {
        const selectData = {
            down: {
                link_id: { _eq: payLinkId },
                tree_id: { _id: [deep.id, "paymentTree"] }
            }
        };
        const { data } = await deep.select(selectData);
        if (data.length === 0) {
            throw new Error(`Select with data ${JSON.stringify(selectData)} returned no results`);
        }
    }

    async function getTerminalPasswordLink({ storageBusinessLink }) {
        const terminalPasswordSelectData = {
            type_id: {
                _id: [deep.id, "TerminalPassword"]
            },
            in: {
                type_id: {
                    _id: [deep.id, "UsesTerminalPassword"]
                },
                from_id: storageBusinessLink.id
            }
        };
        const { data: [terminalPasswordLink] } = await deep.select(terminalPasswordSelectData);
        if (!terminalPasswordLink) {
            throw new Error(`Terminal password is not found. Select with data ${JSON.stringify(terminalPasswordSelectData)} returned no results`);
        }
        if (!terminalPasswordLink.value?.value) {
            throw new Error(`##${terminalPasswordLink.id} must have a value`);
        }
        return terminalPasswordLink;
    }

    async function generateToken({data, terminalPassword}) {
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

    async function getSumLink({ paymentTreeLinksUpToPay }) {
        const sumTypeLinkId = await deep.id(deep.id, "Sum");
        const sumLink = paymentTreeLinksUpToPay.find(link => link.type_id === sumTypeLinkId);
        if (!sumLink) throw new Error(`Sum is not found. A link with type ##${sumTypeLinkId} associated with the Pay link ##${payLink.id} is not found`);
        if (!sumLink.value?.value) {
            throw new Error(`##${sumLink.id} must have a value`)
        }
        return sumLink;
    }

    async function getTerminalKeyLink({ storageBusinessLink }) {
        const terminalKeyTypeLinkId = await deep.id(deep.id, "TerminalKey");
        const usesTerminalKeyTypeLinkId = await deep.id(deep.id, "UsesTerminalKey");
        const { data: [terminalKeyLink] } = await deep.select({
            type_id: terminalKeyTypeLinkId,
            in: {
                type_id: usesTerminalKeyTypeLinkId,
                from_id: storageBusinessLink.id
            }
        });
        if (!terminalKeyLink) {
            throw new Error(`A link with type ##${terminalKeyTypeLinkId} is not found`);
        }
        if (!terminalKeyLink.value?.value) {
            throw new Error(`##${terminalKeyLink.id} must have a value`);
        }
        return terminalKeyLink;
    }

    async function getTinkoffApiUrlLink() {
        const tinkoffApiUrlTypeLinkId = await deep.id(deep.id, "TinkoffApiUrl");
        const { data: [tinkoffApiUrlLink] } = await deep.select({
            type_id: tinkoffApiUrlTypeLinkId
        });
        if (!tinkoffApiUrlLink) {
            throw new Error(`A link with type ##${tinkoffApiUrlTypeLinkId} is not found`);
        }
        if (!tinkoffApiUrlLink.value?.value) {
            throw new Error(`##${tinkoffApiUrlLink.id} must have a value`);
        }
        return tinkoffApiUrlLink;
    }


    async function init({data: data, tinkoffApiUrl, terminalPassword}) {
        try {
            const response = await axios({
                method: 'post',
                url: `${tinkoffApiUrl}/Init`,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: { ...data, Token: await generateToken({
                    data,
                    terminalPassword: terminalPassword
                }) },
            });

            const error = response.data.Details;

            return {
                error,
                request: data,
                response: response.data,
            };
        } catch (error) {
            return {
                error,
                request: data,
                response: null,
            };
        }
    };

    async function getEmailLink({ triggeredByLinkId }) {
        const emailTypeLinkId = await deep.id(deep.id, "Email");
        const { data: [emailLink] } = await deep.select({
            type_id: emailTypeLinkId,
            in: {
                type_id: containTypeLinkId,
                from_id: triggeredByLinkId
            }
        });
        // if (!emailLink) {
        //     throw new Error(`A link with type ##${emailTypeLinkId} is not found`);
        // }
        // if (!emailLink.value?.value) {
        //     throw new Error(`##${emailLink.id} must have a value`);
        // }
        return emailLink;
    }

    async function getPhoneNumberLink({ triggeredByLinkId }) {
        const phoneNumberTypeLinkId = await deep.id(deep.id, "PhoneNumber");
        const { data: [phoneNumberLink] } = await deep.select({
            type_id: phoneNumberTypeLinkId,
            in: {
                type_id: containTypeLinkId,
                from_id: triggeredByLinkId
            }
        });
        if (!phoneNumberLink) {
            throw new Error(`A link with type ##${phoneNumberTypeLinkId} is not found`);
        }
        if (!phoneNumberLink.value?.value) {
            throw new Error(`##${phoneNumberLink.id} must have a value`);
        }
        return phoneNumberLink;
    }

    async function getPaymentLink({ paymentTreeLinksUpToPay }) {
        const paymentTypeLinkId = await deep.id(deep.id, "Payment");
        const paymentLink = paymentTreeLinksUpToPay.find(link => link.type_id === paymentTypeLinkId);
        if (!paymentLink) throw new Error(`Payment is not found. A link with type ##${paymentTypeLinkId} associated with the Pay link ##${payLink.id} is not found`);
        return paymentLink;
    }

    async function getStorageBusinessLink({ paymentLink }) {
        const storageBusinessTypeLinkId = await deep.id(deep.id, "StorageBusiness");
        const { data: [storageBusinessLink] } = await deep.select({
            type_id: storageBusinessTypeLinkId,
            in: {
                type_id: containTypeLinkId,
                from_id: paymentLink.id
            }
        });
        if (!storageBusinessLink) {
            throw new Error(`A link with type ##${storageBusinessTypeLinkId} is not found`);
        }
        return storageBusinessLink;
    }

    async function getNotificationUrlLink() {
        const selectData = {
            type_id: {
                _id: [deep.id, "NotificationUrl"]
            },
            in: {
                type_id: {
                    _id: [deep.id, "UsesNotificationUrl"],
                },
                from_id: triggeredByLinkId
            }
        };
        const { data: [notificationUrlLink] } = await deep.select(selectData);
        if (!notificationUrlLink) {
            throw new Error(`Select with data ${JSON.stringify(selectData)} returned no data`);
        }
        if (!notificationUrlLink.value?.value) {
            throw new Error(`##${notificationUrlLink.id} must have a value`);
        }
        return notificationUrlLink;
    }

    async function getUrlInsertData() {
    const urlTypeLinkId = await deep.id(deep.id, "Url");
    return {
            table: "links",
            type: "insert",
            objects: {
                type_id: urlTypeLinkId,
                from_id: deep.linkId,
                to_id: payLink.id,
                string: { data: { value: initResult.response.PaymentURL } },
            }
        };
    }
    
    async function getPaymentValueInsertData({paymentLink}) {
        return {
            table: "objects",
            type: "insert",
            objects: {
                link_id: paymentLink.id,
                value: {
                    ...(paymentLink?.value?.value ? paymentLink.value.value : {}),
                    bankPaymentId: parseInt(initResult.response.PaymentId)
                }
            }
        };
    }

    async function getInitData({terminalKey, paymentLinkId, notificationUrl, sum, email, phoneNumber}) {
        return  {
            TerminalKey: terminalKey,
            OrderId: `${Date.now()}${paymentLinkId}`,
            CustomerKey: triggeredByLinkId,
            NotificationURL: notificationUrl,
            PayType: 'T',
            Amount: sum,
            Language: 'ru',
            Recurrent: 'Y',
            DATA: {
                Email: email,
                Phone: phoneNumber,
            },
        };
    }


};
