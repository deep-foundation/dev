exports.insertHandler = async ({deep,fileTypeId, fileName, handlerName, handleName, triggerTypeId, code, supportsId, handleOperationTypeId, containTypeId, packageId, handlerTypeId}) => {
    return await deep.insert({
        type_id: fileTypeId,
        in: {
          data: [
            {
              type_id: containTypeId,
              from_id: packageId, // before created package
              string: { data: { value: fileName } },
            },
            {
              from_id: supportsId,
              type_id: handlerTypeId,
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: packageId, // before created package
                    string: { data: { value: handlerName } },
                  },
                  {
                    type_id: handleOperationTypeId,
                    from_id: triggerTypeId,
                    in: {
                      data: [
                        {
                          type_id: containTypeId,
                          from_id: packageId, // before created package
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

  