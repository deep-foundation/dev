exports.testInit = async ({deep, paymentTypeLinkId, storageBusinessLinkId, containTypeLinkId, sumTypeLinkId, sumProviderLinkId, objectTypeLinkId, }) => {
    console.log('testInit-start');

    const createdLinkIds = [];

    const {
      data: [{ id: paymentLinkId }],
    } = await deep.insert({
      type_id: paymentTypeLinkId,
      from_id: deep.linkId,
      to_id: storageBusinessLinkId,
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ paymentLinkId });
    createdLinkIds.push(paymentLinkId);
    allCreatedLinkIds.push(paymentLinkId);

    const {
      data: [{ id: sumLinkId }],
    } = await deep.insert({
      type_id: sumTypeLinkId,
      from_id: sumProviderLinkId,
      to_id: paymentLinkId,
      number: { data: { value: PRICE } },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ sumLinkId });
    createdLinkIds.push(sumLinkId);
    allCreatedLinkIds.push(sumLinkId);

    const {
      data: [{ id: objectLinkId }],
    } = await deep.insert({
      type_id: objectTypeLinkId,
      from_id: paymentLinkId,
      to_id: productLinkId,
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ objectLinkId });
    createdLinkIds.push(objectLinkId);
    allCreatedLinkIds.push(objectLinkId);

    const {
      data: [{ id: payLinkId }],
    } = await deep.insert({
      type_id: payTypeLinkId,
      from_id: deep.linkId,
      to_id: sumLinkId,
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ payLinkId });
    createdLinkIds.push(payLinkId);
    allCreatedLinkIds.push(payLinkId);

    var urlLinkSelectQuery;
    for (let i = 0; i < 10; i++) {
      urlLinkSelectQuery = await deep.select({
        type_id: urlTypeLinkId,
        to_id: payLinkId,
      });

      if (urlLinkSelectQuery.data.length > 0) {
        break;
      }

      await sleep(1000);
    }

    expect(urlLinkSelectQuery.data.length).to.greaterThan(0);

    createdLinkIds.push(urlLinkSelectQuery.data[0].id);
    allCreatedLinkIds.push(urlLinkSelectQuery.data[0].id);

    const createdLinks = (await deep.select(createdLinkIds)).data;
    console.log({ createdLinks });

    console.log('testInit-end');

    return {
      createdLinks
    }
  };