({ deep, data: { newLink, triggeredByLinkId } }) => {
  const timestamp = Date.now();

  const containTypeLinkId = deep.id('@deep-foundation/core', 'Contain');

  const reservedIds = deep.reserve(25);

  const logLinkInsertData = {
    id: reservedIds[0],
    type_id: deep.id("@deep-foundation/logger", "LogLink"),
    ...(newLink.from_id && {from_id: newLink.from_id}),
    ...(newLink.to_id && {from_id: newLink.to_id}),
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  const logInsertLinkInsertData = {
    id: reservedIds[1],
    type_id: deep.id("@deep-foundation/logger", "LogInsert"),
    from_id: logLinkInsertData.id,
    to_id: newLink.id,
    number: timestamp, // TODO: number field must be of type MutationInsertLink or smth like this, but not number. Issue: https://github.com/deep-foundation/deeplinks/issues/80
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  const logTypeLinkInsertData = {
    type_id: deep.id("@deep-foundation/logger", "LogType"),
    from_id: logLinkInsertData.id,
    to_id: newLink.type_id,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  const logSubjectLinkInsertData = {
    type_id: deep.id("@deep-foundation/logger", "LogSubject"),
    from_id: triggeredByLinkId,
    to_id: logInsertLinkInsertData.id,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: triggeredByLinkId,
      },
    },
  };

  deep.insert([
    logLinkInsertData,
    logInsertLinkInsertData,
    logTypeLinkInsertData,
    logSubjectLinkInsertData,
    logSubjectLinkInsertData
  ])
}