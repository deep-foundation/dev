
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  
const crypto = require('crypto');
const axios = require('axios');
const errors = {"7":"Покупатель не найден","53":"Обратитесь к продавцу","99":"Платеж отклонен","100":"Повторите попытку позже","101":"Не пройдена идентификация 3DS","102":"Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой","103":"Повторите попытку позже","119":"Превышено кол-во запросов на авторизацию","191":"Некорректный статус договора, обратитесь к вашему менеджеру","1001":"Свяжитесь с банком, выпустившим карту, чтобы провести платеж","1003":"Неверный merchant ID","1004":"Карта украдена. Свяжитесь с банком, выпустившим карту","1005":"Платеж отклонен банком, выпустившим карту","1006":"Свяжитесь с банком, выпустившим карту, чтобы провести платеж","1007":"Карта украдена. Свяжитесь с банком, выпустившим карту","1008":"Платеж отклонен, необходима идентификация","1012":"Такие операции запрещены для этой карты","1013":"Повторите попытку позже","1014":"Карта недействительна. Свяжитесь с банком, выпустившим карту","1015":"Попробуйте снова или свяжитесь с банком, выпустившим карту","1019":"Платеж отклонен — попробуйте снова","1030":"Повторите попытку позже","1033":"Истек срок действия карты. Свяжитесь с банком, выпустившим карту","1034":"Попробуйте повторить попытку позже","1038":"Превышено количество попыток ввода ПИН-кода","1039":"Платеж отклонен — счет не найден","1041":"Карта утеряна. Свяжитесь с банком, выпустившим карту","1043":"Карта украдена. Свяжитесь с банком, выпустившим карту","1051":"Недостаточно средств на карте","1053":"Платеж отклонен — счет не найден","1054":"Истек срок действия карты","1055":"Неверный ПИН","1057":"Такие операции запрещены для этой карты","1058":"Такие операции запрещены для этой карты","1059":"Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту","1061":"Превышен дневной лимит платежей по карте","1062":"Платежи по карте ограничены","1063":"Операции по карте ограничены","1064":"Проверьте сумму","1065":"Превышен дневной лимит транзакций","1075":"Превышено число попыток ввода ПИН-кода","1076":"Платеж отклонен — попробуйте снова","1077":"Коды не совпадают — попробуйте снова","1080":"Неверный срок действия","1082":"Неверный CVV","1086":"Платеж отклонен — не получилось подтвердить ПИН-код","1088":"Ошибка шифрования. Попробуйте снова","1089":"Попробуйте повторить попытку позже","1091":"Банк, выпустивший карту недоступен для проведения авторизации","1092":"Платеж отклонен — попробуйте снова","1093":"Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту","1094":"Системная ошибка","1096":"Повторите попытку позже","9999":"Внутренняя ошибка системы"};
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


  if(!(req.body.Status === "AUTHORIZED" || req.body.Status === "CONFIRMED" )) {
    return next();
  }

  if (req.body.Status === 'AUTHORIZED') {
    const reqBody = req.body;
    console.log({reqBody});
  
    const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
    const tinkoffProviderLinkSelectQuery = await deep.select({
      type_id: tinkoffProviderTypeLinkId
    });
    if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
    const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
    console.log({tinkoffProviderLinkId});
  
    console.log(JSON.stringify(await deep.select({type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment")})))
    console.log("Select args:" ,JSON.stringify({
      object: {value: {_contains: {bankPaymentId: req.body.PaymentId}}}
    }))

    const paymentLinkSelectQuery = await deep.select({
      object: {value: {_contains: {bankPaymentId: parseInt(req.body.PaymentId)}}}
    });
    if(paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
    const paymentLink = paymentLinkSelectQuery.data[0];
    console.log({paymentLink});
    if(!paymentLink) { throw new Error("The payment link associated with the bank payment id " + req.body.PaymentId + " is not found."); }
  
    const {data: mpUpPayment, error: mpUpPaymentSelectQueryError} = await deep.select({
      up: {
        parent_id: { _eq: paymentLink.id },
        tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
      }
    });
    console.log({mpUpPayment});
    if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }
  
    const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
    const payLink = mpUpPayment.find(link => link.type_id === payTypeLinkId);
    console.log({payLink});
    if(!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }
    
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
    if(storageReceiverLinkSelectQuery.error) {throw new Error(storageReceiverLinkSelectQuery.error.message);}
    const storageReceiverId = storageReceiverLinkSelectQuery.data[0].id;
    console.log({storageReceiverId});


    const usesTokenTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesToken");
    const usesTokenLinkSelectQuery = await deep.select({
      type_id: usesTokenTypeLinkId,
      from_id: storageReceiverId,
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
    
const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
});
if (tinkoffProviderLinkSelectQuery.error) { throw new Error(tinkoffProviderLinkSelectQuery.error.message); }
const tinkoffProviderId = tinkoffProviderLinkSelectQuery.data[0].id;
console.log({ tinkoffProviderId });

const paymentLinkSelectQuery = await deep.select({
    object: { value: { _contains: { orderId: req.body.OrderId } } }
});
if (paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
const paymentLink = paymentLinkSelectQuery.data[0];
console.log({ paymentLink });
if (!paymentLink) { throw new Error("The payment link associated with the order id " + req.body.OrderId + " is not found."); }

const { data: mpUpPayment, error: mpUpPaymentSelectQueryError } = await deep.select({
    up: {
        parent_id: { _eq: paymentLink.id },
        tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
    }
});
console.log({ mpUpPayment });
if (mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }

const Pay = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
const payLink = mpUpPayment.find(link => link.type_id === Pay);
console.log({ payLink });
if (!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }

const storageReceiverLinkSelectQuery = await deep.select({
    id: paymentLink.to_id
});
if (storageReceiverLinkSelectQuery.error) { throw new Error(storageReceiverLinkSelectQuery.error.message); }
const storageReceiverLink = storageReceiverLinkSelectQuery.data[0];
console.log({ storageReceiverLink });

const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
const tokenLinkSelectQuery = await deep.select({
    type_id: Token,
    from_id: storageReceiverLink.id,
    to_id: storageReceiverLink.id
});
if (tokenLinkSelectQuery.error) { throw new Error(tokenLinkSelectQuery.error.message); }
const tokenLink = tokenLinkSelectQuery.data[0];
console.log({ tokenLink });

const storageReceiverSelectQuery = await deep.select({
    id: paymentLink.to_id
});
if (storageReceiverSelectQuery.error) { throw new Error(storageReceiverSelectQuery.error.message); }
const storageReceiver = storageReceiverSelectQuery.data[0];
console.log({ storageReceiver });
if (!storageReceiver) { throw new Error("The storage receiver link associated with the order id " + req.body.OrderId + " is not found."); }

const sumLinkSelectQuery = await deep.select({
    type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum"),
    to_id: paymentLink.id
});
if (sumLinkSelectQuery.error) { throw new Error(sumLinkSelectQuery.error.message); }
const sumLink = sumLinkSelectQuery.data[0];
console.log({ sumLink });
if (!sumLink) { throw new Error("The sum link associated with the order id " + req.body.OrderId + " is not found."); }

const _generateToken = (dataWithPassword) => {
    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map(key => dataWithPassword[key])
      .reduce((acc, item) => `${acc}${item}`, '');
    const hash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
    return hash;
  };
const generateToken = (data) => {
    const { Receipt, DATA, ...restData } = data;
    const dataWithPassword = { ...restData, Password: "undefined" };
    return _generateToken(dataWithPassword);
  };
const getUrl = (method) =>
      `undefined/${method}`;
const getError = errorCode => errorCode === '0' ? undefined : (errors[errorCode] || 'broken');

const C2CToken = await deep.id("@deep-foundation/payments-tinkoff-c2b", "C2CToken");
const C2CTokenLinkSelectQuery = await deep.select({
    type_id: C2CToken,
    from_id: storageReceiverLink.id,
    to_id: storageReceiverLink.id
});
if (C2CTokenLinkSelectQuery.error) { throw new Error(C2CTokenLinkSelectQuery.error.message); }
const C2CTokenLink = C2CTokenLinkSelectQuery.data[0];
console.log({ C2CTokenLink });

const initOptions = {
    TerminalKey: C2CTokenLink.value.value,
    OrderId: req.body.OrderId,
    CardId: storageReceiver.value.value,
    Amount: sumLink.value.value,
};
console.log({ initOptions });

const init = async (options) => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('Init'),
      headers: {
        'Content-Type': 'application/json',
      },
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
const initResult = await init(initOptions);
console.log({ initResult });
if (initResult.error) {
    const errorMessage = initResult.error;
    const { error: errorLinkInsertQueryError } = await deep.insert({
        type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
        from_id: tinkoffProviderId,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
    });
    if (errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
}

const paymentOptions = {
    TerminalKey: C2CTokenLink.value.value,
    PaymentId: initResult.response.PaymentId,
}

const payment = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Payment'),
        headers: {
          'Content-Type': 'application/json',
        },
        data: {...options, Token: generateToken(options)},
      });
  
      const error = getError(response.data.ErrorCode);
  
      const d = {
        error,
        request: options,
        response: response.data,
      };
      options?.log && options.log(d);
  
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
const paymentResult = await payment(paymentOptions);
console.log({ paymentResult });
if (paymentResult.error) {
    const errorMessage = "Could not initialize the order. " + paymentResult.error;
    const { error: errorLinkInsertQueryError } = await deep.insert({
        type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
        from_id: tinkoffProviderId,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
    });
    if (errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
}

const payedLinkInsertQuery = await deep.insert({
    type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderId,
    to_id: payLink.id,
});

if (payedLinkInsertQuery.error) { throw new Error(payedLinkInsertQuery.error.message); }
const payedLinkId = payedLinkInsertQuery.data[0].id;
console.log({ payedLinkId });

const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
const storagePayerLinkSelectQuery = await deep.select({
    type_id: StorageClient,
    number: { value: req.body.CardId }
});
if (storagePayerLinkSelectQuery.error) { throw new Error(storagePayerLinkSelectQuery.error.message); }
let storagePayerLinkId = storagePayerLinkSelectQuery.data[0];
console.log({ storagePayerLinkId });
if (!storagePayerLinkId) {
    const storagePayerLinkInsertQuery = await deep.insert({
        type_id: StorageClient,
        number: { data: { value: req.body.CardId } }
    });
    if (storagePayerLinkInsertQuery.error) { throw new Error(storagePayerLinkInsertQuery.error.message); }
    storagePayerLinkId = storagePayerLinkInsertQuery.data[0].id;
    console.log({ storagePayerLinkId });
}

const Income = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Income");
const incomeLinkInsertQuery = await deep.insert({
    type_id: Income,
    from_id: paymentLink.id,
    to_id: storagePayerLinkId,
});
if (incomeLinkInsertQuery.error) { throw new Error(incomeLinkInsertQuery.error.message); }
const incomeLinkId = incomeLinkInsertQuery.data[0].id;
console.log({ incomeLinkId });
  
  }
};
