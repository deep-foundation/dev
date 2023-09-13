({ deep, data: { newLink, triggeredByLinkId } }) => {
  const timestamp = Date.now();
  
  const containTypeLinkId = deep.id('@deep-foundation/core', 'Contain');

  const valueTypeLinkId = deep.id("@deep-foundation/core", "Value");
  const containToValueTypeLinkSelectQuery = {
    type_id: containTypeLinkId,
    to: {
      in: {
        type_id: valueTypeLinkId,
        from_id: newLink.type_id,
      }
    }
  };
  const { data: [containLinkToValueType] } = deep.select(containToValueTypeLinkSelectQuery);
  if(!containLinkToValueType) {
    throw new Error(`Query ${JSON.stringify(containToValueTypeLinkSelectQuery)} has not found a link`);
  }
  const specificValueTypeLinkId = containLinkToValueType.to_id;
  
  const reservedIds = deep.reserve(3);

  const logValueLinkInsertData = {
    id: reservedIds[0],
    type_id: deep.id("@deep-foundation/core", "Value"),
    from_id: newLink.type_id,
    to_id: deep.id("@deep-foundation/core", specificValueTypeLinkId),
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
    [containLinkToValueType.value.value]: {
      data: { value: newLink.value.value }
    }
  };

  const logUpdateInsertData = {
    id: reservedIds[1],
    type_id: deep.id("@deep-foundation/logger", "LogUpdate"),
    from_id: logValueLinkInsertData.id,
    to_id: newLink.id,
    number: timestamp,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  const logSubjectInsertData = {
    type_id: deep.id("@deep-foundation/logger", "LogSubject"),
    from_id: triggeredByLinkId,
    to_id: logUpdateInsertData.id,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  await deep.insert([
    logValueLinkInsertData,
    logUpdateInsertData,
    logSubjectInsertData
  ])
}