
async (
    req,
    res,
    next,
    { deep, require, gql }
  ) => {
  
    const crypto = require('crypto');
    const axios = require('axios');
    const errors = { "7": "Покупатель не найден", "53": "Обратитесь к продавцу", "99": "Платеж отклонен", "100": "Повторите попытку позже", "101": "Не пройдена идентификация 3DS", "102": "Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой", "103": "Повторите попытку позже", "119": "Превышено кол-во запросов на авторизацию", "191": "Некорректный статус договора, обратитесь к вашему менеджеру", "1001": "Свяжитесь с банком, выпустившим карту, чтобы провести платеж", "1003": "Неверный merchant ID", "1004": "Карта украдена. Свяжитесь с банком, выпустившим карту", "1005": "Платеж отклонен банком, выпустившим карту", "1006": "Свяжитесь с банком, выпустившим карту, чтобы провести платеж", "1007": "Карта украдена. Свяжитесь с банком, выпустившим карту", "1008": "Платеж отклонен, необходима идентификация", "1012": "Такие операции запрещены для этой карты", "1013": "Повторите попытку позже", "1014": "Карта недействительна. Свяжитесь с банком, выпустившим карту", "1015": "Попробуйте снова или свяжитесь с банком, выпустившим карту", "1019": "Платеж отклонен — попробуйте снова", "1030": "Повторите попытку позже", "1033": "Истек срок действия карты. Свяжитесь с банком, выпустившим карту", "1034": "Попробуйте повторить попытку позже", "1038": "Превышено количество попыток ввода ПИН-кода", "1039": "Платеж отклонен — счет не найден", "1041": "Карта утеряна. Свяжитесь с банком, выпустившим карту", "1043": "Карта украдена. Свяжитесь с банком, выпустившим карту", "1051": "Недостаточно средств на карте", "1053": "Платеж отклонен — счет не найден", "1054": "Истек срок действия карты", "1055": "Неверный ПИН", "1057": "Такие операции запрещены для этой карты", "1058": "Такие операции запрещены для этой карты", "1059": "Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту", "1061": "Превышен дневной лимит платежей по карте", "1062": "Платежи по карте ограничены", "1063": "Операции по карте ограничены", "1064": "Проверьте сумму", "1065": "Превышен дневной лимит транзакций", "1075": "Превышено число попыток ввода ПИН-кода", "1076": "Платеж отклонен — попробуйте снова", "1077": "Коды не совпадают — попробуйте снова", "1080": "Неверный срок действия", "1082": "Неверный CVV", "1086": "Платеж отклонен — не получилось подтвердить ПИН-код", "1088": "Ошибка шифрования. Попробуйте снова", "1089": "Попробуйте повторить попытку позже", "1091": "Банк, выпустивший карту недоступен для проведения авторизации", "1092": "Платеж отклонен — попробуйте снова", "1093": "Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту", "1094": "Системная ошибка", "1096": "Повторите попытку позже", "9999": "Внутренняя ошибка системы" };
    const getError = (errorCode) =>
      errorCode === '0' ? undefined : errors[errorCode] || 'broken';
    const getUrl = (method) =>
      `https://securepay.tinkoff.ru/v2/${method}`;
    const generateToken = (data) => {
      const { Receipt, DATA, Shops, ...restData } = data;
      const dataWithPassword = {
        Password: "w4k58ksi9g5sammh",
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
  
  
    if (!(req.body.Status === "AUTHORIZED" || req.body.Status === "CONFIRMED")) {
      return next();
    }
  
    if (req.body.Status === 'AUTHORIZED') {
      const reqBody = req.body;
      console.log({ reqBody });
  
      const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
      const tinkoffProviderLinkSelectQuery = await deep.select({
        type_id: tinkoffProviderTypeLinkId
      });
      if (tinkoffProviderLinkSelectQuery.error) { throw new Error(tinkoffProviderLinkSelectQuery.error.message); }
      const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
      console.log({ tinkoffProviderLinkId });
  
      console.log(JSON.stringify(await deep.select({ type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment") })))
      console.log("Select args:", JSON.stringify({
        object: { value: { _contains: { bankPaymentId: req.body.PaymentId } } }
      }))
  
      const paymentLinkSelectQuery = await deep.select({
        object: { value: { _contains: { bankPaymentId: parseInt(req.body.PaymentId) } } }
      });
      if (paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
      const paymentLink = paymentLinkSelectQuery.data[0];
      console.log({ paymentLink });
      if (!paymentLink) { throw new Error("The payment link associated with the bank payment id " + req.body.PaymentId + " is not found."); }
  
      const { data: mpUpPayment, error: mpUpPaymentSelectQueryError } = await deep.select({
        up: {
          parent_id: { _eq: paymentLink.id },
          tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
        }
      });
      console.log({ mpUpPayment });
      if (mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }
  
      const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
      const payLink = mpUpPayment.find(link => link.type_id === payTypeLinkId);
      console.log({ payLink });
      if (!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }
  
      const confirm = async (options) => {
        try {
          const response = await axios({
            method: 'post',
            url: getUrl('Confirm'),
            data: { ...options, Token: generateToken(options) },
          });
  
          const error = getError(response.data.ErrorCode);
  
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
  
      const storageReceiverLinkSelectQuery = await deep.select({
        id: paymentLink.to_id
      });
      if (storageReceiverLinkSelectQuery.error) { throw new Error(storageReceiverLinkSelectQuery.error.message); }
      const storageReceiverId = storageReceiverLinkSelectQuery.data[0].id;
      console.log({ storageReceiverId });
  
  
      const usesTokenTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesToken");
      const usesTokenLinkSelectQuery = await deep.select({
        type_id: usesTokenTypeLinkId,
        from_id: storageReceiverId,
      });
      if (usesTokenLinkSelectQuery.error) { throw new Error(usesTokenLinkSelectQuery.error.message); }
      const usesTokenLink = usesTokenLinkSelectQuery.data[0];
      console.log({ usesTokenLink });
  
      const tokenLinkSelectQuery = await deep.select({
        id: usesTokenLink.to_id,
      });
      if (tokenLinkSelectQuery.error) { throw new Error(tokenLinkSelectQuery.error.message); }
      const tokenLink = tokenLinkSelectQuery.data[0];
      console.log({ tokenLink });
  
      const confirmOptions = {
        TerminalKey: tokenLink.value.value,
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
          from_id: tinkoffProviderLinkId,
          to_id: payLink.id,
          string: { data: { value: errorMessage } },
        });
        if (errorLinkInsertError) { throw new Error(errorLinkInsertError); }
        throw new Error(errorMessage);
      }
  
      return confirmResult;
    } else if (req.body.Status === 'CONFIRMED') {
  
  
      const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
      const tinkoffProviderLinkSelectQuery = await deep.select({
        type_id: tinkoffProviderTypeLinkId
      });
      if (tinkoffProviderLinkSelectQuery.error) { throw new Error(tinkoffProviderLinkSelectQuery.error.message); }
      const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
      console.log({ tinkoffProviderLinkId });
  
      const paymentLinkSelectQuery = await deep.select({
        object: { value: { _contains: { bankPaymentId: parseInt(req.body.PaymentId) } } }
      });
      if (paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
      const paymentLink = paymentLinkSelectQuery.data[0];
      console.log({ paymentLink });
      if (!paymentLink) { throw new Error("The payment link associated with the bank payment id " + req.body.PaymentId + " is not found."); }
  
      const { data: mpUpPayment, error: mpUpPaymentSelectQueryError } = await deep.select({
        up: {
          parent_id: { _eq: paymentLink.id },
          tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
        }
      });
      console.log({ mpUpPayment });
      if (mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }
  
      const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
      const payLink = mpUpPayment.find(link => link.type_id === payTypeLinkId);
      console.log({ payLink });
      if (!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }
  
      const payedLinkInsertQuery = await deep.insert({
        type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
        from_id: tinkoffProviderLinkId,
        to_id: payLink.id,
      });
      if (payedLinkInsertQuery.error) { throw new Error(payedLinkInsertQuery.error.message); }
      const payedLinkId = payedLinkInsertQuery.data[0].id;
      console.log({ payedLinkId });
  
      const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
      const storageClientLinkSelectQuery = await deep.select({
        type_id: StorageClient,
        number: { value: req.body.CardId }
      });
      console.log({ storageClientLinkSelectQuery });
      if (storageClientLinkSelectQuery.error) { throw new Error(storageClientLinkSelectQuery.error.message); }
  
      if (fromLinkOfPayment.type_id !== StorageClient) {
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
  