exports.insertHandler = async ({deep,fileTypeLinkId, fileName, handlerName, handleName, triggerTypeLinkId, code, supportsId, handleOperationTypeLinkId, containTypeLinkId, packageId, handlerTypeLinkId}) => {
    return await deep.insert({
        type_id: fileTypeLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: packageId, 
              string: { data: { value: fileName } },
            },
            {
              from_id: supportsId,
              type_id: handlerTypeLinkId,
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: packageId,
                    string: { data: { value: handlerName } },
                  },
                  {
                    type_id: handleOperationTypeLinkId,
                    from_id: triggerTypeLinkId,
                    in: {
                      data: [
                        {
                          type_id: containTypeLinkId,
                          from_id: packageId, 
                          string: { data: { value: handleName } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        string: {
          data: {
            value: code,
          },
        },
      });
  };

  